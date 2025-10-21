"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Player {
  player_id: string;
  player_name: string;
}

interface Tournament {
  tournament_id: string;
  name: string;
  status: string;
  date: string;
  location?: string;
  max_combos: number;
}

interface Combo {
  combo_id: string;
  name: string | null;
  player_id: string;
  blade_id?: string | null;
  bit_id?: string | null;
  ratchet_id?: string | null;
  assist_id?: string | null;
  lock_chip_id?: string | null;
}

export default function TournamentManagementPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [combosList, setCombosList] = useState<Combo[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(
    null
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Fix #1 — no more “any” for event handlers
  const handleSelectTournament = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedTournament(e.target.value);
  };

  const handleSelectPlayer = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedPlayer(e.target.value);
  };

  // Load tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase.from("tournaments").select("*");
      if (error) console.error(error);
      else setTournaments(data);
    };
    fetchTournaments();
  }, []);

  // Load players
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*");
      if (error) console.error(error);
      else setPlayers(data);
    };
    fetchPlayers();
  }, []);

  // Load combos
  useEffect(() => {
    const fetchCombos = async () => {
      const { data, error } = await supabase.from("combos").select("*");
      if (error) console.error(error);
      else setCombosList(data);
    };
    fetchCombos();
  }, []);

  const getComboName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return "Combo inconnu";
      const combo = combosList.find((c) => c.combo_id === comboId);
      if (!combo) return "Combo inconnu";
      return combo.name || "Combo sans nom";
    },
    [combosList]
  );

  const getComboDisplayName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return "Combo inconnu";
      const combo = combosList.find((c) => c.combo_id === comboId);
      if (!combo) return "Combo inconnu";
      return combo.name || `Combo ${comboId.slice(0, 8)}...`;
    },
    [combosList]
  );

  // ✅ Fix #2 — Supabase data typed correctly (no any)
  const handleValidatePlayer = async () => {
    if (!selectedTournament || !selectedPlayer) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .update({ is_validated: true })
        .eq("tournament_id", selectedTournament)
        .eq("player_id", selectedPlayer)
        .select();

      if (error) throw error;
      alert("✅ Joueur validé !");
    } catch (err: unknown) {
      // ✅ Fix #3 — proper error handling (no any)
      if (err instanceof Error) {
        console.error(err.message);
        alert(`Erreur : ${err.message}`);
      } else {
        console.error(err);
        alert("Erreur inconnue lors de la validation.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-2xl shadow-xl">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>

      <h1 className="text-3xl font-bold mb-6 text-purple-400 text-center">
        ⚙️ Gestion Tournoi
      </h1>

      {/* Tournament select */}
      <div className="mb-6">
        <label className="block mb-2 text-purple-300 font-semibold">
          Tournoi :
        </label>
        <select
          onChange={handleSelectTournament}
          value={selectedTournament || ""}
          className="bg-gray-800 border border-purple-600 rounded-lg p-2 w-full"
        >
          <option value="">Sélectionnez un tournoi</option>
          {tournaments.map((t) => (
            <option key={t.tournament_id} value={t.tournament_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Player select */}
      <div className="mb-6">
        <label className="block mb-2 text-green-300 font-semibold">
          Joueur :
        </label>
        <select
          onChange={handleSelectPlayer}
          value={selectedPlayer || ""}
          className="bg-gray-800 border border-green-600 rounded-lg p-2 w-full"
        >
          <option value="">Sélectionnez un joueur</option>
          {players.map((p) => (
            <option key={p.player_id} value={p.player_id}>
              {p.player_name}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={handleValidatePlayer}
        disabled={!selectedPlayer || !selectedTournament || isLoading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg"
      >
        {isLoading ? "⏳ Validation..." : "✅ Valider le joueur"}
      </Button>
    </div>
  );
}

