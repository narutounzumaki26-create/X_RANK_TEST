'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
// Types defined directly in the component file
interface Match {
  match_id: string
  tournament_id?: string
  player1_id?: string
  player2_id?: string
  winner_id?: string
  loser_id?: string
  rounds: number
  created_by?: string
  match_logs?: string
  spin_finishes?: number
  over_finishes?: number
  burst_finishes?: number
  xtreme_finishes?: number
  spin_finishes2?: number
  over_finishes2?: number
  burst_finishes2?: number
  xtreme_finishes2?: number
}

interface Player {
  player_id: string
  name: string
}

interface Tournament {
  tournament_id: string
  name: string
}

export default function MatchManager() {
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch all data
  const fetchData = async (): Promise<void> => {
    try {
      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('rounds', { ascending: false })

      if (matchesError) throw matchesError

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_id, name')

      if (playersError) throw playersError

      // Fetch tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('tournament_id, name')

      if (tournamentsError) throw tournamentsError

      setMatches(matchesData || [])
      setPlayers(playersData || [])
      setTournaments(tournamentsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error loading data')
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
    return player ? player.name : `Unknown (${playerId.slice(0, 8)}...)`
  }

  // Get tournament name by ID
  const getTournamentType = (tournamentId: string | undefined): string => {
    if (!tournamentId) return 'Match Officiel'
    const tournament = tournaments.find(t => t.tournament_id === tournamentId)
    return tournament ? tournament.name : `Tournament (${tournamentId.slice(0, 8)}...)`
  }

  // Delete match function
  const handleDeleteMatch = async (matchId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }

    setDeleting(matchId)
    
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('match_id', matchId)

      if (error) throw error

      // Remove from local state
      setMatches(matches.filter((match: Match) => match.match_id !== matchId))
      alert('Match deleted successfully')
    } catch (error) {
      console.error('Error deleting match:', error)
      alert('Error deleting match')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading matches...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Match Manager</h1>
        <div className="text-sm text-gray-500">
          {matches.length} match{matches.length !== 1 ? 'es' : ''} found
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No matches found</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rounds
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Finishes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match: Match) => (
                  <tr key={match.match_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        match.tournament_id ? 'text-purple-600' : 'text-green-600'
                      }`}>
                        {getTournamentType(match.tournament_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Player 1:</span> {getPlayerName(match.player1_id)}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Player 2:</span> {getPlayerName(match.player2_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {match.rounds} rounds
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {match.winner_id ? getPlayerName(match.winner_id) : 'No winner'}
                      </div>
                      {match.loser_id && (
                        <div className="text-sm text-red-600">
                          Loser: {getPlayerName(match.loser_id)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Spin:</span> {match.spin_finishes || 0}/{match.spin_finishes2 || 0}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Over:</span> {match.over_finishes || 0}/{match.over_finishes2 || 0}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Burst:</span> {match.burst_finishes || 0}/{match.burst_finishes2 || 0}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Xtreme:</span> {match.xtreme_finishes || 0}/{match.xtreme_finishes2 || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteMatch(match.match_id)}
                        disabled={deleting === match.match_id}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        {deleting === match.match_id ? 'Deleting...' : 'Delete'}
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
