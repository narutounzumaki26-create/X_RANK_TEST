"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { UserBladeFull } from "@/app/solo_blade_app/types/pets";
import {
  getPlayerIdForUser,
  hasReceivedReward,
  recordReward,
  rewardRandomEquipments,
} from "@/lib/rewards";

/* =======================================================
   🎁 SpecialBladeReward — Rewards players for their first blade
======================================================= */
type SpecialBladeRewardProps = {
  userBlades: UserBladeFull[];
  userId: string | null;
};

export function SpecialBladeReward({ userBlades, userId }: SpecialBladeRewardProps) {
  const hasProcessed = useRef(false);

  useEffect(() => {
    // ✅ Prevent running multiple times or when data is incomplete
    if (hasProcessed.current || !userBlades?.length || !userId) return;
    hasProcessed.current = true;

    const handleReward = async () => {
      try {
        // 1️⃣ Get player ID for this user
        const playerId = await getPlayerIdForUser(userId);
        if (!playerId) {
          console.error("⚠️ Aucun player_id trouvé pour cet utilisateur");
          return;
        }

        // 2️⃣ Check if this is the user's first blade
        const isFirstBlade = userBlades.length === 1;
        if (!isFirstBlade) return;

        // 3️⃣ Check if the reward has already been given
        const alreadyRewarded = await hasReceivedReward(playerId, "first_blade");
        if (alreadyRewarded) return;

        // 4️⃣ Give random equipment reward
        const rewardedItems = await rewardRandomEquipments(playerId, 10);
        await recordReward(playerId, "first_blade");

        // 5️⃣ Prepare and show success message
        const preview = rewardedItems.map((item) => item.name).slice(0, 3).join(", ");
        const rewardCount = rewardedItems.length;

        const description =
          rewardCount === 0
            ? "Bienvenue dans l'arène !"
            : `Bienvenue ! ${rewardCount} équipements ont été ajoutés (${preview}...)`;

        toast("🎁 Récompense obtenue", { description });
      } catch (error) {
        console.error("❌ Erreur lors de l’attribution de la récompense :", error);
        toast("⚠️ Erreur", {
          description: "Impossible d’attribuer la récompense. Réessayez plus tard.",
        });
      }
    };

    handleReward();
  }, [userBlades, userId]);

  return null;
}

