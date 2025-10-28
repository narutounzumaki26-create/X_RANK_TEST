// components/MatchManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  player_name?: string
}

export default function MatchManager() {
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (): Promise<void> => {
    try {
      setError(null)

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('rounds', { ascending: false })

      if (matchesError) {
        console.error('Matches error:', matchesError)
        throw new Error(`Failed to load matches: ${matchesError.message}`)
      }

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_id, player_name')

      if (playersError) {
        console.warn('Players error:', playersError)
      }

      setMatches(matchesData || [])
      setPlayers(playersData || [])

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
    if (!playerId) return 'N/A'
    const player = players.find(p => p.player_id === playerId)
    return player?.player_name || `Player (${playerId.slice(0, 8)}...)`
  }

  const getTournamentType = (tournamentId: string | undefined): string => {
    return tournamentId ? `Tournament` : 'Match Officiel'
  }

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

      if (error) {
        console.error('Supabase delete error:', error)
        throw new Error(`Delete failed: ${error.message}`)
      }

      // Update local state
      setMatches(prev => prev.filter(match => match.match_id !== matchId))
      alert('Match deleted successfully')
      
    } catch (err: unknown) {
      console.error('Error deleting match:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error deleting match'
      
      // Show detailed error message
      alert(`Failed to delete match: ${errorMessage}\n\nCheck if RLS policies are configured correctly.`)
    } finally {
      setDeleting(null)
    }
  }

  const handleRetry = (): void => {
    setLoading(true)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading matches...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-4">
            <button
              onClick={handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Try Again
            </button>
            <div className="text-sm text-red-500">
              <p className="font-semibold">Troubleshooting steps:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Check Supabase RLS policies</li>
                <li>Verify table permissions</li>
                <li>Check browser console for detailed errors</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Match Manager</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {matches.length} match{matches.length !== 1 ? 'es' : ''} found
          </div>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No matches found in database</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Refresh Data
          </button>
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
                    Winner / Loser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match) => (
                  <tr key={match.match_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        match.tournament_id ? 'text-purple-600' : 'text-green-600'
                      }`}>
                        {getTournamentType(match.tournament_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-600">
                        <span className="font-medium">Winner:</span> {getPlayerName(match.winner_id)}
                      </div>
                      <div className="text-sm text-red-600">
                        <span className="font-medium">Loser:</span> {getPlayerName(match.loser_id)}
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
