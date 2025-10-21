"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/components/ui/use-toast";

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
  bit?: string;
  ratchet?: string;
  assist?: string;
  lockChip?: string;
};

interface PieceOption {
  name: string;
  type?: string;
  [key: string]: any;
}

/* --------------------------------------------------------
   📦 Subcomponent: BeyEditor
-------------------------------------------------------- */
function BeyEditor({
  index,
  bey,
  onCxChange,
  onPieceSelect,
  pieces,
}: {
  index: number;
  bey: Bey;
  onCxChange: (index: number, value: boolean) => void;
  onPieceSelect: (index: number, type: BeyPieceKey, value: string) => void;
  pieces: {
    blades: PieceOption[];
    bits: PieceOption[];
    assists: PieceOption[];
    lockChips: PieceOption[];
    ratchets: PieceOption[];
  };
}) {
  const pieceTypes = bey.cx
    ? [
        { key: "lockChip", label: "Lock Chip", options: pieces.lockChips },
        { key: "blade", label: "Blade", options: pieces.blades },
        { key: "assist", label: "Assist", options: pieces.assists },
        { key: "ratchet", label: "Ratchet", options: pieces.ratchets },
        { key: "bit", label: "Bit", options: pieces.bits },
      ]
    : [
        { key: "blade", label: "Blade", options: pieces.blades },
        { key: "ratchet", label: "Ratchet", options: pieces.ratchets },
        { key: "bit", label: "Bit", options: pieces.bits },
      ];

  return (
    <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl">
      <p className="text-lg font-bold mb-4 text-pink-300">🔥 Bey {index + 1}</p>
      <div className="mb-4 flex items-center gap-2">
        <label className="font-semibold">CX ?</label>
        <input
          type="checkbox"
          checked={bey.cx}
          onChange={(e) => onCxChange(index, e.target.checked)}
          className="w-5 h-5 accent-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {pieceTypes.map(({ key, label, options }) => {
          const pieceKey = key as BeyPieceKey;
          const selectedValue = bey[pieceKey] ?? "";

          return (
            <Select
              key={pieceKey}
              onValueChange={(v) => onPieceSelect(index, pieceKey, v)}
              value={selectedValue}
            >
              <SelectTrigger className="bg-gray-900 border border-pink-600">
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white">
                {options.map((o) => {
                  const idKey =
                    pieceKey === "lockChip" ? "lock_chip_id" : `${pieceKey}_id`;
                  const optionValue = o[idKey];
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
  );
}

/* --------------------------------------------------------
   🏆 Main Page: TournamentInscriptionPage
-------------------------------------------------------- */
export default function TournamentInscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [beys, setBeys] = useState<Bey[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<Tournament | null>(null);

  const [blades, setBlades] = useState<PieceOption[]>([]);
  const [bits, setBits] = useState<PieceOption[]>([]);
  const [assists, setAssists] = useState<PieceOption[]>([]);
  const [lockChips, setLockChips] = useState<PieceOption[]>([]);
  const [ratchets, setRatchets] = useState<PieceOption[]>([]);

  /* 🧭 Auth check */
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: adminData } = await supabase
        .from("players")
        .select("Admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!adminData?.Admin) router.replace("/");
    };
    checkAuth();
  }, [router]);

  /* 👥 Fetch players & tournaments */
  useEffect(() => {
    const fetchData = async () => {
      const [{ data: playerData }, { data: tournamentData }] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("tournaments").select("*").eq("status", "planned"),
      ]);

      if (playerData)
        setPlayers(playerData.sort((a, b) => a.player_name.localeCompare(b.player_name)));
      if (tournamentData) setTournaments(tournamentData);
    };
    fetchData();
  }, []);

  /* ⚙️ Fetch pieces */
  useEffect(() => {
    const fetchPieces = async () => {
      const [blades, bits, assists, lockChips, ratchets] = await Promise.all([
        supabase.from("blade").select("*"),
        supabase.from("bit").select("*"),
        supabase.from("assist").select("*"),
        supabase.from("lock_chip").select("*"),
        supabase.from("ratchet").select("*"),
      ]);
      const sort = (data?: any[]) => (data ? data.sort((a, b) => a.name.localeCompare(b.name)) : []);
      setBlades(sort(blades.data));
      setBits(sort(bits.data));
      setAssists(sort(assists.data));
      setLockChips(sort(lockChips.data));
      setRatchets(sort(ratchets.data));
    };
    fetchPieces();
  }, []);

  /* 🏁 Select tournament */
  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    const details = tournaments.find((t) => t.tournament_id === tournamentId) || null;
    setTournamentDetails(details);
    if (details) {
      const initialBeys: Bey[] = Array(details.max_combos)
        .fill(null)
        .map(() => ({ cx: false }));
      setBeys(initialBeys);
    }
  };

  /* 🎮 Bey handlers */
  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys((prev) => {
      const newBeys = [...prev];
      newBeys[index].cx = value;
      return newBeys;
    });
  };

  const handleBeyPieceSelect = useCallback(
    (index: number, type: BeyPieceKey, value: string) => {
      setBeys((prev) => {
        const newBeys = [...prev];
        newBeys[index][type] = value;
        return newBeys;
      });
    },
    []
  );

  /* 🚀 Submit inscription */
  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedTournament) {
      toast({
        title: "Erreur ⚠️",
        description: "Veuillez sélectionner un joueur et un tournoi.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    for (let i = 0; i < beys.length; i++) {
      const { blade, bit, ratchet } = beys[i];
      if (!blade || !bit || !ratchet) {
        toast({
          title: `Combo ${i + 1} incomplet ❌`,
          description: "Veuillez sélectionner au moins Blade, Bit et Ratchet.",
          variant: "destructive",
        });
        return;
      }
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

      toast({
        title: "✅ Inscription réussie !",
        description: "Le joueur a bien été inscrit au tournoi.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur ❌",
        description: err.message || "Une erreur est survenue.",
        variant: "destructive",
      });
      console.error(err);
    }
  };

  /* --------------------------------------------------------
     🖥️ JSX
  -------------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        🚀 Inscription Tournoi
      </h1>

      {/* 🎯 Tournament selection */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
        <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
        <Select onValueChange={handleTournamentSelect} value={selectedTournament || undefined}>
          <SelectTrigger className="bg-gray-900 border border-purple-600">
            <SelectValue placeholder="Choisir un tournoi" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-white">
            {tournaments.map((t) => (
              <SelectItem key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🏆 Tournament details */}
      {tournamentDetails && (
        <div className="mb-8 p-6 bg-gray-800/70 rounded-xl border border-blue-500 shadow-md">
          <p>
            <span className="font-bold text-blue-300">🏆 Nom :</span> {tournamentDetails.name}
          </p>
          <p>
            <span className="font-bold text-blue-300">📍 Lieu :</span>{" "}
            {tournamentDetails.location || "Non spécifié"}
          </p>
          <p>
            <span className="font-bold text-blue-300">📅 Date :</span>{" "}
            {new Date(tournamentDetails.date).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* 👤 Player selection */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg">
        <label className="block mb-3 font-semibold text-green-300">👤 Joueur :</label>
        <Select
          onValueChange={setSelectedPlayer}
          value={selectedPlayer || undefined}
          disabled={!selectedTournament}
        >
          <SelectTrigger className="bg-gray-900 border border-green-600">
            <SelectValue placeholder="Choisir un joueur" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-white">
            {players.map((p) => (
              <SelectItem key={p.player_id} value={p.player_id}>
                {p.player_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🧩 Bey Editors */}
      {beys.map((bey, index) => (
        <BeyEditor
          key={index}
          index={index}
          bey={bey}
          onCxChange={handleBeyCxChange}
          onPieceSelect={handleBeyPieceSelect}
          pieces={{ blades, bits, assists, lockChips, ratchets }}
        />
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
