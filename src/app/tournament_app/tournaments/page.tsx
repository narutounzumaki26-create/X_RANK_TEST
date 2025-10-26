"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { CyberPage } from "@/components/layout/CyberPage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { tournaments } from "@/app/tournament_app/tournament";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

type ParticipantRow = {
  inscription_id: string;
  tournament_id: string;
  player_id: string;
  is_validated: boolean;
  tournament_deck: string | null;
  placement: number | null;
  players?: { player_name: string | null } | null;
  deck?: { deck_id: string; player_id: string | null } | null;
};

type DeckRow = {
  deck_id: string;
  tournament_id: string;
  player_id: string;
  combo_id_1: string | null;
  combo_id_2: string | null;
  combo_id_3: string | null;
  combo_one?: { name: string | null } | null;
  combo_two?: { name: string | null } | null;
  combo_three?: { name: string | null } | null;
};

type RawParticipantRow = {
  inscription_id: string;
  tournament_id: string;
  player_id: string;
  is_validated: boolean;
  tournament_deck: string | null;
  placement: number | null;
  players?: { player_name: string | null }[] | { player_name: string | null } | null;
  deck?:
    | { deck_id: string; player_id: string | null }[]
    | { deck_id: string; player_id: string | null }
    | null;
};

type RawDeckRow = {
  deck_id: string;
  tournament_id: string;
  player_id: string;
  combo_id_1: string | null;
  combo_id_2: string | null;
  combo_id_3: string | null;
  combo_one?: { name: string | null }[] | { name: string | null } | null;
  combo_two?: { name: string | null }[] | { name: string | null } | null;
  combo_three?: { name: string | null }[] | { name: string | null } | null;
};

type TournamentDetails = tournaments & {
  participants: ParticipantRow[];
  decks: DeckRow[];
};

export default function TournamentPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState<string>("");

  const [tournamentsList, setTournamentsList] = useState<tournaments[]>([]);
  const [managedTournaments, setManagedTournaments] = useState<TournamentDetails[]>([]);
  const [winnerSelections, setWinnerSelections] = useState<Record<string, string | undefined>>({});

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [maxCombos, setMaxCombos] = useState(3);

  const fetchManagementData = useCallback(async () => {
    setLoadingData(true);
    setMessage("");

    try {
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: true });

      if (tournamentsError) throw tournamentsError;

      setTournamentsList(tournamentsData ?? []);

      const active = (tournamentsData ?? []).filter((t) =>
        t.status === "planned" || t.status === "ongoing" || t.status === "cancelled"
      );

      if (active.length === 0) {
        setManagedTournaments([]);
        setWinnerSelections({});
        setLoadingData(false);
        return;
      }

      const activeIds = active.map((t) => t.tournament_id);

      const { data: participantsData, error: participantsError } = await supabase
        .from("tournament_participants")
        .select(
          `
          inscription_id,
          tournament_id,
          player_id,
          is_validated,
          tournament_deck,
          placement,
          players:player_id (player_name),
          deck:tournament_deck (deck_id, player_id)
        `
        )
        .in("tournament_id", activeIds);

      if (participantsError) throw participantsError;

      const { data: decksData, error: decksError } = await supabase
        .from("tournament_decks")
        .select(
          `
          deck_id,
          tournament_id,
          player_id,
          combo_id_1,
          combo_id_2,
          combo_id_3,
          combo_one:combo_id_1 (name),
          combo_two:combo_id_2 (name),
          combo_three:combo_id_3 (name)
        `
        )
        .in("tournament_id", activeIds);

      if (decksError) throw decksError;

      const decksByTournament = new Map<string, DeckRow[]>();
      (decksData ?? []).forEach((deck) => {
        const raw = deck as RawDeckRow;
        const comboOne = Array.isArray(raw.combo_one)
          ? raw.combo_one[0] ?? null
          : raw.combo_one ?? null;
        const comboTwo = Array.isArray(raw.combo_two)
          ? raw.combo_two[0] ?? null
          : raw.combo_two ?? null;
        const comboThree = Array.isArray(raw.combo_three)
          ? raw.combo_three[0] ?? null
          : raw.combo_three ?? null;

        const normalized: DeckRow = {
          deck_id: raw.deck_id,
          tournament_id: raw.tournament_id,
          player_id: raw.player_id,
          combo_id_1: raw.combo_id_1,
          combo_id_2: raw.combo_id_2,
          combo_id_3: raw.combo_id_3,
          combo_one: comboOne,
          combo_two: comboTwo,
          combo_three: comboThree,
        };

        const list = decksByTournament.get(normalized.tournament_id) ?? [];
        list.push(normalized);
        decksByTournament.set(normalized.tournament_id, list);
      });

      const participantRows = (participantsData ?? []).map((participant) => {
        const raw = participant as RawParticipantRow;
        const playerRelation = Array.isArray(raw.players)
          ? raw.players[0] ?? null
          : raw.players ?? null;
        const deckRelation = Array.isArray(raw.deck)
          ? raw.deck[0] ?? null
          : raw.deck ?? null;

        const normalized: ParticipantRow = {
          inscription_id: raw.inscription_id,
          tournament_id: raw.tournament_id,
          player_id: raw.player_id,
          is_validated: raw.is_validated,
          tournament_deck: raw.tournament_deck,
          placement: raw.placement,
          players: playerRelation,
          deck: deckRelation,
        };

        return normalized;
      });
      const participantsByTournament = new Map<string, ParticipantRow[]>();
      participantRows.forEach((participant) => {
        const list = participantsByTournament.get(participant.tournament_id) ?? [];
        list.push(participant);
        participantsByTournament.set(participant.tournament_id, list);
      });

      setManagedTournaments(
        active.map((tournament) => ({
          ...tournament,
          participants: participantsByTournament.get(tournament.tournament_id) ?? [],
          decks: decksByTournament.get(tournament.tournament_id) ?? [],
        }))
      );

      setWinnerSelections((prev) => {
        const next: Record<string, string | undefined> = {};
        active.forEach((t) => {
          const seeded =
            prev[t.tournament_id] ??
            t.winner_id ??
            participantsByTournament
              .get(t.tournament_id)
              ?.find((participant) => participant.placement === 1)?.player_id;

          if (seeded) {
            next[t.tournament_id] = seeded;
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Erreur chargement tournois:", err);
      setMessage(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: player, error } = await supabase
        .from("players")
        .select("Admin")
        .eq("user_id", user.id)
        .single();

      if (error || !player || !player.Admin) {
        router.push("/");
        return;
      }

      setAdmin(true);
    };

    void checkAuth();
  }, [router]);

  useEffect(() => {
    if (!admin) return;
    void fetchManagementData();
  }, [admin, fetchManagementData]);

  const handleCreateTournament = async () => {
    setMessage("");

    if (!name || !date) {
      setMessage("Le nom et la date sont obligatoires.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      setMessage("Impossible de récupérer l&apos;utilisateur connecté.");
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("player_id")
      .eq("user_id", user.id)
      .single();

    if (playerError || !playerData) {
      setMessage("Impossible de récupérer le player_id de l&apos;admin.");
      return;
    }

    const { error } = await supabase.from("tournaments").insert({
      name,
      location,
      description,
      date,
      max_combos: maxCombos,
      created_by: playerData.player_id,
      status: "planned",
    });

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setName("");
    setLocation("");
    setDescription("");
    setDate("");
    setMaxCombos(3);
    await fetchManagementData();
    setMessage("Tournoi créé avec succès.");
  };

  const handleCancelTournament = async (tournamentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce tournoi ?")) {
      return;
    }

    setMessage("Annulation en cours...");

    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ status: "cancelled" })
        .eq("tournament_id", tournamentId);

      if (error) {
        console.error("Erreur lors de l&apos;annulation du tournoi:", error);
        throw error;
      }

      setMessage("Tournoi annulé avec succès.");
      await fetchManagementData();
      
    } catch (err) {
      console.error("Erreur détaillée:", err);
      setMessage(
        err instanceof Error 
          ? `Erreur lors de l&apos;annulation: ${err.message}` 
          : "Erreur inconnue lors de l&apos;annulation du tournoi."
      );
    }
  };

  // 🔹 CORRECTION : Fonction de suppression simplifiée et corrigée
  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce tournoi ? Cette action est irréversible.")) {
      return;
    }

    setMessage("Suppression en cours...");

    try {
      console.log("🔹 Début de la suppression du tournoi:", tournamentId);

      // 🔹 CORRECTION : Vérifier d'abord s'il y a des données liées
      const { data: matchesData } = await supabase
        .from("matches")
        .select("match_id")
        .eq("tournament_id", tournamentId)
        .limit(1);

      if (matchesData && matchesData.length > 0) {
        // Supprimer les matchs associés
        const { error: matchesError } = await supabase
          .from("matches")
          .delete()
          .eq("tournament_id", tournamentId);

        if (matchesError) {
          console.error("Erreur suppression matchs:", matchesError);
          // Continuer malgré l'erreur
        }
      }

      // Supprimer les participants
      const { error: participantsError } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("tournament_id", tournamentId);

      if (participantsError) {
        console.error("Erreur suppression participants:", participantsError);
        throw participantsError;
      }

      // Supprimer les decks
      const { error: decksError } = await supabase
        .from("tournament_decks")
        .delete()
        .eq("tournament_id", tournamentId);

      if (decksError) {
        console.error("Erreur suppression decks:", decksError);
        throw decksError;
      }

      // Enfin supprimer le tournoi
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .delete()
        .eq("tournament_id", tournamentId);

      if (tournamentError) {
        console.error("Erreur suppression tournoi:", tournamentError);
        throw tournamentError;
      }

      console.log("✅ Tournoi supprimé avec succès");
      setMessage("Tournoi supprimé avec succès.");
      
      // 🔹 CORRECTION : Mettre à jour l'état local immédiatement
      setTournamentsList(prev => prev.filter(t => t.tournament_id !== tournamentId));
      setManagedTournaments(prev => prev.filter(t => t.tournament_id !== tournamentId));
      
    } catch (err) {
      console.error("❌ Erreur détaillée de suppression:", err);
      setMessage(
        err instanceof Error 
          ? `Erreur lors de la suppression: ${err.message}` 
          : "Erreur inconnue lors de la suppression. Vérifiez la console."
      );
    }
  };

  const handleAssignDeck = async (
    tournamentId: string,
    participant: ParticipantRow,
    deckId: string | null
  ) => {
    const value = deckId;

    const { error } = await supabase
      .from("tournament_participants")
      .update({ tournament_deck: value })
      .eq("inscription_id", participant.inscription_id);

    if (error) {
      setMessage(`Erreur lors de l&apos;association du deck : ${error.message}`);
      return;
    }

    setManagedTournaments((prev) =>
      prev.map((tournament) =>
        tournament.tournament_id === tournamentId
          ? {
              ...tournament,
              participants: tournament.participants.map((row) =>
                row.inscription_id === participant.inscription_id
                  ? { ...row, tournament_deck: value }
                  : row
              ),
            }
          : tournament
      )
    );
  };

  const handlePlacementChange = async (
    tournamentId: string,
    participant: ParticipantRow,
    rawPlacement: string
  ) => {
    const trimmed = rawPlacement.trim();
    const placementValue = trimmed === "" ? null : Number(trimmed);

    if (
      trimmed !== "" &&
      (placementValue === null || !Number.isInteger(placementValue) || placementValue < 1)
    ) {
      setMessage("La place doit être un entier positif.");
      return;
    }

    if (
      placementValue === participant.placement ||
      (placementValue === null && participant.placement === null)
    ) {
      return;
    }

    const { error } = await supabase
      .from("tournament_participants")
      .update({ placement: placementValue })
      .eq("inscription_id", participant.inscription_id);

    if (error) {
      setMessage(`Erreur enregistrement place : ${error.message}`);
      return;
    }

    setManagedTournaments((prev) =>
      prev.map((tournament) =>
        tournament.tournament_id === tournamentId
          ? {
              ...tournament,
              participants: tournament.participants.map((row) =>
                row.inscription_id === participant.inscription_id
                  ? { ...row, placement: placementValue }
                  : row
              ),
            }
          : tournament
      )
    );

    setWinnerSelections((prev) => {
      const current = prev[tournamentId];
      const nextValue =
        placementValue === 1
          ? participant.player_id
          : current === participant.player_id
            ? undefined
            : current;
      if (nextValue === current) return prev;
      return { ...prev, [tournamentId]: nextValue };
    });

    setMessage("");
  };

  const handleToggleValidation = async (tournamentId: string, participant: ParticipantRow) => {
    const newValue = !participant.is_validated;
    const payload = newValue
      ? { is_validated: true, validated_at: new Date().toISOString() }
      : { is_validated: false, validated_at: null };

    const { error } = await supabase
      .from("tournament_participants")
      .update(payload)
      .eq("inscription_id", participant.inscription_id);

    if (error) {
      setMessage(`Erreur validation : ${error.message}`);
      return;
    }

    setManagedTournaments((prev) =>
      prev.map((tournament) =>
        tournament.tournament_id === tournamentId
          ? {
              ...tournament,
              participants: tournament.participants.map((row) =>
                row.inscription_id === participant.inscription_id
                  ? { ...row, is_validated: newValue }
                  : row
              ),
            }
          : tournament
      )
    );
  };

  const handleFinishTournament = async (tournamentId: string) => {
    const winnerId = winnerSelections[tournamentId];
    if (!winnerId) {
      setMessage("Sélectionnez un gagnant avant de terminer le tournoi.");
      return;
    }

    const { error } = await supabase
      .from("tournaments")
      .update({ status: "finished", winner_id: winnerId })
      .eq("tournament_id", tournamentId);

    if (error) {
      setMessage(`Erreur lors de la clôture du tournoi : ${error.message}`);
      return;
    }

    await fetchManagementData();
    setMessage("Tournoi clôturé avec succès.");
  };

  const handleManageMatches = (tournamentId: string) => {
    router.push(`/tournament-management?id=${tournamentId}`);
  };

  const deckLabel = (deck: DeckRow): string => {
    const names = [deck.combo_one?.name, deck.combo_two?.name, deck.combo_three?.name].filter(Boolean);
    if (names.length === 0) return "Deck sans combo";
    return names.join(" • ");
  };

  const plannedCount = managedTournaments.length;
  const plannedTitle = useMemo(() => {
    if (plannedCount === 0) return "Aucun tournoi en attente";
    if (plannedCount === 1) return "1 tournoi à préparer";
    return `${plannedCount} tournois à préparer`;
  }, [plannedCount]);

  if (admin === null) {
    return (
      <CyberPage
        centerContent
        header={{ title: "⚡ Gestion des Tournois", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">
          Initialisation de l&apos;interface...
        </p>
      </CyberPage>
    );
  }

  if (!admin) {
    return (
      <CyberPage
        centerContent
        header={{ title: "⚡ Gestion des Tournois", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-gray-300">Accès réservé aux administrateurs.</p>
      </CyberPage>
    );
  }

  return (
    <CyberPage
      header={{
        title: "⚡ Gestion des Tournois",
        subtitle:
          "Crée, prépare et termine les tournois officiels. Gère les participants, decks et résultats en temps réel.",
        actions: (
          <div className="flex flex-wrap justify-center gap-3">
            <MainMenuButton className="w-full sm:w-auto" />
            <Link href="/tournament_app/tournament-finished" className="inline-flex">
              <Button className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/70 hover:bg-emerald-500/30">
                Tournois terminés
              </Button>
            </Link>
            <Link href="/tournament-management" className="inline-flex">
              <Button className="bg-purple-500/20 text-purple-200 border border-purple-400/70 hover:bg-purple-500/30">
                Centre des matchs
              </Button>
            </Link>
          </div>
        ),
      }}
      contentClassName="gap-10"
    >
      <Card className="bg-gray-900/70 text-white shadow-xl">
        <CardHeader>
          <CardTitle>Créer un tournoi</CardTitle>
          <CardDescription>
            Remplissez les informations pour ajouter un nouveau tournoi à planifier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <input
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400"
            placeholder="Nom du tournoi"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400"
            placeholder="Lieu"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className="col-span-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400"
            placeholder="Description courte du tournoi"
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="w-24 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            type="number"
            min={1}
            max={5}
            value={maxCombos}
            onChange={(e) => setMaxCombos(Number(e.target.value))}
          />
          <Button onClick={handleCreateTournament} className="col-span-2 bg-blue-500 hover:bg-blue-600">
            Créer
          </Button>
          {message && (
            <p className="col-span-2 text-sm text-amber-200">{message}</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{plannedTitle}</h2>
          {loadingData && <span className="text-xs uppercase tracking-[0.3em] text-purple-200">Chargement…</span>}
        </div>

        {managedTournaments.length === 0 ? (
          <p className="text-sm text-gray-300">
            Aucun tournoi planifié pour le moment. Créez un tournoi ou attendez de nouvelles inscriptions.
          </p>
        ) : (
          <div className="grid gap-4">
            {managedTournaments.map((tournament) => (
              <Card
                key={tournament.tournament_id}
                className="bg-gray-900/60 text-white shadow-lg border border-purple-500/30"
              >
                <CardHeader className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl font-bold text-purple-200">{tournament.name}</CardTitle>
                      <CardDescription className="text-sm text-gray-300">
                        {tournament.date} {tournament.location && `- ${tournament.location}`} • Statut : {tournament.status}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Select
                        value={winnerSelections[tournament.tournament_id] ?? ""}
                        onValueChange={(value) =>
                          setWinnerSelections((prev) => ({ ...prev, [tournament.tournament_id]: value }))
                        }
                      >
                        <SelectTrigger className="min-w-[12rem] border-purple-500/40 bg-gray-800 text-sm text-white">
                          <SelectValue placeholder="Choisir un vainqueur" />
                        </SelectTrigger>
                        <SelectContent>
                          {tournament.participants.map((participant) => (
                            <SelectItem key={participant.inscription_id} value={participant.player_id}>
                              {participant.players?.player_name ?? participant.player_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          className="bg-purple-500/30 text-purple-100 border border-purple-400/60 hover:bg-purple-500/40"
                          onClick={() => handleManageMatches(tournament.tournament_id)}
                        >
                          Gérer les matchs
                        </Button>
                        {(tournament.status === "planned" || tournament.status === "ongoing") && (
                          <Button
                            className="bg-orange-500 text-white hover:bg-orange-600 border border-orange-400/60"
                            onClick={() => handleCancelTournament(tournament.tournament_id)}
                          >
                            Annuler
                          </Button>
                        )}
                        <Button
                          className="bg-emerald-500 text-black hover:bg-emerald-400"
                          onClick={() => handleFinishTournament(tournament.tournament_id)}
                        >
                          Terminer
                        </Button>
                        <Button
                          className="bg-red-500/80 text-white hover:bg-red-500 border border-red-400/60"
                          onClick={() => handleDeleteTournament(tournament.tournament_id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                  {tournament.description && (
                    <p className="text-sm text-gray-300">{tournament.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {tournament.participants.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucun participant inscrit.</p>
                  ) : (
                    tournament.participants.map((participant) => {
                      const decks = tournament.decks.filter(
                        (deck) => deck.player_id === participant.player_id
                      );

                      return (
                        <div
                          key={participant.inscription_id}
                          className="flex flex-col gap-3 rounded-lg border border-purple-500/30 bg-gray-950/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-base font-semibold text-white">
                              {participant.players?.player_name ?? participant.player_id}
                            </p>
                            <p className="text-xs text-gray-400">
                              {participant.is_validated ? "Place confirmée" : "En attente de validation"}
                              {typeof participant.placement === "number" &&
                                ` • Position : ${participant.placement}`}
                            </p>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Select
                              value={participant.tournament_deck ?? "none"}
                              onValueChange={(value) =>
                                handleAssignDeck(
                                  tournament.tournament_id,
                                  participant,
                                  value === "none" ? null : value
                                )
                              }
                            >
                              <SelectTrigger className="min-w-[12rem] border-purple-500/40 bg-gray-800 text-sm text-white">
                                <SelectValue placeholder="Associer un deck" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucun deck</SelectItem>
                                {decks.length === 0 ? (
                                  <SelectItem value="disabled" disabled>
                                    Aucun deck enregistré
                                  </SelectItem>
                                ) : (
                                  decks.map((deck) => (
                                    <SelectItem key={deck.deck_id} value={deck.deck_id}>
                                      {deckLabel(deck)}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <label className="text-xs uppercase tracking-[0.3em] text-purple-200">
                                Place
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={participant.placement ?? ""}
                                onChange={(event) =>
                                  handlePlacementChange(
                                    tournament.tournament_id,
                                    participant,
                                    event.target.value
                                  )
                                }
                                className="w-20 rounded border border-purple-500/40 bg-gray-800 px-2 py-1 text-sm text-white placeholder-gray-500"
                                placeholder="-"
                              />
                            </div>
                            <Button
                              onClick={() => handleToggleValidation(tournament.tournament_id, participant)}
                              className={
                                participant.is_validated
                                  ? "bg-red-500/80 text-white hover:bg-red-500"
                                  : "bg-emerald-500 text-black hover:bg-emerald-400"
                              }
                            >
                              {participant.is_validated ? "Annuler la validation" : "Valider la place"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Historique des tournois</h2>
        {tournamentsList.length === 0 ? (
          <p className="text-sm text-gray-300">Aucun tournoi enregistré pour le moment.</p>
        ) : (
          <div className="grid gap-4">
            {tournamentsList.map((t) => (
              <Card
                key={t.tournament_id}
                className="bg-gray-900/60 text-white border border-gray-700/60 shadow-md"
              >
                <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <p className="text-sm text-gray-300">
                      {t.date} {t.location && `- ${t.location}`} • Statut : {t.status}
                    </p>
                    {t.description && (
                      <p className="text-xs text-gray-400">{t.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/70 hover:bg-yellow-500/30"
                      onClick={() => handleManageMatches(t.tournament_id)}
                    >
                      Gérer
                    </Button>
                    <Button
                      className="bg-red-500/20 text-red-200 border border-red-400/70 hover:bg-red-500/30"
                      onClick={() => handleDeleteTournament(t.tournament_id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </CyberPage>
  );
}
