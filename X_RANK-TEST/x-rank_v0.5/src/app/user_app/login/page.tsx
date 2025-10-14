"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { NeonBackdrop } from "@/components/layout/NeonBackdrop";

type PlayerRow = {
  user_id: string;
  player_first_name?: string;
  player_last_name?: string;
  Arbitre?: boolean;
  Admin?: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fail = (msg: string) => {
      setError(msg);
      setLoading(false);
    };

    if (!email || !password) return fail("⚠️ Merci de remplir tous les champs");

    try {
      // --- Connexion à Supabase ---
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) return fail("❌ " + signInError.message);
      if (!signInData.session || !signInData.user)
        return fail("❌ Impossible de récupérer la session utilisateur");

      // --- Récupération du profil joueur ---
      const userId = signInData.user.id;
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("player_first_name, player_last_name, Arbitre, Admin")
        .eq("user_id", userId)
        .maybeSingle<PlayerRow>();

      if (playerError)
        return fail("❌ Erreur lors de la lecture du profil joueur : " + playerError.message);
      if (!playerData)
        return fail(
          "⚠️ Aucun profil joueur associé à ce compte. Contactez un administrateur."
        );

      // --- Redirection selon le rôle ---
      router.push("/user_app/main-menu");
    } catch (err: unknown) {
      if (err instanceof Error) fail("❌ Erreur inattendue: " + err.message);
      else fail("❌ Une erreur inconnue est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-12 text-white">
      <NeonBackdrop />

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-black/70 p-8 shadow-[0_0_30px_rgba(255,0,255,0.25)] backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-cyan-300/80">
            system//login
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-fuchsia-200 drop-shadow-[0_0_18px_rgba(255,0,255,0.45)]">
            Connexion
          </h1>
          <p className="text-sm text-white/70">
            Accède aux fonctionnalités X-RANK avec tes identifiants.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300/80">
              Email
            </label>
            <input
              type="email"
              placeholder="blade.runner@xranks.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/80 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300/80">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/80 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600/80 via-purple-600/80 to-indigo-700/80 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_22px_rgba(255,0,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(255,0,255,0.55)] disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
          >
            ⬅ Accueil
          </button>
          <button
            onClick={() => router.push("/user_app/forgot-password")}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:text-white"
          >
            🔑 Mot de passe oublié
          </button>
        </div>
      </div>
    </main>
  );
}
