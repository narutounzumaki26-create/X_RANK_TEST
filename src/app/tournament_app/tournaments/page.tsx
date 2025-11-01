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
  user_id: string
  player_name?: string
  Admin?: boolean
}

// Liste de toutes les tables qui référencent les tournois
const TOURNAMENT_REFERENCE_TABLES = [
  'matches',
  'tournament_participants'
  // Ajoutez ici toute nouvelle table qui pourrait référencer tournaments
]

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [finishing, setFinishing] = useState<string | null>(null)
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

  // Check if current user is admin
  const isAdmin = currentPlayer?.Admin === true

  // Vérifier toutes les références d'un tournoi
  const checkTournamentReferences = async (tournamentId: string) => {
    const references: { [key: string]: number } = {}

    // Vérifier chaque table connue
    for (const tableName of TOURNAMENT_REFERENCE_TABLES) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)

        if (!error) {
          references[tableName] = count || 0
        } else {
          references[tableName] = 0
        }
      } catch (err) {
        console.error(`Error checking table ${tableName}:`, err)
        references[tableName] = 0
      }
    }

    return references
  }

  // Supprimer toutes les données d'un tournoi
  const deleteAllTournamentData = async (tournamentId: string): Promise<{ [key: string]: number }> => {
    const deletedCounts: { [key: string]: number } = {}

    // Supprimer de chaque table connue
    for (const tableName of TOURNAMENT_REFERENCE_TABLES) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .delete({ count: 'exact' })
          .eq('tournament_id', tournamentId)

        if (!error) {
          deletedCounts[tableName] = count || 0
        } else {
          deletedCounts[tableName] = 0
          console.warn(`Could not delete from ${tableName}:`, error)
        }
      } catch (err) {
        console.error(`Error deleting from ${tableName}:`, err)
        deletedCounts[tableName] = 0
      }
    }

    return deletedCounts
  }

  // Fonction utilitaire pour formater les noms de tables en français
  const formatTableName = (tableName: string): string => {
    const translations: { [key: string]: string } = {
      'matches': 'matchs',
      'tournament_participants': 'participants'
    }
    return translations[tableName] || tableName
  }

  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        // Fetch current player's admin status using user_id
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('player_id, user_id, player_name, Admin')
          .eq('user_id', user.id)
          .single()

        if (!playerError && playerData) {
          setCurrentPlayer(playerData)
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

      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(submissionData)
          .eq('tournament_id', editingTournament.tournament_id)

        if (error) {
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
      alert('Only administrators can edit tournaments.')
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

  const handleFinish = async (tournamentId: string): Promise<void> => {
    if (!isAdmin) {
      alert('Only administrators can finish tournaments.')
      return
    }

    if (!confirm('Are you sure you want to mark this tournament as finished?')) {
      return
    }

    setFinishing(tournamentId)
    
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'finished' })
        .eq('tournament_id', tournamentId)

      if (error) {
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          throw new Error('Permission denied: Only administrators can finish tournaments.')
        }
        throw error
      }

      // Update local state
      setTournaments(prev => prev.map(t => 
        t.tournament_id === tournamentId 
          ? { ...t, status: 'finished' }
          : t
      ))
      
      alert('Tournament marked as finished successfully')
      
    } catch (err: unknown) {
      console.error('Error finishing tournament:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error finishing tournament'
      alert(`Failed to finish tournament: ${errorMessage}`)
    } finally {
      setFinishing(null)
    }
  }

  const handleDelete = async (tournamentId: string): Promise<void> => {
    if (!isAdmin) {
      alert('Only administrators can delete tournaments.')
      return
    }

    const tournamentName = tournaments.find(t => t.tournament_id === tournamentId)?.name || 'This tournament'
    
    // Vérifier toutes les références
    const references = await checkTournamentReferences(tournamentId)
    const totalReferences = Object.values(references).reduce((sum, count) => sum + count, 0)
    
    let deleteMessage = `Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`
    
    if (totalReferences > 0) {
      deleteMessage = `WARNING: This action will PERMANENTLY DELETE:\n\n` +
                     `• The tournament "${tournamentName}"\n`
      
      // Lister toutes les tables avec des données
      for (const [tableName, count] of Object.entries(references)) {
        if (count > 0) {
          const displayName = formatTableName(tableName)
          if (tableName === 'matches') {
            deleteMessage += `• ${count} match(es)\n`
          } else if (tableName === 'tournament_participants') {
            deleteMessage += `• ${count} tournament participation(s)\n`
          } else {
            deleteMessage += `• ${count} record(s) in ${displayName}\n`
          }
        }
      }
      
      deleteMessage += `\nThis action cannot be undone!\n\nAre you absolutely sure you want to proceed?`
    }

    if (!confirm(deleteMessage)) {
      return
    }

    setDeleting(tournamentId)
    
    try {
      // Supprimer toutes les données associées au tournoi
      const deletedCounts = await deleteAllTournamentData(tournamentId)

      // Finalement supprimer le tournoi lui-même
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('tournament_id', tournamentId)

      if (error) throw error
      
      // Message de confirmation détaillé
      let successMessage = `Tournament "${tournamentName}" deleted successfully.`
      const deletedItems = []
      
      for (const [tableName, count] of Object.entries(deletedCounts)) {
        if (count > 0) {
          const displayName = formatTableName(tableName)
          if (tableName === 'matches') {
            deletedItems.push(`${count} match(es)`)
          } else if (tableName === 'tournament_participants') {
            deletedItems.push(`${count} participation(s)`)
          } else {
            deletedItems.push(`${count} ${displayName}`)
          }
        }
      }
      
      if (deletedItems.length > 0) {
        successMessage += ` Also deleted: ${deletedItems.join(', ')}.`
      }
      
      alert(successMessage)
      
      // Mettre à jour l'état local
      setTournaments(prev => prev.filter(t => t.tournament_id !== tournamentId))
      
    } catch (err: unknown) {
      console.error('Error deleting tournament:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error deleting tournament'
      
      if (errorMessage.includes('foreign key constraint')) {
        // Vérifier quelles tables posent encore problème
        const remainingRefs = await checkTournamentReferences(tournamentId)
        const problematicTables = Object.entries(remainingRefs)
          .filter(([_, count]) => count > 0)
          .map(([table]) => formatTableName(table))
        
        if (problematicTables.length > 0) {
          alert(`Cannot delete tournament: There are still references in: ${problematicTables.join(', ')}. Please contact administrator.`)
        } else {
          alert('Cannot delete tournament: Unknown references in the database. Contact administrator.')
        }
      } else {
        alert(`Delete failed: ${errorMessage}`)
      }
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
      alert('Only administrators can create tournaments.')
      return
    }
    setShowForm(true)
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
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
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
            ) : (
              <span className="ml-2 text-orange-600">(View Only)</span>
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
        </div>
      </div>

      {showForm && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingTournament ? 'Edit Tournament' : 'Create New Tournament'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Combos *
                </label>
                <input
                  type="number"
                  name="max_combos"
                  value={formData.max_combos || 3}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                {editingTournament ? 'Update Tournament' : 'Create Tournament'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No tournaments found</p>
          {isAdmin ? (
            <button
              onClick={showCreateForm}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Create First Tournament
            </button>
          ) : (
            <p className="text-orange-600">Only administrators can create tournaments</p>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TOURNAMENT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DETAILS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournaments.map((tournament) => (
                  <tr key={tournament.tournament_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {tournament.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tournament.location || 'No location specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Date:</span> {new Date(tournament.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Max Combos:</span> {tournament.max_combos}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        tournament.status === 'finished' ? 'bg-green-100 text-green-800 border border-green-200' :
                        tournament.status === 'ongoing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        tournament.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {tournament.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {isAdmin ? (
                        <>
                          {tournament.status !== 'finished' && (
                            <button
                              onClick={() => handleFinish(tournament.tournament_id)}
                              disabled={finishing === tournament.tournament_id}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm"
                            >
                              {finishing === tournament.tournament_id ? 'Finishing...' : 'Finish'}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(tournament)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tournament.tournament_id)}
                            disabled={deleting === tournament.tournament_id}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm"
                          >
                            {deleting === tournament.tournament_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
