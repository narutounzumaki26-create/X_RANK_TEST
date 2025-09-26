"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type PlayerRow = {
  user_id: string
  player_first_name?: string
  player_last_name?: string
  Arbitre?: boolean
  Admin?: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fail = (msg: string) => {
      setError(msg)
      setLoading(false)
    }

    if (!email || !password) return fail("⚠️ Merci de remplir tous les champs")

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })

      if (signInError) return fail("❌ " + signInError.message)
      if (!signInData.session || !signInData.user)
        return fail("❌ Impossible de récupérer la session utilisateur")

      const userId = signInData.user.id
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("player_first_name, player_last_name, Arbitre, Admin")
        .eq("user_id", userId)
        .maybeSingle<PlayerRow>()

      if (playerError) return fail("❌ Erreur lecture players: " + playerError.message)
      if (!playerData)
        return fail("⚠️ Aucun profil joueur associé à ce compte. Contactez un administrateur.")

      // Redirection selon rôle
      if (playerData.Arbitre === true) router.push("/main-menu-arbitre")
      else if (playerData.Admin === true) router.push("/main-menu-admin")
      else router.push("/main-menu")
    } catch (err: unknown) {
      if (err instanceof Error) fail("❌ Erreur inattendue: " + err.message)
      else fail("❌ Une erreur inconnue est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md bg-gray-800/70 rounded-2xl shadow-2xl p-6 space-y-4">
        <h1 className="text-3xl font-extrabold text-purple-400 text-center mb-4">
          ⚡ Connexion
        </h1>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-700 rounded-xl p-3 bg-gray-900 text-white placeholder-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-700 rounded-xl p-3 bg-gray-900 text-white placeholder-gray-400"
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition shadow-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Actions supplémentaires */}
        <div className="flex justify-between mt-4 gap-2">
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-gray-600 text-white py-2 rounded-xl hover:bg-gray-700 transition"
          >
            Retour à l&apos;accueil
          </button>
          <button
            onClick={() => router.push("/forgot-password")}
            className="flex-1 bg-yellow-500 text-black py-2 rounded-xl hover:bg-yellow-600 transition"
          >
            Mot de passe oublié ?
          </button>
        </div>
      </div>
    </main>
  )
}
