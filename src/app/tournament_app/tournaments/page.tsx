// components/TournamentManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Types defined directly in the component file
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

interface TournamentParticipant {
  tournament_id: string
  player_id: string
  is_validated?: boolean
  validated_at?: string
  tournament_deck?: string
  inscription_id?: string
  placement?: number
}

interface TournamentDeck {
  tournament_id: string
  player_id: string
  combo_id_1?: string
  combo_id_2?: string
  combo_id_3?: string
  deck_id: string
  Date_Creation?: string
}

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<TournamentParticipant[]>([])
  const [decks, setDecks] = useState<TournamentDeck[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    winner_id: '',
    status: 'upcoming',
    max_combos: 3,
    description: ''
  })

  // Fetch all data
  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      // Fetch tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: false })

      if (tournamentsError) throw tournamentsError

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_id, player_name')

      if (playersError) console.warn('Could not load players')

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select('*')

      if (participantsError) console.warn('Could not load participants')

      // Fetch decks
      const { data: decksData, error: decksError } = await supabase
        .from('tournament_decks')
        .select('*')

      if (decksError) console.warn('Could not load decks')

      setTournaments(tournamentsData || [])
      setPlayers(playersData || [])
      setParticipants(participantsData || [])
      setDecks(decksData || [])

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

  // Get player name by ID
  const getPlayerName = (playerId: string | undefined): string => {
    if (!playerId) return 'N/A'
    const player = players.find(p => p.player_id === playerId)
    return player?.player_name || `Player (${playerId.slice(0, 8)}...)`
  }

  // Get participant count for a tournament
  const getParticipantCount = (tournamentId: string): number => {
    return participants.filter(p => p.tournament_id === tournamentId).length
  }

  // Get decks count for a tournament
  const getDeckCount = (tournamentId: string): number => {
    return decks.filter(d => d.tournament_id === tournamentId).length
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_combos' ? parseInt(value) : value
    }))
  }

  // Reset form
  const resetForm = (): void => {
    setFormData({
      name: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      winner_id: '',
      status: 'upcoming',
      max_combos: 3,
      description: ''
    })
    setEditingTournament(null)
    setShowForm(false)
  }

  // Create or update tournament
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    try {
      if (editingTournament) {
        // Update tournament
        const { error } = await supabase
          .from('tournaments')
          .update(formData)
          .eq('tournament_id', editingTournament.tournament_id)

        if (error) throw error
        alert('Tournament updated successfully')
      } else {
        // Create new tournament
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

  // Edit tournament
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

  // Delete tournament
  const handleDelete = async (tournamentId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all participants and decks.')) {
      return
    }

    setDeleting(tournamentId)
    
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('tournament_id', tournamentId)

      if (error) throw error

      setTournaments(tournaments.filter(t => t.tournament_id !== tournamentId))
      alert('Tournament deleted successfully')
    } catch (err: unknown) {
      console.error('Error deleting tournament:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error deleting tournament'
      alert(`Error: ${errorMessage}`)
    } finally {
      setDeleting(null)
    }
  }

  // Retry loading data
  const handleRetry = (): void => {
    setLoading(true)
    fetchData()
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
        </div>
      </div>

      {/* Tournament Form */}
      {showForm && (
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
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status || 'upcoming'}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Winner
                </label>
                <select
                  name="winner_id"
                  value={formData.winner_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No winner</option>
                  {players.map(player => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.player_name || `Player (${player.player_id.slice(0, 8)}...)`}
                    </option>
                  ))}
                </select>
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

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No tournaments found</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Create First Tournament
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tournament
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        {tournament.location || 'No location'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Date:</span> {new Date(tournament.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                          tournament.status === 'completed' ? 'bg-green-100 text-green-800' :
                          tournament.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                          tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Max Combos:</span> {tournament.max_combos}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Participants: {getParticipantCount(tournament.tournament_id)}
                      </div>
                      <div className="text-sm text-gray-900">
                        Decks: {getDeckCount(tournament.tournament_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-600">
                        {tournament.winner_id ? getPlayerName(tournament.winner_id) : 'No winner'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
