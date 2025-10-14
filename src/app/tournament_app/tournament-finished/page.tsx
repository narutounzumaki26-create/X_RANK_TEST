"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { CyberPage } from "@/components/layout/CyberPage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

type FinishedTournament = {
  tournament_id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  winner_id: string | null;
  winnerName: string;
};

type FinishedTournamentRow = {
  tournament_id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  winner_id: string | null;
  winner: { player_name: string | null }[] | { player_name: string | null } | null;
};

export default function FinishedTournamentsPage() {
  const [tournamentsList, setTournamentsList] = useState<FinishedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinished = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("tournaments")
          .select(
            `
            tournament_id,
            name,
            date,
            location,
            description,
            winner_id,
            winner:winner_id (player_name)
          `
          )
          .eq("status", "finished")
          .order("date", { ascending: false })
          .returns<FinishedTournamentRow[]>();

        if (fetchError) throw fetchError;

        const formatted: FinishedTournament[] = (data ?? []).map((row) => {
          const winnerField = row.winner;
          const winnerArray = Array.isArray(winnerField)
            ? winnerField
            : winnerField
            ? [winnerField]
            : [];
          const winnerName =
            winnerArray[0]?.player_name ??
            (row.winner_id ? `Joueur ${row.winner_id.slice(0, 8)}` : "Non renseigné");

          return {
            tournament_id: row.tournament_id,
            name: row.name,
            date: row.date,
            location: row.location,
            description: row.description,
            winner_id: row.winner_id,
            winnerName,
          } satisfies FinishedTournament;
        });

        setTournamentsList(formatted);
      } catch (err) {
        console.error("Erreur chargement tournois terminés:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    void fetchFinished();
  }, []);

  if (loading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Tournois terminés", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Chargement des vainqueurs...</p>
      </CyberPage>
    );
  }

  if (error) {
    return (
      <CyberPage
        centerContent
        header={{
          title: "Tournois terminés",
          actions: (
            <div className="flex flex-wrap justify-center gap-3">
              <MainMenuButton className="w-full sm:w-auto" />
              <Link href="/tournament_app/tournaments" className="inline-flex">
                <Button className="bg-purple-500/20 text-purple-200 border border-purple-400/70 hover:bg-purple-500/30">
                  ← Retour à la gestion
                </Button>
              </Link>
            </div>
          ),
        }}
      >
        <p className="text-sm text-red-400">⚠️ {error}</p>
      </CyberPage>
    );
  }

  if (tournamentsList.length === 0) {
    return (
      <CyberPage
        centerContent
        header={{
          title: "Tournois terminés",
          subtitle: "Aucun vainqueur n’a encore été enregistré.",
          actions: (
            <div className="flex flex-wrap justify-center gap-3">
              <MainMenuButton className="w-full sm:w-auto" />
              <Link href="/tournament_app/tournaments" className="inline-flex">
                <Button className="bg-purple-500/20 text-purple-200 border border-purple-400/70 hover:bg-purple-500/30">
                  ← Retour à la gestion
                </Button>
              </Link>
            </div>
          ),
        }}
      >
        <p className="text-sm text-gray-300">Revenez après les prochaines compétitions.</p>
      </CyberPage>
    );
  }

  return (
    <CyberPage
      header={{
        title: "🏆 Tournois terminés",
        subtitle: "Consultez les vainqueurs des précédentes compétitions X-RANK.",
        actions: (
          <div className="flex flex-wrap justify-center gap-3">
            <MainMenuButton className="w-full sm:w-auto" />
            <Link href="/tournament_app/tournaments" className="inline-flex">
              <Button className="bg-purple-500/20 text-purple-200 border border-purple-400/70 hover:bg-purple-500/30">
                ← Retour à la gestion
              </Button>
            </Link>
          </div>
        ),
      }}
      contentClassName="gap-8"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tournamentsList.map((tournament) => {
          return (
            <Card
              key={tournament.tournament_id}
              className="border border-emerald-500/40 bg-gray-900/70 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-emerald-200">{tournament.name}</CardTitle>
                <CardDescription className="text-sm text-gray-300">
                  {tournament.date} {tournament.location && `• ${tournament.location}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-200">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Vainqueur</p>
                  <p className="text-lg font-semibold text-white">{tournament.winnerName}</p>
                </div>
                {tournament.description && (
                  <p className="text-xs text-gray-400">{tournament.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CyberPage>
  );
}
