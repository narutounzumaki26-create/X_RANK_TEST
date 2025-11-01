// src/app/leaderboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy, Globe, MapPin, Sword, Users } from "lucide-react"
import { CyberPage } from "@/components/layout/CyberPage"
import { MainMenuButton } from "@/components/navigation/MainMenuButton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

type Player = {
  player_id: string
  player_name: string | null
  player_region: string | null
}

type Match = {
  match_id: string
  tournament_id: string | null
  player1_id: string
  player2_id: string
  winner_id: string
}

type Tournament = {
  tournament_id: string
  name: string
  status: string
}

type LeaderboardEntry = {
  player_id: string
  player_name: string
  wins: number
  region: string
}

async function getLeaderboardData(
  players: Player[],
  matches: Match[],
  filter?: {
    tournamentId?: string | null
    region?: string
  }
): Promise<LeaderboardEntry[]> {
  const winsMap = new Map<string, number>()

  const filteredMatches = matches.filter(match => {
    if (filter?.tournamentId !== undefined) {
      return match.tournament_id === filter.tournamentId
    }
    if (filter?.region) {
      const player1 = players.find(p => p.player_id === match.player1_id)
      const player2 = players.find(p => p.player_id === match.player2_id)
      return player1?.player_region === filter.region || player2?.player_region === filter.region
    }
    return true
  })

  filteredMatches.forEach(match => {
    if (match.winner_id) {
      winsMap.set(match.winner_id, (winsMap.get(match.winner_id) || 0) + 1)
    }
  })

  const leaderboard = players.map(player => ({
    player_id: player.player_id,
    player_name: player.player_name ?? "Inconnu",
    wins: winsMap.get(player.player_id) || 0,
    region: player.player_region ?? "Unknown"
  }))

  return leaderboard.filter(entry => entry.wins > 0).sort((a, b) => b.wins - a.wins)
}

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient()

  // Fetch all data
  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("player_id, player_name, player_region")

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("match_id, tournament_id, player1_id, player2_id, winner_id")

  const { data: tournamentsData, error: tournamentsError } = await supabase
    .from("tournaments")
    .select("tournament_id, name, status")

  if (playersError || matchesError || tournamentsError) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">
          ❌ Erreur: {playersError?.message || matchesError?.message || tournamentsError?.message}
        </p>
      </CyberPage>
    )
  }

  // Get regions and tournaments
  const regions = [...new Set(playersData.map(p => p.player_region).filter(Boolean))] as string[]
  const activeTournaments = tournamentsData.filter(t => t.status === "active")

  // Generate all leaderboards in parallel
  const [
    globalLeaderboard,
    officialMatchesLeaderboard,
    regionalLeaderboards,
    tournamentLeaderboards
  ] = await Promise.all([
    getLeaderboardData(playersData as Player[], matchesData as Match[]),
    getLeaderboardData(playersData as Player[], matchesData as Match[], { tournamentId: null }),
    Promise.all(
      regions.map(async (region) => {
        const data = await getLeaderboardData(
          playersData as Player[],
          matchesData as Match[],
          { region }
        )
        return { region, data }
      })
    ),
    Promise.all(
      activeTournaments.map(async (tournament) => {
        const data = await getLeaderboardData(
          playersData as Player[],
          matchesData as Match[],
          { tournamentId: tournament.tournament_id }
        )
        return { tournament, data }
      })
    )
  ])

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//ranking",
        title: "🏆 Multi-Leaderboards",
        subtitle: "Classements par catégorie",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-4xl gap-6"
    >
      {/* Selection Grid - Visual Only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Global */}
        <div className="p-4 rounded-xl border-2 border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(0,255,255,0.35)] scale-105">
          <div className="mb-2 text-cyan-300">
            <Globe className="h-5 w-5" />
          </div>
          <h3 className="font-mono font-bold text-sm mb-1 text-cyan-200">
            Global
          </h3>
          <p className="text-xs text-cyan-100/80">
            Tous les matchs
          </p>
        </div>
        
        {/* Official */}
        <div className="p-4 rounded-xl border-2 border-white/20 bg-white/5">
          <div className="mb-2 text-gray-400">
            <Sword className="h-5 w-5" />
          </div>
          <h3 className="font-mono font-bold text-sm mb-1 text-white">
            Officiels
          </h3>
          <p className="text-xs text-gray-400">
            Hors tournoi
          </p>
        </div>
        
        {/* Regional */}
        <div className="p-4 rounded-xl border-2 border-white/20 bg-white/5">
          <div className="mb-2 text-gray-400">
            <MapPin className="h-5 w-5" />
          </div>
          <h3 className="font-mono font-bold text-sm mb-1 text-white">
            Régional
          </h3>
          <p className="text-xs text-gray-400">
            Par région
          </p>
        </div>
        
        {/* Tournament */}
        <div className="p-4 rounded-xl border-2 border-white/20 bg-white/5">
          <div className="mb-2 text-gray-400">
            <Trophy className="h-5 w-5" />
          </div>
          <h3 className="font-mono font-bold text-sm mb-1 text-white">
            Tournois
          </h3>
          <p className="text-xs text-gray-400">
            Compétitions
          </p>
        </div>
      </div>

      {/* Global Leaderboard */}
      <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
            🌍 Classement Global
          </CardTitle>
          <CardDescription className="text-gray-200/80">
            Tous les matchs confondus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {globalLeaderboard.map((entry, index) => {
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
                </span>
                <span className="text-base text-cyan-200">{entry.wins} victoires</span>
              </div>
            )
          })}
          {globalLeaderboard.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official Matches Leaderboard */}
      <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
            ⚔️ Matchs Officiels
          </CardTitle>
          <CardDescription className="text-gray-200/80">
            Matchs hors tournoi (tournament_id = null)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {officialMatchesLeaderboard.map((entry, index) => {
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
                </span>
                <span className="text-base text-cyan-200">{entry.wins} victoires</span>
              </div>
            )
          })}
          {officialMatchesLeaderboard.length === 0 && (
            <div className="text-center text-gray-400 py-4">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Leaderboards */}
      {regionalLeaderboards.map(({ region, data }) => (
        <Card key={region} className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
              📍 {region}
            </CardTitle>
            <CardDescription className="text-gray-200/80">
              Classement régional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.map((entry, index) => {
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
                  </span>
                  <span className="text-base text-cyan-200">{entry.wins} victoires</span>
                </div>
              )
            })}
            {data.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Tournament Leaderboards */}
      {tournamentLeaderboards.map(({ tournament, data }) => (
        <Card key={tournament.tournament_id} className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
              🏆 {tournament.name}
            </CardTitle>
            <CardDescription className="text-gray-200/80">
              Tournoi actif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.map((entry, index) => {
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
                  </span>
                  <span className="text-base text-cyan-200">{entry.wins} victoires</span>
                </div>
              )
            })}
            {data.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
        datastream :: multi_leaderboard_active
      </p>
    </CyberPage>
  )
}
