// src/app/profile/page.tsx
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { MainMenuButton } from "@/components/navigation/MainMenuButton"
import { CyberPage } from "@/components/layout/CyberPage"
import type { players, player_stats } from "src/app/tournament_app/tournament"

// ============================================================
// 🔹 Page Profil Joueur
// ============================================================
export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()

  // --- Authentification ---
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // --- Récupération du joueur lié à cet utilisateur ---
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("player_id, player_name")
    .eq("user_id", user.id)
    .single<players>()

  if (playerError || !player) {
    return (
      <CyberPage
        centerContent
        header={{
          title: "Profil joueur",
          subtitle:
            "Aucun profil n\'est associé à ce compte. Merci de contacter un administrateur.",
          actions: <MainMenuButton />,
        }}
      >
        <Card className="w-full max-w-xl border border-red-500/50 bg-black/70 text-center shadow-[0_0_30px_rgba(255,0,0,0.35)]">
          <CardHeader>
            <CardTitle className="text-red-400 text-2xl font-bold drop-shadow-[0_0_12px_rgba(255,0,0,0.6)]">
              Joueur non trouvé
            </CardTitle>
            <CardDescription className="text-gray-200/80">
              Aucun joueur n&apos;a été identifié pour cet utilisateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <p className="text-sm font-mono">User ID: {user.id}</p>
            {playerError && (
              <p className="text-sm font-mono text-red-300">
                Erreur: {playerError.message}
              </p>
            )}
          </CardContent>
        </Card>
      </CyberPage>
    )
  }

  // --- Récupération des stats joueur ---
  const { data: stats, error: statsError } = await supabase
    .from("player_stats")
    .select("*")
    .eq("player_id", player.player_id)
    .maybeSingle<player_stats>()

  // --- Récupération du score global ---
  const { data: pointsData, error: pointsError } = await supabase
    .from("points")
    .select("player_score_global")
    .eq("player_id", player.player_id)
    .maybeSingle<{ player_score_global: number }>()

  // --- Calculs ---
  const matchesPlayed = stats?.matches_played ?? 0
  const matchesWon = stats?.matches_won ?? 0
  const winrate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0
  const spinFinishes = stats?.spin_finishes ?? 0
  const overFinishes = stats?.over_finishes ?? 0
  const burstFinishes = stats?.burst_finishes ?? 0
  const xtremeFinishes = stats?.xtreme_finishes ?? 0
  const totalPoints = pointsData?.player_score_global ?? 0

  const statsList = [
    { label: "Matchs joués", value: matchesPlayed },
    { label: "Matchs gagnés", value: matchesWon },
    { label: "Winrate (%)", value: winrate },
    { label: "Spin total", value: spinFinishes },
    { label: "Over total", value: overFinishes },
    { label: "Burst total", value: burstFinishes },
    { label: "Xtreme total", value: xtremeFinishes },
    { label: "Points totaux", value: totalPoints },
  ]

  // ============================================================
  // 🎨 Rendu
  // ============================================================
  return (
    <CyberPage
      header={{
        title: `⚡ Profil de ${player.player_name}`,
        subtitle: "Vos statistiques globales et vos performances en tournoi.",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-4xl gap-6"
    >
      <Card className="border border-fuchsia-400/40 bg-black/70 shadow-[0_0_30px_rgba(255,0,255,0.35)]">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-2xl text-fuchsia-200 drop-shadow-[0_0_14px_rgba(255,0,255,0.45)]">
            Statistiques globales
          </CardTitle>
          <CardDescription className="text-gray-200/80">
            Les indicateurs sont calculés à partir de vos matchs officiels.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-3">
          {statsList.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </CardContent>

        <CardContent className="mt-2 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-white sm:grid-cols-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300/80">
              Identifiant
            </p>
            <p className="mt-1 text-sm font-semibold">{player.player_id}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300/80">
              Winrate
            </p>
            <p className="mt-1 text-sm font-semibold">{winrate}%</p>
          </div>
          {(statsError || pointsError) && (
            <div className="sm:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-300">
              Erreurs lors du chargement des données : {statsError?.message || ""} {pointsError?.message || ""}
            </div>
          )}
        </CardContent>
      </Card>
    </CyberPage>
  )
}

// ============================================================
// 🔸 Composant StatCard (mini carte néon)
// ============================================================
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-gray-800/70 border-2 border-purple-600 rounded-xl shadow-[0_0_15px_#a0f] transition hover:scale-105 hover:shadow-[0_0_25px_#ff00ff]">
      <CardContent className="flex flex-col items-center justify-center p-4">
        <span className="text-lg font-bold text-white drop-shadow-[0_0_10px_#fff]">
          {value}
        </span>
        <span className="text-sm text-gray-300 mt-1">{label}</span>
      </CardContent>
    </Card>
  )
}
