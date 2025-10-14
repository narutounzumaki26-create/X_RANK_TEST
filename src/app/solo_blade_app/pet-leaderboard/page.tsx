"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Trophy } from "lucide-react";
import { CyberPage } from "@/components/layout/CyberPage";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

type LeaderboardEntry = {
  user_id: string;
  player_name: string;
  points: number;
  pet_name: string;
  assist_name: string | null;
  ratchet_name: string | null;
  bit_name: string | null;
};

export default function PetLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_pet_leaderboard");
        if (error) {
          console.error("❌ Erreur Supabase :", error);
          return;
        }
        setLeaderboard((data || []) as LeaderboardEntry[]);
      } catch (err) {
        console.error("❌ Erreur JS :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Classement des Pets", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Chargement du classement...</p>
      </CyberPage>
    );
  }

  return (
    <main className="relative flex flex-col items-center min-h-screen bg-black overflow-hidden p-6">
      {/* Glow cyberpunk */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#ff00ff33,transparent),radial-gradient(circle_at_bottom_right,#00fff933,transparent)] animate-pulse" />

      {/* Titre glitchy */}
      <div className="relative z-10 mb-8 flex w-full max-w-3xl justify-end">
        <MainMenuButton />
      </div>
      <h1 className="relative z-10 text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-blue to-neon-green mb-10 text-center tracking-wide animate-pulse">
        🏆 Classement des Pets
      </h1>

      <div className="relative z-10 w-full max-w-3xl space-y-4">
        {leaderboard.map((entry, index) => {
          let bgColor = "bg-gray-800/60 border border-gray-600";
          let trophyIcon = null;

          if (index === 0) {
            bgColor = "bg-yellow-400/20 border border-yellow-500 shadow-[0_0_20px_#FFD700]";
            trophyIcon = <Trophy className="w-6 h-6 text-yellow-400 mr-2" />;
          } else if (index === 1) {
            bgColor = "bg-gray-400/20 border border-gray-400 shadow-[0_0_20px_#C0C0C0]";
            trophyIcon = <Trophy className="w-6 h-6 text-gray-300 mr-2" />;
          } else if (index === 2) {
            bgColor = "bg-orange-500/20 border border-orange-500 shadow-[0_0_20px_#FF8C00]";
            trophyIcon = <Trophy className="w-6 h-6 text-orange-400 mr-2" />;
          }

          return (
            <div
              key={entry.user_id}
              className={`flex justify-between items-center p-4 rounded-xl font-mono text-white transition-transform transform hover:scale-105 ${bgColor}`}
            >
              <span className="flex items-center font-bold tracking-wide">
                {trophyIcon}
                {index + 1}. {entry.player_name} — {entry.pet_name}{entry.assist_name ?? " "}{entry.ratchet_name ?? "—"}{entry.bit_name ?? "—"}
              </span>
              <span className="text-lg text-neon-blue">
                {entry.points}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer console style */}
      <p className="absolute bottom-4 text-xs text-gray-500 font-mono opacity-70">
        DATASTREAM :: PET_LEADERBOARD_ACTIVE
      </p>
    </main>
  );
}
