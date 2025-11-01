// src/app/leaderboard/page.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Trophy, Globe, MapPin, Sword, Users, X, Calendar, Target, Award, Map } from "lucide-react"
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
  player_birth_date?: string | null
  player_first_name?: string | null
}

type Match = {
  match_id: string
  tournament_id: string | null
  player1_id: string
  player2_id: string
  winner_id: string
  rounds: number | null
  spin_finishes: number | null
  over_finishes: number | null
  burst_finishes: number | null
  xterms_finishes: number | null
  spin_finishes2: number | null
  over_finishes2: number | null
  burst_finishes2: number | null
  xterms_finishes2: number | null
}

type Tournament = {
  tournament_id: string
  name: string
  status: string
  date: string
  location: string | null
}

type TournamentParticipant = {
  tournament_id: string
  player_id: string
  is_validated: boolean
  placement: number | null
}

type LeaderboardEntry = {
  player_id: string
  player_name: string
  wins: number
  region: string
  placement?: number
}

type PlayerStats = {
  total_matches: number
  total_wins: number
  total_losses: number
  win_rate: number
  total_rounds: number
  avg_rounds_per_match: number
  total_finishes: number
  spin_finishes: number
  over_finishes: number
  burst_finishes: number
  xterms_finishes: number
  tournaments_played: number
  best_placement: number | null
  regions_played: string[]
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

// Player Stats Modal Component
function PlayerStatsModal({ 
  player, 
  stats, 
  onClose 
}: { 
  player: Player
  stats: PlayerStats
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 p-6 border-b border-cyan-500/30">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-cyan-200 mb-2">
                {player.player_name}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                {player.player_region && (
                  <div className="flex items-center gap-1">
                    <Map className="h-4 w-4" />
                    <span>{player.player_region}</span>
                  </div>
                )}
                {player.player_birth_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(player.player_birth_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Match Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">
                Statistiques des Matchs
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-cyan-200 text-sm">Matchs Totaux</div>
                  <div className="text-2xl font-bold text-white">{stats.total_matches}</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-cyan-200 text-sm">Victoires</div>
                  <div className="text-2xl font-bold text-green-400">{stats.total_wins}</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-cyan-200 text-sm">Défaites</div>
                  <div className="text-2xl font-bold text-red-400">{stats.total_losses}</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-cyan-200 text-sm">Taux de Victoire</div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.win_rate}%</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-cyan-300" />
                  <span className="text-cyan-200 font-semibold">Rounds</span>
                </div>
                <div className="text-sm text-gray-300">
                  Total: <span className="text-white font-semibold">{stats.total_rounds}</span>
                </div>
                <div className="text-sm text-gray-300">
                  Moyenne/Match: <span className="text-white font-semibold">{stats.avg_rounds_per_match}</span>
                </div>
              </div>
            </div>

            {/* Tournament & Finishes Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-300 border-b border-purple-500/30 pb-2">
                Tournois & Finitions
              </h3>

              {/* Tournament Stats */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-purple-300" />
                  <span className="text-purple-200 font-semibold">Tournois</span>
                </div>
                <div className="text-sm text-gray-300">
                  Participations: <span className="text-white font-semibold">{stats.tournaments_played}</span>
                </div>
                {stats.best_placement && (
                  <div className="text-sm text-gray-300">
                    Meilleur placement: <span className="text-yellow-400 font-semibold">#{stats.best_placement}</span>
                  </div>
                )}
              </div>

              {/* Finish Stats */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-cyan-200 font-semibold mb-2">Types de Finitions</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Spin:</span>
                    <span className="text-white font-semibold">{stats.spin_finishes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Over:</span>
                    <span className="text-white font-semibold">{stats.over_finishes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Burst:</span>
                    <span className="text-white font-semibold">{stats.burst_finishes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">X-Terms:</span>
                    <span className="text-white font-semibold">{stats.xterms_finishes}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-cyan-300">Total:</span>
                      <span className="text-cyan-300">{stats.total_finishes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regions Played */}
          {stats.regions_played.length > 0 && (
            <div className="mt-6 bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Map className="h-4 w-4 text-green-400" />
                <span className="text-green-200 font-semibold">Régions Jouées</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.regions_played.map(region => (
                  <span 
                    key={region}
                    className="px-3 py-1 bg-green-500/20 border border-green-400/50 rounded-full text-green-300 text-sm"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Leaderboard Row Component
function LeaderboardRow({ 
  entry, 
  index, 
  onPlayerClick 
}: { 
  entry: LeaderboardEntry
  index: number
  onPlayerClick: (playerId: string) => void
}) {
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
      className={`flex items-center justify-between rounded-2xl px-5 py-4 font-mono text-white transition hover:-translate-y-1 cursor-pointer ${bgColor}`}
      onClick={() => onPlayerClick(entry.player_id)}
    >
      <span className="flex items-center text-sm font-semibold tracking-wide">
        {trophyIcon}
        {index + 1}. {entry.player_name}
        {entry.placement && (
          <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded ml-2">
            Placement: {entry.placement}
          </span>
        )}
      </span>
      <span className="text-base text-cyan-200">
        {entry.wins} {entry.wins === 1 ? 'victoire' : 'victoires'}
      </span>
    </div>
  )
}

// Leaderboard Card Component
function LeaderboardCard({ 
  title, 
  description, 
  data,
  onPlayerClick
}: { 
  title: string
  description: string
  data: LeaderboardEntry[]
  onPlayerClick: (playerId: string) => void
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
          <LeaderboardRow 
            key={entry.player_id} 
            entry={entry} 
            index={index}
            onPlayerClick={onPlayerClick}
          />
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
  const [tournamentParticipants, setTournamentParticipants] = useState<TournamentParticipant[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        // Fetch all data in parallel
        const [
          playersResponse, 
          matchesResponse, 
          tournamentsResponse,
          participantsResponse
        ] = await Promise.all([
          supabase.from("players").select("player_id, player_name, player_region, player_birth_date, player_first_name"),
          supabase.from("matches").select("match_id, tournament_id, player1_id, player2_id, winner_id, rounds, spin_finishes, over_finishes, burst_finishes, xterms_finishes, spin_finishes2, over_finishes2, burst_finishes2, xterms_finishes2"),
          supabase.from("tournaments").select("tournament_id, name, status, date, location"),
          supabase.from("tournament_participants").select("tournament_id, player_id, is_validated, placement")
        ])

        if (playersResponse.error) throw new Error(playersResponse.error.message)
        if (matchesResponse.error) throw new Error(matchesResponse.error.message)
        if (tournamentsResponse.error) throw new Error(tournamentsResponse.error.message)
        if (participantsResponse.error) throw new Error(participantsResponse.error.message)

        setPlayers(playersResponse.data || [])
        setMatches(matchesResponse.data || [])
        setTournaments(tournamentsResponse.data || [])
        setTournamentParticipants(participantsResponse.data || [])

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate player stats
  function calculatePlayerStats(playerId: string): PlayerStats {
    const playerMatches = matches.filter(match => 
      match.player1_id === playerId || match.player2_id === playerId
    )

    const wins = playerMatches.filter(match => match.winner_id === playerId).length
    const losses = playerMatches.length - wins
    const winRate = playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0

    // Calculate rounds
    const totalRounds = playerMatches.reduce((sum, match) => sum + (match.rounds || 0), 0)
    const avgRounds = playerMatches.length > 0 ? Math.round(totalRounds / playerMatches.length) : 0

    // Calculate finishes
    let spinFinishes = 0
    let overFinishes = 0
    let burstFinishes = 0
    let xtermsFinishes = 0

    playerMatches.forEach(match => {
      if (match.winner_id === playerId) {
        // Player won - count their finishes
        const isPlayer1 = match.player1_id === playerId
        spinFinishes += isPlayer1 ? (match.spin_finishes || 0) : (match.spin_finishes2 || 0)
        overFinishes += isPlayer1 ? (match.over_finishes || 0) : (match.over_finishes2 || 0)
        burstFinishes += isPlayer1 ? (match.burst_finishes || 0) : (match.burst_finishes2 || 0)
        xtermsFinishes += isPlayer1 ? (match.xterms_finishes || 0) : (match.xterms_finishes2 || 0)
      }
    })

    const totalFinishes = spinFinishes + overFinishes + burstFinishes + xtermsFinishes

    // Tournament stats
    const playerTournaments = tournamentParticipants.filter(p => p.player_id === playerId && p.is_validated)
    const bestPlacement = playerTournaments.length > 0 
      ? Math.min(...playerTournaments.map(p => p.placement || Infinity))
      : null

    // Regions played
    const regionsPlayed = [...new Set(
      playerMatches.flatMap(match => {
        const opponentId = match.player1_id === playerId ? match.player2_id : match.player1_id
        const opponent = players.find(p => p.player_id === opponentId)
        return opponent?.player_region ? [opponent.player_region] : []
      })
    )]

    return {
      total_matches: playerMatches.length,
      total_wins: wins,
      total_losses: losses,
      win_rate: winRate,
      total_rounds: totalRounds,
      avg_rounds_per_match: avgRounds,
      total_finishes: totalFinishes,
      spin_finishes: spinFinishes,
      over_finishes: overFinishes,
      burst_finishes: burstFinishes,
      xterms_finishes: xtermsFinishes,
      tournaments_played: playerTournaments.length,
      best_placement: bestPlacement === Infinity ? null : bestPlacement,
      regions_played: regionsPlayed
    }
  }

  // Handle player click
  const handlePlayerClick = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId)
    if (player) {
      setSelectedPlayer(player)
      setPlayerStats(calculatePlayerStats(playerId))
    }
  }

  // Calculate leaderboard data
  function getLeaderboardData(
    filter?: {
      tournamentId?: string | null
      region?: string
    }
  ): LeaderboardEntry[] {
    // Use a plain object instead of Map to avoid TypeScript issues
    const winsMap: { [key: string]: number } = {}

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
        winsMap[match.winner_id] = (winsMap[match.winner_id] || 0) + 1
      }
    })

    const leaderboard = players.map(player => ({
      player_id: player.player_id,
      player_name: player.player_name ?? "Inconnu",
      wins: winsMap[player.player_id] || 0,
      region: player.player_region ?? "Unknown"
    }))

    return leaderboard.filter(entry => entry.wins > 0).sort((a, b) => b.wins - a.wins)
  }

  // Get tournament participants for a specific tournament
  function getTournamentParticipants(tournamentId: string): LeaderboardEntry[] {
    const participants = tournamentParticipants
      .filter(p => p.tournament_id === tournamentId && p.is_validated)
      .map(participant => {
        const player = players.find(p => p.player_id === participant.player_id)
        return {
          player_id: participant.player_id,
          player_name: player?.player_name ?? "Inconnu",
          wins: 0,
          region: player?.player_region ?? "Unknown",
          placement: participant.placement || undefined
        }
      })
      .sort((a, b) => {
        if (a.placement && b.placement) {
          return a.placement - b.placement
        }
        return (a.player_name || "").localeCompare(b.player_name || "")
      })

    return participants
  }

  // Get regions and ALL tournaments
  const regions = [...new Set(players.map(p => p.player_region).filter(Boolean))] as string[]
  const allTournaments = tournaments

  // Auto-select first region/tournament when switching to those views
  useEffect(() => {
    if (activeBoard === "regional" && !selectedRegion && regions.length > 0) {
      setSelectedRegion(regions[0])
    }
    if (activeBoard === "tournament" && !selectedTournament && allTournaments.length > 0) {
      setSelectedTournament(allTournaments[0].tournament_id)
    }
  }, [activeBoard, selectedRegion, selectedTournament, regions, allTournaments])

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
        currentTitle = "📍 Régions"
        currentDescription = "Choisissez une région dans la liste ci-dessous"
      }
      break
    
    case "tournament":
      if (selectedTournament) {
        const matchData = getLeaderboardData({ tournamentId: selectedTournament })
        
        if (matchData.length > 0) {
          currentData = matchData
          const tournamentInfo = allTournaments.find(t => t.tournament_id === selectedTournament)
          currentTitle = `🏆 ${tournamentInfo?.name || "Tournoi"}`
          currentDescription = "Classement basé sur les matchs joués"
        } else {
          currentData = getTournamentParticipants(selectedTournament)
          const tournamentInfo = allTournaments.find(t => t.tournament_id === selectedTournament)
          currentTitle = `🏆 ${tournamentInfo?.name || "Tournoi"}`
          currentDescription = currentData.length > 0 
            ? "Participants validés du tournoi (triés par placement)" 
            : "Aucun participant validé pour ce tournoi"
        }
      } else {
        currentData = []
        currentTitle = "🏆 Tournois"
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
    <>
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
            
            {activeBoard === "tournament" && allTournaments.map(tournament => (
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
          onPlayerClick={handlePlayerClick}
        />

        <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
          active_board: {activeBoard} | entries: {currentData.length}
        </p>
      </CyberPage>

      {/* Player Stats Modal */}
      {selectedPlayer && playerStats && (
        <PlayerStatsModal
          player={selectedPlayer}
          stats={playerStats}
          onClose={() => {
            setSelectedPlayer(null)
            setPlayerStats(null)
          }}
        />
      )}
    </>
  )
}
