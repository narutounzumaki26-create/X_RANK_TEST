"use client";

import { useEffect, useState, useCallback } from "react"; // Ajouter useCallback
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

type Tournament = {
  tournament_id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  winner_id: string | null;
  winnerName: string;
  placements: TournamentPlacement[];
};

type TournamentPlacement = {
  player_id: string;
  player_name: string | null;
  placement: number | null;
  is_winner: boolean;
};

type TournamentRow = {
  tournament_id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  winner_id: string | null;
  winner: { player_name: string | null }[] | { player_name: string | null } | null;
};

type Participant = {
  player_id: string;
  player_name: string | null;
  current_placement: number | null;
};

export default function FinishedTournamentsPage() {
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [editingPlacements, setEditingPlacements] = useState<{ [key: string]: number }>({});
  const [saving, setSaving] = useState(false);

  const fetchTournamentParticipants = async (tournamentId: string): Promise<Participant[]> => {
    try {
      const { data, error: participantsError } = await supabase
        .from("tournament_participants")
        .select(`
          player_id,
          placement,
          player:player_id (player_name)
        `)
        .eq("tournament_id", tournamentId)
        .eq("is_validated", true)
        .order("placement", { ascending: true });

      if (participantsError) throw participantsError;

      return (data || []).map(participant => ({
        player_id: participant.player_id,
        player_name: Array.isArray(participant.player) 
          ? participant.player[0]?.player_name 
          : participant.player?.player_name,
        current_placement: participant.placement
      }));
    } catch (err) {
      console.error("Error fetching participants:", err);
      return [];
    }
  };

  // Utiliser useCallback pour stabiliser la fonction
  const fetchFinishedTournaments = useCallback(async () => {
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
        .returns<TournamentRow[]>();

      if (fetchError) throw fetchError;

      const tournamentsWithParticipants: Tournament[] = [];

      for (const row of data ?? []) {
        const participants = await fetchTournamentParticipants(row.tournament_id);
        
        // Create placements array with winner info
        const placements: TournamentPlacement[] = participants.map(participant => ({
          player_id: participant.player_id,
          player_name: participant.player_name,
          placement: participant.current_placement,
          is_winner: participant.player_id === row.winner_id
        }));

        const winnerField = row.winner;
        const winnerArray = Array.isArray(winnerField)
          ? winnerField
          : winnerField
          ? [winnerField]
          : [];
        const winnerName =
          winnerArray[0]?.player_name ??
          (row.winner_id ? `Joueur ${row.winner_id.slice(0, 8)}` : "Non défini");

        tournamentsWithParticipants.push({
          tournament_id: row.tournament_id,
          name: row.name,
          date: row.date,
          location: row.location,
          description: row.description,
          winner_id: row.winner_id,
          winnerName,
          placements
        });
      }

      setTournamentsList(tournamentsWithParticipants);
    } catch (err) {
      console.error("Erreur chargement tournois terminés:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []); // fetchTournamentParticipants n'est pas inclus car utilisé à l'intérieur

  useEffect(() => {
    void fetchFinishedTournaments();
  }, [fetchFinishedTournaments]); // Maintenant la dépendance est stable

  const handleShowRanking = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    // Initialize editing placements with current values
    const initialPlacements: { [key: string]: number } = {};
    tournament.placements.forEach(placement => {
      if (placement.placement !== null) {
        initialPlacements[placement.player_id] = placement.placement;
      }
    });
    setEditingPlacements(initialPlacements);
    setShowRankingModal(true);
  };

  const handlePlacementChange = (playerId: string, newPlacement: number) => {
    setEditingPlacements(prev => ({
      ...prev,
      [playerId]: newPlacement
    }));
  };

  const savePlacements = async () => {
    if (!selectedTournament) return;

    setSaving(true);
    try {
      // Validate placements (no duplicates, sequential numbers)
      const placements = Object.values(editingPlacements);
      const uniquePlacements = new Set(placements);
      if (uniquePlacements.size !== placements.length) {
        alert("Erreur : Les placements doivent être uniques !");
        return;
      }

      // Update placements in tournament_participants
      const updates = Object.entries(editingPlacements).map(([playerId, placement]) => ({
        tournament_id: selectedTournament.tournament_id,
        player_id: playerId,
        placement: placement,
        is_validated: true
      }));

      // Use upsert to update existing records
      const { error: updateError } = await supabase
        .from("tournament_participants")
        .upsert(updates, { onConflict: 'tournament_id,player_id' });

      if (updateError) throw updateError;

      alert("Classement sauvegardé avec succès !");
      await fetchFinishedTournaments();
      setShowRankingModal(false);
    } catch (err) {
      console.error("Error saving placements:", err);
      alert("Erreur lors de la sauvegarde du classement");
    } finally {
      setSaving(false);
    }
  };

  const setTournamentWinner = async (playerId: string) => {
    if (!selectedTournament) return;

    try {
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({ winner_id: playerId })
        .eq("tournament_id", selectedTournament.tournament_id);

      if (updateError) throw updateError;

      alert("Vainqueur défini avec succès !");
      await fetchFinishedTournaments();
      // Refresh the modal with updated data
      const updatedTournament = tournamentsList.find(t => t.tournament_id === selectedTournament.tournament_id);
      if (updatedTournament) {
        setSelectedTournament(updatedTournament);
      }
    } catch (err) {
      console.error("Error setting winner:", err);
      alert("Erreur lors de la définition du vainqueur");
    }
  };

  const autoSetWinnerFromFirstPlace = () => {
    if (!selectedTournament) return;

    // Find player with placement 1
    const firstPlacePlayer = selectedTournament.placements.find(p => p.placement === 1);
    if (firstPlacePlayer) {
      setTournamentWinner(firstPlacePlayer.player_id);
    } else {
      alert("Aucun joueur n&apos;a le placement #1. Veuillez d&apos;abord définir le classement.");
    }
  };

  if (loading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Tournois terminés", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Chargement des tournois...</p>
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
          subtitle: "Aucun tournoi terminé n&apos;a été trouvé.",
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
        <p className="text-sm text-gray-300">Les tournois marqués comme &quot;finished&quot; apparaîtront ici.</p>
      </CyberPage>
    );
  }

  return (
    <>
      <CyberPage
        header={{
          title: "🏆 Gestion des Tournois Terminés",
          subtitle: "Définissez le classement et désignez les vainqueurs des tournois terminés",
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
            const hasPlacements = tournament.placements.length > 0;
            const hasWinner = tournament.winner_id !== null;

            return (
              <Card
                key={tournament.tournament_id}
                className={`border ${
                  hasWinner 
                    ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                    : 'border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.25)]'
                } bg-gray-900/70 text-white`}
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
                    <p className={`text-lg font-semibold ${hasWinner ? 'text-white' : 'text-yellow-400'}`}>
                      {tournament.winnerName}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-2">
                      Classement {!hasPlacements && <span className="text-yellow-400">(À définir)</span>}
                    </p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {hasPlacements ? (
                        <>
                          {tournament.placements.slice(0, 3).map((placement) => (
                            <div key={placement.player_id} className="flex justify-between items-center text-xs">
                              <span className={`${placement.is_winner ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                                {placement.placement ? `#${placement.placement}` : 'N/A'}. {placement.player_name || 'Joueur inconnu'}
                              </span>
                              {placement.is_winner && (
                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-xs">🏆</span>
                              )}
                            </div>
                          ))}
                          {tournament.placements.length > 3 && (
                            <p className="text-xs text-gray-400 text-center">
                              +{tournament.placements.length - 3} autres participants
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-yellow-400">Aucun classement défini</p>
                      )}
                    </div>
                  </div>

                  {tournament.description && (
                    <p className="text-xs text-gray-400">{tournament.description}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleShowRanking(tournament)}
                      className="bg-blue-500/20 text-blue-200 border border-blue-400/70 hover:bg-blue-500/30 text-xs"
                      size="sm"
                    >
                      {hasPlacements ? 'Modifier le classement' : 'Définir le classement'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CyberPage>

      {/* Modal pour gérer le classement */}
      {showRankingModal && selectedTournament && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 p-6 border-b border-cyan-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-cyan-200 mb-2">
                    Classement - {selectedTournament.name}
                  </h2>
                  <p className="text-gray-300 text-sm">
                    {selectedTournament.date} {selectedTournament.location && `• ${selectedTournament.location}`}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Définissez les placements et désignez le vainqueur
                  </p>
                </div>
                <button
                  onClick={() => setShowRankingModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Participants list for placement editing */}
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Participants</h3>
                {selectedTournament.placements.map((participant) => (
                  <div
                    key={participant.player_id}
                    className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-white font-medium min-w-[120px]">
                        {participant.player_name || 'Joueur inconnu'}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">Placement:</label>
                        <input
                          type="number"
                          min="1"
                          max={selectedTournament.placements.length}
                          value={editingPlacements[participant.player_id] || ''}
                          onChange={(e) => handlePlacementChange(participant.player_id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-center"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {participant.is_winner && (
                        <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-semibold">
                          🏆 VAINQUEUR
                        </span>
                      )}
                      <Button
                        onClick={() => setTournamentWinner(participant.player_id)}
                        disabled={participant.is_winner}
                        className={`text-xs ${
                          participant.is_winner 
                            ? 'bg-gray-500/20 text-gray-400 border-gray-400/50' 
                            : 'bg-green-500/20 text-green-200 border-green-400/70 hover:bg-green-500/30'
                        }`}
                        size="sm"
                      >
                        {participant.is_winner ? 'Vainqueur' : 'Désigner vainqueur'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTournament.placements.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>Aucun participant validé pour ce tournoi</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Button
                    onClick={autoSetWinnerFromFirstPlace}
                    disabled={!Object.values(editingPlacements).includes(1)}
                    className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/70 hover:bg-yellow-500/30"
                    size="sm"
                  >
                    🏆 Vainqueur auto (Placement #1)
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowRankingModal(false)}
                    className="bg-gray-500/20 text-gray-200 border border-gray-400/70 hover:bg-gray-500/30"
                    size="sm"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={savePlacements}
                    disabled={saving}
                    className="bg-blue-500/20 text-blue-200 border border-blue-400/70 hover:bg-blue-500/30"
                    size="sm"
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder le classement'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
