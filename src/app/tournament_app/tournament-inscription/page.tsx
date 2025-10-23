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

type Bey = {
  cx: boolean;
  blade?: string;
  bit?: string;
  ratchet?: string;
  assist?: string;
  lockChip?: string;
};

export default function TournamentInscriptionPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [beys, setBeys] = useState<Bey[]>([]);
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<Tournament | null>(null);

  const [blades, setBlades] = useState<{ blade_id: string; name: string }[]>([]);
  const [bits, setBits] = useState<{ bit_id: string; name: string }[]>([]);
  const [assists, setAssists] = useState<{ assist_id: string; name: string }[]>([]);
  const [lockChips, setLockChips] = useState<{ lock_chip_id: string; name: string }[]>([]);
  const [ratchets, setRatchets] = useState<{ ratchet_id: string; name: string }[]>([]);

  // Vérification admin
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*");
      if (!error && data) setPlayers(data.sort((a, b) => a.player_name.localeCompare(b.player_name)));
    };
    fetchPlayers();
  }, []);

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase.from("tournaments").select("*").eq("status", "planned");
      if (!error && data) setTournaments(data);
    };
    fetchTournaments();
  }, []);

  // Fetch pièces
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

  // Sélection tournoi
  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    const details = tournaments.find((t) => t.tournament_id === tournamentId) || null;
    setTournamentDetails(details);
    if (details) {
      setSelectedComboCount(0);
      setBeys([]);
    }
  };

  const handleComboCountChange = (count: number) => {
    setSelectedComboCount(count);
    if (count > 0) {
      const initialBeys: Bey[] = Array(count).fill(null).map(() => ({ cx: false }));
      setBeys(initialBeys);
    } else {
      setBeys([]);
    }
  };

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev];
      newBeys[index].cx = value;
      return newBeys;
    });
  };

  const handleBeyPieceSelect = (index: number, type: keyof Bey, value: string) => {
    const newBeys = [...beys];
    newBeys[index][type] = value;
    setBeys(newBeys);
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

    const incompleteBeys = beys.some(bey =>
      bey.cx
        ? !bey.lockChip || !bey.blade || !bey.assist || !bey.ratchet || !bey.bit
        : !bey.blade || !bey.ratchet || !bey.bit
    );
    if (incompleteBeys) {
      alert("Veuillez sélectionner toutes les pièces requises pour chaque combo !");
      return;
    }

    try {
      const comboIds: string[] = [];

      for (let i = 0; i < beys.length; i++) {
        const bey = beys[i];

        const bladeObj = blades.find(b => b.blade_id === bey.blade);
        const ratchetObj = ratchets.find(r => r.ratchet_id === bey.ratchet);
        const bitObj = bits.find(b => b.bit_id === bey.bit);
        const assistObj = bey.assist ? assists.find(a => a.assist_id === bey.assist) : null;
        const lockChipObj = bey.lockChip ? lockChips.find(l => l.lock_chip_id === bey.lockChip) : null;

        const bladeName = bladeObj?.name || "Inconnu";
        const ratchetName = ratchetObj?.name || "Inconnu";
        const bitName = bitObj?.name || "Inconnu";
        const assistName = assistObj?.name || "";
        const lockChipName = lockChipObj?.name || "";

        let comboName = bey.cx
          ? `${lockChipName} / ${bladeName} / ${assistName} / ${ratchetName} / ${bitName}`
          : `${bladeName} / ${ratchetName} / ${bitName}`;

        comboName = `Combo ${i + 1} - ${comboName}`;

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

      // Création du deck
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

      alert("✅ Inscription réussie !");
      setSelectedPlayer(null);
      setSelectedTournament(null);
      setTournamentDetails(null);
      setSelectedComboCount(0);
      setBeys([]);
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
    <div className="max-w-4xl mx-auto p-6 text-white">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Inscription Tournoi</h1>

      {/* Sélection du tournoi */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold">Tournoi :</label>
        <Select onValueChange={handleTournamentSelect} value={selectedTournament || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un tournoi" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map(t => (
              <SelectItem key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélection du joueur */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold">Joueur :</label>
        <Select onValueChange={setSelectedPlayer} value={selectedPlayer || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un joueur" />
          </SelectTrigger>
          <SelectContent>
            {players.map(p => (
              <SelectItem key={p.player_id} value={p.player_id}>
                {p.player_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nombre de combos */}
      {tournamentDetails && (
        <div className="mb-6">
          <label className="block mb-2 font-semibold">Nombre de combos :</label>
          <Select onValueChange={value => handleComboCountChange(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un nombre" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: tournamentDetails.max_combos }, (_, i) => i + 1).map(count => (
                <SelectItem key={count} value={count.toString()}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Combos */}
      {beys.map((bey, index) => (
        <div key={index} className="mb-6 p-4 border border-gray-700 rounded-lg">
          <h2 className="font-semibold mb-2">Combo {index + 1}</h2>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={bey.cx}
              onChange={e => handleBeyCxChange(index, e.target.checked)}
            />
            CX Combo
          </label>

          <div className="grid grid-cols-1 gap-2">
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
            ).map(({ key, options, label }) => (
              <div key={key}>
                <label className="block mb-1">{label}</label>
                <Select
                  onValueChange={value => handleBeyPieceSelect(index, key as keyof Bey, value)}
                  value={(bey[key as keyof Bey] as string) || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Choisir un ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(opt => (
                      <SelectItem
                        key={opt[`${key}_id`]}
                        value={opt[`${key}_id`]}
                      >
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={handleSubmit} className="w-full py-3 mt-4 font-semibold">
        Valider l’inscription
      </Button>
    </div>
  );
}
