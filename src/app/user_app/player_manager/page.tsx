// components/PlayerManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabaseClient"

interface Player {
  player_id: string
  user_id: string | null
  player_name: string | null
  player_first_name: string | null
  player_last_name: string | null
  player_birth_date: string | null
  player_region: string | null
  Admin: boolean
  Arbitre: boolean
  bladepoints: number | null
  created_at: string
}

interface MatchReference {
  match_id: string
  tournament_name: string | null
  opponent_name: string | null
}

interface MatchRow {
  match_id: string
  tournament_id: string
  player1_id: string
  player2_id: string
  tournaments: {
    name: string
  } | null
}

export default function PlayerManager() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [deletingPlayer, setDeletingPlayer] = useState<string | null>(null)
  const [matchReferences, setMatchReferences] = useState<{ [key: string]: MatchReference[] }>({})

  const [formData, setFormData] = useState<Partial<Player>>({
    player_name: '',
    player_first_name: '',
    player_last_name: '',
    player_birth_date: '',
    player_region: '',
    Admin: false,
    Arbitre: false,
    bladepoints: null
  })

  // Vérifier si un joueur est référencé dans des matchs
  const checkPlayerMatches = async (playerId: string): Promise<MatchReference[]> => {
    try {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          match_id,
          tournament_id,
          player1_id,
          player2_id,
          tournaments (name)
        `)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .returns<MatchRow[]>()

      if (matchesError) throw matchesError

      return (matches || []).map(match => {
        let tournamentName = 'Tournoi inconnu'
        if (match.tournaments) {
          if (Array.isArray(match.tournaments)) {
            tournamentName = match.tournaments[0]?.name || 'Tournoi inconnu'
          } else {
            tournamentName = match.tournaments.name || 'Tournoi inconnu'
          }
        }

        return {
          match_id: match.match_id,
          tournament_name: tournamentName,
          opponent_name: match.player1_id === playerId 
            ? (players.find(p => p.player_id === match.player2_id)?.player_name || 'Adversaire inconnu')
            : (players.find(p => p.player_id === match.player1_id)?.player_name || 'Adversaire inconnu')
        }
      })
    } catch (err) {
      console.error('Error checking player matches:', err)
      return []
    }
  }

  // Vérifier si le joueur a des données dans d'autres tables
  const checkPlayerReferences = async (playerId: string) => {
    const references = {
      matches: 0,
      player_stats: 0,
      points: 0,
      tournament_participants: 0
    }

    try {
      // Vérifier les matchs
      const { count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)

      if (!matchesError) references.matches = matchesCount || 0

      // Vérifier les statistiques
      const { count: statsCount, error: statsError } = await supabase
        .from('player_stats')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId)

      if (!statsError) references.player_stats = statsCount || 0

      // Vérifier les points
      const { count: pointsCount, error: pointsError } = await supabase
        .from('points')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId)

      if (!pointsError) references.points = pointsCount || 0

      // Vérifier les participations aux tournois
      const { count: participantsCount, error: participantsError } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId)

      if (!participantsError) references.tournament_participants = participantsCount || 0

    } catch (err) {
      console.error('Error checking player references:', err)
    }

    return references
  }

  // Supprimer toutes les données d'un joueur
  const deleteAllPlayerData = async (playerId: string): Promise<{ [key: string]: number }> => {
    const deletedCounts = {
      matches: 0,
      player_stats: 0,
      points: 0,
      tournament_participants: 0
    }

    try {
      // 1. Supprimer les matchs
      const { count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .delete({ count: 'exact' })
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)

      if (!matchesError) deletedCounts.matches = matchesCount || 0

      // 2. Supprimer les statistiques
      const { count: statsCount, error: statsError } = await supabase
        .from('player_stats')
        .delete({ count: 'exact' })
        .eq('player_id', playerId)

      if (!statsError) deletedCounts.player_stats = statsCount || 0

      // 3. Supprimer les points
      const { count: pointsCount, error: pointsError } = await supabase
        .from('points')
        .delete({ count: 'exact' })
        .eq('player_id', playerId)

      if (!pointsError) deletedCounts.points = pointsCount || 0

      // 4. Supprimer les participations aux tournois
      const { count: participantsCount, error: participantsError } = await supabase
        .from('tournament_participants')
        .delete({ count: 'exact' })
        .eq('player_id', playerId)

      if (!participantsError) deletedCounts.tournament_participants = participantsCount || 0

    } catch (err) {
      console.error('Error deleting player data:', err)
      throw new Error('Failed to delete player data')
    }

    return deletedCounts
  }

  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .order('player_name', { ascending: true })

      if (fetchError) {
        if (fetchError.message.includes('row-level security')) {
          throw new Error('RLS Policy Error: Cannot access players. Check database permissions.')
        }
        throw fetchError
      }

      setPlayers(data || [])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? (value === '' ? null : parseInt(value)) : value
    }))
  }

  const resetForm = (): void => {
    setFormData({
      player_name: '',
      player_first_name: '',
      player_last_name: '',
      player_birth_date: '',
      player_region: '',
      Admin: false,
      Arbitre: false,
      bladepoints: null
    })
    setEditingPlayer(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    try {
      const submissionData: Record<string, unknown> = { ...formData }
      
      // Clean up empty strings for optional fields
      const optionalFields = ['player_name', 'player_first_name', 'player_last_name', 'player_region']
      optionalFields.forEach(field => {
        if (submissionData[field] === '') {
          submissionData[field] = null
        }
      })

      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update(submissionData)
          .eq('player_id', editingPlayer.player_id)

        if (error) {
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            throw new Error('Permission denied: Cannot update players.')
          }
          throw error
        }
        alert('Player updated successfully')
      } else {
        const { error } = await supabase
          .from('players')
          .insert([submissionData])

        if (error) {
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            throw new Error('Permission denied: Cannot create players.')
          }
          throw error
        }
        alert('Player created successfully')
      }

      await fetchData()
      resetForm()
    } catch (err: unknown) {
      console.error('Error saving player:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error saving player'
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleEdit = (player: Player): void => {
    setEditingPlayer(player)
    setFormData({
      player_name: player.player_name || '',
      player_first_name: player.player_first_name || '',
      player_last_name: player.player_last_name || '',
      player_birth_date: player.player_birth_date || '',
      player_region: player.player_region || '',
      Admin: player.Admin,
      Arbitre: player.Arbitre,
      bladepoints: player.bladepoints
    })
    setShowForm(true)
  }

  const handleDelete = async (playerId: string): Promise<void> => {
    const playerName = players.find(p => p.player_id === playerId)?.player_name || 'This player'
    
    // Vérifier toutes les références
    const references = await checkPlayerReferences(playerId)
    const totalReferences = Object.values(references).reduce((sum, count) => sum + count, 0)
    
    let deleteMessage = `Are you sure you want to delete ${playerName}? This action cannot be undone.`
    
    if (totalReferences > 0) {
      deleteMessage = `WARNING: This action will PERMANENTLY DELETE:\n\n` +
                     `• The player profile\n`
      
      if (references.matches > 0) deleteMessage += `• ${references.matches} match(es)\n`
      if (references.player_stats > 0) deleteMessage += `• Player statistics\n`
      if (references.points > 0) deleteMessage += `• ${references.points} point record(s)\n`
      if (references.tournament_participants > 0) deleteMessage += `• ${references.tournament_participants} tournament participation(s)\n`
      
      deleteMessage += `\nThis action cannot be undone!\n\nAre you absolutely sure you want to proceed?`
    }

    if (!confirm(deleteMessage)) {
      return
    }

    setDeletingPlayer(playerId)
    
    try {
      // Supprimer toutes les données du joueur
      const deletedCounts = await deleteAllPlayerData(playerId)

      // Finalement supprimer le joueur lui-même
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('player_id', playerId)

      if (error) throw error
      
      // Message de confirmation détaillé
      let successMessage = 'Player deleted successfully.'
      const deletedItems = []
      
      if (deletedCounts.matches > 0) deletedItems.push(`${deletedCounts.matches} match(es)`)
      if (deletedCounts.player_stats > 0) deletedItems.push('player statistics')
      if (deletedCounts.points > 0) deletedItems.push(`${deletedCounts.points} point record(s)`)
      if (deletedCounts.tournament_participants > 0) deletedItems.push(`${deletedCounts.tournament_participants} tournament participation(s)`)
      
      if (deletedItems.length > 0) {
        successMessage += ` Also deleted: ${deletedItems.join(', ')}.`
      }
      
      alert(successMessage)
      await fetchData()
      
    } catch (err: unknown) {
      console.error('Error deleting player:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error deleting player'
      
      if (errorMessage.includes('foreign key constraint')) {
        // Essayer de trouver quelle table pose encore problème
        const remainingRefs = await checkPlayerReferences(playerId)
        const remainingTables = Object.entries(remainingRefs)
          .filter(([_, count]) => count > 0)
          .map(([table]) => table)
          .join(', ')
        
        alert(`Cannot delete player: There are still references in the following tables: ${remainingTables}. Please contact administrator.`)
      } else {
        alert(`Delete failed: ${errorMessage}`)
      }
    } finally {
      setDeletingPlayer(null)
    }
  }

  const handleCheckReferences = async (playerId: string) => {
    const references = await checkPlayerMatches(playerId)
    setMatchReferences(prev => ({
      ...prev,
      [playerId]: references
    }))
  }

  const handleRetry = (): void => {
    setLoading(true)
    fetchData()
  }

  const showCreateForm = (): void => {
    setShowForm(true)
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return 'N/A'
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading players...</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Player Manager</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {players.length} player{players.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={showCreateForm}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Add Player
          </button>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  name="player_name"
                  value={formData.player_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="player_first_name"
                  value={formData.player_first_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="player_last_name"
                  value={formData.player_last_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  name="player_birth_date"
                  value={formData.player_birth_date || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  name="player_region"
                  value={formData.player_region || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bladepoints
                </label>
                <input
                  type="number"
                  name="bladepoints"
                  value={formData.bladepoints || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="Admin"
                    checked={formData.Admin || false}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Administrator</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="Arbitre"
                    checked={formData.Arbitre || false}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Referee</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                {editingPlayer ? 'Update Player' : 'Add Player'}
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

      {players.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No players found</p>
          <button
            onClick={showCreateForm}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Add First Player
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PLAYER INFO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DETAILS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROLES & STATS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player) => {
                  const references = matchReferences[player.player_id] || []
                  
                  return (
                    <tr key={player.player_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {player.player_name || 'Unnamed Player'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {player.player_first_name && player.player_last_name 
                            ? `${player.player_first_name} ${player.player_last_name}`
                            : 'No full name'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Region:</span> {player.player_region || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Birth Date:</span> {formatDate(player.player_birth_date)}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Age:</span> {calculateAge(player.player_birth_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {player.Admin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Admin
                            </span>
                          )}
                          {player.Arbitre && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Referee
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Bladepoints:</span> {player.bladepoints || 0}
                        </div>
                        <div className="text-sm text-gray-500">
                          Joined: {formatDate(player.created_at)}
                        </div>
                        {references.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleCheckReferences(player.player_id)}
                              className="text-xs text-orange-600 hover:text-orange-800 font-semibold"
                            >
                              ⚠️ {references.length} match(es) - WILL BE DELETED
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(player)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(player.player_id)}
                          disabled={deletingPlayer === player.player_id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm"
                        >
                          {deletingPlayer === player.player_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal pour afficher les références */}
      {Object.entries(matchReferences).map(([playerId, references]) => (
        references.length > 0 && (
          <div key={playerId} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                ⚠️ Matches that will be DELETED for {players.find(p => p.player_id === playerId)?.player_name}
              </h3>
              <div className="space-y-2 mb-4">
                {references.map(match => (
                  <div key={match.match_id} className="border-b pb-2">
                    <div className="text-sm">
                      <strong>Tournament:</strong> {match.tournament_name}
                    </div>
                    <div className="text-sm">
                      <strong>Opponent:</strong> {match.opponent_name}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-red-600 mb-4 font-semibold">
                These {references.length} match(es) will be PERMANENTLY DELETED along with the player.
              </p>
              <button
                onClick={() => setMatchReferences(prev => ({ ...prev, [playerId]: [] }))}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )
      ))}
    </div>
  )
}
