"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

interface Player {
  player_id: string;
  player_name: string;
  user_id: string;
  Admin?: boolean;
}

interface Tournament {
  tournament_id: string;
  name: string;
  location: string | null;
  date: string;
  max_combos: number;
}

interface TournamentDeck {
  deck_id: string;
  player_id: string;
  tournament_id: string;
  combo_id_1?: string;
  combo_id_2?: string;
  combo_id_3?: string;
  combo_id_4?: string;
  combo_id_5?: string;
}

interface TournamentParticipant {
  player_id: string;
  tournament_id: string;
  tournament_deck: string;
  is_validated: boolean;
  validated_at?: string;
  placement?: number;
  inscription_id?: string;
}

type BeyPieceKey = "blade" | "bit" | "ratchet" | "assist" | "lockChip";

type Bey = {
  cx: boolean;
  blade?: string;
  bladeType?: string;
  bit?: string;
  bitType?: string;
  ratchet?: string;
  ratchetType?: string;
  assist?: string;
  assistType?: string;
  lockChip?: string;
  lockChipType?: string;
  existingComboId?: string;
};

export default function TournamentInscriptionPage() {
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get player data for current user
      const { data: playerData } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (playerData) {
        setCurrentPlayer(playerData);
        setIsAdmin(playerData.Admin === true);
      } else {
        console.error("Player not found for user");
        router.push("/");
      }

      // If admin, fetch all players for selection
      if (playerData?.Admin) {
        const { data: allPlayersData } = await supabase
          .from("players")
          .select("*")
          .order("player_name");
        if (allPlayersData) setAllPlayers(allPlayersData);
      }
    };

    checkAuth();
  }, [router]);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [beys, setBeys] = useState<Bey[]>([]);
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0);
  const [existingDeck, setExistingDeck] = useState<TournamentDeck | null>(null);
  const [existingParticipant, setExistingParticipant] = useState<TournamentParticipant | null>(null);

  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<Tournament | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Pièces
  const [blades, setBlades] = useState<{ blade_id: string; name: string; type?: string }[]>([]);
  const [bits, setBits] = useState<{ bit_id: string; name: string; type?: string }[]>([]);
  const [assists, setAssists] = useState<{ assist_id: string; name: string; type?: string }[]>([]);
  const [lockChips, setLockChips] = useState<{ lock_chip_id: string; name: string; type?: string }[]>([]);
  const [ratchets, setRatchets] = useState<{ ratchet_id: string; name: string; type?: string }[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase.from("tournaments").select("*").eq("status", "planned");
      if (error) console.error(error);
      else if (data) setTournaments(data);
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchPieces = async () => {
      const { data: bladeData } = await supabase.from("blade").select("*");
      const { data: bitData } = await supabase.from("bit").select("*");
      const { data: assistData } = await supabase.from("assist").select("*");
      const { data: lockChipData } = await supabase.from("lock_chip").select("*");
      const { data: ratchetData } = await supabase.from("ratchet").select("*");

      if (bladeData) setBlades(bladeData.sort((a, b) => a.name.localeCompare(b.name)));
      if (bitData) setBits(bitData.sort((a, b) => a.name.localeCompare(b.name)));
      if (assistData) setAssists(assistData.sort((a, b) => a.name.localeCompare(b.name)));
      if (lockChipData) setLockChips(lockChipData.sort((a, b) => a.name.localeCompare(b.name)));
      if (ratchetData) setRatchets(ratchetData.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchPieces();
  }, []);

  // Determine which player to use (current user or admin selection)
  const targetPlayerId = isAdmin ? selectedPlayer : currentPlayer?.player_id;

  const handleTournamentSelect = async (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    const details = tournaments.find((t) => t.tournament_id === tournamentId) || null;
    setTournamentDetails(details);

    if (details && targetPlayerId) {
      // Check if player is already registered for this tournament
      const { data: participantData } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("player_id", targetPlayerId)
        .eq("tournament_id", tournamentId)
        .single();

      if (participantData) {
        setExistingParticipant(participantData);
        
        // Fetch existing deck
        const { data: deckData } = await supabase
          .from("tournament_decks")
          .select("*")
          .eq("deck_id", participantData.tournament_deck)
          .single();

        if (deckData) {
          setExistingDeck(deckData);
          await loadExistingCombos(deckData, details.max_combos);
        }
      } else {
        // Reset for new registration
        setExistingDeck(null);
        setExistingParticipant(null);
        setSelectedComboCount(0);
        setBeys([]);
      }
    }
  };

  const loadExistingCombos = async (deck: TournamentDeck, maxCombos: number) => {
    const comboIds = [
      deck.combo_id_1,
      deck.combo_id_2,
      deck.combo_id_3,
      deck.combo_id_4,
      deck.combo_id_5,
    ].filter(Boolean).slice(0, maxCombos) as string[];

    setSelectedComboCount(comboIds.length);

    // Fetch combo details
    const { data: combosData } = await supabase
      .from("combos")
      .select("*")
      .in("combo_id", comboIds);

    if (combosData) {
      const existingBeys: Bey[] = combosData.map(combo => {
        const isCx = !!(combo.assist_id && combo.lock_chip_id);
        
        return {
          cx: isCx,
          blade: combo.blade_id,
          ratchet: combo.ratchet_id,
          bit: combo.bit_id,
          assist: combo.assist_id || undefined,
          lockChip: combo.lock_chip_id || undefined,
          existingComboId: combo.combo_id
        };
      });

      // Fill remaining slots with empty beys if needed
      while (existingBeys.length < maxCombos) {
        existingBeys.push({ cx: false });
      }

      setBeys(existingBeys.slice(0, maxCombos));
    }
  };

  const handleComboCountChange = (count: number) => {
    setSelectedComboCount(count);
    
    if (count > 0) {
      const newBeys: Bey[] = [];
      for (let i = 0; i < count; i++) {
        if (i < beys.length && beys[i].existingComboId) {
          newBeys.push(beys[i]);
        } else {
          newBeys.push({ cx: false });
        }
      }
      setBeys(newBeys);
    } else {
      setBeys([]);
    }
  };

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev];
      newBeys[index] = {
        ...newBeys[index],
        cx: value,
        ...(value === false ? { assist: undefined, lockChip: undefined } : {})
      };
      return newBeys;
    });
  };

  const handleBeyPieceSelect = (
    index: number,
    type: BeyPieceKey,
    value: string
  ) => {
    const newBeys = [...beys];
    newBeys[index] = {
      ...newBeys[index],
      [type]: value,
      existingComboId: undefined
    };

    setBeys(newBeys);
  };

  const generateComboName = (bey: Bey): string => {
    const parts: string[] = [];

    if (bey.blade) {
      const blade = blades.find(b => b.blade_id === bey.blade);
      if (blade) parts.push(blade.name);
    }

    if (bey.ratchet) {
      const ratchet = ratchets.find(r => r.ratchet_id === bey.ratchet);
      if (ratchet) parts.push(ratchet.name);
    }

    if (bey.bit) {
      const bit = bits.find(b => b.bit_id === bey.bit);
      if (bit) parts.push(bit.name);
    }

    if (bey.cx) {
      if (bey.assist) {
        const assist = assists.find(a => a.assist_id === bey.assist);
        if (assist) parts.push(assist.name);
      }
      if (bey.lockChip) {
        const lockChip = lockChips.find(l => l.lock_chip_id === bey.lockChip);
        if (lockChip) parts.push(lockChip.name);
      }
    }

    if (parts.length > 0) {
      return parts.join('-');
    }

    return "Nouveau Combo";
  };

  const getCurrentComboName = (bey: Bey, index: number): string => {
    const baseName = generateComboName(bey);
    return baseName === "Nouveau Combo" ? `Combo ${index + 1}` : `Combo ${index + 1} - ${baseName}`;
  };

  const handleSubmit = async () => {
    if (!targetPlayerId || !selectedTournament) {
      alert("Erreur d&apos;authentification ou tournoi non sélectionné !");
      return;
    }

    if (selectedComboCount === 0) {
      alert("Veuillez sélectionner le nombre de combos !");
      return;
    }

    // Check if all required pieces are selected for each bey
    const incompleteBeys = beys.slice(0, selectedComboCount).some((bey) => {
      if (bey.cx) {
        return !bey.lockChip || !bey.blade || !bey.assist || !bey.ratchet || !bey.bit;
      } else {
        return !bey.blade || !bey.ratchet || !bey.bit;
      }
    });

    if (incompleteBeys) {
      alert("Veuillez sélectionner toutes les pièces requises pour chaque combo !");
      return;
    }

    try {
      const comboIds: string[] = [];

      for (let i = 0; i < selectedComboCount; i++) {
        const bey = beys[i];
        
        if (bey.existingComboId) {
          // Update existing combo
          const comboName = generateComboName(bey);
          const { error: updateError } = await supabase
            .from("combos")
            .update({
              blade_id: bey.blade,
              ratchet_id: bey.ratchet,
              bit_id: bey.bit,
              assist_id: bey.assist || null,
              lock_chip_id: bey.lockChip || null,
              name: comboName,
            })
            .eq("combo_id", bey.existingComboId);

          if (updateError) throw updateError;
          comboIds.push(bey.existingComboId);
        } else {
          // Create new combo
          const comboName = generateComboName(bey);
          const { data: combo, error: comboError } = await supabase
            .from("combos")
            .insert({
              blade_id: bey.blade,
              ratchet_id: bey.ratchet,
              bit_id: bey.bit,
              assist_id: bey.assist || null,
              lock_chip_id: bey.lockChip || null,
              name: comboName,
            })
            .select()
            .single();
          if (comboError) throw comboError;
          comboIds.push(combo.combo_id);
        }
      }

      if (existingDeck) {
        // Update existing deck
        const deckUpdate: Record<string, string> = {};
        comboIds.forEach((id, idx) => {
          deckUpdate[`combo_id_${idx + 1}`] = id;
        });

        const { error: deckError } = await supabase
          .from("tournament_decks")
          .update(deckUpdate)
          .eq("deck_id", existingDeck.deck_id);

        if (deckError) throw deckError;

        alert("Deck mis à jour avec succès !");
      } else {
        // Create new deck and registration
        const deckInsert: Record<string, string> = {
          player_id: targetPlayerId,
          tournament_id: selectedTournament,
        };
        comboIds.forEach((id, idx) => {
          deckInsert[`combo_id_${idx + 1}`] = id;
        });

        const { data: deck, error: deckError } = await supabase
          .from("tournament_decks")
          .insert(deckInsert)
          .select()
          .single();
        if (deckError) throw deckError;

        const { error: participantError } = await supabase
          .from("tournament_participants")
          .insert({
            player_id: targetPlayerId,
            tournament_id: selectedTournament,
            tournament_deck: deck.deck_id,
            is_validated: false,
          });
        if (participantError) throw participantError;

        alert("Inscription réussie !");
      }

      // Refresh data
      if (selectedTournament) {
        handleTournamentSelect(selectedTournament);
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
        alert(`Erreur : ${err.message}`);
      } else {
        console.error(err);
        alert("Erreur lors de l&apos;inscription.");
      }
    }
  };

  const handleCancelRegistration = async () => {
    if (!existingParticipant || !existingDeck || !targetPlayerId || !selectedTournament) return;

    if (confirm("Êtes-vous sûr de vouloir annuler cette inscription ?")) {
      try {
        // Delete participant using composite key (tournament_id + player_id)
        const { error: participantError } = await supabase
          .from("tournament_participants")
          .delete()
          .eq("player_id", targetPlayerId)
          .eq("tournament_id", selectedTournament);

        if (participantError) throw participantError;

        // Delete deck
        const { error: deckError } = await supabase
          .from("tournament_decks")
          .delete()
          .eq("deck_id", existingDeck.deck_id);

        if (deckError) throw deckError;

        alert("Inscription annulée avec succès !");
        
        // Reset form
        setSelectedTournament(null);
        setTournamentDetails(null);
        setExistingDeck(null);
        setExistingParticipant(null);
        setSelectedComboCount(0);
        setBeys([]);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l&apos;annulation.");
      }
    }
  };

  // Generate combo count options based on tournament max_combos
  const comboCountOptions = tournamentDetails 
    ? Array.from({ length: tournamentDetails.max_combos }, (_, i) => i + 1)
    : [];

  if (!currentPlayer) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-300">
          Connecté en tant que : <span className="font-semibold text-purple-300">{currentPlayer.player_name}</span>
          {isAdmin && <span className="ml-2 px-2 py-1 bg-red-600 rounded text-xs">ADMIN</span>}
        </div>
        <MainMenuButton />
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        🚀 Inscription Tournoi
      </h1>

      {/* Admin Player Selection */}
      {isAdmin && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-red-500 shadow-lg">
          <label className="block mb-3 font-semibold text-red-300">👑 Sélection du Joueur (Admin) :</label>
          <Select onValueChange={setSelectedPlayer} value={selectedPlayer || undefined}>
            <SelectTrigger className="bg-gray-900 border border-red-600">
              <SelectValue placeholder="Choisir un joueur" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 text-white">
              {allPlayers.map(p => (
                <SelectItem key={p.player_id} value={p.player_id}>
                  {p.player_name} {p.Admin && "👑"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm text-red-200">
            Mode Admin : Vous pouvez inscrire n&apos;importe quel joueur
          </p>
        </div>
      )}

      {/* Sélection du tournoi */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
        <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
        <Select onValueChange={handleTournamentSelect} value={selectedTournament || undefined}>
          <SelectTrigger className="bg-gray-900 border border-purple-600">
            <SelectValue placeholder="Choisir un tournoi" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-white">
            {tournaments.map(t => (
              <SelectItem key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Récap tournoi */}
      {tournamentDetails && (
        <div className="mb-8 p-6 bg-gray-800/70 rounded-xl border border-blue-500 shadow-md">
          <p><span className="font-bold text-blue-300">🏆 Nom :</span> {tournamentDetails.name}</p>
          <p><span className="font-bold text-blue-300">📍 Lieu :</span> {tournamentDetails.location || "Non spécifié"}</p>
          <p><span className="font-bold text-blue-300">📅 Date :</span> {new Date(tournamentDetails.date).toLocaleDateString()}</p>
          <p><span className="font-bold text-blue-300">🔢 Combos maximum :</span> {tournamentDetails.max_combos}</p>
          {existingParticipant && (
            <div className="mt-3 p-3 bg-yellow-600/20 rounded-lg border border-yellow-500">
              <p className="text-yellow-300 font-semibold">
                ✅ {isAdmin ? "Le joueur est déjà inscrit" : "Vous êtes déjà inscrit"} à ce tournoi
                {existingParticipant.is_validated && " (Validé)"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sélection du nombre de combos */}
      {tournamentDetails && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-yellow-500 shadow-lg">
          <label className="block mb-3 font-semibold text-yellow-300">🔢 Nombre de combos :</label>
          <Select 
            onValueChange={(value) => handleComboCountChange(parseInt(value))} 
            value={selectedComboCount.toString()}
            disabled={existingParticipant?.is_validated}
          >
            <SelectTrigger className="bg-gray-900 border border-yellow-600">
              <SelectValue placeholder="Choisir le nombre de combos" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 text-white">
              <SelectItem value="0">Sélectionner...</SelectItem>
              {comboCountOptions.map(count => (
                <SelectItem key={count} value={count.toString()}>
                  {count} combo{count > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm text-yellow-200">
            Choisissez entre 1 et {tournamentDetails.max_combos} combo(s) pour ce tournoi
            {existingParticipant?.is_validated && (
              <span className="block text-red-300 mt-1">
                ⚠️ L&apos;inscription est validée, vous ne pouvez plus modifier le nombre de combos
              </span>
            )}
          </p>
        </div>
      )}

      {/* Beys - Only show if combo count is selected */}
      {selectedComboCount > 0 && beys.slice(0, selectedComboCount).map((bey, index) => (
        <div
          key={`bey-${index}-${bey.existingComboId || 'new'}`}
          className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl"
        >
          {/* Display auto-generated combo name */}
          <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-pink-600">
            <p className="text-sm font-semibold text-pink-300 mb-1">Nom du Combo :</p>
            <p className="text-white font-mono">{getCurrentComboName(bey, index)}</p>
            {bey.existingComboId && (
              <p className="text-xs text-green-400 mt-1">
                ✨ Combo existant - Les modifications créeront un nouveau combo
              </p>
            )}
          </div>

          <p className="text-lg font-bold mb-4 text-pink-300">
            🔥 Combo {index + 1} 
            {bey.existingComboId && " (Existant)"}
          </p>
          
          <div className="mb-4 flex items-center gap-2">
            <label className="font-semibold">CX ?</label>
            <input
              type="checkbox"
              checked={bey.cx}
              onChange={e => handleBeyCxChange(index, e.target.checked)}
              className="w-5 h-5 accent-pink-500"
              disabled={existingParticipant?.is_validated}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(bey.cx
              ? [
                  { key: "lockChip", options: lockChips, label: "Lock Chip" },
                  { key: "blade", options: blades, label: "Blade" },
                  { key: "assist", options: assists, label: "Assist" },
                  { key: "ratchet", options: ratchets, label: "Ratchet" },
                  { key: "bit", options: bits, label: "Bit" },
                ]
              : [
                  { key: "blade", options: blades, label: "Blade" },
                  { key: "ratchet", options: ratchets, label: "Ratchet" },
                  { key: "bit", options: bits, label: "Bit" },
                ]
            ).map(({ key, options, label }) => {
              const pieceKey = key as BeyPieceKey;
              const selectedValue = bey[pieceKey] ?? "";

              return (
                <Select
                  key={pieceKey}
                  onValueChange={(v) => handleBeyPieceSelect(index, pieceKey, v)}
                  value={selectedValue}
                  disabled={existingParticipant?.is_validated}
                >
                  <SelectTrigger className="bg-gray-900 border border-pink-600">
                    <SelectValue placeholder={label} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white">
                    {options.map(o => {
                      const idKey =
                        pieceKey === "lockChip"
                          ? "lock_chip_id"
                          : `${pieceKey}_id`;
                      const optionValue = o[idKey as keyof typeof o] as string;
                      return (
                        <SelectItem key={optionValue} value={optionValue}>
                          {o.name} {o.type ? `(${o.type})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-4">
        {existingParticipant && (
          <Button
            onClick={handleCancelRegistration}
            className="flex-1 py-3 text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all duration-200"
            disabled={existingParticipant?.is_validated && !isAdmin}
          >
            ❌ {isAdmin ? "Annuler l&apos;inscription" : "Se désinscrire"}
          </Button>
        )}
        
        <Button
          onClick={handleSubmit}
          disabled={!selectedTournament || selectedComboCount === 0 || (existingParticipant?.is_validated && !isAdmin)}
          className="flex-1 py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {existingParticipant ? "💾 Modifier le Deck" : "⚡ S&apos;inscrire maintenant"}
        </Button>
      </div>

      {existingParticipant?.is_validated && (
        <div className="mt-4 p-4 bg-green-600/20 rounded-lg border border-green-500">
          <p className="text-green-300 text-center">
            ✅ L&apos;inscription est validée {!isAdmin && "et ne peut plus être modifiée"}
          </p>
          {isAdmin && (
            <p className="text-yellow-300 text-center text-sm mt-1">
              👑 Mode Admin : Vous pouvez toujours modifier cette inscription
            </p>
          )}
        </div>
      )}
    </div>
  );
}
