"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Blade,
  UserBladeFull,
  Enemy,
  DEFAULT_STAT,
} from "@/app/solo_blade_app/types/pets";
import { usePlayerProfile } from "@/app/hooks/usePlayerProfile";

type RawUserBladeRow = {
  id: string;
  player_id: string;
  blade_id: string;
  xp: number;
  hunger: number;
  happiness: number;
  created_at: string;
  blade: Blade | null;
};

export function useBlades() {
  const [blades, setBlades] = useState<Blade[]>([]);
  const [userBlades, setUserBlades] = useState<UserBladeFull[]>([]);
  const [selectedBlade, setSelectedBlade] = useState<UserBladeFull | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [loadingBlades, setLoadingBlades] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
    addBladepoints,
    setBladepoints,
  } = usePlayerProfile();

  const playerId = profile?.player_id ?? null;

  useEffect(() => {
    if (profileLoading) return;

    if (!playerId) {
      setLoadingBlades(false);
      setError(profileError);
      return;
    }

    const fetchAll = async (): Promise<void> => {
      setLoadingBlades(true);
      setError(null);

      try {
        const { data: allBlades, error: bladesError } = await supabase
          .from("blade")
          .select("*")
          .order("name", { ascending: true })
          .returns<Blade[]>();

        if (bladesError) throw bladesError;

        const { data: rawOwned, error: ownedError } = await supabase
          .from("user_blades")
          .select(
            `
            id,
            player_id,
            blade_id,
            xp,
            hunger,
            happiness,
            created_at,
            blade:blade_id (
              blade_id,
              name,
              attack,
              defense,
              stamina,
              height,
              weight,
              line,
              skills,
              propulsion,
              burst,
              image_url
            )
          `
          )
          .eq("player_id", playerId)
          .returns<RawUserBladeRow[]>();

        if (ownedError) throw ownedError;

        const owned: UserBladeFull[] = (rawOwned ?? []).map((row) => ({
          id: row.id,
          player_id: row.player_id,
          blade_id: row.blade_id,
          xp: row.xp,
          hunger: row.hunger,
          happiness: row.happiness,
          created_at: row.created_at,
          blade: {
            blade_id: row.blade?.blade_id ?? "",
            name: row.blade?.name ?? "Inconnue",
            attack: row.blade?.attack ?? DEFAULT_STAT,
            defense: row.blade?.defense ?? DEFAULT_STAT,
            stamina: row.blade?.stamina ?? DEFAULT_STAT,
            height: row.blade?.height ?? DEFAULT_STAT,
            weight: row.blade?.weight ?? DEFAULT_STAT,
            line: row.blade?.line ?? null,
            skills: row.blade?.skills ?? null,
            propulsion: row.blade?.propulsion ?? DEFAULT_STAT,
            burst: row.blade?.burst ?? DEFAULT_STAT,
            image_url: row.blade?.image_url ?? null,
          },
        }));

        setBlades(allBlades ?? []);
        setUserBlades(owned);
        setEnemies([]);
      } catch (e) {
        console.error("fetchAll error", e);
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoadingBlades(false);
      }
    };

    void fetchAll();
  }, [playerId, profileLoading, profileError]);

  // ✅ Fonction refresh réutilisable
  const refreshUserBlades = async (): Promise<void> => {
    if (!playerId) return;

    const { data: rawOwned } = await supabase
      .from("user_blades")
      .select(
        `
        id,
        player_id,
        blade_id,
        xp,
        hunger,
        happiness,
        created_at,
        blade:blade_id (
          blade_id,
          name,
          attack,
          defense,
          stamina,
          height,
          weight,
          line,
          skills,
          propulsion,
          burst,
          image_url
        )
      `
      )
      .eq("player_id", playerId)
      .returns<RawUserBladeRow[]>();

    const owned: UserBladeFull[] = (rawOwned ?? []).map((row) => ({
      id: row.id,
      player_id: row.player_id,
      blade_id: row.blade_id,
      xp: row.xp,
      hunger: row.hunger,
      happiness: row.happiness,
      created_at: row.created_at,
      blade: {
        blade_id: row.blade?.blade_id ?? "",
        name: row.blade?.name ?? "Inconnue",
        line: row.blade?.line ?? null,
        skills: row.blade?.skills ?? null,
        attack: row.blade?.attack ?? DEFAULT_STAT,
        defense: row.blade?.defense ?? DEFAULT_STAT,
        stamina: row.blade?.stamina ?? DEFAULT_STAT,
        height: row.blade?.height ?? DEFAULT_STAT,
        weight: row.blade?.weight ?? DEFAULT_STAT,
        propulsion: row.blade?.propulsion ?? DEFAULT_STAT,
        burst: row.blade?.burst ?? DEFAULT_STAT,
        image_url: row.blade?.image_url ?? null,
      },
    }));

    setUserBlades(owned);
  };

  const loading = profileLoading || loadingBlades;
  const combinedError = error ?? profileError ?? null;

  return {
    blades,
    userBlades,
    enemies,
    loading,
    error: combinedError,
    selectedBlade,
    setSelectedBlade,
    refreshUserBlades,
    playerId,
    bladepoints: profile?.bladepoints ?? 0,
    refreshPlayer: refreshProfile,
    addBladepoints,
    setBladepoints,
  };
}
