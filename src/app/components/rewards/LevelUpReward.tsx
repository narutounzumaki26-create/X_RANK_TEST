"use client";

import { useEffect } from "react";
import { UserBladeFull } from "@/app/solo_blade_app/types/pets";
import { hasReceivedReward, recordReward, rewardRandomEquipments } from "@/lib/rewards";

type LevelUpRewardProps = {
  userBlades: UserBladeFull[];
  playerId: string | null;
  setPendingReward: (reward: string | null) => void;
};

export function LevelUpReward({ userBlades, playerId, setPendingReward }: LevelUpRewardProps) {
  useEffect(() => {
    if (!userBlades || !playerId) return;

    (async () => {
      for (const blade of userBlades) {
        // suppose que la progression XP → niveau = 100 xp / niveau
        const level = Math.floor((blade.xp ?? 0) / 100);

        if (level >= 5) {
          // Utilisation de l'id du blade pour éviter doublons
          const rewardKey = `levelup_${blade.id}`;

          const alreadyRewarded = await hasReceivedReward(playerId, rewardKey);
          if (!alreadyRewarded) {
            const rewards = await rewardRandomEquipments(playerId, 1);
            await recordReward(playerId, rewardKey);

            const gift = rewards[0]?.name ?? "Équipement rare";
            setPendingReward(`Récompense de niveau 5 pour ${blade.blade.name}: ${gift}`);
          }
        }
      }
    })();
  }, [userBlades, playerId, setPendingReward]);

  return null; // pas d'affichage, uniquement la logique
}
