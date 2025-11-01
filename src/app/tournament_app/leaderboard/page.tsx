// src/app/leaderboard/page.tsx
"use client"

import { useState } from "react"
import { Trophy, Users, Globe, MapPin, Sword } from "lucide-react"
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
  rounds: number
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

// Mock data - replace with your actual data fetching
const mockPlayers: Player[] = [
  { player_id: "1", player_name: "Neo", player_region: "Matrix" },
  { player_id: "2", player_name: "Trinity", player_region: "Matrix" },
  { player_id: "3", player_name: "Morpheus", player_region: "Zion" },
  { player_id: "4", player_name: "Cypher", player_region: "Matrix" },
  { player_id: "5", player_name: "Tank", player_region: "Zion" },
]

const mockMatches: Match[] = [
  { match_id: "1", tournament_id: null, player1_id: "1", player2_id: "2", winner_id: "1", rounds: 3 },
  { match_id: "2", tournament_id: "1", player1_id: "1", player2_id: "3", winner_id: "1", rounds: 5 },
  { match_id: "3", tournament_id: "1", player1_id: "2", player2_id: "4", winner_id: "2", rounds: 4 },
  { match_id: "4", tournament_id: null, player1_id: "3", player2_id: "5", winner_id: "3", rounds: 6 },
]

const mockTournaments: Tournament[] = [
  { tournament_id: "1", name: "Cyber Championship", status: "active" },
  { tournament_id: "2", name: "Neo Tournament", status: "completed" },
]

type LeaderboardType = "global" | "official" | "regional" | "tournament"

export default function LeaderboardPage() {
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>("global")
  const [selectedRegion, setSelectedRegion] = useState<string>("Matrix")
  const [selectedTournament, setSelectedTournament] = useState<string>("1")

  const getLeaderboardData = (
    players: Player[],
    matches: Match[],
    filter?: {
      tournamentId?: string | null
      region?: string
    }
  ): LeaderboardEntry[] => {
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

  const regions = [...new Set(mockPlayers.map(p => p.player_region).filter(Boolean))] as string[]
  const activeTournaments = mockTournaments.filter(t => t.status === "active")

  let currentData: LeaderboardEntry[] = []
  let currentTitle = ""
  let currentDescription = ""

  switch (activeBoard) {
    case "global":
      currentData = getLeaderboardData(mockPlayers, mockMatches)
      currentTitle = "🌍 Classement Global"
      currentDescription = "Tous les matchs confondus"
      break
    case "official":
      currentData = getLeaderboardData(mockPlayers, mockMatches, { tournamentId: null })
      currentTitle = "⚔️ Matchs Officiels"
      currentDescription = "Matchs hors tournoi"
      break
    case "regional":
      currentData = getLeaderboardData(mockPlayers, mockMatches, { region: selectedRegion })
      currentTitle = `📍 ${selectedRegion}`
      currentDescription = `Classement régional`
      break
    case "tournament":
      const tournament = mockTournaments.find(t => t.tournament_id === selectedTournament)
      currentData = getLeaderboardData(mockPlayers, mockMatches, { tournamentId: selectedTournament })
      currentTitle = `🏆 ${tournament?.name || "Tournoi"}`
      currentDescription = `Classement du tournoi`
      break
  }

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//ranking",
        title: "🏆 Multi-Leaderboards",
        subtitle: "Sélectionnez une catégorie pour afficher le classement",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-6xl gap-6"
    >
      {/* Selection Windows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SelectionWindow
          icon={<Globe className="h-6 w-6" />}
          title="Global"
          description="Tous les matchs"
          isActive={activeBoard === "global"}
          onClick={() => setActiveBoard("global")}
        />
        
        <SelectionWindow
          icon={<Sword className="h-6 w-6" />}
          title="Officiels"
          description="Hors tournoi"
          isActive={activeBoard === "official"}
          onClick={() => setActiveBoard("official")}
        />
        
        <SelectionWindow
          icon={<MapPin className="h-6 w-6" />}
          title="Régional"
          description="Par région"
          isActive={activeBoard === "regional"}
          onClick={() => setActiveBoard("regional")}
        />
        
        <SelectionWindow
          icon={<Trophy className="h-6 w-6" />}
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
      <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
            {currentTitle}
          </CardTitle>
          <CardDescription className="text-gray-200/80">
            {currentDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentData.map((entry, index) => (
            <LeaderboardRow key={entry.player_id} entry={entry} index={index} />
          ))}
          {currentData.length === 0 && (
            <div className="text-center text-gray-400 py-8 font-mono">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Aucune donnée disponible pour cette catégorie
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
        active_board: {activeBoard} | entries: {currentData.length}
      </p>
    </CyberPage>
  )
}

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
      <div className={`mb-3 transition-colors ${
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
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
        </div>
      )}
    </button>
  )
}

// Leaderboard Row Component
function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  let bgColor = "bg-white/5 border border-white/15"
  let trophyIcon = null
  let rankColor = "text-gray-300"

  if (index === 0) {
    bgColor = "bg-yellow-400/15 border border-yellow-400/70 shadow-[0_0_18px_rgba(255,215,0,0.45)]"
    trophyIcon = <Trophy className="mr-2 h-5 w-5 text-yellow-300" />
    rankColor = "text-yellow-300"
  } else if (index === 1) {
    bgColor = "bg-gray-300/10 border border-gray-300/60 shadow-[0_0_18px_rgba(192,192,192,0.35)]"
    trophyIcon = <Trophy className="mr-2 h-5 w-5 text-gray-200" />
    rankColor = "text-gray-200"
  } else if (index === 2) {
    bgColor = "bg-orange-400/15 border border-orange-400/70 shadow-[0_0_18px_rgba(255,140,0,0.35)]"
    trophyIcon = <Trophy className="mr-2 h-5 w-5 text-orange-300" />
    rankColor = "text-orange-300"
  }

  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-5 py-4 font-mono text-white transition-all duration-300 hover:-translate-y-1 ${bgColor}`}
    >
      <div className="flex items-center space-x-4">
        <span className={`text-sm font-bold w-6 text-center ${rankColor}`}>
          {index + 1}
        </span>
        <span className="flex items-center text-sm font-semibold tracking-wide">
          {trophyIcon}
          {entry.player_name}
        </span>
        {entry.region && entry.region !== "Unknown" && (
          <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
            {entry.region}
          </span>
        )}
      </div>
      <span className="text-base text-cyan-200 font-bold">
        {entry.wins} {entry.wins === 1 ? 'victoire' : 'victoires'}
      </span>
    </div>
  )
}
