"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

interface TournamentParticipant {
  player_id: string;
  tournament_id: string;
  is_validated: boolean;
  player?: {
    player_name: string;
    user_id: string;
  };
  tournament?: {
    name: string;
    date: string;
    location: string | null;
  };
}

type FilterType = "all" | "validated" | "pending";

export default function ParticipantValidationDashboard() {
  const router = useRouter();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [tournaments, setTournaments] = useState<{ tournament_id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [updatingIds, setUpdatingIds] = useState<{ player_id: string; tournament_id: string } | null>(null);

  useEffect(() => {
    const checkAuthAndAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: playerData } = await supabase
        .from("players")
        .select("Admin")
        .eq("user_id", user.id)
        .single();

      if (!playerData?.Admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      fetchTournaments();
      fetchParticipants();
    };

    checkAuthAndAdmin();
  }, [router]);

  const fetchTournaments = async () => {
    try {
      const { data: tournamentsData, error } = await supabase
        .from("tournaments")
        .select("tournament_id, name")
        .order("name");

      if (error) throw error;
      setTournaments(tournamentsData || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const fetchParticipants = async () => {
    try {
      setLoading(true);

      const { data: participantsData, error } = await supabase
        .from("tournament_participants")
        .select(`
          *,
          player:player_id(player_name, user_id),
          tournament:tournament_id(name, date, location)
        `)
        .not("tournament_id", "is", null) // prevent orphaned tournament refs
        .order("tournament_id")
        .order("player_id");

      if (error) throw error;
      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      alert("Erreur lors du chargement des participants");
    } finally {
      setLoading(false);
    }
  };

  const toggleValidation = async (player_id: string, tournament_id: string, currentStatus: boolean) => {
    try {
      setUpdatingIds({ player_id, tournament_id });

      const { error } = await supabase
        .from("tournament_participants")
        .update({ is_validated: !currentStatus })
        .eq("player_id", player_id)
        .eq("tournament_id", tournament_id)
        .select();

      if (error) throw new Error(error.message);

      setParticipants(prev =>
        prev.map(p =>
          p.player_id === player_id && p.tournament_id === tournament_id
            ? { ...p, is_validated: !currentStatus }
            : p
        )
      );
    } catch (error) {
      console.error("Error updating validation status:", error);
      alert("Erreur lors de la mise à jour");
    } finally {
      setUpdatingIds(null);
    }
  };

  const validateAllPending = async () => {
    try {
      const pendingParticipants = getFilteredParticipants().filter(p => !p.is_validated);

      if (pendingParticipants.length === 0) {
        alert("Aucun participant en attente de validation");
        return;
      }

      if (!confirm(`Êtes-vous sûr de vouloir valider ${pendingParticipants.length} participant(s) ?`)) return;

      const updatePromises = pendingParticipants.map(participant =>
        supabase
          .from("tournament_participants")
          .update({ is_validated: true })
          .eq("player_id", participant.player_id)
          .eq("tournament_id", participant.tournament_id)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error("Certaines validations ont échoué");

      setParticipants(prev => prev.map(p => ({ ...p, is_validated: true })));
      alert(`${pendingParticipants.length} participant(s) validé(s) avec succès !`);
    } catch (error) {
      console.error("Error validating all:", error);
      alert("Erreur lors de la validation en masse");
    }
  };

  const handleDeleteTournament = async (tournament_id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce tournoi ? Cette action est irréversible.")) return;

    try {
      // Delete tournament (ensure cascade is active in DB)
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("tournament_id", tournament_id);

      if (error) throw error;

      // Refresh lists
      await fetchTournaments();
      await fetchParticipants();

      alert("Tournoi supprimé avec succès !");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      alert("Erreur lors de la suppression du tournoi (vérifiez les contraintes ou participants liés).");
    }
  };

  const getFilteredParticipants = () => {
    let filtered = participants;

    if (selectedTournament !== "all") {
      filtered = filtered.filter(p => p.tournament_id === selectedTournament);
    }

    switch (filter) {
      case "validated":
        return filtered.filter(p => p.is_validated);
      case "pending":
        return filtered.filter(p => !p.is_validated);
      default:
        return filtered;
    }
  };

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  const isUpdating = (player_id: string, tournament_id: string) =>
    updatingIds?.player_id === player_id && updatingIds?.tournament_id === tournament_id;

  const filteredParticipants = getFilteredParticipants();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Vérification des permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-purple-400 mb-2">
              👑 Validation des Participants
            </h1>
            <p className="text-gray-300">
              Dashboard administrateur - Gestion des validations de tournoi
            </p>
          </div>
          <MainMenuButton />
        </div>

        {/* Existing Stats and Filters */}
        {/* ... unchanged ... */}

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-blue-500">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">
            ⚡ Actions Rapides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <button
              onClick={() => setFilter("pending")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              👀 Voir En Attente
            </button>
            <button
              onClick={validateAllPending}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              ✅ Tout Valider
            </button>
            <button
              onClick={fetchParticipants}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={() => router.push("/tournament_app/tournament-inscription")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              🏆 Gérer Tournois
            </button>
            {selectedTournament !== "all" && (
              <button
                onClick={() => handleDeleteTournament(selectedTournament)}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                🗑️ Supprimer Tournoi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
