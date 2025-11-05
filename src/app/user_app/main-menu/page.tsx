"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CyberPage } from "@/components/layout/CyberPage";

type MenuLink = {
  href: string;
  label: string;
  icon: string;
  description: string;
  gradient: string;
  shadow: string;
};

type PlayerData = {
  player_name: string;
  Admin: boolean;
};

/**
 * Menu principal joueur - Accès aux différentes fonctionnalités du système X-RANK
 */
export default function MainMenuPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 Checking auth state...");
        
        // Check if user is authenticated
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error("❌ Auth error:", authError);
          setError("Erreur d'authentification");
          router.push("/user_app/login");
          return;
        }

        if (!session) {
          console.log("❌ No session found, redirecting to login");
          router.push("/user_app/login");
          return;
        }

        console.log("✅ User authenticated:", session.user.email);
        setUser(session.user);

        // Fetch player data
        console.log("🔍 Fetching player data...");
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("player_name, Admin")
          .eq("user_id", session.user.id)
          .single();

        if (playerError) {
          console.error("❌ Player data error:", playerError);
          setError("Erreur lors du chargement du profil");
          return;
        }

        if (!playerData) {
          console.log("❌ No player found, redirecting to Banhammer");
          router.push("/Banhammer");
          return;
        }

        console.log("✅ Player data loaded:", playerData);
        setPlayer(playerData);
        
      } catch (err) {
        console.error("💥 Unexpected error:", err);
        setError("Erreur inattendue");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/user_app/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-xl font-semibold text-cyan-300">Chargement...</div>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-400">{error}</div>
          <button 
            onClick={() => router.push("/user_app/login")}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // If no user or player data, don't render
  if (!user || !player) {
    return null;
  }

  const playerName = player.player_name || "Blader";
  const isAdmin = player.Admin === true;

  const baseLinks: MenuLink[] = [
    {
      href: "/user_app/profile",
      label: "Profil",
      icon: "🧬",
      description: "Identité, statistiques et progression personnelle.",
      gradient: "from-fuchsia-600/70 via-purple-700/70 to-indigo-800/60",
      shadow: "shadow-[0_0_22px_rgba(255,0,255,0.25)] hover:shadow-[0_0_28px_rgba(255,0,255,0.45)]",
    },
    {
      href: "/solo_blade_app",
      label: "Mode Solo",
      icon: "⚔️",
      description: "Gère tes blades, combats et fais grimper tes BladePoints.",
      gradient: "from-orange-500/70 via-rose-600/70 to-red-700/60",
      shadow: "shadow-[0_0_22px_rgba(255,100,80,0.25)] hover:shadow-[0_0_28px_rgba(255,120,90,0.45)]",
    },
    {
      href: "/solo_blade_shop",
      label: "Blade Shop",
      icon: "🛒",
      description: "Achete de nouvelles blades via les boutiques spécialisées.",
      gradient: "from-cyan-500/60 via-teal-600/70 to-emerald-700/60",
      shadow: "shadow-[0_0_22px_rgba(0,255,200,0.2)] hover:shadow-[0_0_28px_rgba(0,255,220,0.4)]",
    },
    {
      href: "/tournament_app/leaderboard",
      label: "Classement Global",
      icon: "📊",
      description: "Découvre la hiérarchie des joueurs et leurs points.",
      gradient: "from-lime-500/70 via-emerald-600/70 to-teal-700/60",
      shadow: "shadow-[0_0_22px_rgba(0,255,120,0.25)] hover:shadow-[0_0_28px_rgba(0,255,150,0.45)]",
    },
    {
      href: "/tournament_app/tournament-inscription",
      label: "Inscriptions aux tournois",
      icon: "🧾",
      description: "Inscrivez vous aux tournois organisés dans toute la France.",
      gradient: "from-indigo-500/70 via-blue-600/70 to-cyan-700/60",
      shadow: "shadow-[0_0_22px_rgba(120,160,255,0.25)] hover:shadow-[0_0_28px_rgba(120,180,255,0.45)]",
    },
    {
      href: "/solo_blade_app/pet-leaderboard",
      label: "Classement Beys",
      icon: "🌀",
      description: "Classement des blades élevées par la communauté.",
      gradient: "from-pink-500/70 via-violet-600/70 to-purple-800/60",
      shadow: "shadow-[0_0_22px_rgba(255,0,200,0.25)] hover:shadow-[0_0_28px_rgba(255,0,220,0.45)]",
    },
  ];

  const adminLinks: MenuLink[] = [
    {
      href: "/tournament_app/tournament-management",
      label: "Gestion des matchs",
      icon: "⚙️",
      description: "Renseigne les placements, decks et vainqueurs.",
      gradient: "from-amber-500/70 via-orange-600/70 to-rose-600/60",
      shadow: "shadow-[0_0_22px_rgba(255,200,80,0.25)] hover:shadow-[0_0_28px_rgba(255,180,80,0.45)]",
    },
    {
      href: "/tournament_app/Validation_Dashboard",
      label: "Validations des participants",
      icon: "✅",
      description: "Valider les participations des joueurs",
      gradient: "from-amber-500/70 via-green-600/70 to-rose-600/60",
      shadow: "shadow-[0_0_22px_rgba(255,200,80,0.25)] hover:shadow-[0_0_28px_rgba(255,180,80,0.45)]",
    },
    {
      href: "/tournament_app/tournaments",
      label: "Tournois",
      icon: "🏆",
      description: "Organise ou consulte les brackets et decks enregistrés.",
      gradient: "from-sky-500/70 via-blue-600/70 to-indigo-700/60",
      shadow: "shadow-[0_0_22px_rgba(0,150,255,0.25)] hover:shadow-[0_0_28px_rgba(60,180,255,0.45)]",
    },
    {
      href: "/tournament_app/tournament-finished",
      label: "Tournois terminés",
      icon: "🏁",
      description: "Consulte l&apos;historique et les vainqueurs déclarés.",
      gradient: "from-slate-500/70 via-slate-600/70 to-gray-800/60",
      shadow: "shadow-[0_0_22px_rgba(148,163,184,0.25)] hover:shadow-[0_0_28px_rgba(200,213,225,0.45)]",
    },
    {
      href: "/match_app/Match_Officiel",
      label: "Match Officiel",
      icon: "🌀",
      description: "Creation et gestion de matchs Officiel",
      gradient: "from-slate-500/70 via-blue-600/70 to-red-800/60",
      shadow: "shadow-[0_0_22px_rgba(148,163,184,0.25)] hover:shadow-[0_0_28px_rgba(200,213,225,0.45)]",
    },
  ];

  return (
    <CyberPage
      header={{
        eyebrow: "console//mainframe",
        title: `Bienvenue, ${playerName}`,
        subtitle: isAdmin
          ? "Sélectionne un mode de jeu ou accède aux outils administrateur."
          : "Choisis ta destination pour poursuivre ta progression.",
        actions: (
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-600/80 via-red-600/80 to-pink-700/80 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_0_16px_rgba(255,90,120,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,120,150,0.6)]"
          >
            🚪 Déconnexion
          </button>
        ),
      }}
      contentClassName="mx-auto w-full max-w-5xl gap-6"
    >
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border border-white/10 bg-black/70 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-cyan-200 drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
              Accès rapide
            </CardTitle>
            <CardDescription className="text-gray-300/80">
              Toutes les sections principales de la plateforme X-RANK.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {baseLinks.map((link) => (
              <MenuTile key={link.href} link={link} />
            ))}
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-black/70 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-fuchsia-200 drop-shadow-[0_0_12px_rgba(255,0,255,0.45)]">
              Statut session
            </CardTitle>
            <CardDescription className="text-gray-300/80">
              Console de diagnostic temps réel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-gray-200">
            <StatusLine label="Operateur" value={playerName} />
            <StatusLine label="Mode" value={isAdmin ? "Administrateur" : "Joueur"} />
            <StatusLine label="Dernier accès" value={new Date().toLocaleString()} />
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.35em] text-fuchsia-300/80">
              system//link_ready
            </p>
          </CardContent>
        </Card>
      </section>

      {isAdmin && (
        <Card className="border border-white/10 bg-black/70 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-amber-200 drop-shadow-[0_0_12px_rgba(255,200,120,0.45)]">
              Admin hub
            </CardTitle>
            <CardDescription className="text-gray-300/80">
              Outils pour valider, organiser et clôturer les tournois.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adminLinks.map((link) => (
              <MenuTile key={link.href} link={link} />
            ))}
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-center text-xs font-mono uppercase tracking-[0.4em] text-gray-400/80">
        system::user_interface_active
      </p>
    </CyberPage>
  );
}

function MenuTile({ link }: { link: MenuLink }) {
  return (
    <Link
      href={link.href}
      className={`group relative flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br ${link.gradient} p-5 text-left text-white transition-all duration-150 hover:-translate-y-1 hover:border-white/20 ${link.shadow}`}
    >
      <span className="text-2xl drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{link.icon}</span>
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-wide">{link.label}</p>
        <p className="text-xs text-white/80 leading-relaxed">{link.description}</p>
      </div>
      <span className="mt-auto text-[10px] font-mono uppercase tracking-[0.35em] text-white/60 transition group-hover:text-white/80">
        ► ouvrir
      </span>
    </Link>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-300/80">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
