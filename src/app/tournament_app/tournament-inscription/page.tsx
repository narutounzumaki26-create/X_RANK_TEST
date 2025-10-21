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
}

interface Tournament {
  tournament_id: string;
  name: string;
  location: string | null;
  date: string;
  max_combos: number;
}

interface Combo {
  combo_id: string;
  name: string;
  blade_id: string;
  bit_id: string;
  ratchet_id: string;
  assist_id: string | null;
  lock_chip_id: string | null;
  blade?: { name: string; type?: string };
  bit?: { name: string; type?: string };
  ratchet?: { name: string; type?: string };
  assist?: { name: string; type?: string };
  lock_chip?: { name: string; type?: string };
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
  isExistingCombo?: boolean;
  existingComboId?: string;
};

export default function TournamentInscriptionPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: adminData } = await supabase
        .from("players")
        .select("Admin")
        .eq("user_id", user?.id)
        .single();
      if (adminData?.Admin === false) {
        router.push("/");
      }
    };

    checkAuth();
  }, [router]);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [beys, setBeys] = useState<Bey[]>([]);
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0);
  const [existingCombos, setExistingCombos] = useState<Combo[]>([]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<Tournament | null>(null);

  // Pièces
  const [blades, setBlades] = useState<{ blade_id: string; name: string; type?: string }[]>([]);
  const [bits, setBits] = useState<{ bit_id: string; name: string; type?: string }[]>([]);
  const [assists, setAssists] = useState<{ assist_id: string; name: string; type?: string }[]>([]);
  const [lockChips, setLockChips] = useState<{ lock_chip_id: string; name: string; type?: string }[]>([]);
  const [ratchets, setRatchets] = useState<{ ratchet_id: string; name: string; type?: string }[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*");
      if (error) console.error(error);
      else if (data) setPlayers(data.sort((a, b) => a.player_name.localeCompare(b.player_name)));
    };
    fetchPlayers();
  }, []);

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

  // Fetch existing combos when player is selected
  useEffect(() => {
    const fetchExistingCombos = async () => {
      if (!selectedPlayer) {
        setExistingCombos([]);
        return;
      }

      const { data, error } = await supabase
        .from("combos")
        .select(`
          *,
          blade:blade_id(name, type),
          bit:bit_id(name, type),
          ratchet:ratchet_id(name, type),
          assist:assist_id(name, type),
          lock_chip:lock_chip_id(name, type)
        `)
        .eq("player_id", selectedPlayer);

      if (error) {
        console.error("Error fetching combos:", error);
      } else if (data) {
        setExistingCombos(data);
      }
    };

    fetchExistingCombos();
  }, [selectedPlayer]);

  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    const details = tournaments.find((t) => t.tournament_id === tournamentId) || null;
    setTournamentDetails(details);

    if (details) {
      // Reset combo count and beys when tournament changes
      setSelectedComboCount(0);
      setBeys([]);
    }
  };

  const handleComboCountChange = (count: number) => {
    setSelectedComboCount(count);
    
    if (count > 0) {
      // Initialize the beys array with empty bey objects
      const initialBeys: Bey[] = Array(count).fill(null).map(() => ({ 
        cx: false,
        isExistingCombo: false 
      }));
      setBeys(initialBeys);
    } else {
      setBeys([]);
    }
  };

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev];
      // If changing from existing combo to new, clear the existing combo data
      if (newBeys[index].isExistingCombo && !value === newBeys[index].cx) {
        newBeys[index].isExistingCombo = false;
        newBeys[index].existingComboId = undefined;
      }
      newBeys[index].cx = value;
      return newBeys;
    });
  };

  const handleBeyPieceSelect = (
    index: number,
    type: BeyPieceKey,
    value: string,
    pieceType?: string
  ) => {
    const newBeys = [...beys];
    // If modifying a piece, it's no longer an existing combo
    if (newBeys[index].isExistingCombo) {
      newBeys[index].isExistingCombo = false;
      newBeys[index].existingComboId = undefined;
    }
    
    (newBeys[index][type] as string) = value;

    if (pieceType) {
      const typeKey = `${type}Type` as keyof Bey;
      (newBeys[index][typeKey] as string) = pieceType;
    }

    setBeys(newBeys);
  };

  const handleExistingComboSelect = (index: number, comboId: string) => {
    if (!comboId) {
      // Reset to empty bey
      setBeys(prev => {
        const newBeys = [...prev];
        newBeys[index] = { cx: false, isExistingCombo: false };
        return newBeys;
      });
      return;
    }

    const combo = existingCombos.find(c => c.combo_id === comboId);
    if (!combo) return;

    setBeys(prev => {
      const newBeys = [...prev];
      newBeys[index] = {
        cx: !!combo.lock_chip_id, // CX if has lock chip
        blade: combo.blade_id,
        bit: combo.bit_id,
        ratchet: combo.ratchet_id,
        assist: combo.assist_id || undefined,
        lockChip: combo.lock_chip_id || undefined,
        isExistingCombo: true,
        existingComboId: combo.combo_id
      };
      return newBeys;
    });
  };

  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedTournament) {
      alert("Veuillez sélectionner un joueur et un tournoi !");
      return;
    }

    if (selectedComboCount === 0) {
      alert("Veuillez sélectionner le nombre de combos !");
      return;
    }

    // Check if all required pieces are selected for each bey
    const incompleteBeys = beys.some((bey, index) => {
      if (bey.isExistingCombo) {
        // Existing combos are already complete
        return false;
      }
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

      for (let i = 0; i < beys.length; i++) {
        const bey = beys[i];
        
        if (bey.isExistingCombo && bey.existingComboId) {
          // Use existing combo
          comboIds.push(bey.existingComboId);
        } else {
          // Create new combo
          const { data: combo, error: comboError } = await supabase
            .from("combos")
            .insert({
              player_id: selectedPlayer,
              blade_id: bey.blade,
              ratchet_id: bey.ratchet,
              bit_id: bey.bit,
              assist_id: bey.assist || null,
              lock_chip_id: bey.lockChip || null,
              name: `Combo ${i + 1} - ${players.find(p => p.player_id === selectedPlayer)?.player_name}`,
            })
            .select()
            .single();
          if (comboError) throw comboError;
          comboIds.push(combo.combo_id);
        }
      }

      const deckInsert: Record<string, string> = {
        player_id: selectedPlayer,
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
          player_id: selectedPlayer,
          tournament_id: selectedTournament,
          tournament_deck: deck.deck_id,
          is_validated: false,
        });
      if (participantError) throw participantError;

      alert("Inscription réussie !");
      
      // Reset form
      setSelectedPlayer(null);
      setSelectedTournament(null);
      setTournamentDetails(null);
      setSelectedComboCount(0);
      setBeys([]);
      setExistingCombos([]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
        alert(`Erreur : ${err.message}`);
      } else {
        console.error(err);
        alert("Erreur lors de l'inscription.");
      }
    }
  };

  // Generate combo count options based on tournament max_combos
  const comboCountOptions = tournamentDetails 
    ? Array.from({ length: tournamentDetails.max_combos }, (_, i) => i + 1)
    : [];

const getComboDisplayName = (combo: Combo) => {
  // If the combo has a meaningful custom name (not the default pattern), use it
  if (combo.name && !combo.name.startsWith('Combo ') && !combo.name.includes(' - ')) {
    return combo.name;
  }
  
  // Otherwise, build a descriptive name from the pieces
  const bladeName = combo.blade?.name || 'Unknown Blade';
  const ratchetName = combo.ratchet?.name || 'Unknown Ratchet';
  const bitName = combo.bit?.name || 'Unknown Bit';
  
  let displayName = `${bladeName} | ${ratchetName} | ${bitName}`;
  
  // Add CX parts if present
  if (combo.lock_chip) {
    const lockChipName = combo.lock_chip?.name || 'Unknown Lock';
    const assistName = combo.assist?.name || 'Unknown Assist';
    displayName = `[CX] ${lockChipName} | ${bladeName} | ${assistName} | ${ratchetName} | ${bitName}`;
  }
  
  return displayName;
};
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        🚀 Inscription Tournoi
      </h1>

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
        </div>
      )}

      {/* Sélection joueur */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg">
        <label className="block mb-3 font-semibold text-green-300">👤 Joueur :</label>
        <Select onValueChange={setSelectedPlayer} value={selectedPlayer || undefined} disabled={!selectedTournament}>
          <SelectTrigger className="bg-gray-900 border border-green-600">
            <SelectValue placeholder="Choisir un joueur" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-white">
            {players.map(p => (
              <SelectItem key={p.player_id} value={p.player_id}>
                {p.player_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélection du nombre de combos */}
      {tournamentDetails && selectedPlayer && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-yellow-500 shadow-lg">
          <label className="block mb-3 font-semibold text-yellow-300">🔢 Nombre de combos :</label>
          <Select 
            onValueChange={(value) => handleComboCountChange(parseInt(value))} 
            value={selectedComboCount.toString()}
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
          </p>
        </div>
      )}

      {/* Beys - Only show if combo count is selected */}
      {selectedComboCount > 0 && beys.map((bey, index) => (
        <div
          key={`bey-${index}`}
          className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl"
        >
          <p className="text-lg font-bold mb-4 text-pink-300">🔥 Combo {index + 1}</p>

          {/* Sélection de combo existant */}
          {existingCombos.length > 0 && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-cyan-500">
              <label className="block mb-2 font-semibold text-cyan-300">
                🎯 Utiliser un combo existant :
              </label>
              <Select 
                onValueChange={(value) => handleExistingComboSelect(index, value)}
                value={bey.isExistingCombo ? bey.existingComboId : ""}
              >
                <SelectTrigger className="bg-gray-900 border border-cyan-600">
                  <SelectValue placeholder="Choisir un combo existant (optionnel)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-white">
                  <SelectItem value="">Créer un nouveau combo</SelectItem>
                  {existingCombos.map(combo => (
                    <SelectItem key={combo.combo_id} value={combo.combo_id}>
                      {getComboDisplayName(combo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-cyan-200">
                {bey.isExistingCombo 
                  ? "✓ Combo existant sélectionné - Les pièces seront pré-remplies"
                  : "Laisser vide pour créer un nouveau combo"
                }
              </p>
            </div>
          )}

          {/* Affichage conditionnel des pièces - seulement si pas de combo existant ou en modification */}
          {(!bey.isExistingCombo || (bey.isExistingCombo && Object.keys(bey).some(key => !['cx', 'isExistingCombo', 'existingComboId'].includes(key)))) && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <label className="font-semibold">CX ?</label>
                <input
                  type="checkbox"
                  checked={bey.cx}
                  onChange={e => handleBeyCxChange(index, e.target.checked)}
                  className="w-5 h-5 accent-pink-500"
                  disabled={bey.isExistingCombo}
                />
                {bey.isExistingCombo && (
                  <span className="text-sm text-cyan-300">(Défini par le combo existant)</span>
                )}
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
                      onValueChange={v => handleBeyPieceSelect(index, pieceKey, v)}
                      value={selectedValue}
                      disabled={bey.isExistingCombo}
                    >
                      <SelectTrigger className={`bg-gray-900 border ${bey.isExistingCombo ? 'border-cyan-600' : 'border-pink-600'}`}>
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

              {bey.isExistingCombo && (
                <p className="mt-3 text-sm text-cyan-300">
                  ⚠️ Modifier une pièce convertira ce combo en nouveau combo
                </p>
              )}
            </>
          )}
        </div>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!selectedTournament || !selectedPlayer || selectedComboCount === 0}
        className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        ⚡ S&apos;inscrire maintenant
      </Button>
    </div>
  );
}
