// ❌ supprime cette ligne
// "use client";

import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CyberPage } from "@/components/layout/CyberPage";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("Admin, Arbitre, player_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (playerError) {
      console.error("Erreur Supabase:", playerError);
      redirect("/user_app/login");
    }

    if (!playerData) {
      console.warn("Aucun joueur trouvé pour user:", user.id);
      redirect("/user_app/signup");
    }

    redirect("/user_app/main-menu");
  }

  return (
    <CyberPage
      centerContent
      header={{ eyebrow: "system online", title: "X-Rank Systems", subtitle: "<Cyber Tournament Manager/>" }}
      contentClassName="w-full items-center"
    >
      <Card className="relative w-full max-w-md bg-gray-950/90 border border-fuchsia-400 shadow-[0_0_20px_#ff00ff,0_0_40px_#00fff9] rounded-2xl p-8 backdrop-blur-md">
        <CardHeader className="space-y-2">
          <CardTitle className="flex justify-center">
            <Image
              src="/icons/logo.png"
              alt="X-Rank Systems Logo"
              width={220}
              height={72}
              className="drop-shadow-[0_0_12px_#00fff9]"
              priority
            />
          </CardTitle>
          <CardDescription className="text-center italic tracking-wide text-[#00fff9]">
            &lt;Cyber Tournament Manager/&gt;
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 mt-4">
          <Link
            href="/user_app/signup"
            className="w-full rounded-xl border border-fuchsia-400 bg-gradient-to-r from-fuchsia-500 to-purple-600 py-3 text-center font-semibold uppercase tracking-wide shadow-[0_0_12px_#ff00ff] transition-transform hover:scale-[1.02] hover:shadow-[0_0_20px_#ff00ff]"
          >
            ► S&apos;inscrire au Système
          </Link>
          <Link
            href="/user_app/login"
            className="w-full rounded-xl border border-cyan-400 bg-gradient-to-r from-green-400 to-cyan-500 py-3 text-center font-semibold uppercase tracking-wide shadow-[0_0_12px_#00fff9] transition-transform hover:scale-[1.02] hover:shadow-[0_0_20px_#00fff9]"
          >
            ► Connexion
          </Link>
          <Link
            href="/tournament_app/leaderboard"
            className="w-full rounded-xl border border-cyan-400 bg-gradient-to-r from-emerald-400 to-cyan-500 py-3 text-center font-semibold uppercase tracking-wide shadow-[0_0_12px_#00fff9] transition-transform hover:scale-[1.02] hover:shadow-[0_0_20px_#00fff9]"
          >
            ► Classement Global
          </Link>
        </CardContent>
      </Card>
      <p className="mt-6 text-xs font-mono uppercase tracking-[0.4em] text-gray-400">
        ░ Awaiting user input ░
      </p>
    </CyberPage>
  );
}
