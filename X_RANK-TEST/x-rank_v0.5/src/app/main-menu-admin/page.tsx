"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function MainMenuClient({ playerName }: { playerName: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-8 text-center tracking-wide">
        ⚡ Bienvenue {playerName}
      </h1>

      <div className="w-full max-w-md grid gap-4">
        <a
          href="/profile"
          className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition text-center shadow-lg"
        >
          Profil
        </a>
        <a
          href="/leaderboard"
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition text-center shadow-lg"
        >
          Classement
        </a>
        <a
          href="/tournament"
          className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition text-center shadow-lg"
        >
          Tournois
        </a>
        <a
          href="/tournament-management"
          className="w-full bg-yellow-600 text-white py-3 rounded-xl hover:bg-yellow-700 transition text-center shadow-lg"
        >
          Gestion Tournoi
        </a>
        <a
          href="/tournament-inscription"
          className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition text-center shadow-lg"
        >
          Inscription
        </a>

        {/* Bouton déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition text-center shadow-lg font-semibold"
        >
          Déconnexion
        </button>
      </div>
    </main>
  )
}
