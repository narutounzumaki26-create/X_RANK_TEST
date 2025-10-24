"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

interface Combo {
  combo_id: string;
  name: string;
  blade_id: string;
  ratchet_id: string;
  bit_id: string;
  assist_id: string | null;
  lock_chip_id: string | null;
  Date_Creation: string;
  blade?: {
    name: string;
    type?: string;
  };
  ratchet?: {
    name: string;
    type?: string;
  };
  bit?: {
    name: string;
    type?: string;
  };
  assist?: {
    name: string;
    type?: string;
  };
  lock_chip?: {
    name: string;
    type?: string;
  };
}

interface TournamentDeck {
  deck_id: string;
  player_id: string;
  tournament_id: string;
  combo_id_1?: string;
  combo_id_2?: string;
  combo_id_3?: string;
  player?: {
    player_name: string;
  };
  tournament?: {
    name: string;
    date: string;
  };
}

interface RecentCombo extends Combo {
  deck?: TournamentDeck;
  usage_count: number;
  last_used: string;
}

export default function AdminCombosDashboardPage() {
  const router = useRouter();
  const [recentCombos, setRecentCombos] = useState<RecentCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
      fetchRecentCombos();
    };

    checkAuthAndAdmin();
  }, [router]);

  const fetchRecentCombos = async () => {
    try {
      setLoading(true);

      // Fetch the 3 most recent combos
      const { data: combosData, error: combosError } = await supabase
        .from("combos")
        .select(`
          *,
          blade:blade_id(name, type),
          ratchet:ratchet_id(name, type),
          bit:bit_id(name, type),
          assist:assist_id(name, type),
          lock_chip:lock_chip_id(name, type)
        `)
        .order("Date_Creation", { ascending: false })
        .limit(3);

      if (combosError) throw combosError;

      // Fetch tournament decks to see which combos are being used
      const { data: decksData, error: decksError } = await supabase
        .from("tournament_decks")
        .select(`
          *,
          player:player_id(player_name),
          tournament:tournament_id(name, date)
        `);

      if (decksError) throw decksError;

      // Create a map of combo usage
      const comboUsage = new Map<string, { count: number; lastDeck?: TournamentDeck; lastUsed: string }>();

      decksData?.forEach(deck => {
        const comboIds = [
          deck.combo_id_1,
          deck.combo_id_2,
          deck.combo_id_3,
        ].filter(Boolean) as string[];

        comboIds.forEach(comboId => {
          const existing = comboUsage.get(comboId);
          const deckDate = deck.tournament?.date || new Date().toISOString();
          
          if (existing) {
            existing.count += 1;
            // Keep the most recent usage
            if (new Date(deckDate) > new Date(existing.lastUsed)) {
              existing.lastDeck = deck;
              existing.lastUsed = deckDate;
            }
          } else {
            comboUsage.set(comboId, {
              count: 1,
              lastDeck: deck,
              lastUsed: deckDate
            });
          }
        });
      });

      // Combine combo data with usage information
      const enrichedCombos: RecentCombo[] = (combosData || []).map(combo => {
        const usage = comboUsage.get(combo.combo_id);
        return {
          ...combo,
          usage_count: usage?.count || 0,
          last_used: usage?.lastUsed || combo.Date_Creation,
          deck: usage?.lastDeck
        };
      });

      setRecentCombos(enrichedCombos);
    } catch (error) {
      console.error("Error fetching recent combos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getComboType = (combo: Combo): string => {
    return combo.assist_id && combo.lock_chip_id ? "CX" : "Standard";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Vérification des permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Chargement des combos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-purple-400 mb-2">
              👑 Dashboard Admin - 3 Derniers Combos
            </h1>
            <p className="text-gray-300">
              Vue d&apos;administration des combos les plus récemment créés
            </p>
          </div>
          <MainMenuButton />
        </div>

        {/* Stats Summary */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">{recentCombos.length}</div>
            <div className="text-purple-200 text-sm">Combos Récents</div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {recentCombos.filter(c => c.usage_count > 0).length}
            </div>
            <div className="text-blue-200 text-sm">Combos Utilisés</div>
          </div>
          <div className="bg-gradient-to-r from-pink-600 to-pink-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold">
              {recentCombos.filter(c => getComboType(c) === "CX").length}
            </div>
            <div className="text-pink-200 text-sm">Combos CX</div>
          </div>
        </div>

        {/* 3 Recent Combos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recentCombos.map((combo, index) => (
            <div
              key={combo.combo_id}
              className="bg-gray-800 rounded-xl border-2 border-purple-500 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 overflow-hidden"
            >
              {/* Combo Header with Rank */}
              <div className="bg-gradient-to-r from-purple-700 to-purple-800 p-4 border-b border-purple-600">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                      #{index + 1}
                    </div>
                    <h3 className="font-bold text-lg text-white truncate">
                      {combo.name}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    getComboType(combo) === "CX" 
                      ? "bg-pink-600 text-white" 
                      : "bg-blue-600 text-white"
                  }`}>
                    {getComboType(combo)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-purple-200">
                  <span>Créé le {formatDate(combo.Date_Creation)}</span>
                  {combo.usage_count > 0 && (
                    <span className="text-green-300 font-semibold">
                      {combo.usage_count} usage{combo.usage_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Combo Details */}
              <div className="p-4">
                {/* Parts Breakdown */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-300">🗡️ Blade</span>
                    <span className="font-semibold text-white">{combo.blade?.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-300">⚙️ Ratchet</span>
                    <span className="font-semibold text-white">{combo.ratchet?.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-300">🎯 Bit</span>
                    <span className="font-semibold text-white">{combo.bit?.name}</span>
                  </div>
                  {combo.assist && (
                    <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-300">🛡️ Assist</span>
                      <span className="font-semibold text-white">{combo.assist.name}</span>
                    </div>
                  )}
                  {combo.lock_chip && (
                    <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-300">🔒 Lock Chip</span>
                      <span className="font-semibold text-white">{combo.lock_chip.name}</span>
                    </div>
                  )}
                </div>

                {/* Usage Info */}
                {combo.deck ? (
                  <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 rounded-lg p-3 border border-green-600">
                    <p className="text-sm text-green-300 mb-2 font-semibold">
                      ✅ Utilisé en tournoi
                    </p>
                    <p className="font-semibold text-white text-sm">
                      🏆 {combo.deck.tournament?.name}
                    </p>
                    <p className="text-sm text-gray-300">
                      👤 par {combo.deck.player?.player_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      📅 {formatDate(combo.last_used)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded-lg p-3 border border-yellow-600 text-center">
                    <p className="text-sm text-yellow-300 font-semibold">
                      ⚠️ Pas encore utilisé
                    </p>
                    <p className="text-xs text-yellow-200 mt-1">
                      En attente de premier usage
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              <div className="p-4 bg-gray-900 border-t border-gray-700">
                <div className="flex gap-2">
                  <button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                    onClick={() => {/* View details logic */}}
                  >
                    📊 Détails
                  </button>
                  <button 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                    onClick={() => {/* Delete logic */}}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {recentCombos.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-purple-500">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Aucun combo récent
            </h3>
            <p className="text-gray-400">
              Aucun combo n&apos;a été créé récemment.
            </p>
          </div>
        )}

        {/* Admin Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6 border border-blue-500">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">
            ⚡ Actions Rapides Admin
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              onClick={() => router.push('/tournament-inscription')}
            >
              ➕ Nouvelle Inscription
            </button>
            <button 
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              onClick={() => router.push('/tournament-management')}
            >
              🏆 Gérer Tournois
            </button>
            <button 
              className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              onClick={fetchRecentCombos}
            >
              🔄 Actualiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
