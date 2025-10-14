import { UserBladeFull, Blade } from "@/app/solo_blade_app/types/pets";

/* -------------------- Filtrer les blades adoptables -------------------- */
export function getAdoptableBlades(allBlades: Blade[], userBlades: UserBladeFull[]): Blade[] {
  const ownedIds = new Set(userBlades.map((ub) => ub.blade_id));
  return allBlades.filter((blade) => !ownedIds.has(blade.blade_id));
}

/* -------------------- Calculer le pourcentage d'XP -------------------- */
export function calcXpPercent(blade: UserBladeFull, maxXp: number = 1000): number {
  const xp = blade.xp ?? 0;
  return Math.min(100, (xp / maxXp) * 100);
}

/* -------------------- Vérifier si une Blade peut être auto-adoptée -------------------- */
export function isAutoAdoptable(blade: Blade, userBlades: UserBladeFull[]): boolean {
  const ownedIds = new Set(userBlades.map((ub) => ub.blade_id));
  return (blade.level ?? 1) === 1 && !ownedIds.has(blade.blade_id);
}

/* -------------------- Formater l'image de la Blade -------------------- */
export function formatBladeImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/blade/")) return url;
  return `/blade/${url}`;
}

/* -------------------- Générer les stats complètes d’une Blade -------------------- */
export function buildUserBladeStats(inserted: UserBladeFull, baseBlade: Blade): UserBladeFull {
  return {
    ...inserted,
    attack: baseBlade.attack ?? 50,
    defense: baseBlade.defense ?? 50,
    stamina: baseBlade.stamina ?? 50,
    height: baseBlade.height ?? 50,
    propulsion: baseBlade.propulsion ?? 50,
    burst: baseBlade.burst ?? 50,
    blade: {
      ...baseBlade,
      image_url: formatBladeImageUrl(baseBlade.image_url ?? null), // ✅ fix ici
    },
  };
}
