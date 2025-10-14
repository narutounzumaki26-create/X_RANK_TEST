"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Battle from "./components/Battle";
import ImageWithFallback from "./components/ImageWithFallback";
import InventoryView from "./components/view/InventoryView";
import { useBlades } from "./hooks/useBlades";
import { UserBladeFull } from "@/app/solo_blade_app/types/pets";
import PetDetailsView from "src/app/solo_blade_app/components/view/BladeDetailsView";
import { toast } from "sonner";
import { CyberPage } from "@/components/layout/CyberPage";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

/* ----------------------------- Types ----------------------------- */
type View = "dashboard" | "pet" | "battle" | "inventory";

/* ----------------------------- Component ----------------------------- */
export default function PetDashboard() {
  const [view, setView] = useState<View>("dashboard");
  const [pendingReward, setPendingReward] = useState<string | null>(null);

  const {
    userBlades,
    loading,
    error,
    selectedBlade,
    setSelectedBlade,
    refreshUserBlades,
    bladepoints,
    addBladepoints,
  } = useBlades();
  /* ----------------------------- Actions ----------------------------- */
  const handleUpdateBlade = async (updated: UserBladeFull) => {
    try {
      const { error } = await supabase
        .from("user_blades")
        .update({
          xp: updated.xp,
          hunger: updated.hunger,
          happiness: updated.happiness,
        })
        .eq("id", updated.id);

      if (error) throw error;

      setSelectedBlade(updated);
      await refreshUserBlades();
    } catch (e) {
      console.error("Erreur handleUpdateBlade:", e);
    }
  };

  useEffect(() => {
    if (!pendingReward) return;

    toast(pendingReward);
    setPendingReward(null);
  }, [pendingReward]);

  const handleExitBattle = async () => {
    if (selectedBlade) {
      const newHunger = Math.min(100, selectedBlade.hunger + 20);
      await handleUpdateBlade({ ...selectedBlade, hunger: newHunger });
    }
    setView("dashboard");
  };

  const handleBattleWin = async () => {
    try {
      const total = await addBladepoints(20);

      if (total === null) {
        toast.error("Impossible de créditer les BladePoints.");
        return;
      }

      setPendingReward(`⚡ +20 BladePoints ! Total: ${total}`);
    } catch (e) {
      console.error("Erreur attribution BladePoints:", e);
      toast.error("Une erreur est survenue lors du gain de BladePoints.");
    }
  };

  /* ----------------------------- États spéciaux ----------------------------- */
  if (loading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Solo Fight X", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">
          ⏳ Initialisation du réseau...
        </p>
      </CyberPage>
    );
  }

  if (error) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Solo Fight X", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">⚠️ Erreur : {error}</p>
      </CyberPage>
    );
  }

  /* ----------------------------- Vues ----------------------------- */

  /** 🔹 DASHBOARD PRINCIPAL */
  if (view === "dashboard") {
    return (
      <CyberPage
        header={{
          title: "⚡ Solo Fight X ⚡",
          subtitle: "Gère tes Blades, recrute de nouveaux alliés et prépare ton arsenal solo.",
          actions: (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
              <MainMenuButton className="w-full sm:w-auto" />
              <div className="rounded-full border border-cyan-500/70 bg-black/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200 shadow-[0_0_16px_rgba(0,255,255,0.35)]">
                BladePoints : <span className="text-white">{bladepoints}</span>
              </div>
              <Link href="/solo_blade_shop" className="inline-flex">
                <Button className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/60 hover:bg-cyan-500/30">
                  🛒 Aller au Blade Shop
                </Button>
              </Link>
            </div>
          ),
        }}
        contentClassName="gap-10"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-full border border-fuchsia-500/60 bg-black/75 shadow-[0_0_25px_rgba(255,0,255,0.35)]">
            <CardHeader>
              <CardTitle className="text-2xl text-fuchsia-300 text-center font-bold">
                Mes Blades
              </CardTitle>
              <CardDescription className="text-center text-gray-300">
                Blades actuellement sous ton contrôle
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              {userBlades.length === 0 ? (
                <p className="col-span-full text-center text-gray-400 italic">Aucune Blade détectée...</p>
              ) : (
                userBlades.map((userBlade: UserBladeFull) => (
                  <button
                    key={userBlade.id}
                    type="button"
                    onClick={() => {
                      setSelectedBlade(userBlade);
                      setView("pet");
                    }}
                    className="group flex flex-col items-center rounded-2xl border border-fuchsia-500/40 bg-black/70 p-4 text-left shadow-[0_0_18px_rgba(255,0,255,0.25)] transition hover:-translate-y-1 hover:border-fuchsia-400/80 hover:shadow-[0_0_26px_rgba(255,0,255,0.45)]"
                  >
                    <ImageWithFallback
                      src={userBlade.blade.image_url}
                      alt={userBlade.blade.name}
                      size={90}
                      fallback="🐾"
                    />
                    <p className="mt-3 text-lg font-semibold text-white">{userBlade.blade.name}</p>
                    <p className="text-sm text-cyan-300">⚡ Faim: {userBlade.hunger}</p>
                    <p className="text-sm text-emerald-300">✦ Joie: {userBlade.happiness}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="h-full border border-cyan-500/60 bg-black/75 shadow-[0_0_25px_rgba(0,255,255,0.35)]">
            <CardHeader>
              <CardTitle className="text-2xl text-cyan-300 text-center font-bold">
                Recrutement de Blades
              </CardTitle>
              <CardDescription className="text-center text-gray-300">
                Les nouvelles lames s&apos;achètent désormais via le Blade Shop.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-4 text-center">
              <ImageWithFallback src="/shops/hero.png" alt="Blade Shop" size={120} fallback="✨" />
              <p className="text-sm text-gray-300">
                Consulte les boutiques thématiques pour découvrir de nouvelles Blades. Les prix varient selon le niveau :
                <span className="text-cyan-200"> 100</span> points pour le niveau 1,
                <span className="text-cyan-200"> 1000</span> points pour le niveau 2 et ainsi de suite.
              </p>
              <Link href="/solo_blade_shop" className="inline-flex">
                <Button className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400">
                  Accéder au Blade Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setView("inventory")}
            className="rounded-full border border-cyan-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200 transition hover:bg-cyan-500/10"
          >
            🧰 Inventaire
          </button>
        </div>
      </CyberPage>
    );
  }

  /** 🔹 DÉTAILS D’UNE BLADE */
  if (view === "pet" && selectedBlade) {
    return (
      <PetDetailsView
        selectedPet={selectedBlade}
        onBack={() => setView("dashboard")}
        onBattle={() => setView("battle")}
        onUpdatePet={handleUpdateBlade}
        refreshUserBlades={refreshUserBlades}
      />
    );
  }

  /** 🔹 COMBAT SOLO */
  if (view === "battle" && selectedBlade) {
    return (
      <CyberPage
        header={{
          title: "Mode Combat",
          subtitle: selectedBlade.blade.name,
          actions: <MainMenuButton />,
        }}
        contentClassName="gap-6"
      >
        <button
          onClick={() => setView("dashboard")}
          className="self-start rounded-full border border-gray-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-200 transition hover:bg-gray-700/60"
        >
          ⬅ Retour
        </button>
        <Battle
          selectedPet={selectedBlade}
          onUpdatePet={handleUpdateBlade}
          onExit={handleExitBattle}
          onWin={handleBattleWin}
        />
      </CyberPage>
    );
  }

  /** 🔹 INVENTAIRE */
  if (view === "inventory") {
    return (
      <CyberPage header={{ title: "Inventaire", actions: <MainMenuButton /> }}>
        <InventoryView onBack={() => setView("dashboard")} />
      </CyberPage>
    );
  }

  return null;
}
