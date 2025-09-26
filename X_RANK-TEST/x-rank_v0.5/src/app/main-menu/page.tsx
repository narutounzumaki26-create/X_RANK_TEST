// src/app/main-menu/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function MainMenuPage() {
  const supabase = await createSupabaseServerClient()

  // Récupère l’utilisateur depuis le cookie
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login") // Redirection côté serveur si pas connecté
  }

  async function signOut() {
    "use server"
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    redirect("/login")
  }

  // Récupération du joueur
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("player_name")
    .eq("user_id", user.id)
    .single()

  // Gestion fallback si erreur ou pas de joueur
  const playerName = playerError || !player ? "joueur" : player.player_name

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-12 text-center tracking-wide">
        ⚡ Menu Principal
      </h1>

      <Card className="max-w-md w-full bg-gray-800/70 border-2 border-purple-500 rounded-2xl shadow-2xl p-6 flex flex-col space-y-6">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-400 text-center font-bold">
            Bienvenue {playerName}
          </CardTitle>
          <CardDescription className="text-center text-gray-300">
            Sélectionnez une option pour continuer
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Link
            href="/profile"
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition text-center font-semibold"
          >
            Profil
          </Link>

          <Link
            href="/leaderboard"
            className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition text-center font-semibold"
          >
            Classement
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition text-center font-semibold"
            >
              Déconnexion
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
