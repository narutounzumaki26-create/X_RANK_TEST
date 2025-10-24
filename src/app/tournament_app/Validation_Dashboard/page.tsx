"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

interface TournamentParticipant {
  player_id: string;
  tournament_id: string;
  is_validated: boolean;
  tournament_deck: string;
  created_at?: string;
  player?: {
    player_name: string;
    user_id: string;
  };
  tournament?: {
    name: string;
    date: string;
    location: string | null;
  };
  deck?: {
    deck_id: string;
    combo_id_1?: string;
    combo_id_2?: string;
    combo_id_3?: string;
  };
  combos?: {
    combo_id: string;
    name: string;
    blade?: { name: string };
    ratchet?: { name: string };
    bit?: { name: string };
    assist?: { name: string };
    lock_chip?: { name: string };
  }[];
}

type FilterType = "all" | "validated" | "pending";

export default function ParticipantValidationDashboard() {
  const router = useRouter();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [tournaments, setTournaments] = useState<{tournament_id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [updatingIds, setUpdatingIds] = useState<{player_id: string, tournament_id: string} | null>(null);
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(new Set());

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);

      // Get the most recent deck for each player-tournament combination
      const { data: participantsData, error } = await supabase
        .from("tournament_participants")
        .select(`
          *,
          player:player_id(player_name, user_id),
          tournament:tournament_id(name, date, location),
          deck:tournament_deck!inner(
            deck_id,
            combo_id_1,
            combo_id_2,
            combo_id_3
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique participants (most recent only)
      const uniqueParticipants = getMostRecentParticipants(participantsData || []);

      // Fetch combo details for each participant
      const participantsWithCombos = await Promise.all(
        uniqueParticipants.map(async (participant) => {
          if (!participant.deck) return participant;

          const comboIds = [
            participant.deck.combo_id_1,
            participant.deck.combo_id_2,
            participant.deck.combo_id_3,
          ].filter(Boolean) as string[];

          if (comboIds.length === 0) return participant;

          const { data: combosData, error: combosError } = await supabase
            .from("combos")
            .select(`
              combo_id,
              name,
              blade:blade_id(name),
              ratchet:ratchet_id(name),
              bit:bit_id(name),
              assist:assist_id(name),
              lock_chip:lock_chip_id(name)
            `)
            .in("combo_id", comboIds);

          if (combosError) {
            console.error("Error fetching combos:", combosError);
            return participant;
          }

          return {
            ...participant,
            combos: combosData || []
          };
        })
      );

      setParticipants(participantsWithCombos);
    } catch (error) {
      console.error("Error fetching participants:", error);
      alert("Erreur lors du chargement des participants");
    } finally {
      setLoading(false);
    }
  }, []);

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
      fetchTournaments();
      fetchParticipants();
    };

    checkAuthAndAdmin();
  }, [router, fetchParticipants]);

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

  // Get only the most recent participant entry for each player-tournament combination
  const getMostRecentParticipants = (allParticipants: TournamentParticipant[]): TournamentParticipant[] => {
    const participantMap = new Map();
    
    allParticipants.forEach(participant => {
      const key = `${participant.player_id}-${participant.tournament_id}`;
      const existing = participantMap.get(key);
      
      if (!existing || (participant.created_at && existing.created_at && new Date(participant.created_at) > new Date(existing.created_at))) {
        participantMap.set(key, participant);
      }
    });

    return Array.from(participantMap.values());
  };

  const toggleValidation = async (player_id: string, tournament_id: string, currentStatus: boolean) => {
    try {
      setUpdatingIds({player_id, tournament_id});
      
      const { error } = await supabase
        .from("tournament_participants")
        .update({ 
          is_validated: !currentStatus
        })
        .eq("player_id", player_id)
        .eq("tournament_id", tournament_id)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message || "Erreur de base de données");
      }

      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          p.player_id === player_id && p.tournament_id === tournament_id
            ? { ...p, is_validated: !currentStatus }
            : p
        )
      );

    } catch (error) {
      console.error("Error updating validation status:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erreur inconnue lors de la mise à jour";
      alert(`Erreur lors de la mise à jour: ${errorMessage}`);
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

      if (!confirm(`Êtes-vous sûr de vouloir valider ${pendingParticipants.length} participant(s) en attente ?`)) {
        return;
      }

      // Update each pending participant individually
      const updatePromises = pendingParticipants.map(participant =>
        supabase
          .from("tournament_participants")
          .update({ is_validated: true })
          .eq("player_id", participant.player_id)
          .eq("tournament_id", participant.tournament_id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error("Certaines validations ont échoué");
      }

      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          !p.is_validated ? { ...p, is_validated: true } : p
        )
      );

      alert(`${pendingParticipants.length} participant(s) validé(s) avec succès !`);

    } catch (error) {
      console.error("Error validating all:", error);
      alert("Erreur lors de la validation en masse");
    }
  };

  const toggleDeckExpansion = (playerId: string, tournamentId: string) => {
    const key = `${playerId}-${tournamentId}`;
    setExpandedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isDeckExpanded = (playerId: string, tournamentId: string) => {
    return expandedDecks.has(`${playerId}-${tournamentId}`);
  };

  const getFilteredParticipants = () => {
    let filtered = participants;

    // Apply tournament filter
    if (selectedTournament !== "all") {
      filtered = filtered.filter(p => p.tournament_id === selectedTournament);
    }

    // Apply status filter
    switch (filter) {
      case "validated":
        return filtered.filter(p => p.is_validated);
      case "pending":
        return filtered.filter(p => !p.is_validated);
      default:
        return filtered;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const isUpdating = (player_id: string, tournament_id: string) => {
    return updatingIds?.player_id === player_id && updatingIds?.tournament_id === tournament_id;
  };

  const getComboType = (combo: { assist?: { name: string }; lock_chip?: { name: string } }): string => {
    return combo.assist && combo.lock_chip ? "CX" : "Standard";
  };

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
              Dashboard administrateur - Deck le plus récent (max 3 combos)
            </p>
          </div>
          <MainMenuButton />
        </div>

        {/* Stats and Filters */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Stats */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">{filteredParticipants.length}</div>
            <div className="text-purple-200 text-sm">Participants Filtrés</div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {filteredParticipants.filter(p => p.is_validated).length}
            </div>
            <div className="text-green-200 text-sm">Validés</div>
          </div>
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {filteredParticipants.filter(p => !p.is_validated).length}
            </div>
            <div className="text-yellow-200 text-sm">En Attente</div>
          </div>

          {/* Tournament Filter */}
          <div className="bg-gray-800 rounded-xl p-6 border border-blue-500">
            <label className="block text-sm font-semibold text-blue-300 mb-3">
              🏆 Tournoi
            </label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les tournois</option>
              {tournaments.map(tournament => (
                <option key={tournament.tournament_id} value={tournament.tournament_id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="bg-gray-800 rounded-xl p-6 border border-purple-500">
            <label className="block text-sm font-semibold text-purple-300 mb-3">
              🔍 Statut
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-4 py-2 bg-gray-700 border border-purple-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="validated">Validés uniquement</option>
              <option value="pending">En attente uniquement</option>
            </select>
          </div>

          {/* Bulk Action */}
          <div className="bg-gray-800 rounded-xl p-6 border border-green-500">
            <label className="block text-sm font-semibold text-green-300 mb-3">
              ⚡ Action Groupée
            </label>
            <button
              onClick={validateAllPending}
              disabled={filteredParticipants.filter(p => !p.is_validated).length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg font-semibold transition-colors"
            >
              ✅ Tout Valider
            </button>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-gray-800 rounded-xl border border-purple-500 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-6 py-4 border-b border-purple-600">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-purple-200">
              <div className="col-span-2">Joueur</div>
              <div className="col-span-2">Tournoi</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">Lieu</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-3">Deck (3 combos max)</div>
              <div className="col-span-2">Actions</div>
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
                <div key={`${participant.player_id}-${participant.tournament_id}`}>
                  {/* Main Participant Row */}
                  <div className="px-6 py-4 hover:bg-gray-750 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Player */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white">
                          {participant.player?.player_name}
                        </div>
                        <div className="text-sm text-gray-400">
                          ID: {participant.player_id.substring(0, 8)}...
                        </div>
                      </div>

                      {/* Tournament */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white">
                          {participant.tournament?.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          ID: {participant.tournament_id.substring(0, 8)}...
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-1 text-gray-300 text-sm">
                        {participant.tournament?.date ? formatDate(participant.tournament.date) : 'N/A'}
                      </div>

                      {/* Location */}
                      <div className="col-span-1 text-gray-300 text-sm">
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

                      {/* Deck Summary */}
                      <div className="col-span-3">
                        {participant.combos && participant.combos.length > 0 ? (
                          <div className="text-sm">
                            <div className="text-white font-semibold mb-1">
                              Deck Récent ({participant.combos.length}/3 combos)
                            </div>
                            <div className="space-y-1">
                              {participant.combos.slice(0, 3).map((combo, index) => (
                                <div key={combo.combo_id} className="flex items-center justify-between bg-gray-700 px-2 py-1 rounded">
                                  <span className="text-white text-xs">
                                    Combo {index + 1}: {combo.name}
                                  </span>
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    getComboType(combo) === 'CX' ? 'bg-pink-600' : 'bg-blue-600'
                                  }`}>
                                    {getComboType(combo)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => toggleDeckExpansion(participant.player_id, participant.tournament_id)}
                              className="text-blue-400 hover:text-blue-300 text-xs mt-2"
                            >
                              {isDeckExpanded(participant.player_id, participant.tournament_id) ? "▲ Masquer détails" : "▼ Voir détails complets"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Aucun deck configuré</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2">
                        <button
                          onClick={() => toggleValidation(participant.player_id, participant.tournament_id, participant.is_validated)}
                          disabled={isUpdating(participant.player_id, participant.tournament_id)}
                          className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            participant.is_validated
                              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {isUpdating(participant.player_id, participant.tournament_id) ? (
                            "⏳..."
                          ) : participant.is_validated ? (
                            "❌ Invalider"
                          ) : (
                            "✅ Valider"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Deck Details */}
                  {isDeckExpanded(participant.player_id, participant.tournament_id) && participant.combos && participant.combos.length > 0 && (
                    <div className="bg-gray-750 px-6 py-4 border-t border-gray-600">
                      <h4 className="font-semibold text-purple-300 mb-3">🎯 Détails Complets du Deck</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {participant.combos.slice(0, 3).map((combo, index) => (
                          <div key={combo.combo_id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-semibold text-white text-lg">Combo {index + 1}</h5>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                getComboType(combo) === 'CX' ? 'bg-pink-600 text-white' : 'bg-blue-600 text-white'
                              }`}>
                                {getComboType(combo)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="text-gray-400 font-medium">Nom:</span>
                                <div className="text-white font-semibold mt-1">{combo.name}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {combo.blade && (
                                  <div>
                                    <span className="text-gray-400">🗡️ Blade:</span>
                                    <div className="text-white">{combo.blade.name}</div>
                                  </div>
                                )}
                                {combo.ratchet && (
                                  <div>
                                    <span className="text-gray-400">⚙️ Ratchet:</span>
                                    <div className="text-white">{combo.ratchet.name}</div>
                                  </div>
                                )}
                                {combo.bit && (
                                  <div>
                                    <span className="text-gray-400">🎯 Bit:</span>
                                    <div className="text-white">{combo.bit.name}</div>
                                  </div>
                                )}
                                {combo.assist && (
                                  <div>
                                    <span className="text-gray-400">🛡️ Assist:</span>
                                    <div className="text-white">{combo.assist.name}</div>
                                  </div>
                                )}
                                {combo.lock_chip && (
                                  <div>
                                    <span className="text-gray-400">🔒 Lock Chip:</span>
                                    <div className="text-white">{combo.lock_chip.name}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => { setFilter("pending"); setSelectedTournament("all"); }}
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
              onClick={() => router.push('/tournament_app/tournament-inscription')}
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
              <li>• Cliquez sur &quot;Valider&quot; pour approuver un participant</li>
              <li>• Cliquez sur &quot;Invalider&quot; pour retirer l&apos;approbation</li>
              <li>• Utilisez &quot;Tout Valider&quot; pour valider tous les participants en attente</li>
              <li>• Chaque joueur affiche son deck le plus récent (max 3 combos)</li>
              <li>• Cliquez sur &quot;Voir détails complets&quot; pour afficher les détails des combos</li>
            </ul>
          </div>
          <div>
            <strong>📊 Statistiques actuelles:</strong>
            <ul className="mt-2 space-y-1">
              <li>• {participants.filter(p => p.is_validated).length} participants validés</li>
              <li>• {participants.filter(p => !p.is_validated).length} participants en attente</li>
              <li>• {new Set(participants.map(p => p.tournament_id)).size} tournois actifs</li>
              <li>• {new Set(participants.map(p => p.player_id)).size} joueurs uniques</li>
              <li>• {participants.filter(p => p.combos && p.combos.length > 0).length} decks configurés</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
