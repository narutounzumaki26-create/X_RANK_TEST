// src/app/solo_blade_app/components/BattleComponents/hooks/useEnemy.ts
"use client";

import { useEffect, useState } from "react";
import { Enemy } from "@/app/solo_blade_app/types/pets";
import { generateEnemy } from "src/app/solo_blade_app/components/BattleComponents/EnemyFactory";

export function useEnemy() {
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  useEffect(() => {
    (async () => setEnemy(await generateEnemy()))();
  }, []);
  return enemy;
}
