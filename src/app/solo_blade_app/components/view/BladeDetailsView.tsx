"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";
import ImageWithFallback from "../ImageWithFallback";
import {
  UserBladeFull,
  CombatStats,
  Assist,
  Bit,
  Ratchet,
  LockChip,
  DEFAULT_STAT,
} from "../../types/pets";
import Energize from "../EnergizeComponents/Energize";
import BladeBuilder from "src/app/solo_blade_app/components/BladeBuilder";

/* =========================
   Types locaux (build actuel)
========================= */
type PetBuildRow = {
  id: string;
  user_blade_id: string;
  assist_id: string | null;
  ratchet_id: string | null;
  bit_id: string | null;
  lock_chip_id: string | null;
};

type LoadedEquipments = {
  assist?: Assist | null;
  ratchet?: Ratchet | null;
  bit?: Bit | null;
  lock_chip?: LockChip | null;
};

type PetDetailsViewProps = {
  selectedPet: UserBladeFull;
  onBack: () => void;
  onBattle: () => void;
  onUpdatePet: (updated: UserBladeFull) => void;
  refreshUserBlades: () => Promise<void>;
};

/* ================================================================
   Composant principal
================================================================ */
export default function PetDetailsView({
  selectedPet,
  onBack,
  onBattle,
  onUpdatePet,
  refreshUserBlades,
}: PetDetailsViewProps) {
  const maxXp = 1000;

  // États locaux
  const [isEnergizeOpen, setIsEnergizeOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false); // ✅ déclenche un re-fetch après modification du build

  const [currentBuild, setCurrentBuild] = useState<PetBuildRow | null>(null);
  const [equipmentBonuses, setEquipmentBonuses] = useState<Partial<CombatStats>>({});
  const [equipmentNames, setEquipmentNames] = useState<string[]>([]);

  const xpPercent = Math.min(100, ((selectedPet.xp ?? 0) / maxXp) * 100);

  /* ==========================================================
     1) Charger le build + les pièces depuis les vraies tables
  ========================================================== */
  useEffect(() => {
    if (!selectedPet?.id) return;

    const fetchBuildAndEquipments = async () => {
      console.groupCollapsed("🔍 BladeDetails fetch cycle");
      console.log("Fetching build and equipments for:", selectedPet.id);

      try {
        // Récupération du build
        const { data: build, error: buildErr } = await supabase
          .from("user_blade_builds")
          .select("*")
          .eq("user_blade_id", selectedPet.id)
          .maybeSingle<PetBuildRow>();

        if (buildErr) console.error("❌ Erreur fetch build:", buildErr);
        setCurrentBuild(build ?? null);

        if (!build) {
          setEquipmentBonuses({});
          setEquipmentNames([]);
          console.groupEnd();
          return;
        }

        // Fetch des pièces existantes
        const [assistRes, ratchetRes, bitRes, lockChipRes] = await Promise.all([
          build.assist_id
            ? supabase.from("assist").select("*").eq("assist_id", build.assist_id).maybeSingle<Assist>()
            : Promise.resolve({ data: null, error: null }),
          build.ratchet_id
            ? supabase.from("ratchet").select("*").eq("ratchet_id", build.ratchet_id).maybeSingle<Ratchet>()
            : Promise.resolve({ data: null, error: null }),
          build.bit_id
            ? supabase.from("bit").select("*").eq("bit_id", build.bit_id).maybeSingle<Bit>()
            : Promise.resolve({ data: null, error: null }),
          build.lock_chip_id
            ? supabase.from("lock_chip").select("*").eq("lock_chip_id", build.lock_chip_id).maybeSingle<LockChip>()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (assistRes?.error) console.warn("assist fetch:", assistRes.error);
        if (ratchetRes?.error) console.warn("ratchet fetch:", ratchetRes.error);
        if (bitRes?.error) console.warn("bit fetch:", bitRes.error);
        if (lockChipRes?.error) console.warn("lock_chip fetch:", lockChipRes.error);

        const loaded: LoadedEquipments = {
          assist: assistRes?.data ?? null,
          ratchet: ratchetRes?.data ?? null,
          bit: bitRes?.data ?? null,
          lock_chip: lockChipRes?.data ?? null,
        };

        // Calcul des bonus
        const bonuses: Required<CombatStats> = {
          attack: 0,
          defense: 0,
          stamina: 0,
          height: 0,
          propulsion: 0,
          burst: 0,
          weight: 0,
        };

        [loaded.assist, loaded.ratchet, loaded.bit].forEach((p) => {
          bonuses.attack += p?.attack ?? 0;
          bonuses.defense += p?.defense ?? 0;
          bonuses.stamina += p?.stamina ?? 0;
          bonuses.height += p?.height ?? 0;
          bonuses.propulsion += p?.propulsion ?? 0;
          bonuses.burst += p?.burst ?? 0;
        });

        setEquipmentBonuses(bonuses);

        const names = [
          loaded.lock_chip?.name,
          loaded.assist?.name,
          loaded.ratchet?.name,
          loaded.bit?.name,
        ].filter(Boolean) as string[];

        setEquipmentNames(names);
      } catch (err) {
        console.error("Erreur fetchBuildAndEquipments:", err);
      } finally {
        console.groupEnd();
        setShouldRefresh(false); // reset du flag
      }
    };

    fetchBuildAndEquipments();
  }, [selectedPet.id, shouldRefresh]); // ✅ pas de currentBuild ici

  /* ====================================
     2) Stats finales (blade + bonus pièces)
  ==================================== */
  const petStats: Required<CombatStats> = {
    attack: (selectedPet.blade.attack ?? DEFAULT_STAT) + (equipmentBonuses.attack ?? 0),
    defense: (selectedPet.blade.defense ?? DEFAULT_STAT) + (equipmentBonuses.defense ?? 0),
    stamina: (selectedPet.blade.stamina ?? DEFAULT_STAT) + (equipmentBonuses.stamina ?? 0),
    propulsion: (selectedPet.blade.propulsion ?? DEFAULT_STAT) + (equipmentBonuses.propulsion ?? 0),
    height: (selectedPet.blade.height ?? DEFAULT_STAT) + (equipmentBonuses.height ?? 0),
    burst: (selectedPet.blade.burst ?? DEFAULT_STAT) + (equipmentBonuses.burst ?? 0),
    weight: (selectedPet.blade.weight ?? DEFAULT_STAT) + (equipmentBonuses.weight ?? 0),
  };

  /* ==========================
     3) Exemple: consommer objet
  ========================== */
  const handleUseItem = async () => {
    try {
      const newHunger = Math.max(0, (selectedPet.hunger ?? 100) - 20);
      const { error } = await supabase
        .from("user_blades")
        .update({ hunger: newHunger })
        .eq("id", selectedPet.id);

      if (error) {
        console.error("Erreur update blade:", error);
        return;
      }

      onUpdatePet({ ...selectedPet, hunger: newHunger });
    } catch (err) {
      console.error("Erreur handleUseItem:", err);
    }
  };

  /* ==========================
     4) Builder view
  ========================== */
  if (showBuilder) {
    const handleBuilderBack = async () => {
      await refreshUserBlades(); // recharge les blades
      setShouldRefresh(true); // ✅ déclenche le re-fetch local
      setShowBuilder(false);
    };

    return (
      <BladeBuilder
        selectedBlade={selectedPet}
        onBack={handleBuilderBack}
        refreshUserBlades={refreshUserBlades}
      />
    );
  }

  /* ==========================
     5) Vue principale
  ========================== */
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="w-full rounded border border-gray-600 bg-gray-800 px-4 py-2 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-gray-700 sm:w-auto"
        >
          ⬅ Retour
        </button>
        <MainMenuButton className="w-full sm:w-auto" />
      </div>

      <Card className="bg-black/70 border border-yellow-400 rounded-2xl shadow-[0_0_20px_rgba(255,255,0,0.5)]">
        <CardHeader>
          <CardTitle className="text-2xl text-yellow-400 font-bold text-center drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
            {selectedPet.blade.name}
          </CardTitle>

          {currentBuild && equipmentNames.length > 0 ? (
            <CardDescription className="text-gray-300 text-center mt-1">
              {equipmentNames.join(" | ")}
            </CardDescription>
          ) : (
            <CardDescription className="text-gray-400 text-center">
              Interface de contrôle Blade
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6">
          <ImageWithFallback
            src={selectedPet.blade.image_url}
            alt={selectedPet.blade.name}
            size={120}
            fallback="🌀"
          />

          {/* Barre d'XP */}
          <div className="w-full max-w-sm text-center">
            <p className="text-gray-400 mb-2">
              XP : {selectedPet.xp} / {maxXp}
            </p>
            <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Stats avec build */}
          <div className="space-y-1 text-center">
            <p className="text-red-400">⚔ Attaque : {petStats.attack}</p>
            <p className="text-blue-400">🛡 Défense : {petStats.defense}</p>
            <p className="text-yellow-400">💪 Stamina : {petStats.stamina}</p>
            <p className="text-green-400">🚀 Propulsion : {petStats.propulsion}</p>
            <p className="text-cyan-400">📏 Hauteur : {petStats.height}</p>
            <p className="text-pink-400">💥 Burst : {petStats.burst}</p>

            {/* Barre d'Énergie */}
            <div className="w-full max-w-sm text-center mt-2">
              <p className="text-cyan-400 mb-2">
                ⚡ Énergie : {100 - selectedPet.hunger}/100
              </p>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 transition-all duration-500"
                  style={{ width: `${100 - selectedPet.hunger}%` }}
                />
              </div>
            </div>

            <p className="text-green-400">✦ Joie : {selectedPet.happiness}/100</p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setIsEnergizeOpen(true)}
              disabled={selectedPet.hunger === 0}
              className={`px-5 py-2 rounded shadow-[0_0_15px_rgba(0,150,255,0.8)] ${
                selectedPet.hunger === 0
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {selectedPet.hunger === 0
                ? "⚡ Déjà pleine d’énergie"
                : "⚡ Energiser"}
            </button>

            <button
              onClick={onBattle}
              disabled={selectedPet.hunger >= 90}
              className={`px-5 py-2 rounded shadow-[0_0_15px_rgba(255,255,0,0.8)] ${
                selectedPet.hunger >= 90
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-yellow-500 hover:bg-yellow-400"
              }`}
            >
              ⚔ Combattre
            </button>

            <button
              onClick={() => setShowBuilder(true)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded shadow-[0_0_15px_rgba(150,0,255,0.8)]"
            >
              🛠 Builder
            </button>
          </div>
        </CardContent>
      </Card>

      <Energize
        isOpen={isEnergizeOpen}
        onClose={() => setIsEnergizeOpen(false)}
        onUseItem={handleUseItem}
      />
    </div>
  );
}
