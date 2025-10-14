"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { UserBladeFull } from "@/app/solo_blade_app/types/pets";
import { getPlayerIdForUser } from "@/lib/player";
import { hasReceivedReward, recordReward, rewardRandomEquipments } from "@/lib/rewards";

/* =======================================================
   🎁 Composant principal de récompense
======================================================= */
type SpecialBladeRewardProps = {
  userBlades: UserBladeFull[];
  userId: string | null;
};

export function SpecialBladeReward({
  userBlades,
  userId,
}: SpecialBladeRewardProps) {
  useEffect(() => {
    if (!userBlades?.length || !userId) return;

    (async () => {
      const playerId = await getPlayerIdForUser(userId);

      if (!playerId) {
        console.error("⚠️ Aucun player_id trouvé pour cet utilisateur");
        return;
      }

      if (userBlades.length === 1) {
        const alreadyRewarded = await hasReceivedReward(playerId, "first_blade");

        if (!alreadyRewarded) {
          const rewarded = await rewardRandomEquipments(playerId, 10);
          await recordReward(playerId, "first_blade");

          const itemPreview = rewarded.map((item) => item.name).slice(0, 3);
          const description =
            rewarded.length === 0
              ? "Bienvenue dans l'arène !"
              : `Bienvenue ! ${rewarded.length} équipements ont été ajoutés (${itemPreview.join(", ")}...)`;

          toast("🎁 Récompense obtenue", {
            description,
          });
        }
      }
    })();
  }, [userBlades, userId]);

  return null;
}
