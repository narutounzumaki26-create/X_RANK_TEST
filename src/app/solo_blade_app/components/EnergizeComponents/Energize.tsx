"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useInventory, EquipmentStats } from "@/app/hooks/useInventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                                   Props                                    */
/* -------------------------------------------------------------------------- */
type EnergizeProps = {
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: EquipmentStats) => Promise<void>;
};

/* -------------------------------------------------------------------------- */
/*                            Composant principal                             */
/* -------------------------------------------------------------------------- */
export default function Energize({
  isOpen,
  onClose,
  onUseItem,
}: EnergizeProps) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🧭 Étape 1 : récupérer le player_id
  useEffect(() => {
    const fetchPlayerId = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: playerData, error } = await supabase
        .from("players")
        .select("player_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur récupération player_id:", error);
        return;
      }

      if (playerData?.player_id) {
        setPlayerId(playerData.player_id);
      }
    };

    if (isOpen) fetchPlayerId();
  }, [isOpen]);

  // 🧩 Étape 2 : charger l’inventaire
  const { inventory, loading: invLoading, refreshInventory } = useInventory(playerId);
  const selectedItem =
    inventory.find((i) => i.inventory_id === selectedItemId) || null;

  /* -------------------------------------------------------------------------- */
  /*                              Utiliser un objet                             */
  /* -------------------------------------------------------------------------- */
  const handleConfirm = async (): Promise<void> => {
    if (!selectedItem?.equipment) return;
    setLoading(true);

    try {
      // 🔹 1. Appliquer l’effet de l’objet
      await onUseItem(selectedItem.equipment);

      // 🔹 2. Calculer la nouvelle quantité
      const newQty = Math.max(0, selectedItem.quantity - 1);

      // 🔹 3. Mettre à jour Supabase
      const { error } = await supabase
        .from("player_inventory")
        .update({ quantity: newQty })
        .eq("inventory_id", selectedItem.inventory_id);

      if (error) throw error;

      // 🔹 4. Rafraîchir l’inventaire local
      await refreshInventory?.();

      // 🔹 5. Fermer le modal
      onClose();
    } catch (err) {
      console.error("Erreur utilisation objet:", err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                   Rendu UI                                 */
  /* -------------------------------------------------------------------------- */

  // ⚡ Ne garder que les items avec quantité > 1
  const usableItems = inventory.filter((item) => item.quantity > 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/80 border border-fuchsia-500 text-white rounded-2xl shadow-lg max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-fuchsia-400 text-2xl text-center">
            ⚡ Choisis un objet pour renforcer ta Blade
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4 max-h-64 overflow-y-auto">
          {invLoading ? (
            <p className="text-gray-400 italic text-center">
              Chargement de l’inventaire...
            </p>
          ) : usableItems.length === 0 ? (
            <p className="text-gray-400 italic text-center">
              Aucun objet utilisable...
            </p>
          ) : (
            usableItems.map((item) => (
              <button
                key={item.inventory_id}
                onClick={() => setSelectedItemId(item.inventory_id)}
                className={`px-4 py-2 rounded-xl border transition text-left ${
                  selectedItemId === item.inventory_id
                    ? "border-fuchsia-500 bg-fuchsia-900/40"
                    : "border-gray-600 hover:border-fuchsia-400"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white">
                    {item.equipment?.name ?? "Objet inconnu"}
                  </span>
                  <span className="text-cyan-400">×{item.quantity}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">
            Annuler
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!selectedItem || selectedItem.quantity <= 0 || loading}
            className={`${
              selectedItem && selectedItem.quantity > 0
                ? "bg-fuchsia-600 hover:bg-fuchsia-500"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Utilisation..." : "Utiliser"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
