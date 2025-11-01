// lib/leaderboard-calculations.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer"

// Type definitions based on your actual database schema
interface Player {
  player_id: string
  player_name: string | null
  player_region: string | null
}

interface LeaderboardEntry {
  player_id: string
  player_name: string
  player_region: string | null
  total_score: number
  wins: number
  total_matches: number
  win_rate: number
}

interface LeaderboardOptions {
  region?: string
  tournamentId?: string | null
}

// Define the match structure based on your actual database columns
interface MatchData {
  match_id: string
  player_id: string
  player2_id: string
  winner_id: string
  tournament_id: string | null
  rounds: number
  created_by: string | null
  loser_id: string | null
  match_logs: string | null
  spin_finished: number | null
  over_finished: number | null
  burst_finished: number | null
  xtreme_finished: number | null
  spin_finished2: number | null
  over_finished2: number | null
  burst_finished2: number | null
  xtreme_finished2: number | null
  Data_Creation: string | null
  players_matches_player_id_fkey?: Player[] | Player
  players_matches_player2_id_fkey?: Player[] | Player
}

// Type guard to check if an object has the required player properties
function isValidPlayer(player: unknown): player is Player {
  return (
    typeof player === 'object' &&
    player !== null &&
    'player_id' in player &&
    'player_name' in player
  )
}

export async function calculateLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
  const supabase = await createSupabaseServerClient()

  // Get all matches with filters - using correct column names from your database
  let matchQuery = supabase
    .from('matches')
    .select(`
      match_id,
      player_id,
      player2_id,
      winner_id,
      tournament_id,
      rounds,
      created_by,
      loser_id,
      match_logs,
      spin_finished,
      over_finished,
      burst_finished,
      xtreme_finished,
      spin_finished2,
      over_finished2,
      burst_finished2,
      xtreme_finished2,
      Data_Creation,
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
      tournaments!left(name, date)
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

  matches?.forEach((match: MatchData) => {
    // Safely extract players from the match data
    const player1 = Array.isArray(match.players_matches_player_id_fkey) 
      ? match.players_matches_player_id_fkey[0]
      : match.players_matches_player_id_fkey
    
    const player2 = Array.isArray(match.players_matches_player2_id_fkey)
      ? match.players_matches_player2_id_fkey[0]
      : match.players_matches_player2_id_fkey

    // Validate players
    if (!isValidPlayer(player1) || !isValidPlayer(player2)) {
      console.warn('Invalid player data in match:', match.match_id)
      return
    }

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
  player: Player,
  match: MatchData,
  isWinner: boolean
): void {
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

function calculateMatchPoints(match: MatchData, isWinner: boolean): number {
  let points = 0

  if (isWinner) {
    points += 100 // Base points for win
    
    // Bonus points for finish types - using correct column names
    const finishes = match.spin_finished || 0
    const overFinishes = match.over_finished || 0
    const burstFinishes = match.burst_finished || 0
    const xtremeFinishes = match.xtreme_finished || 0

    points += finishes * 10
    points += overFinishes * 15
    points += burstFinishes * 20
    points += xtremeFinishes * 25

    // Bonus for tournament matches
    if (match.tournament_id) {
      points += 50
    }

    // Bonus for more rounds (longer matches are harder)
    points += match.rounds * 2

  } else {
    points += 25 // Participation points
    
    // Points for finishes even if lost - using correct column names
    const finishes = match.spin_finished2 || 0
    const overFinishes = match.over_finished2 || 0
    const burstFinishes = match.burst_finished2 || 0
    const xtremeFinishes = match.xtreme_finished2 || 0

    points += finishes * 5
    points += overFinishes * 8
    points += burstFinishes * 10
    points += xtremeFinishes * 15

    // Small bonus for rounds even when losing
    points += match.rounds * 1
  }

  return points
}

// Get available regions
export async function getRegions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('players')
    .select('player_region')
    .not('player_region', 'is', null)
    .not('player_region', 'eq', '')

  if (error) {
    console.error('Error fetching regions:', error)
    return []
  }

  const regions = [...new Set(data.map(item => item.player_region))].filter(Boolean)
  return regions as string[]
}

// Get tournaments for filter
export async function getTournaments(): Promise<Array<{
  tournament_id: string | null
  name: string
}>> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('tournament_id, name')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching tournaments:', error)
    return []
  }

  // Add "Official Matches" option for null tournament_id
  return [
    { tournament_id: null, name: 'Official Matches' },
    ...(data || [])
  ]
}
