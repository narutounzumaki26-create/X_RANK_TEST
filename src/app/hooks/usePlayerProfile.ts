"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PlayerProfile = {
  player_id: string;
  bladepoints: number;
};

type UsePlayerProfile = {
  profile: PlayerProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBladepoints: (next: number) => Promise<number | null>;
  addBladepoints: (delta: number) => Promise<number | null>;
};

export function usePlayerProfile(): UsePlayerProfile {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error: playerError } = await supabase
        .from("players")
        .select("player_id, bladepoints")
        .eq("user_id", userId)
        .maybeSingle<{ player_id: string; bladepoints: number | null }>();

      if (playerError) throw playerError;

      if (!data) {
        setProfile(null);
        return;
      }

      setProfile({
        player_id: data.player_id,
        bladepoints: data.bladepoints ?? 0,
      });
    } catch (err) {
      console.error("Erreur chargement profil joueur:", err);
      setProfile(null);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const persistBladepoints = useCallback(
    async (next: number): Promise<number | null> => {
      const playerId = profile?.player_id;
      if (!playerId) return null;

      const normalized = Math.max(0, Math.floor(next));

      const { data, error: updateError } = await supabase
        .from("players")
        .update({ bladepoints: normalized })
        .eq("player_id", playerId)
        .select("bladepoints")
        .maybeSingle<{ bladepoints: number | null }>();

      if (updateError) {
        console.error("Erreur mise à jour bladepoints:", updateError);
        throw updateError;
      }

      const stored = data?.bladepoints ?? normalized;
      setProfile((prev) =>
        prev ? { ...prev, bladepoints: stored } : { player_id: playerId, bladepoints: stored }
      );

      return stored;
    },
    [profile?.player_id]
  );

  const setBladepoints = useCallback(
    async (next: number): Promise<number | null> => {
      try {
        return await persistBladepoints(next);
      } catch {
        await fetchProfile();
        return null;
      }
    },
    [fetchProfile, persistBladepoints]
  );

  const addBladepoints = useCallback(
    async (delta: number): Promise<number | null> => {
      if (!profile) return null;
      const next = (profile.bladepoints ?? 0) + delta;

      try {
        return await persistBladepoints(next);
      } catch {
        await fetchProfile();
        return null;
      }
    },
    [persistBladepoints, profile, fetchProfile]
  );

  return useMemo(
    () => ({
      profile,
      loading,
      error,
      refresh: fetchProfile,
      setBladepoints,
      addBladepoints,
    }),
    [addBladepoints, error, fetchProfile, loading, profile, setBladepoints]
  );
}
