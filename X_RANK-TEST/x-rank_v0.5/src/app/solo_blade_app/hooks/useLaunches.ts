// src/app/solo_blade_app/components/BattleComponents/hooks/useLaunches.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LaunchType } from "@/app/solo_blade_app/types/pets";

export function useLaunches() {
  const [launches, setLaunches] = useState<LaunchType[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("launch_types").select("*");
      if (error) console.error("❌ Erreur de chargement des launch types :", error);
      else setLaunches(data);
    })();
  }, []);
  return launches;
}
