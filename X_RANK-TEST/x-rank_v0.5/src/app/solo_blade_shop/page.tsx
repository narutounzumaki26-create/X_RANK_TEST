"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CyberPage } from "@/components/layout/CyberPage";
import { usePlayerProfile } from "@/app/hooks/usePlayerProfile";
import { MainMenuButton } from "@/components/navigation/MainMenuButton";

/* ==========================================
   🎨 Page : solo_blade_shop
   ==========================================
   - Affiche les boutiques disponibles
   - Chaque boutique correspond à un archetype
   - On affiche aussi une petite description sympa
========================================== */

type BladeRow = {
  archetype: string | null;
};

type ShopCategory = {
  archetype: string;
  display_name: string;
  description: string;
  image: string;
};

export default function SoloBladeShop() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { profile, loading: profileLoading, error: profileError } = usePlayerProfile();
  const bladepoints = profile?.bladepoints ?? 0;

  useEffect(() => {
    const fetchArchetypes = async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from("blade")
          .select("archetype")
          .not("archetype", "is", null);

        if (error) throw error;
        if (!data) {
          setCategories([]);
          return;
        }

        // ✅ Typage de data
        const blades = data as BladeRow[];

        // ✅ Filtrer les duplicats + valeurs null
        const uniqueArchetypes = Array.from(
          new Set(blades.map((b) => b.archetype).filter((a): a is string => Boolean(a)))
        );

        // ✅ Mapper chaque archetype vers un objet complet
        const mapped: ShopCategory[] = uniqueArchetypes.map((archetype) => ({
          archetype,
          display_name: capitalize(archetype),
          description: getArchetypeDescription(archetype),
          image: getArchetypeImage(archetype),
        }));

        setCategories(mapped);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Erreur fetch archetypes:", err.message);
        } else {
          console.error("Erreur fetch archetypes (inconnue):", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArchetypes();
  }, []);

  if (loading || profileLoading) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Blade Shop", actions: <MainMenuButton /> }}
      >
        <p className="text-sm uppercase tracking-[0.4em] text-yellow-300">
          🌀 Chargement des boutiques...
        </p>
      </CyberPage>
    );
  }

  if (profileError) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Blade Shop", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-red-400">⚠️ {profileError}</p>
      </CyberPage>
    );
  }

  if (categories.length === 0) {
    return (
      <CyberPage
        centerContent
        header={{ title: "Blade Shop", actions: <MainMenuButton /> }}
      >
        <p className="text-sm text-gray-300">
          Aucune boutique disponible pour le moment.
        </p>
      </CyberPage>
    );
  }

  return (
    <CyberPage
      header={{
        title: "🏪 Blade Shop",
        subtitle: "Choisis ton archetype et découvre l&apos;arsenal correspondant.",
        actions: (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
            <MainMenuButton className="w-full sm:w-auto" />
            <div className="rounded-full border border-yellow-500/70 bg-black/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-200 shadow-[0_0_16px_rgba(255,255,0,0.35)]">
              BladePoints : <span className="text-white">{bladepoints}</span>
            </div>
            <Link href="/solo_blade_app" className="inline-flex">
              <Button className="bg-yellow-500/20 text-yellow-200 border border-yellow-400/80 hover:bg-yellow-500/30">
                ← Retour à Solo Blade App
              </Button>
            </Link>
          </div>
        ),
      }}
      contentClassName="gap-10"
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((shop) => (
          <Link key={shop.archetype} href={`/solo_blade_shop/${shop.archetype}`} className="group">
            <Card className="h-full bg-black/75 border border-yellow-500/60 shadow-[0_0_20px_rgba(255,255,0,0.35)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_0_28px_rgba(255,255,0,0.55)]">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_12px_rgba(255,255,0,0.4)]">
                  {shop.display_name}
                </CardTitle>
                <CardDescription className="text-gray-300">{shop.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Image
                  src={shop.image}
                  alt={shop.display_name}
                  width={200}
                  height={200}
                  className="rounded-xl object-contain drop-shadow-[0_0_15px_rgba(255,255,0,0.35)]"
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </CyberPage>
  );
}

/* ===============================
   🧠 Fonctions utilitaires
=============================== */

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getArchetypeDescription(archetype: string): string {
  const map: Record<string, string> = {
    animals: "Des lames féroces inspirées des créatures sauvages.",
    creature: "Des entités étranges venues d’ailleurs.",
    hero: "Les héros légendaires de la Blade League.",
    champion: "Les toupies des plus grands combattants.",
    retool: "Des modèles retravaillés et optimisés.",
    persona: "Des lames au caractère unique et imprévisible.",
  };
  return map[archetype] || "Une collection spéciale de Blades.";
}

function getArchetypeImage(archetype: string): string {
  const base = "/shops/";
  const map: Record<string, string> = {
    animals: `${base}animals.png`,
    creature: `${base}creature.png`,
    hero: `${base}hero.png`,
    champion: `${base}champion.png`,
    retool: `${base}retool.png`,
    persona: `${base}persona.png`,
  };
  return map[archetype] || `${base}default.png`;
}
