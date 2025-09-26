// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupération du joueur
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("player_id, player_name")
    .eq("user_id", user.id)
    .single();

  if (playerError || !player) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
        <Card className="max-w-2xl w-full text-center border-2 border-red-500 rounded-2xl shadow-2xl bg-gray-800/70">
          <CardHeader>
            <CardTitle className="text-red-500 text-2xl font-bold">Joueur non trouvé</CardTitle>
            <CardDescription className="text-gray-300">
              Aucun joueur trouvé pour cet utilisateur. Le joueur doit être créé d&apos;abord.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-gray-700/50 rounded-xl p-4 mt-4 text-white">
            <p className="text-sm font-mono">User ID: {user.id}</p>
            {playerError && <p className="text-sm font-mono text-red-400">Erreur: {playerError.message}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }

  // Récupération des stats
  const { data: stats, error: statsError } = await supabase
    .from("player_stats")
    .select("*")
    .eq("player_id", player.player_id)
    .maybeSingle();

  const { data: pointsData, error: pointsError } = await supabase
    .from("points")
    .select("player_score_global")
    .eq("player_id", player.player_id)
    .maybeSingle();

  const matchesPlayed = stats?.matches_played || 0;
  const matchesWon = stats?.matches_won || 0;
  const winrate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const spinFinishes = stats?.spin_finishes || 0;
  const overFinishes = stats?.over_finishes || 0;
  const burstFinishes = stats?.burst_finishes || 0;
  const xtremeFinishes = stats?.xtreme_finishes || 0;
  const totalPoints = pointsData?.player_score_global || 0;

  const statsList = [
    { label: "Matchs joués", value: matchesPlayed },
    { label: "Matchs gagnés", value: matchesWon },
    { label: "Winrate (%)", value: winrate },
    { label: "Spin total", value: spinFinishes },
    { label: "Over total", value: overFinishes },
    { label: "Burst total", value: burstFinishes },
    { label: "Xtreme total", value: xtremeFinishes },
    { label: "Points totaux", value: totalPoints },
  ];

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-8 text-center tracking-wide">
        ⚡ Profil de {player.player_name}
      </h1>

      <div className="max-w-3xl w-full grid gap-6">
        <Card className="bg-gray-800/70 border-2 border-purple-500 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-400 text-center font-bold">Statistiques</CardTitle>
            <CardDescription className="text-center text-gray-300">Voici vos performances actuelles</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mt-4">
            {statsList.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </CardContent>
          <CardContent className="mt-6 bg-gray-700/50 rounded-xl p-4 text-center text-white">
            <p className="text-xs text-gray-400">Player ID: {player.player_id}</p>
            {(statsError || pointsError) && (
              <p className="text-xs text-red-400">
                Erreurs lors du chargement des données : {statsError?.message || ""} {pointsError?.message || ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// StatCard avec style similaire au reste
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-gray-800/60 border-2 border-purple-600 rounded-xl shadow-lg transition hover:scale-105">
      <CardContent className="flex flex-col items-center justify-center p-4">
        <span className="text-lg font-bold text-white">{value}</span>
        <span className="text-sm text-gray-300 mt-1">{label}</span>
      </CardContent>
    </Card>
  );
}
