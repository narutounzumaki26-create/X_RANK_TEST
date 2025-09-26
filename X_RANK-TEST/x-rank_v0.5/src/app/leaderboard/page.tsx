import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy } from "lucide-react"

type Player = {
  player_id: string
  player_name: string | null
}

type PlayerPoints = {
  player_id: string
  player_score_global: number
}

type LeaderboardEntry = {
  player_id: string
  player_name: string
  player_score_global: number
}

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("player_id, player_name")

  if (playersError) {
    return <div>Erreur lors du chargement des joueurs : {playersError.message}</div>
  }

  const { data: pointsData, error: pointsError } = await supabase
    .from("points")
    .select("player_id, player_score_global")

  if (pointsError) {
    return <div>Erreur lors du chargement des scores : {pointsError.message}</div>
  }

  const leaderboard: LeaderboardEntry[] = (playersData as Player[]).map(player => {
    const points = (pointsData as PlayerPoints[]).find(p => p.player_id === player.player_id)
    return {
      player_id: player.player_id,
      player_name: player.player_name ?? "Inconnu",
      player_score_global: points?.player_score_global ?? 0,
    }
  })

  leaderboard.sort((a, b) => b.player_score_global - a.player_score_global)

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-8 text-center tracking-wide">
        🏆 Classement Global
      </h1>

      <div className="w-full max-w-3xl space-y-3">
        {leaderboard.map((entry, index) => {
          let bgColor = "bg-gray-800/60"
          let trophyIcon = null

          if (index === 0) {
            bgColor = "bg-yellow-500/30"
            trophyIcon = <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
          } else if (index === 1) {
            bgColor = "bg-gray-500/30"
            trophyIcon = <Trophy className="w-5 h-5 text-gray-400 mr-2" />
          } else if (index === 2) {
            bgColor = "bg-orange-500/30"
            trophyIcon = <Trophy className="w-5 h-5 text-orange-400 mr-2" />
          }

          return (
            <div
              key={entry.player_id}
              className={`flex justify-between items-center p-4 rounded-xl shadow-lg hover:scale-105 transition ${bgColor}`}
            >
              <span className="flex items-center font-semibold text-white">
                {trophyIcon}
                {index + 1}. {entry.player_name}
              </span>
              <span className="font-mono text-white">{entry.player_score_global}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
