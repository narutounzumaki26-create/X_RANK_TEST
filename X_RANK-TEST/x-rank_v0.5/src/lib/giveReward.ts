import { getCurrentPlayerId } from "@/lib/player";
import { hasReceivedReward, recordReward } from "@/lib/rewards";

/**
 * Donne une récompense une seule fois à l'utilisateur connecté
 */
export async function giveUserRewardOnce(rewardType: string): Promise<boolean> {
  try {
    const playerId = await getCurrentPlayerId();

    if (!playerId) {
      console.error("❌ Aucun player_id associé à l'utilisateur connecté.");
      return false;
    }

    const alreadyRewarded = await hasReceivedReward(playerId, rewardType);

    if (alreadyRewarded) {
      console.log(`⚠️ Reward '${rewardType}' déjà accordée à ${playerId}`);
      return false;
    }

    await recordReward(playerId, rewardType);

    console.log(`🎁 Reward '${rewardType}' donnée avec succès à ${playerId}`);
    return true;
  } catch (err) {
    console.error("Erreur giveUserRewardOnce:", err);
    return false;
  }
}
