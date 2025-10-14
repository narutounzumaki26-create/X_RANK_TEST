"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInventory } from "@/app/hooks/useInventory"; // 👈 ton nouveau hook
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/*                            Composant principal                             */
/* -------------------------------------------------------------------------- */
export default function Inventory() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  // 🔹 Étape 1 : récupérer le player_id de l’utilisateur courant
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

    fetchPlayerId();
  }, []);

  // 🔹 Étape 2 : on utilise ton hook custom
  const { inventory, loading } = useInventory(playerId);

  /* -------------------------------------------------------------------------- */
  /*                                   Rendu UI                                 */
  /* -------------------------------------------------------------------------- */
  if (loading) {
    return (
      <Card className="bg-gray-800/70 border-2 border-blue-500 rounded-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-400 text-center font-bold">
            Inventaire
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 text-center">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/70 border-2 border-blue-500 rounded-2xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-400 text-center font-bold">
          Inventaire
        </CardTitle>
        <CardDescription className="text-center text-gray-300">
          Vos équipements collectés
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-4 justify-center mt-4">
        {inventory.length === 0 ? (
          <p className="text-gray-300">Aucun équipement.</p>
        ) : (
          inventory.map((item) => (
            <Card
              key={item.inventory_id}
              className="bg-gray-700/50 border-2 border-blue-600 rounded-xl shadow-lg p-4 w-40 flex flex-col items-center"
            >
              {/* ✅ Image réelle si dispo */}
              {item.equipment?.image_url ? (
                <Image
                  src={item.equipment.image_url}
                  alt={item.equipment.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 mb-2 object-contain"
                />
              ) : (
                <div className="w-16 h-16 mb-2 flex items-center justify-center text-2xl">
                  🌀
                </div>
              )}

              <p className="text-white font-semibold">
                {item.equipment?.name ?? "Objet inconnu"}
              </p>
              <p className="text-gray-300 text-sm capitalize">
                Type : {item.item_type}
              </p>
              <p className="text-gray-400 text-xs">x{item.quantity}</p>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
