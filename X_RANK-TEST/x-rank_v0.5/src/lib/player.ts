import { supabase } from "@/lib/supabaseClient";

/**
 * Retrieve the player_id associated with a given Supabase auth user id.
 * Returns null when no player is found or when Supabase returns an error.
 */
export async function getPlayerIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("players")
    .select("player_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erreur récupération player_id:", error);
    return null;
  }

  return data?.player_id ?? null;
}

/**
 * Helper that loads the current authenticated user and returns its player_id.
 */
export async function getCurrentPlayerId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Erreur récupération utilisateur:", error);
    return null;
  }

  const userId = data?.user?.id;
  if (!userId) {
    return null;
  }

  return getPlayerIdForUser(userId);
}

/**
 * Retrieve the auth user identifier linked to a given player identifier.
 */
export async function getUserIdForPlayer(playerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("players")
    .select("user_id")
    .eq("player_id", playerId)
    .maybeSingle<{ user_id: string | null }>();

  if (error) {
    console.error("Erreur récupération user_id depuis player_id:", error);
    return null;
  }

  return data?.user_id ?? null;
}
