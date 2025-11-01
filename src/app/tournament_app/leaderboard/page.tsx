// src/app/leaderboard/page.tsx
"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"
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

type LeaderboardType = "global" | "official" | "regional" | "tournament"

// Selection Window Component
function SelectionWindow({
  icon,
  title,
  description,
  isActive,
  onClick
}: {
  icon: React.ReactNode
  title: string
  description: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left group cursor-pointer ${
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
    </button>
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
          <div className="text-center text-gray-400 py-8">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function LeaderboardPage() {
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>("global")
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [selectedTournament, setSelectedTournament] = useState<string>("")
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createSupabaseBrowserClient()
        
        // Fetch all data in parallel
        const [playersResponse, matchesResponse, tournamentsResponse] = await Promise.all([
          supabase.from("players").select("player_id, player_name, player_region"),
          supabase.from("matches").select("match_id, tournament_id, player1_id, player2_id, winner_id"),
          supabase.from("tournaments").select("tournament_id, name, status")
        ])

        if (playersResponse.error) throw new Error(playersResponse.error.message)
        if (matchesResponse.error) throw new Error(matchesResponse.error.message)
        if (tournamentsResponse.error) throw new Error(tournamentsResponse.error.message)

        setPlayers(playersResponse.data || [])
        setMatches(matchesResponse.data || [])
        setTournaments(tournamentsResponse.data || [])

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate leaderboard data
  function getLeaderboardData(
    filter?: {
      tournamentId?: string | null
      region?: string
    }
  ): LeaderboardEntry[] {
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

  // Get regions and active tournaments
  const regions = [...new Set(players.map(p => p.player_region).filter(Boolean))] as string[]
  const activeTournaments = tournaments.filter(t => t.status === "active")

  // Auto-select first region/tournament when switching to those views
  useEffect(() => {
    if (activeBoard === "regional" && !selectedRegion && regions.length > 0) {
      setSelectedRegion(regions[0])
    }
    if (activeBoard === "tournament" && !selectedTournament && activeTournaments.length > 0) {
      setSelectedTournament(activeTournaments[0].tournament_id)
    }
  }, [activeBoard, selectedRegion, selectedTournament, regions, activeTournaments])

  // Get current data based on active board
  let currentData: LeaderboardEntry[] = []
  let currentTitle = ""
  let currentDescription = ""

  switch (activeBoard) {
    case "global":
      currentData = getLeaderboardData()
      currentTitle = "🌍 Classement Global"
      currentDescription = "Tous les matchs confondus"
      break
    
    case "official":
      currentData = getLeaderboardData({ tournamentId: null })
      currentTitle = "⚔️ Matchs Officiels"
      currentDescription = "Matchs hors tournoi (tournament_id = null)"
      break
    
    case "regional":
      if (selectedRegion) {
        currentData = getLeaderboardData({ region: selectedRegion })
        currentTitle = `📍 ${selectedRegion}`
        currentDescription = "Classement régional"
      } else {
        currentData = []
        currentTitle = "📍 Sélectionnez une région"
        currentDescription = "Choisissez une région dans la liste ci-dessous"
      }
      break
    
    case "tournament":
      if (selectedTournament) {
        currentData = getLeaderboardData({ tournamentId: selectedTournament })
        const tournamentInfo = tournaments.find(t => t.tournament_id === selectedTournament)
        currentTitle = `🏆 ${tournamentInfo?.name || "Tournoi"}`
        currentDescription = "Classement du tournoi"
      } else {
        currentData = []
        currentTitle = "🏆 Sélectionnez un tournoi"
        currentDescription = "Choisissez un tournoi dans la liste ci-dessous"
      }
      break
  }

  if (loading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <div className="text-center text-cyan-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Chargement des données...</p>
        </div>
      </CyberPage>
    )
  }

  if (error) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">❌ Erreur: {error}</p>
      </CyberPage>
    )
  }

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//ranking",
        title: "🏆 Multi-Leaderboards",
        subtitle: "Sélectionnez une catégorie pour afficher le classement",
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
          isActive={activeBoard === "global"}
          onClick={() => setActiveBoard("global")}
        />
        
        <SelectionWindow
          icon={<Sword className="h-5 w-5" />}
          title="Officiels"
          description="Hors tournoi"
          isActive={activeBoard === "official"}
          onClick={() => setActiveBoard("official")}
        />
        
        <SelectionWindow
          icon={<MapPin className="h-5 w-5" />}
          title="Régional"
          description="Par région"
          isActive={activeBoard === "regional"}
          onClick={() => setActiveBoard("regional")}
        />
        
        <SelectionWindow
          icon={<Trophy className="h-5 w-5" />}
          title="Tournois"
          description="Compétitions"
          isActive={activeBoard === "tournament"}
          onClick={() => setActiveBoard("tournament")}
        />
      </div>

      {/* Sub-selection for Regional and Tournament */}
      {(activeBoard === "regional" || activeBoard === "tournament") && (
        <div className="flex flex-wrap gap-3 mb-6">
          {activeBoard === "regional" && regions.map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                selectedRegion === region
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                  : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
              }`}
            >
              {region}
            </button>
          ))}
          
          {activeBoard === "tournament" && activeTournaments.map(tournament => (
            <button
              key={tournament.tournament_id}
              onClick={() => setSelectedTournament(tournament.tournament_id)}
              className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                selectedTournament === tournament.tournament_id
                  ? "bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(192,132,252,0.3)]"
                  : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
              }`}
            >
              {tournament.name}
            </button>
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
        active_board: {activeBoard} | entries: {currentData.length}
      </p>
    </CyberPage>
  )
}
