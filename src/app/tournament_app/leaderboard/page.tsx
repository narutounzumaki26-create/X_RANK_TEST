// src/app/tournament_app/leaderboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy, Globe, MapPin, Award } from "lucide-react"
import { CyberPage } from "@/components/layout/CyberPage"
import { MainMenuButton } from "@/components/navigation/MainMenuButton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

// Basic type definitions
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

// Type guard to check if an object has the required player properties
function isValidPlayer(player: unknown): player is Player {
  return (
    typeof player === 'object' &&
    player !== null &&
    'player_id' in player &&
    'player_name' in player
  )
}

// Leaderboard calculation function
async function calculateLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
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
      spin_finishes,
      over_finishes,
      burst_finishes,
      xtreme_finishes,
      spin_finishes2,
      over_finishes2,
      burst_finishes2,
      xtreme_finishes2,
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

  matches?.forEach((match) => {
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
  match: any, // Use any here for flexibility with Supabase response
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

// Helper functions to get regions and tournaments
async function getRegions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('players')
    .select('player_region')
    .not('player_region', 'is', null)
    .not('player_region', 'eq', '')
  
  const regions = [...new Set(data?.map(item => item.player_region) || [])]
  return regions as string[]
}

async function getTournaments(): Promise<Array<{tournament_id: string, name: string, date: string}>> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('tournaments')
    .select('tournament_id, name, date')
    .order('date', { ascending: false })
  
  return data || []
}

// Leaderboard Section Component
function LeaderboardSection({ 
  title, 
  subtitle, 
  icon: Icon,
  data,
  emptyMessage = "Aucune donnée disponible"
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  data: LeaderboardEntry[]
  emptyMessage?: string
}) {
  return (
    <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)] flex items-center justify-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-gray-200/80">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length > 0 ? data.map((entry, index) => {
          let bgColor = "bg-white/5 border border-white/15"
          let trophyIcon = null

          if (index === 0) {
            bgColor = "bg-yellow-400/15 border border-yellow-400/70 shadow-[0_0_18px_rgba(255,215,0,0.45)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-yellow-300" />
          } else if (index === 1) {
            bgColor = "bg-gray-300/10 border border-gray-300/60 shadow-[0_0_18px_rgba(192,192,192,0.35)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-gray-200" />
          } else if (index === 2) {
            bgColor = "bg-orange-400/15 border border-orange-400/70 shadow-[0_0_18px_rgba(255,140,0,0.35)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-orange-300" />
          }

          return (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between rounded-2xl px-5 py-4 font-mono text-white transition hover:-translate-y-1 ${bgColor}`}
            >
              <span className="flex items-center text-sm font-semibold tracking-wide">
                {trophyIcon}
                {index + 1}. {entry.player_name}
                {entry.player_region && (
                  <span className="ml-2 text-xs text-gray-400">[{entry.player_region}]</span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">
                  {entry.wins}W/{entry.total_matches}M ({(entry.win_rate).toFixed(1)}%)
                </span>
                <span className="text-base text-cyan-200">{entry.total_score}</span>
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-8 text-gray-400">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function LeaderboardPage() {
  try {
    // Load all leaderboards in parallel
    const [globalLeaderboard, regions, tournaments] = await Promise.all([
      calculateLeaderboard(), // Global leaderboard
      getRegions(),
      getTournaments()
    ])

    // Load regional leaderboards
    const regionalLeaderboards = await Promise.all(
      regions.map(region => calculateLeaderboard({ region }))
    )

    // Load tournament leaderboards
    const tournamentLeaderboards = await Promise.all(
      tournaments.map(tournament => calculateLeaderboard({ tournamentId: tournament.tournament_id }))
    )

    // Load official matches leaderboard
    const officialMatchesLeaderboard = await calculateLeaderboard({ tournamentId: null })

    return (
      <CyberPage
        header={{
          eyebrow: "datastream//multi_ranking",
          title: "🏆 Multi-Leaderboards",
          subtitle: "Classements par région, tournois et matchs officiels",
          actions: <MainMenuButton />,
        }}
        contentClassName="mx-auto w-full max-w-6xl gap-8"
      >
        {/* Global Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Classement Global
          </h2>
          <LeaderboardSection
            title="Champions Mondiaux"
            subtitle="Les meilleurs joueurs toutes régions et tournois confondus"
            icon={Globe}
            data={globalLeaderboard.slice(0, 10)}
          />
        </div>

        {/* Regional Leaderboards */}
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Classements Régionaux
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regionalLeaderboards.map((leaderboard, index) => {
              const region = regions[index]
              if (!leaderboard.length) return null
              
              return (
                <LeaderboardSection
                  key={region}
                  title={`Champions ${region}`}
                  subtitle={`Top joueurs de la région ${region}`}
                  icon={MapPin}
                  data={leaderboard.slice(0, 5)}
                  emptyMessage={`Aucun match enregistré pour ${region}`}
                />
              )
            })}
          </div>
        </div>

        {/* Tournament Leaderboards */}
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
            <Award className="h-6 w-6" />
            Classements Tournois
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournamentLeaderboards.map((leaderboard, index) => {
              const tournament = tournaments[index]
              if (!leaderboard.length) return null
              
              return (
                <LeaderboardSection
                  key={tournament.tournament_id}
                  title={tournament.name}
                  subtitle={`Tournoi du ${new Date(tournament.date).toLocaleDateString('fr-FR')}`}
                  icon={Award}
                  data={leaderboard.slice(0, 5)}
                  emptyMessage={`Aucun match pour ${tournament.name}`}
                />
              )
            })}
          </div>
        </div>

        {/* Official Matches Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Matchs Officiels
          </h2>
          <LeaderboardSection
            title="Ligue Principale"
            subtitle="Classement des matchs officiels (hors tournois)"
            icon={Trophy}
            data={officialMatchesLeaderboard.slice(0, 10)}
            emptyMessage="Aucun match officiel enregistré"
          />
        </div>

        <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
          datastream :: multi_leaderboard_active
        </p>
      </CyberPage>
    )
  } catch (error) {
    console.error('Error loading leaderboard page:', error)
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">❌ Erreur lors du chargement du leaderboard</p>
      </CyberPage>
    )
  }
}
