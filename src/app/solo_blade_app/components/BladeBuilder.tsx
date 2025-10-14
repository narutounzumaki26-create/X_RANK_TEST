"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ImageWithFallback from "./ImageWithFallback";
import {
  UserBladeFull,
  Assist,
  Bit,
  Ratchet,
} from "@/app/solo_blade_app/types/pets";

/* -------------------------------------------------------------------------- */
/*                                    Props                                   */
/* -------------------------------------------------------------------------- */
type BladeBuilderProps = {
  selectedBlade: UserBladeFull;
  onBack: () => void;
  refreshUserBlades: () => Promise<void>;
};

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type InventoryRow = {
  inventory_id: string;
  item_id: string;
  item_type: "assist" | "ratchet" | "bit";
  quantity: number;
};

type Equipement = Assist | Bit | Ratchet;

/* -------------------------------------------------------------------------- */
/*                              Component Builder                             */
/* -------------------------------------------------------------------------- */
export default function BladeBuilder({ selectedBlade, onBack, refreshUserBlades }: BladeBuilderProps) {
  const [inventory, setInventory] = useState<Equipement[]>([]);
  const [assist, setAssist] = useState<string | null>(null);
  const [ratchet, setRatchet] = useState<string | null>(null);
  const [bit, setBit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------------------------------- */
  /*                         Charger l'inventaire joueur                        */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        // Récupère le player_id lié à cet utilisateur
        const { data: playerData } = await supabase
          .from("players")
          .select("player_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!playerData) return;

        // Charge tout l'inventaire du joueur
        const { data, error } = await supabase
          .from("player_inventory")
          .select("item_id, item_type, quantity")
          .eq("player_id", playerData.player_id)
          .gt("quantity", 0)
          .returns<InventoryRow[]>();

        if (error) {
          console.error("Erreur chargement inventaire:", error);
          return;
        }

        const equipements: Equipement[] = [];

        for (const row of data ?? []) {
          let tableName = "";
          let idCol = "";

          switch (row.item_type) {
            case "assist":
              tableName = "assist";
              idCol = "assist_id";
              break;
            case "ratchet":
              tableName = "ratchet";
              idCol = "ratchet_id";
              break;
            case "bit":
              tableName = "bit";
              idCol = "bit_id";
              break;
            default:
              continue;
          }

          const { data: eq } = await supabase
            .from(tableName)
            .select("*")
            .eq(idCol, row.item_id)
            .maybeSingle();

          if (eq) equipements.push(eq as Equipement);
        }

        setInventory(equipements);
      } catch (err) {
        console.error("Erreur fetchInventory:", err);
      }
    };

    fetchInventory();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                       Vérification du build valide                         */
  /* -------------------------------------------------------------------------- */
  const isBuildValid = (): boolean => {
    if (selectedBlade.blade.line === "CX") {
      // CX → Assist + Ratchet + Bit
      return !!(assist && ratchet && bit);
    }
    // Autres → Ratchet + Bit
    return !!(ratchet && bit);
  };

  /* -------------------------------------------------------------------------- */
  /*                             Sauvegarde du build                            */
  /* -------------------------------------------------------------------------- */
  const handleSaveBuild = async () => {
    if (!isBuildValid()) {
      alert("⚠️ Le build est incomplet !");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("Utilisateur non connecté");

      const { data: existingBuild } = await supabase
        .from("user_blade_builds")
        .select("*")
        .eq("user_blade_id", selectedBlade.id)
        .maybeSingle();

      if (existingBuild) {
        const { error: updateError } = await supabase
          .from("user_blade_builds")
          .update({
            assist_id: assist,
            ratchet_id: ratchet,
            bit_id: bit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBuild.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("user_blade_builds").insert({
          user_blade_id: selectedBlade.id,
          assist_id: assist,
          ratchet_id: ratchet,
          bit_id: bit,
        });

        if (insertError) throw insertError;
      }

      alert("✅ Build sauvegardé !");
      await refreshUserBlades();
      onBack();
    } catch (err) {
      console.error("Erreur sauvegarde build:", err);
      alert("❌ Impossible de sauvegarder le build.");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                          Filtrage et affichage UI                          */
  /* -------------------------------------------------------------------------- */
  const filterEquipments = (type: string) =>
    inventory.filter((i) => {
      if ("assist_id" in i && type === "assist") return true;
      if ("ratchet_id" in i && type === "ratchet") return true;
      if ("bit_id" in i && type === "bit") return true;
      return false;
    });

  const renderSelect = (
    label: string,
    type: string,
    value: string | null,
    setValue: (v: string) => void
  ) => {
    const items = filterEquipments(type);
    return (
      <div>
        <p className="text-gray-300 mb-2 font-medium">{label}</p>
        <div className="flex items-center gap-3">
          <select
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 text-white p-2 rounded-xl focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-400 transition"
          >
            <option value="">-- Aucun --</option>
            {items.map((item) => {
              const id: string | undefined =
                ("assist_id" in item && item.assist_id) ||
                ("ratchet_id" in item && item.ratchet_id) ||
                ("bit_id" in item && item.bit_id) ||
                undefined;

              if (!id) return null;

              return (
                <option key={id} value={id}>
                  {item.name}
                </option>
              );
            })}
          </select>

          {value && (
            <ImageWithFallback
              src={
                items.find((i) => {
                  const id: string | undefined =
                    ("assist_id" in i && i.assist_id) ||
                    ("ratchet_id" in i && i.ratchet_id) ||
                    ("bit_id" in i && i.bit_id) ||
                    undefined;
                  return id === value;
                })?.image_url
              }
              alt={
                items.find((i) => {
                  const id: string | undefined =
                    ("assist_id" in i && i.assist_id) ||
                    ("ratchet_id" in i && i.ratchet_id) ||
                    ("bit_id" in i && i.bit_id) ||
                    undefined;
                  return id === value;
                })?.name
              }
              size={50}
              fallback="✨"
            />
          )}
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                              Rendu final UI                                */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white p-6">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 rounded-xl border border-fuchsia-600 text-fuchsia-400 hover:bg-fuchsia-900/30 hover:text-white transition shadow-lg shadow-fuchsia-800/40"
      >
        ⬅ Retour
      </button>

      <Card className="bg-black/80 border border-fuchsia-500 rounded-2xl shadow-xl shadow-fuchsia-800/50 p-6 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-fuchsia-400 text-2xl font-bold text-center drop-shadow-md">
            ⚙️ Builder :{" "}
            <span className="text-cyan-300">{selectedBlade.blade.name}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* CX → Assist + Ratchet + Bit */}
          {selectedBlade.blade.line === "CX" && (
            <>
              {renderSelect("Assist", "assist", assist, setAssist)}
            </>
          )}

          {/* Tous les types → Ratchet + Bit */}
          {renderSelect("Ratchet", "ratchet", ratchet, setRatchet)}
          {renderSelect("Bit", "bit", bit, setBit)}

          <button
            onClick={handleSaveBuild}
            disabled={loading || !isBuildValid()}
            className={`w-full py-3 rounded-xl font-bold text-black transition shadow-lg shadow-yellow-800/40 ${
              isBuildValid()
                ? "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500"
                : "bg-gray-600 cursor-not-allowed opacity-60"
            }`}
          >
            {loading ? "Sauvegarde..." : "💾 Sauvegarder le build"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
