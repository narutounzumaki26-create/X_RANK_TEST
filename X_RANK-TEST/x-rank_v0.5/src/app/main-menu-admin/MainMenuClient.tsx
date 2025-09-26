"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function MainMenuClient({ playerName }: { playerName: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login") // redirect after logout
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 flex flex-col space-y-4">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Bienvenue {playerName}
        </h1>

        <a href="/profile" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition text-center">Profil</a>
        <a href="/leaderboard" className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-center">Classement</a>
        <a href="/tournament" className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition text-center">Tournois</a>
        <a href="/tournament-management" className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition text-center">Gestion Tournoi</a>
        <a href="/tournament-inscription" className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition text-center">Inscription</a>

        {/* Client-side sign out button */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition text-center"
        >
          Déconnexion
        </button>
      </div>
    </main>
  )
}
