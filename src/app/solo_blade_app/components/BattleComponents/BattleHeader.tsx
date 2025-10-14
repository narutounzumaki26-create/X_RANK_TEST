// src/app/solo_blade_app/components/BattleComponents/BattleHeader.tsx
"use client";

import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserBladeFullWithBuild, Enemy } from "@/app/solo_blade_app/types/pets";
import { getPartNames, getFullLabel } from "src/app/solo_blade_app/Utils/parts";

export default function BattleHeader({
  userPet,
  enemy,
}: {
  userPet: UserBladeFullWithBuild;
  enemy: Enemy;
}) {
  const userParts = getPartNames(userPet);
  const userLabel = getFullLabel(userPet.blade?.name, userParts);

  return (
    <CardHeader className="text-center">
      <CardTitle className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.6)]">
        ⚔️ Duel de Blades
      </CardTitle>

      <CardDescription className="text-gray-300 mt-1 text-lg">
        <span className="text-fuchsia-400 font-semibold">{userLabel}</span>{" "}
        VS{" "}
        <span className="text-blue-400 font-semibold">{enemy.name}</span>
      </CardDescription>
    </CardHeader>
  );
}
