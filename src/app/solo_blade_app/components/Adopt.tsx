"use client";

import { supabase } from "@/lib/supabaseClient";
import { UserBlade, UserBladeFull, Blade, DEFAULT_STAT } from "@/app/solo_blade_app/types/pets";

/**
 * Permet à un utilisateur d’adopter une nouvelle Blade
 * en créant une entrée dans la table `user_blades`
 * et en enregistrant une récompense si ce n’est pas déjà fait.
 */
export async function adoptBlade(
  adoptCandidate: Blade,
  refreshUserBlades: () => Promise<void>
): Promise<UserBladeFull | null> {
  try {
    // 1️⃣ Récupérer l'utilisateur connecté
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) throw new Error("Utilisateur non connecté");
    const user = userData.user;

    // 2️⃣ Trouver le player_id correspondant
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("player_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (playerError || !playerData?.player_id) {
      console.error("❌ Aucun joueur trouvé pour cet utilisateur");
      return null;
    }

    const player_id = playerData.player_id;

    // 3️⃣ Préparer l’objet à insérer
    const insertData = {
      player_id,
      blade_id: adoptCandidate.blade_id,
      xp: 0,
      hunger: 100,
      happiness: 50,
    };

    console.log("⚔️ Tentative d’adoption :", insertData);

    // 4️⃣ Insérer dans la table user_blades
    const { data: inserted, error: insertError } = await supabase
      .from("user_blades")
      .insert([insertData])
      .select(
        `
        id,
        player_id,
        blade_id,
        xp,
        hunger,
        happiness,
        created_at
      `
      )
      .single<UserBlade>();

    if (insertError || !inserted) throw insertError;

    // 5️⃣ Fusionner avec les infos complètes de la Blade
    const newUserBlade: UserBladeFull = {
      ...inserted,
      blade: {
        ...adoptCandidate,
        image_url: adoptCandidate.image_url ?? null,
        attack: adoptCandidate.attack ?? DEFAULT_STAT,
        defense: adoptCandidate.defense ?? DEFAULT_STAT,
        stamina: adoptCandidate.stamina ?? DEFAULT_STAT,
        height: adoptCandidate.height ?? DEFAULT_STAT,
        propulsion: adoptCandidate.propulsion ?? DEFAULT_STAT,
        burst: adoptCandidate.burst ?? DEFAULT_STAT,
      },
    };

   
    // 7️⃣ Rafraîchir les données utilisateur
    await refreshUserBlades();

    console.log("✅ Nouvelle Blade adoptée :", newUserBlade);
    return newUserBlade;
  } catch (err) {
    console.error("❌ Erreur adoption :", err);
    return null;
  }
}
