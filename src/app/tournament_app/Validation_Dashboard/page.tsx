"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

interface TournamentParticipant {
  participant_id: string;
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

export default function ParticipantValidationDashboard() {
  const router = useRouter();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"all" | "validated" | "pending">("all");

  useEffect(() => {
    const checkAuthAndAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin
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
      fetchParticipants();
    };

    checkAuthAndAdmin();
  }, [router]);

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
        .order("tournament_id")
        .order("player_id");

      if (error) throw error;
      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleValidation = async (participantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ is_validated: !currentStatus })
        .eq("participant_id", participantId);

      if (error) throw error;

      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          p.participant_id === participantId
            ? { ...p, is_validated: !currentStatus }
            : p
        )
      );
    } catch (error) {
      console.error("Error updating validation status:", error);
      alert("Erreur lors de la mise à jour du statut de validation");
    }
  };

  const filteredParticipants = participants.filter(participant => {
    switch (filter) {
      case "validated":
        return participant.is_validated;
      case "pending":
        return !participant.is_validated;
      default:
        return true;
    }
  });

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

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

        {/* Stats and Filters */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Stats */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">{participants.length}</div>
            <div className="text-purple-200 text-sm">Total Participants</div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {participants.filter(p => p.is_validated).length}
            </div>
            <div className="text-green-200 text-sm">Validés</div>
          </div>
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {participants.filter(p => !p.is_validated).length}
            </div>
            <div className="text-yellow-200 text-sm">En Attente</div>
          </div>

          {/* Filter */}
          <div className="bg-gray-800 rounded-xl p-6 border border-blue-500">
            <label className="block text-sm font-semibold text-blue-300 mb-3">
              🔍 Filtre
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les participants</option>
              <option value="validated">Validés uniquement</option>
              <option value="pending">En attente uniquement</option>
            </select>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-gray-800 rounded-xl border border-purple-500 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-6 py-4 border-b border-purple-600">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-purple-200">
              <div className="col-span-3">Joueur</div>
              <div className="col-span-3">Tournoi</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Lieu</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-700">
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400">
                Chargement des participants...
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">
                Aucun participant trouvé
              </div>
            ) : (
              filteredParticipants.map((participant) => (
                <div
                  key={participant.participant_id}
                  className="px-6 py-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Player */}
                    <div className="col-span-3">
                      <div className="font-semibold text-white">
                        {participant.player?.player_name}
                      </div>
                      <div className="text-sm text-gray-400">
                        ID: {participant.player_id.substring(0, 8)}...
                      </div>
                    </div>

                    {/* Tournament */}
                    <div className="col-span-3">
                      <div className="font-semibold text-white">
                        {participant.tournament?.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        ID: {participant.tournament_id.substring(0, 8)}...
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-gray-300">
                      {participant.tournament?.date ? formatDate(participant.tournament.date) : 'N/A'}
                    </div>

                    {/* Location */}
                    <div className="col-span-2 text-gray-300">
                      {participant.tournament?.location || 'Non spécifié'}
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          participant.is_validated
                            ? "bg-green-600 text-white"
                            : "bg-yellow-600 text-white"
                        }`}
                      >
                        {participant.is_validated ? "✅ Validé" : "⏳ En attente"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <button
                        onClick={() => toggleValidation(participant.participant_id, participant.is_validated)}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                          participant.is_validated
                            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {participant.is_validated ? "❌ Invalider" : "✅ Valider"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-blue-500">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">
            ⚡ Actions Rapides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setFilter("pending")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              👀 Voir En Attente
            </button>
            <button
              onClick={fetchParticipants}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={() => router.push('/tournament-management')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              🏆 Gérer Tournois
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
          <div>
            <strong>ℹ️ Instructions:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Cliquez sur "Valider" pour approuver un participant</li>
              <li>• Cliquez sur "Invalider" pour retirer l&apos;approbation</li>
              <li>• Utilisez le filtre pour voir les participants en attente</li>
            </ul>
          </div>
          <div>
            <strong>📊 Statistiques actuelles:</strong>
            <ul className="mt-2 space-y-1">
              <li>• {participants.filter(p => p.is_validated).length} participants validés</li>
              <li>• {participants.filter(p => !p.is_validated).length} participants en attente</li>
              <li>• {new Set(participants.map(p => p.tournament_id)).size} tournois actifs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
