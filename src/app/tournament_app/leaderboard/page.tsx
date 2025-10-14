// src/app/leaderboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy } from "lucide-react"
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
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">❌ Erreur joueurs : {playersError.message}</p>
      </CyberPage>
    )
  }

  const { data: pointsData, error: pointsError } = await supabase
    .from("points")
    .select("player_id, player_score_global")

  if (pointsError) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Leaderboard", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">❌ Erreur scores : {pointsError.message}</p>
      </CyberPage>
    )
  }

  const leaderboard: LeaderboardEntry[] = (playersData as Player[]).map((player) => {
    const points = (pointsData as PlayerPoints[]).find(
      (p) => p.player_id === player.player_id
    )
    return {
      player_id: player.player_id,
      player_name: player.player_name ?? "Inconnu",
      player_score_global: points?.player_score_global ?? 0,
    }
  })

  leaderboard.sort((a, b) => b.player_score_global - a.player_score_global)

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//ranking",
        title: "🏆 Leaderboard Global",
        subtitle: "Classement général des joueurs en fonction de leurs points cumulés.",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-3xl gap-6"
    >
      <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)]">
            Tableau des champions
          </CardTitle>
          <CardDescription className="text-gray-200/80">
            Chaque victoire ajoute des points, seules les meilleures performances survivent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.map((entry, index) => {
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
                <span className="text-base text-cyan-200">{entry.player_score_global}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
        datastream :: leaderboard_active
      </p>
    </CyberPage>
  )
}
