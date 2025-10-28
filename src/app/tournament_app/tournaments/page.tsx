// components/TournamentManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tournament {
  tournament_id: string
  name: string
  location?: string
  date: string
  winner_id?: string
  status: string
  max_combos: number
  created_by?: string
  description?: string
}

interface Player {
  player_id: string
  player_name?: string
}

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)

  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    winner_id: '',
    status: 'planned',
    max_combos: 3,
    description: ''
  })

  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      const [tournamentsRes, playersRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('date', { ascending: false }),
        supabase.from('players').select('player_id, player_name')
      ])

      if (tournamentsRes.error) throw tournamentsRes.error

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

  const getPlayerName = (playerId: string | undefined): string => {
    if (!playerId) return 'No winner'
    const player = players.find(p => p.player_id === playerId)
    return player?.player_name || `Player (${playerId.slice(0, 8)}...)`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_combos' ? parseInt(value) : value
    }))
  }

  const resetForm = (): void => {
    setFormData({
      name: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      winner_id: '',
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
      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(formData)
          .eq('tournament_id', editingTournament.tournament_id)

        if (error) throw error
        alert('Tournament updated successfully')
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert([formData])

        if (error) throw error
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
    setEditingTournament(tournament)
    setFormData({
      name: tournament.name,
      location: tournament.location || '',
      date: tournament.date,
      winner_id: tournament.winner_id || '',
      status: tournament.status,
      max_combos: tournament.max_combos,
      description: tournament.description || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (tournamentId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all participants, decks, and matches related to this tournament.')) {
      return
    }

    setDeleting(tournamentId)
    
    try {
      console.log('Starting deletion process for tournament:', tournamentId);

      // First, delete related records from other tables
      // Delete tournament participants
      const { error: participantsError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId);

      if (participantsError) {
        console.error('Error deleting participants:', participantsError);
        throw new Error(`Failed to delete participants: ${participantsError.message}`);
      }

      // Delete tournament decks
      const { error: decksError } = await supabase
        .from('tournament_decks')
        .delete()
        .eq('tournament_id', tournamentId);

      if (decksError) {
        console.error('Error deleting decks:', decksError);
        throw new Error(`Failed to delete decks: ${decksError.message}`);
      }

      // Update matches to remove tournament reference (set tournament_id to null)
      const { error: matchesError } = await supabase
        .from('matches')
        .update({ tournament_id: null })
        .eq('tournament_id', tournamentId);

      if (matchesError) {
        console.error('Error updating matches:', matchesError);
        throw new Error(`Failed to update matches: ${matchesError.message}`);
      }

      // Finally, delete the tournament
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .delete()
        .eq('tournament_id', tournamentId);

      if (tournamentError) {
        console.error('Error deleting tournament:', tournamentError);
        throw new Error(`Failed to delete tournament: ${tournamentError.message}`);
      }

      console.log('Tournament deleted successfully');
      setTournaments(prev => prev.filter(t => t.tournament_id !== tournamentId));
      alert('Tournament deleted successfully');
      
    } catch (err: unknown) {
      console.error('Error in delete process:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error deleting tournament';
      
      // More detailed error message
      if (errorMessage.includes('foreign key constraint')) {
        alert(`Cannot delete tournament: It has related records in other tables. Please contact an administrator to set up proper cascade deletion.`);
      } else {
        alert(`Delete failed: ${errorMessage}`);
      }
    } finally {
      setDeleting(null);
    }
  }

  const handleRetry = (): void => {
    setLoading(true)
    fetchData()
  }

  // Quick fix: Add this SQL to your database to enable cascade deletion
  const showSQLFix = () => {
    const sql = `
-- Run this in your Supabase SQL editor to fix deletion issues:

-- 1. First, drop the existing foreign key constraints
ALTER TABLE tournament_participants 
DROP CONSTRAINT IF EXISTS tournament_participants_tournament_id_fkey;

ALTER TABLE tournament_decks 
DROP CONSTRAINT IF EXISTS tournament_decks_tournament_id_fkey;

ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_tournament_id_fkey;

-- 2. Recreate them with CASCADE DELETE
ALTER TABLE tournament_participants 
ADD CONSTRAINT tournament_participants_tournament_id_fkey 
FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) 
ON DELETE CASCADE;

ALTER TABLE tournament_decks 
ADD CONSTRAINT tournament_decks_tournament_id_fkey 
FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) 
ON DELETE CASCADE;

ALTER TABLE matches 
ADD CONSTRAINT matches_tournament_id_fkey 
FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) 
ON DELETE SET NULL;
    `;
    
    console.log('SQL Fix:', sql);
    alert('Check browser console for SQL fix. Copy and run it in Supabase SQL editor.');
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
              onClick={showSQLFix}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md ml-3"
            >
              Show SQL Fix
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
            {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} found
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Create Tournament
          </button>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            Refresh
          </button>
          <button
            onClick={showSQLFix}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm"
          >
            Fix Deletion
          </button>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          {/* Form content same as before */}
        </div>
      )}

      {/* Table content same as before */}
    </div>
  )
}
