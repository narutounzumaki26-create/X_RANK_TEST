"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
};

export default function TournamentInscriptionPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [beys, setBeys] = useState<Bey[]>([]);

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
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: players, error: playerError } = await supabase
      .from("players")
      .select("player_name,Admin")
      .eq("user_id", user?.id)
      .single()

      if (!user || playerError || !players) {
        router.push("/login");
      } else if (players?.Admin === false) {
        router.push("/");
      }
    };

    checkAuth();
  }, [supabase, router, playerError, players]);

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
      const { data: bladeData } = await supabase.from("blades").select("*");
      const { data: bitData } = await supabase.from("bits").select("*");
      const { data: assistData } = await supabase.from("assists").select("*");
      const { data: lockChipData } = await supabase.from("lock_chips").select("*");
      const { data: ratchetData } = await supabase.from("ratchets").select("*");

      if (bladeData) setBlades(bladeData.sort((a, b) => a.name.localeCompare(b.name)));
      if (bitData) setBits(bitData.sort((a, b) => a.name.localeCompare(b.name)));
      if (assistData) setAssists(assistData.sort((a, b) => a.name.localeCompare(b.name)));
      if (lockChipData) setLockChips(lockChipData.sort((a, b) => a.name.localeCompare(b.name)));
      if (ratchetData) setRatchets(ratchetData.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchPieces();
  }, []);

  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    const details = tournaments.find((t) => t.tournament_id === tournamentId) || null;
    setTournamentDetails(details);

    if (details) {
      const initialBeys: Bey[] = Array(details.max_combos).fill(null).map(() => ({ cx: false }));
      setBeys(initialBeys);
    }
  };

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev];
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

  // Forcer TypeScript à accepter que c'est bien un string
  (newBeys[index][type] as string) = value;

  if (pieceType) {
    const typeKey = `${type}Type` as keyof Bey;
    (newBeys[index][typeKey] as string) = pieceType;
  }

  setBeys(newBeys);
};


  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedTournament) {
      alert("Veuillez sélectionner un joueur et un tournoi !");
      return;
    }

    try {
      const comboIds: string[] = [];

      for (let i = 0; i < beys.length; i++) {
        const bey = beys[i];
        const { data: combo, error: comboError } = await supabase
          .from("combos")
          .insert({
            blade_id: bey.blade,
            ratchet_id: bey.ratchet,
            bit_id: bey.bit,
            assist_id: bey.assist || null,
            lock_chip_id: bey.lockChip || null,
            name: `Combo ${i + 1} - ${selectedPlayer}`,
          })
          .select()
          .single();
        if (comboError) throw comboError;
        comboIds.push(combo.combo_id);
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
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

      {/* Beys */}
      {beys.map((bey, index) => (
        <div
          key={`bey-${index}`}
          className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl"
        >
          <p className="text-lg font-bold mb-4 text-pink-300">🔥 Bey {index + 1}</p>
          <div className="mb-4 flex items-center gap-2">
            <label className="font-semibold">CX ?</label>
            <input
              type="checkbox"
              checked={bey.cx}
              onChange={e => handleBeyCxChange(index, e.target.checked)}
              className="w-5 h-5 accent-pink-500"
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
                  onValueChange={v => handleBeyPieceSelect(index, pieceKey, v)}
                  value={selectedValue}
                >
                  <SelectTrigger className="bg-gray-900 border border-pink-600">
                    <SelectValue placeholder={label} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white">
                    {options.map(o => {
                      const idKey = `${pieceKey}_id` as keyof typeof o;
                      const optionValue = o[idKey] as string;
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

      <Button
        onClick={handleSubmit}
        disabled={!selectedTournament}
        className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200"
      >
        ⚡ S&apos;inscrire maintenant
      </Button>
    </div>
  );
}
