// src/app/solo_blade_app/components/BattleComponents/EnemyFactory.ts
import { supabase } from "@/lib/supabaseClient";
import { Blade, Enemy, Assist, Bit, Ratchet } from "@/app/solo_blade_app/types/pets";

/**
 * Génère un adversaire complet à partir des données Supabase.
 * - Tire une Blade aléatoire
 * - Si CX → ajoute un Assist
 * - Ajoute un Ratchet et un Bit aléatoires
 * - Calcule les stats fusionnées
 */
export async function generateEnemy(): Promise<Enemy> {
  // 1️⃣ Charger toutes les pièces depuis Supabase
  const [
    { data: blades, error: bladeErr },
    { data: assists, error: assistErr },
    { data: ratchets, error: ratchetErr },
    { data: bits, error: bitErr },
  ] = await Promise.all([
    supabase.from("blade").select("*"),
    supabase.from("assist").select("*"),
    supabase.from("ratchet").select("*"),
    supabase.from("bit").select("*"),
  ]);

  if (bladeErr || assistErr || ratchetErr || bitErr) {
    console.error("❌ Erreur de chargement Supabase :", {
      bladeErr,
      assistErr,
      ratchetErr,
      bitErr,
    });
    throw new Error("Erreur lors du chargement des données Supabase.");
  }

  if (!blades || blades.length === 0) {
    throw new Error("Aucune Blade disponible pour générer un adversaire.");
  }

  // 2️⃣ Sélection aléatoire d’une Blade
  const baseBlade = blades[Math.floor(Math.random() * blades.length)] as Blade;

  // 3️⃣ Sélection conditionnelle des autres pièces
  const assist =
    baseBlade.line === "CX" && assists && assists.length > 0
      ? (assists[Math.floor(Math.random() * assists.length)] as Assist)
      : null;

  const ratchet =
    ratchets && ratchets.length > 0
      ? (ratchets[Math.floor(Math.random() * ratchets.length)] as Ratchet)
      : null;

  const bit =
    bits && bits.length > 0
      ? (bits[Math.floor(Math.random() * bits.length)] as Bit)
      : null;

  // 4️⃣ Fusion des statistiques
  const parts: (Blade | Assist | Bit | Ratchet)[] = [
    baseBlade,
    assist,
    ratchet,
    bit,
  ].filter((p): p is Blade | Assist | Bit | Ratchet => !!p);

  const stats = parts.reduce(
    (acc, p) => ({
      attack: acc.attack + (p.attack ?? 0),
      defense: acc.defense + (p.defense ?? 0),
      stamina: acc.stamina + (p.stamina ?? 0),
      height: acc.height + (p.height ?? 0),
      propulsion: acc.propulsion + (p.propulsion ?? 0),
      burst: acc.burst + (p.burst ?? 0),
      weight: acc.weight + (p.weight ?? 0),
    }),
    {
      attack: 0,
      defense: 0,
      stamina: 0,
      height: 0,
      propulsion: 0,
      burst: 0,
      weight: 0,
    }
  );

  // 5️⃣ Génération du nom lisible de l’adversaire
  const nameParts = [
    baseBlade.name,
    assist ? `+${assist.name}` : "",
    ratchet ? `-${ratchet.name}` : "",
    bit ? `-${bit.name}` : "",
  ].filter(Boolean);

  // 6️⃣ Création finale de l’ennemi
  const enemy: Enemy = {
    enemy_id: baseBlade.blade_id,
    name: nameParts.join(" "),
    image_url: baseBlade.image_url
      ? baseBlade.image_url.startsWith("http")
        ? baseBlade.image_url
        : `/blades/${baseBlade.image_url}`
      : "/blades/enemy-default.png",
    ...stats,
  };

  console.log("👾 Ennemi généré :", enemy);
  return enemy;
}
