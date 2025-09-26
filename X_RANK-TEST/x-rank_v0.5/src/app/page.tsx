// src/app/page.tsx
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (playerError) {
      console.error("Erreur supabase:", playerError)
      redirect("/error")
    }

    if (!playerData) {
      console.error("Aucun joueur trouvé pour user:", user.id)
      redirect("/signup")
    }

    if (playerData.Arbitre === false && playerData.Admin === false) {
      redirect("/main-menu")
    } else if (playerData.Arbitre === true) {
      redirect("/main-menu-arbitre")
    } else if (playerData.Admin === true) {
      redirect("/main-menu-admin")
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Card className="max-w-md w-full bg-gray-800/70 border-2 border-purple-500 rounded-2xl shadow-2xl p-6 space-y-6">
        <CardHeader>
          <CardTitle className="text-3xl text-purple-400 text-center font-extrabold">
            ⚡ Bienvenue sur X-Rank
          </CardTitle>
          <CardDescription className="text-center text-gray-300">
            Gérez vos tournois, matchs et composants facilement depuis votre smartphone ou ordinateur.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Link
            href="/signup"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition"
          >
            Inscription
          </Link>

          <Link
            href="/login"
            className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold text-center hover:bg-yellow-600 transition"
          >
            Connexion
          </Link>

          <Link
            href="/components"
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-green-700 transition"
          >
            Liste des composants
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
