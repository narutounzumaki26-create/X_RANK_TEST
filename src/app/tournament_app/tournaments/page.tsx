// components/TournamentManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabaseClient";

interface Tournament {
  tournament_id: string
  name: string
  location?: string
  date: string
  status: string
  max_combos: number
  created_by?: string
  description?: string
}

interface Player {
  player_id: string
  user_id: string  // Add user_id field
  player_name?: string
  Admin?: boolean
}

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)

  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    status: 'planned',
    max_combos: 3,
    description: ''
  })

  // Check if current user is admin - FIXED
  const isAdmin = currentPlayer?.Admin === true

  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        // FIXED: Use user_id instead of player_id to match auth user
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('player_id, user_id, player_name, Admin')
          .eq('user_id', user.id)  // FIXED: Changed from player_id to user_id
          .single()

        if (!playerError && playerData) {
          setCurrentPlayer(playerData)
          console.log('Current player found:', playerData)
          console.log('Admin status:', playerData.Admin)
        } else {
          console.log('Player not found or error:', playerError)
          // If no player found, check if we need to create one
          if (playerError?.code === 'PGRST116') { // No rows returned
            console.log('No player record found for user:', user.id)
          }
        }
      }

      // Fetch tournaments and all players
      const [tournamentsRes, playersRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('date', { ascending: false }),
        supabase.from('players').select('player_id, user_id, player_name, Admin')
      ])

      if (tournamentsRes.error) {
        if (tournamentsRes.error.message.includes('row-level security')) {
          throw new Error('RLS Policy Error: Cannot access tournaments. Check database permissions.')
        }
        throw tournamentsRes.error
      }

      setTournaments(tournamentsRes.data || [])
      setPlayers(playersRes.data || [])

    } catch (err: unknown) {
      console.error('Error in fetchData:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error loading data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_combos' ? parseInt(value) || 3 : value
    }))
  }

  const resetForm = (): void => {
    setFormData({
      name: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      status: 'planned',
      max_combos: 3,
      description: ''
    })
    setEditingTournament(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    try {
      const submissionData: Record<string, unknown> = { ...formData }
      
      // Clean up empty strings for optional fields
      if (submissionData.location === '') {
        submissionData.location = null
      }
      
      if (submissionData.description === '') {
        submissionData.description = null
      }

      console.log('Submitting data as admin:', isAdmin)

      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(submissionData)
          .eq('tournament_id', editingTournament.tournament_id)

        if (error) {
          console.error('Update error:', error)
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            throw new Error('Permission denied: Only administrators can update tournaments.')
          }
          throw error
        }
        alert('Tournament updated successfully')
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert([submissionData])

        if (error) {
          console.error('Insert error:', error)
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            throw new Error('Permission denied: Only administrators can create tournaments.')
          }
          throw error
        }
        alert('Tournament created successfully')
      }

      await fetchData()
      resetForm()
    } catch (err: unknown) {
      console.error('Error saving tournament:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error saving tournament'
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleEdit = (tournament: Tournament): void => {
    if (!isAdmin) {
      alert(`Only administrators can edit tournaments. Your admin status: ${isAdmin}`)
      return
    }
    setEditingTournament(tournament)
    setFormData({
      name: tournament.name,
      location: tournament.location || '',
      date: tournament.date,
      status: tournament.status,
      max_combos: tournament.max_combos,
      description: tournament.description || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (tournamentId: string): Promise<void> => {
    if (!isAdmin) {
      alert(`Only administrators can delete tournaments. Your admin status: ${isAdmin}`)
      return
    }

    if (!confirm('Are you sure you want to delete this tournament?')) {
      return
    }

    setDeleting(tournamentId)
    
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('tournament_id', tournamentId)

      if (error) {
        console.error('Delete error:', error)
        
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          throw new Error('Permission denied: Only administrators can delete tournaments.')
        }
        throw error
      }

      setTournaments(prev => prev.filter(t => t.tournament_id !== tournamentId))
      alert('Tournament deleted successfully')
      
    } catch (err: unknown) {
      console.error('Error deleting tournament:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error deleting tournament'
      alert(`Delete failed: ${errorMessage}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleRetry = (): void => {
    setLoading(true)
    fetchData()
  }

  const showCreateForm = (): void => {
    if (!isAdmin) {
      alert(`Only administrators can create tournaments. Your admin status: ${isAdmin}`)
      return
    }
    setShowForm(true)
  }

  // Debug function to check user status
  const debugUserStatus = () => {
    console.log('Debug info:', {
      currentUser: currentUser?.id,
      currentPlayer,
      isAdmin,
      hasPlayerRecord: !!currentPlayer,
      playerUserID: currentPlayer?.user_id,
      authUserID: currentUser?.id
    })
    alert(`Debug Info:
User ID: ${currentUser?.id}
Player User ID: ${currentPlayer?.user_id}
Admin Status: ${isAdmin}
Has Player Record: ${!!currentPlayer}
Match: ${currentPlayer?.user_id === currentUser?.id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading tournaments...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Try Again
            </button>
            <button
              onClick={debugUserStatus}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md ml-3"
            >
              Debug User Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Manager</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}
            {isAdmin ? (
              <span className="ml-2 text-green-600 font-semibold">(Administrator)</span>
            ) : currentPlayer ? (
              <span className="ml-2 text-orange-600">(View Only - Not Admin)</span>
            ) : (
              <span className="ml-2 text-red-600">(No Player Record)</span>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={showCreateForm}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              Create Tournament
            </button>
          )}
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            Refresh
          </button>
          <button
            onClick={debugUserStatus}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
            title="Debug user status"
          >
            Debug
          </button>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {showForm && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          {/* Form content */}
        </div>
      )}

      {/* Table content */}
    </div>
  )
}
