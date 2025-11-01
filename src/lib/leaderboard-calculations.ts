// lib/leaderboard-calculations.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export interface LeaderboardEntry {
  player_id: string
  player_name: string
  player_region: string | null
  total_score: number
  wins: number
  total_matches: number
  win_rate: number
}

export async function calculateLeaderboard(options?: {
  region?: string
  tournamentId?: string | null
}): Promise<LeaderboardEntry[]> {
  const supabase = await createSupabaseServerClient()

  // Get all matches with filters
  let matchQuery = supabase
    .from('matches')
    .select(`
      match_id,
      player_id,
      player2_id,
      winner_id,
      tournament_id,
      players!matches_player_id_fkey(
        player_id,
        player_name,
        player_region
      ),
      players!matches_player2_id_fkey(
        player_id,
        player_name,
        player_region
      ),
      tournaments!left(name)
    `)

  // Apply filters
  if (options?.tournamentId !== undefined) {
    if (options.tournamentId === null) {
      matchQuery = matchQuery.is('tournament_id', null)
    } else {
      matchQuery = matchQuery.eq('tournament_id', options.tournamentId)
    }
  }

  const { data: matches, error } = await matchQuery

  if (error) {
    console.error('Error fetching matches:', error)
    throw error
  }

  // Calculate player statistics
  const playerStats = new Map<string, LeaderboardEntry>()

  matches?.forEach(match => {
    const player1 = match.players_matches_player_id_fkey
    const player2 = match.players_matches_player2_id_fkey
    
    if (!player1 || !player2) return

    // Apply regional filter if specified
    if (options?.region) {
      if (player1.player_region !== options.region && player2.player_region !== options.region) {
        return
      }
    }

    // Update player1 stats
    updatePlayerStats(playerStats, player1, match, match.winner_id === player1.player_id)
    
    // Update player2 stats
    updatePlayerStats(playerStats, player2, match, match.winner_id === player2.player_id)
  })

  // Convert to array and calculate win rate
  const leaderboard = Array.from(playerStats.values()).map(entry => ({
    ...entry,
    win_rate: entry.total_matches > 0 ? (entry.wins / entry.total_matches) * 100 : 0
  }))

  // Sort by score (descending)
  leaderboard.sort((a, b) => b.total_score - a.total_score)

  return leaderboard
}

function updatePlayerStats(
  stats: Map<string, LeaderboardEntry>,
  player: any,
  match: any,
  isWinner: boolean
) {
  const existing = stats.get(player.player_id) || {
    player_id: player.player_id,
    player_name: player.player_name || 'Unknown',
    player_region: player.player_region,
    total_score: 0,
    wins: 0,
    total_matches: 0,
    win_rate: 0
  }

  existing.total_matches++

  if (isWinner) {
    existing.wins++
    // Award points for win
    existing.total_score += calculateMatchPoints(match, true)
  } else {
    // Award points for participation/loss
    existing.total_score += calculateMatchPoints(match, false)
  }

  stats.set(player.player_id, existing)
}

function calculateMatchPoints(match: any, isWinner: boolean): number {
  let points = 0

  if (isWinner) {
    points += 100 // Base points for win
    
    // Bonus points for finish types
    const finishes = match.spin_finishes || 0
    const overFinishes = match.over_finishes || 0
    const burstFinishes = match.burst_finishes || 0
    const xtremeFinishes = match.xtreme_finishes || 0

    points += finishes * 10
    points += overFinishes * 15
    points += burstFinishes * 20
    points += xtremeFinishes * 25

    // Bonus for tournament matches
    if (match.tournament_id) {
      points += 50
    }
  } else {
    points += 25 // Participation points
    
    // Points for finishes even if lost
    const finishes = match.spin_finishes2 || 0
    const overFinishes = match.over_finishes2 || 0
    const burstFinishes = match.burst_finishes2 || 0
    const xtremeFinishes = match.xtreme_finishes2 || 0

    points += finishes * 5
    points += overFinishes * 8
    points += burstFinishes * 10
    points += xtremeFinishes * 15
  }

  return points
}
