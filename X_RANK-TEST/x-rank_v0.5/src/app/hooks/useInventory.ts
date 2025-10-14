"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ==============================
   Types
============================== */
type InventoryItemDB = {
  inventory_id: string;
  player_id: string;
  item_id: string;
  item_type: "assist" | "bit" | "ratchet" | "lock_chip";
  quantity: number;
};

export type EquipmentStats = {
  id: string;
  name: string;
  type: string;
  image_url?: string | null;
  attack?: number | null;
  defense?: number | null;
  stamina?: number | null;
  height?: number | null;
  weight?: number | null;
  skills?: string | null;
  propulsion?: number | null;
  burst?: number | null;
};

export type InventoryItemFull = InventoryItemDB & {
  equipment: EquipmentStats | null;
};

/* ==============================
   Hook principal
============================== */
export function useInventory(playerId: string | null) {
  const [inventory, setInventory] = useState<InventoryItemFull[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔁 Fonction interne réutilisable
  const fetchInventory = useCallback(async (): Promise<void> => {
    if (!playerId) return;

    setLoading(true);

    // 1️⃣ Récupère les entrées brutes
    const { data: invData, error } = await supabase
      .from("player_inventory")
      .select("*")
      .eq("player_id", playerId)
      .returns<InventoryItemDB[]>();

    if (error) {
      console.error("Erreur chargement inventaire:", error);
      setInventory([]);
      setLoading(false);
      return;
    }

    const enriched: InventoryItemFull[] = [];

    // 2️⃣ Pour chaque item, on cherche les infos dans la bonne table
    for (const item of invData) {
      const table = item.item_type;
      const idCol =
        table === "assist"
          ? "assist_id"
          : table === "bit"
          ? "bit_id"
          : table === "ratchet"
          ? "ratchet_id"
          : "lock_chip_id";

      const { data: equipData, error: equipError } = await supabase
        .from(table)
        .select("*")
        .eq(idCol, item.item_id)
        .maybeSingle<EquipmentStats>();

      if (equipError) {
        console.warn(`Erreur chargement ${table}:`, equipError);
      }

      enriched.push({
        ...item,
        equipment: equipData ?? null,
      });
    }

    setInventory(enriched);
    setLoading(false);
  }, [playerId]);

  // ⚙️ Auto-chargement quand playerId change
  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  // ✅ Retourne aussi une méthode pour forcer le refresh
  return { inventory, loading, refreshInventory: fetchInventory };
}
