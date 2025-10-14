// src/app/solo_blade_app/components/BattleComponents/hooks/useHydratedBuild.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserBladeFullWithBuild } from "@/app/solo_blade_app/types/pets";

type ResolvedBuildRow = {
  id: string;
  user_blade_id: string;
  created_at: string | null;
  updated_at: string | null;
  assist_id: string | null;
  ratchet_id: string | null;
  bit_id: string | null;
  assist: { name?: string | null } | null;
  ratchet: { name?: string | null } | null;
  bit: { name?: string | null; type?: string | null } | null;
};

async function fetchResolvedBuild(user_blade_id: string): Promise<ResolvedBuildRow | null> {
  const { data, error } = await supabase
    .from("user_blade_builds")
    .select(`
      id, user_blade_id, created_at, updated_at,
      assist_id, ratchet_id, bit_id,
      assist:assist(*), ratchet:ratchet(*), bit:bit(*)
    `)
    .eq("user_blade_id", user_blade_id)
    .maybeSingle();

  if (error) {
    console.error("⚠️ Hydratation du build: erreur Supabase", error);
    return null;
  }
  return (data as unknown as ResolvedBuildRow) ?? null;
}

export function useHydratedBuild(selectedPet: UserBladeFullWithBuild) {
  const [hydrated, setHydrated] = useState<UserBladeFullWithBuild>(selectedPet);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    const requiresAssist =
      selectedPet.blade?.line === "CX" && !selectedPet.build?.assist;

    const needFetch =
      !selectedPet.build ||
      !selectedPet.build.bit ||
      !selectedPet.build.ratchet ||
      requiresAssist;

    if (!needFetch) {
      setHydrated(selectedPet);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const build = await fetchResolvedBuild(selectedPet.id);
        if (canceled || !build) {
          setHydrated(selectedPet);
          return;
        }

        setHydrated((prev) => {
          const mergedBuild = {
            ...(prev.build ?? {}),
            id: prev.build?.id ?? build.id,
            user_blade_id: prev.build?.user_blade_id ?? build.user_blade_id,
            created_at: prev.build?.created_at ?? build.created_at ?? null,
            updated_at: build.updated_at ?? prev.build?.updated_at ?? null,
            assist_id: build.assist_id ?? prev.build?.assist_id ?? null,
            ratchet_id: build.ratchet_id ?? prev.build?.ratchet_id ?? null,
            bit_id: build.bit_id ?? prev.build?.bit_id ?? null,
            assist: build.assist ?? prev.build?.assist ?? null,
            ratchet: build.ratchet ?? prev.build?.ratchet ?? null,
            bit: build.bit ?? prev.build?.bit ?? null,
          } as NonNullable<UserBladeFullWithBuild["build"]>;

          return { ...prev, build: mergedBuild };
        });
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    })();

    return () => { canceled = true; };
  }, [selectedPet]);

  return { hydrated, loading };
}
