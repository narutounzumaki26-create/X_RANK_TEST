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

async function calculateLeaderboard(region?: string, tournamentId?: string | null) {
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('matches')
    .select(`
      match_id,
      player1_id,
      player2_id,
      winner_id,
      tournament_id,
      rounds,
      spin_finished,
      over_finished,
      burst_finished,
      xtreme_finished,
      spin_finished2,
      over_finished2,
      burst_finished2,
      xtreme_finished2,
      player1:players!matches_player1_id_fkey(player_id, player_name, player_region),
      player2:players!matches_player2_id_fkey(player_id, player_name, player_region)
    `)

  if (tournamentId !== undefined) {
    if (tournamentId === null) {
      query = query.is('tournament_id', null)
    } else {
      query = query.eq('tournament_id', tournamentId)
    }
  }

  const { data: matches, error } = await query
  if (error) throw error

  const playerStats = new Map()

  matches?.forEach(match => {
    const player1 = match.player1?.[0] || match.player1
    const player2 = match.player2?.[0] || match.player2

    if (!player1 || !player2) return

    if (region && player1.player_region !== region && player2.player_region !== region) {
      return
    }

    updatePlayerStats(playerStats, player1, match, match.winner_id === player1.player_id)
    updatePlayerStats(playerStats, player2, match, match.winner_id === player2.player_id)
  })

  const leaderboard = Array.from(playerStats.values()).map(entry => ({
    ...entry,
    win_rate: entry.total_matches > 0 ? (entry.wins / entry.total_matches) * 100 : 0
  }))

  leaderboard.sort((a, b) => b.total_score - a.total_score)
  return leaderboard
}

function updatePlayerStats(stats, player, match, isWinner) {
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
    existing.total_score += 100
    existing.total_score += (match.spin_finished || 0) * 10
    existing.total_score += (match.over_finished || 0) * 15
    existing.total_score += (match.burst_finished || 0) * 20
    existing.total_score += (match.xtreme_finished || 0) * 25
    if (match.tournament_id) existing.total_score += 50
    existing.total_score += (match.rounds || 0) * 2
  } else {
    existing.total_score += 25
    existing.total_score += (match.spin_finished2 || 0) * 5
    existing.total_score += (match.over_finished2 || 0) * 8
    existing.total_score += (match.burst_finished2 || 0) * 10
    existing.total_score += (match.xtreme_finished2 || 0) * 15
    existing.total_score += (match.rounds || 0) * 1
  }

  stats.set(player.player_id, existing)
}

async function getRegions() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('players')
    .select('player_region')
    .not('player_region', 'is', null)
    .not('player_region', 'eq', '')
  
  const regions = [...new Set(data?.map(item => item.player_region) || [])]
  return regions
}

async function getTournaments() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('tournaments')
    .select('tournament_id, name, date')
    .order('date', { ascending: false })
  
  return data || []
}

function LeaderboardSection({ title, subtitle, icon: Icon, data, emptyMessage = "Aucune donnée disponible" }) {
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
    const [globalLeaderboard, regions, tournaments] = await Promise.all([
      calculateLeaderboard(),
      getRegions(),
      getTournaments()
    ])

    const regionalLeaderboards = await Promise.all(
      regions.map(region => calculateLeaderboard(region))
    )

    const tournamentLeaderboards = await Promise.all(
      tournaments.map(tournament => calculateLeaderboard(undefined, tournament.tournament_id))
    )

    const officialMatchesLeaderboard = await calculateLeaderboard(undefined, null)

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
