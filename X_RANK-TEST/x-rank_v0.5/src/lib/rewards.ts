import { supabase } from "@/lib/supabaseClient"
import { getUserIdForPlayer } from "@/lib/player"

const EQUIPMENT_SOURCES = [
  { table: "assist", idColumn: "assist_id" },
  { table: "ratchet", idColumn: "ratchet_id" },
  { table: "bit", idColumn: "bit_id" },
  { table: "lock_chip", idColumn: "lock_chip_id" },
] as const

type EquipmentTable = (typeof EQUIPMENT_SOURCES)[number]
export type EquipmentTableName = EquipmentTable["table"]

type EquipmentRow = {
  id: string
  name: string
  type: EquipmentTableName
}

type RewardOwner = {
  playerId: string
  userId: string
}

type RewardHistoryRow = {
  id: string
  reward_type: string
  user_id: string
}

type InventoryRow = {
  inventory_id: string
  quantity: number
}

type InventoryItemType = "assist" | "ratchet" | "bit" | "lock_chip"

async function resolveRewardOwner(playerId: string): Promise<RewardOwner | null> {
  const userId = await getUserIdForPlayer(playerId)

  if (!userId) {
    console.warn("Aucun user_id associé au player_id fourni:", playerId)
    return null
  }

  return {
    playerId,
    userId,
  }
}

export async function hasReceivedReward(playerId: string, rewardType: string): Promise<boolean> {
  const owner = await resolveRewardOwner(playerId)
  if (!owner) {
    return false
  }

  const { data, error } = await supabase
    .from("user_rewards")
    .select("id")
    .eq("user_id", owner.userId)
    .eq("reward_type", rewardType)
    .maybeSingle<RewardHistoryRow>()

  if (error && error.code !== "PGRST116") {
    console.error("Erreur vérification historique reward:", error)
    return false
  }

  return Boolean(data)
}

export async function recordReward(playerId: string, rewardType: string): Promise<void> {
  const owner = await resolveRewardOwner(playerId)
  if (!owner) {
    return
  }

  const { error } = await supabase.from("user_rewards").insert({
    user_id: owner.userId,
    reward_type: rewardType,
  })

  if (error) {
    console.error("Erreur enregistrement reward:", error)
  }
}

export async function rewardInventoryItem(
  playerId: string,
  itemId: string,
  itemType: InventoryItemType,
  quantity: number = 1,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("increment_inventory_quantity", {
      p_player_id: playerId,
      p_item_id: itemId,
      p_item_type: itemType,
      p_amount: quantity,
    })

    if (!error) {
      return
    }

    console.warn("RPC increment_inventory_quantity indisponible, fallback manuel:", error)
  } catch (rpcError) {
    console.warn("Exception RPC increment_inventory_quantity, fallback manuel:", rpcError)
  }

  const { data: existing, error: fetchError } = await supabase
    .from("player_inventory")
    .select("inventory_id, quantity")
    .eq("player_id", playerId)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .maybeSingle<InventoryRow>()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Erreur lecture inventaire joueur:", fetchError)
    return
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("player_inventory")
      .update({ quantity: existing.quantity + quantity })
      .eq("inventory_id", existing.inventory_id)

    if (updateError) {
      console.error("Erreur mise à jour inventaire joueur:", updateError)
    }
  } else {
    const { error: insertError } = await supabase.from("player_inventory").insert({
      player_id: playerId,
      item_id: itemId,
      item_type: itemType,
      quantity,
    })

    if (insertError) {
      console.error("Erreur insertion inventaire joueur:", insertError)
    }
  }
}

export async function rewardRandomEquipments(
  playerId: string,
  count: number = 1,
): Promise<EquipmentRow[]> {
  const equipments: EquipmentRow[] = []

  for (const source of EQUIPMENT_SOURCES) {
    const { data, error } = await supabase
      .from(source.table)
      .select(`${source.idColumn}, name`)
      .returns<{ [key: string]: string | null }[]>()

    if (error) {
      console.warn(`Erreur chargement ${source.table}:`, error)
      continue
    }

    for (const row of data ?? []) {
      const id = row[source.idColumn]
      const name = row.name

      if (typeof id === "string") {
        equipments.push({
          id,
          name: typeof name === "string" ? name : source.table,
          type: source.table,
        })
      }
    }
  }

  if (equipments.length === 0) {
    console.error("Aucun équipement disponible pour les récompenses.")
    return []
  }

  const shuffled = [...equipments].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.max(1, Math.min(count, equipments.length)))

  for (const equip of selected) {
    await rewardInventoryItem(playerId, equip.id, equip.type)
  }

  return selected
}

export async function rewardNamedLoadout(
  playerId: string,
  items: { id: string; type: InventoryItemType }[],
): Promise<void> {
  await Promise.all(items.map((item) => rewardInventoryItem(playerId, item.id, item.type)))
}
