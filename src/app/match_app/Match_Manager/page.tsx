// components/MatchManager.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
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

export default function MatchManager() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch all matches
  const fetchMatches = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('rounds', { ascending: false })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
      alert('Error loading matches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

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
                    Match ID
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
                      <div className="text-sm font-medium text-gray-900">
                        {match.match_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Player 1: {match.player1_id ? match.player1_id.slice(0, 8) + '...' : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-900">
                        Player 2: {match.player2_id ? match.player2_id.slice(0, 8) + '...' : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {match.rounds} rounds
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {match.winner_id ? match.winner_id.slice(0, 8) + '...' : 'No winner'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Spin: {match.spin_finishes || 0}/{match.spin_finishes2 || 0}
                      </div>
                      <div className="text-sm text-gray-900">
                        Over: {match.over_finishes || 0}/{match.over_finishes2 || 0}
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
