// src/app/leaderboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy, Globe, MapPin, Sword } from "lucide-react"
import { CyberPage } from "@/components/layout/CyberPage"
import { MainMenuButton } from "@/components/navigation/MainMenuButton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import Link from "next/link"

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

// Selection Window Component with Link
function SelectionWindow({
  icon,
  title,
  description,
  isActive,
  href
}: {
  icon: React.ReactNode
  title: string
  description: string
  isActive: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left group cursor-pointer block ${
        isActive
          ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(0,255,255,0.35)] scale-105"
          : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      }`}
    >
      <div className={`mb-2 transition-colors ${
        isActive ? "text-cyan-300" : "text-gray-400 group-hover:text-white"
      }`}>
        {icon}
      </div>
      <h3 className={`font-mono font-bold text-sm mb-1 transition-colors ${
        isActive ? "text-cyan-200" : "text-white group-hover:text-cyan-100"
      }`}>
        {title}
      </h3>
      <p className={`text-xs transition-colors ${
        isActive ? "text-cyan-100/80" : "text-gray-400 group-hover:text-gray-300"
      }`}>
        {description}
      </p>
    </Link>
  )
}

// Leaderboard Row Component
function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
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
      className={`flex items-center justify-between rounded-2xl px-5 py-4 font-mono text-white transition hover:-translate-y-1 ${bgColor}`}
    >
      <span className="flex items-center text-sm font-semibold tracking-wide">
        {trophyIcon}
        {index + 1}. {entry.player_name}
      </span>
      <span className="text-base text-cyan-200">{entry.wins} victoires</span>
    </div>
  )
}

// Leaderboard Card Component
function LeaderboardCard({ 
  title, 
  description, 
  data 
}: { 
  title: string
  description: string
  data: LeaderboardEntry[]
}) {
  return (
    <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
          {title}
        </CardTitle>
        <CardDescription className="text-gray-200/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((entry, index) => (
          <LeaderboardRow key={entry.player_id} entry={entry} index={index} />
        ))}
        {data.length === 0 && (
          <div className="text-center text-gray-400 py-4">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createSupabaseServerClient()

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

  // Get URL params to determine active view
  const view = searchParams.view as string || "global"
  const region = searchParams.region as string
  const tournament = searchParams.tournament as string

  // Get all data upfront
  const regions = [...new Set(playersData.map(p => p.player_region).filter(Boolean))] as string[]
  const activeTournaments = tournamentsData.filter(t => t.status === "active")

  let currentData: LeaderboardEntry[] = []
  let currentTitle = ""
  let currentDescription = ""

  // Determine which data to show based on URL params
  switch (view) {
    case "global":
      currentData = await getLeaderboardData(playersData as Player[], matchesData as Match[])
      currentTitle = "🌍 Classement Global"
      currentDescription = "Tous les matchs confondus"
      break
    
    case "official":
      currentData = await getLeaderboardData(
        playersData as Player[], 
        matchesData as Match[], 
        { tournamentId: null }
      )
      currentTitle = "⚔️ Matchs Officiels"
      currentDescription = "Matchs hors tournoi (tournament_id = null)"
      break
    
    case "regional":
      if (region) {
        currentData = await getLeaderboardData(
          playersData as Player[], 
          matchesData as Match[], 
          { region }
        )
        currentTitle = `📍 ${region}`
        currentDescription = "Classement régional"
      }
      break
    
    case "tournament":
      if (tournament) {
        currentData = await getLeaderboardData(
          playersData as Player[], 
          matchesData as Match[], 
          { tournamentId: tournament }
        )
        const tournamentInfo = tournamentsData.find(t => t.tournament_id === tournament)
        currentTitle = `🏆 ${tournamentInfo?.name || "Tournoi"}`
        currentDescription = "Classement du tournoi"
      }
      break
  }

  // Fallback if no data for the selected view
  if (currentData.length === 0 && (view === "regional" || view === "tournament")) {
    currentData = await getLeaderboardData(playersData as Player[], matchesData as Match[])
    currentTitle = "🌍 Classement Global"
    currentDescription = "Aucune donnée disponible pour la sélection, affichage du classement global"
  }

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//ranking",
        title: "🏆 Multi-Leaderboards",
        subtitle: "Sélectionnez une catégorie",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-4xl gap-6"
    >
      {/* Selection Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SelectionWindow
          icon={<Globe className="h-5 w-5" />}
          title="Global"
          description="Tous les matchs"
          isActive={view === "global"}
          href="/leaderboard?view=global"
        />
        
        <SelectionWindow
          icon={<Sword className="h-5 w-5" />}
          title="Officiels"
          description="Hors tournoi"
          isActive={view === "official"}
          href="/leaderboard?view=official"
        />
        
        <SelectionWindow
          icon={<MapPin className="h-5 w-5" />}
          title="Régional"
          description="Par région"
          isActive={view === "regional"}
          href="/leaderboard?view=regional"
        />
        
        <SelectionWindow
          icon={<Trophy className="h-5 w-5" />}
          title="Tournois"
          description="Compétitions"
          isActive={view === "tournament"}
          href="/leaderboard?view=tournament"
        />
      </div>

      {/* Sub-selection for Regional and Tournament */}
      {(view === "regional" || view === "tournament") && (
        <div className="flex flex-wrap gap-3 mb-6">
          {view === "regional" && regions.map(regionItem => (
            <Link
              key={regionItem}
              href={`/leaderboard?view=regional&region=${encodeURIComponent(regionItem)}`}
              className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                region === regionItem
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                  : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
              }`}
            >
              {regionItem}
            </Link>
          ))}
          
          {view === "tournament" && activeTournaments.map(tournamentItem => (
            <Link
              key={tournamentItem.tournament_id}
              href={`/leaderboard?view=tournament&tournament=${tournamentItem.tournament_id}`}
              className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                tournament === tournamentItem.tournament_id
                  ? "bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(192,132,252,0.3)]"
                  : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
              }`}
            >
              {tournamentItem.name}
            </Link>
          ))}
        </div>
      )}

      {/* Main Leaderboard Display */}
      <LeaderboardCard
        title={currentTitle}
        description={currentDescription}
        data={currentData}
      />

      <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
        datastream :: {view}_leaderboard_active
      </p>
    </CyberPage>
  )
}
