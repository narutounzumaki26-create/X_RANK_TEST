"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";
import { CyberPage } from "@/components/layout/CyberPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlayerProfile } from "@/app/hooks/usePlayerProfile";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

const SHOP_STATUSES = ["solo_only", "both"] as const;

type Blade = {
  blade_id: string;
  name: string;
  level: number | null;
  type: string | null;
  line: string | null;
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  propulsion: number | null;
  burst: number | null;
  image_url: string | null;
  status: string | null;
};

function getBladeCost(level: number | null): number {
  const normalized = Math.max(1, level ?? 1);
  return 100 * Math.pow(10, normalized - 1);
}

function formatArchetype(label: string): string {
  if (!label) return "";
  const pretty = label.replace(/[-_]/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export default function ShopArchetypePage() {
  const params = useParams();
  const archetype = typeof params?.archetype === "string" ? params.archetype : "";

  const { profile, loading: profileLoading, error: profileError, addBladepoints } = usePlayerProfile();
  const playerId = profile?.player_id ?? null;
  const bladepoints = profile?.bladepoints ?? 0;

  const [blades, setBlades] = useState<Blade[]>([]);
  const [loadingBlades, setLoadingBlades] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!archetype) return;
    if (profileLoading) return;

    if (!playerId) {
      setError("Impossible de récupérer votre profil joueur.");
      setBlades([]);
      setLoadingBlades(false);
      return;
    }

    const fetchAvailableBlades = async (): Promise<void> => {
      setLoadingBlades(true);
      setError(null);

      try {
        const { data: ownedData, error: ownedError } = await supabase
          .from("user_blades")
          .select("blade_id")
          .eq("player_id", playerId);

        if (ownedError) throw ownedError;
        const ownedIds = new Set((ownedData ?? []).map((b) => b.blade_id));

        const { data: bladesData, error: bladesError } = await supabase
          .from("blade")
          .select("*")
          .eq("archetype", archetype)
          .in("status", SHOP_STATUSES);

        if (bladesError) throw bladesError;

        const available = (bladesData ?? []).filter((b) => !ownedIds.has(b.blade_id));
        setBlades(available as Blade[]);
      } catch (err) {
        console.error("Erreur chargement blades:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        toast.error("Impossible de charger les Blades pour ce shop.");
      } finally {
        setLoadingBlades(false);
      }
    };

    void fetchAvailableBlades();
  }, [archetype, playerId, profileLoading]);

  const adoptBlade = async (blade: Blade): Promise<void> => {
    if (!profile || !playerId) {
      toast.error("Profil joueur introuvable.");
      return;
    }

    const cost = getBladeCost(blade.level);
    if (bladepoints < cost) {
      toast.error("BladePoints insuffisants pour cette Blade.");
      return;
    }

    try {
      const updated = await addBladepoints(-cost);
      if (updated === null) {
        toast.error("La mise à jour de vos BladePoints a échoué.");
        return;
      }

      const { error: insertError } = await supabase.from("user_blades").insert([
        {
          player_id: playerId,
          blade_id: blade.blade_id,
          xp: 0,
          hunger: 100,
          happiness: 100,
        },
      ]);

      if (insertError) {
        await addBladepoints(cost);
        throw insertError;
      }

      toast.success(`${blade.name} rejoint ton équipe ! (-${cost} BP)`);
      setBlades((prev) => prev.filter((b) => b.blade_id !== blade.blade_id));
    } catch (err) {
      console.error("Erreur adoption:", err);
      toast.error("Impossible d’adopter cette Blade.");
    }
  };

  const formattedArchetype = useMemo(() => formatArchetype(archetype), [archetype]);
  const globalError = error || profileError;
  const isLoading = profileLoading || loadingBlades;

  if (!archetype) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Blade Shop", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-gray-300">Catégorie introuvable.</p>
      </CyberPage>
    );
  }

  if (isLoading) {
    return (
      <CyberPage
        centerContent
        header={{ title: `Boutique ${formattedArchetype}`, actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.4em] text-yellow-300">⚙️ Synchronisation des stocks...</p>
      </CyberPage>
    );
  }

  if (globalError) {
    return (
      <CyberPage
        centerContent
        header={{ title: `Boutique ${formattedArchetype}`, actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">⚠️ {globalError}</p>
        <Link href="/solo_blade_shop" className="mt-6 inline-flex">
          <Button className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/80 hover:bg-yellow-500/30">
            ← Retour aux boutiques
          </Button>
        </Link>
      </CyberPage>
    );
  }

  if (blades.length === 0) {
    return (
      <CyberPage
        centerContent
        header={{ title: `Boutique ${formattedArchetype}`, actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-gray-300">Aucune Blade disponible pour cette catégorie.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/solo_blade_shop" className="inline-flex">
            <Button className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/80 hover:bg-yellow-500/30">
              ← Retour aux boutiques
            </Button>
          </Link>
          <Link href="/solo_blade_app" className="inline-flex">
            <Button className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/60 hover:bg-cyan-500/30">
              Aller à Solo Blade App
            </Button>
          </Link>
        </div>
      </CyberPage>
    );
  }

  return (
    <CyberPage
      header={{
        title: `🐾 Boutique ${formattedArchetype}`,
        subtitle: "Sélectionne une Blade compatible avec ton style de combat.",
        actions: (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
            <MainMenuButton className="w-full sm:w-auto" />
            <div className="rounded-full border border-yellow-500/70 bg-black/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-200 shadow-[0_0_16px_rgba(255,255,0,0.35)]">
              BladePoints : <span className="text-white">{bladepoints}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/solo_blade_app" className="inline-flex">
                <Button className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/60 hover:bg-cyan-500/30">
                  ← Solo Blade App
                </Button>
              </Link>
              <Link href="/solo_blade_shop" className="inline-flex">
                <Button className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/80 hover:bg-yellow-500/30">
                  Boutiques
                </Button>
              </Link>
            </div>
          </div>
        ),
      }}
      contentClassName="gap-10"
    >
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {blades.map((blade) => {
          const cost = getBladeCost(blade.level);
          const canAfford = bladepoints >= cost;

          return (
            <Card
              key={blade.blade_id}
              className="bg-black/75 border border-yellow-500/60 shadow-[0_0_20px_rgba(255,255,0,0.35)] hover:-translate-y-1 hover:shadow-[0_0_26px_rgba(255,255,0,0.55)] transition"
            >
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_12px_rgba(255,255,0,0.4)]">
                  {blade.name}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {blade.type || "Type inconnu"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <Image
                  src={blade.image_url || "/default_blade.png"}
                  alt={blade.name}
                  width={180}
                  height={180}
                  className="rounded-xl object-contain drop-shadow-[0_0_15px_rgba(255,255,0,0.35)]"
                />
                <div className="text-sm text-gray-300">
                  <p>⚔️ Attaque : {blade.attack ?? "?"}</p>
                  <p>🛡️ Défense : {blade.defense ?? "?"}</p>
                  <p>💨 Propulsion : {blade.propulsion ?? "?"}</p>
                  <p>🔋 Stamina : {blade.stamina ?? "?"}</p>
                  <p>💥 Burst : {blade.burst ?? "?"}</p>
                </div>
                <div className="flex flex-col items-center gap-1 text-sm text-yellow-200">
                  <span className="text-lg font-semibold text-yellow-300">
                    {cost.toLocaleString()} BP
                  </span>
                  <span className="text-xs text-gray-400">Niveau {blade.level ?? 1}</span>
                </div>
                <Button
                  onClick={() => adoptBlade(blade)}
                  disabled={!canAfford}
                  className="bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-60"
                >
                  {canAfford ? "Acheter" : "Solde insuffisant"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CyberPage>
  );
}
