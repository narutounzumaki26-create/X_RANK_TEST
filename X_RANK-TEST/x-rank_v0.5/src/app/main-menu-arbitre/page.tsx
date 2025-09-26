// src/app/main-menu-arbitre/page.tsx
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export default async function MainMenuPage() {
  const supabase = await createSupabaseServerClient()

  // Récupère l’utilisateur depuis le cookie
  const { data: { user } } = await supabase.auth.getUser()
 
  const { data: players, error: playerError } = await supabase
    .from("players")
    .select("player_name,Arbitre")
    .eq("user_id", user?.id)
    .single()

  if (!user || playerError || !players) {
    redirect("/login") // Redirection côté serveur
  } else if (players?.Arbitre === false){
    redirect("/") 
  }

  async function signOut() {
    "use server"
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    redirect("/login")
  }




  // Si aucun joueur trouvé, rediriger vers la création de profil
  if (playerError || !players) {
    redirect("/complete-profile")
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 flex flex-col space-y-4">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Bienvenue {players!.player_name}
        </h1>

        <a
          href="/profile"
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition text-center"
        >
          Profil
        </a>

        <a
          href="/leaderboard"
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-center"
        >
          Classement
        </a>

        <a
          href="/tournaments"
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition text-center"
        >
          Tournois
        </a>

        {/* Bouton de déconnexion */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition text-center"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </main>
  )
}
