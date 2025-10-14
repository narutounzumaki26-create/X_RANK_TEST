"use client";

import { useEffect } from "react";
import { useBlades } from "@/app/solo_blade_app/hooks/useBlades";
import { toast } from "sonner";
import { UserBladeFull } from "@/app/solo_blade_app/types/pets";
import {
  hasReceivedReward,
  recordReward,
  rewardRandomEquipments,
} from "@/lib/rewards";

/* =======================================================
   Composant principal
======================================================= */
export default function RewardListener() {
  const { selectedBlade, userBlades, playerId } = useBlades();

  /* ----------------------------- 🎁 Récompense montée de niveau ----------------------------- */
  useEffect(() => {
    if (!selectedBlade || !playerId) return;

    const xp = selectedBlade.xp ?? 0;
    const level = Math.floor(xp / 100);

    if (level >= 5) {
      const rewardKey = `levelup_${selectedBlade.id}`;
      (async () => {
        const alreadyRewarded = await hasReceivedReward(playerId, rewardKey);
        if (alreadyRewarded) return;

        const rewards = await rewardRandomEquipments(playerId, 1);
        await recordReward(playerId, rewardKey);

        toast("🎁 Récompense obtenue !", {
          description:
            rewards.length > 0
              ? `Équipement rare pour ${selectedBlade.blade.name}: ${rewards[0].name}`
              : `Équipement rare pour ${selectedBlade.blade.name}`,
        });
      })();
    }
  }, [selectedBlade, playerId]);

  /* ----------------------------- 🎁 Récompense Blade spéciale ----------------------------- */
  useEffect(() => {
    if (!userBlades || !playerId) return;

    const specialBlade = userBlades.find(
      (b: UserBladeFull) => b.blade?.name === "Dragon Noir"
    );

    if (specialBlade) {
      (async () => {
        const rewardKey = "special_dragon_noir";
        const alreadyRewarded = await hasReceivedReward(playerId, rewardKey);
        if (alreadyRewarded) return;

        const rewards = await rewardRandomEquipments(playerId, 3);
        await recordReward(playerId, rewardKey);

        toast("🎁 Récompense obtenue !", {
          description:
            rewards.length > 0
              ? `Butin du Dragon Noir: ${rewards.map((item) => item.name).join(", ")}`
              : "Équipement unique du Dragon Noir 🐉",
        });
      })();
    }
  }, [userBlades, playerId]);

  return null;
}
