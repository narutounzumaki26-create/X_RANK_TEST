import { DEFAULT_STAT, CombatStats } from "@/app/solo_blade_app/types/pets";
import { BitType, FighterMeta } from "./types";

/**
 * Structure utilitaire pour décrire toutes les façons possibles
 * dont le type/nom/height peuvent être présents dans tes objets “riches”.
 *
 * Pourquoi ?
 * - Selon l’endroit d’où vient l’objet (user hydraté, enemy généré, build brut, etc.),
 *   l’info peut se trouver à différents niveaux (racine, build.*, build.bit.*, blade.*, etc.).
 * - On centralise ces clés ici pour que les fonctions de lecture soient robustes.
 */
type WithBuildData = {
  // variantes possibles pour le type de bit
  bit_type?: string;                   // snake_case
  bitType?: string;                    // camelCase
  bit?: { type?: string };             // bit objet direct

  build?: {
    bit?: { type?: string };           // build.bit.type
    bit_type?: string;                 // build.bit_type (si stocké à plat)
    blade?: {                          // build.blade
      height?: number;
      name?: string;
    };
  };

  // parfois height/name sont à la racine ou sous blade
  height?: number;
  blade?: {
    height?: number;
    name?: string;
  };

  // fallback name
  name?: string;
};

/**
 * readBitTypeFrom
 * ---------------
 * Lecture tolérante du **type de bit** depuis un objet potentiellement hétérogène.
 *
 * Ordre de priorité (du plus spécifique au plus générique) :
 *   1) source.bit_type
 *   2) source.bitType
 *   3) source.bit?.type
 *   4) source.build?.bit?.type
 *   5) source.build?.bit_type
 *   6) "balance" (fallback)
 *
 * On normalise en lower-case puis on vérifie contre l’union BitType.
 * Si la valeur n’est pas reconnue, on retourne "balance".
 *
 * Où tweaker :
 * - Ajouter d’autres emplacements potentiels (ex: source.parts?.bit?.kind)
 * - Changer le fallback par "attack" si tu veux un défaut plus agressif
 */
export function readBitTypeFrom(
  source: Partial<CombatStats> & WithBuildData
): BitType {
  const possible =
    source.bit_type ??
    source.bitType ??
    source.bit?.type ??
    source.build?.bit?.type ??
    source.build?.bit_type ??
    "balance";

  const low = String(possible).toLowerCase();

  // On s’assure que la valeur est bien dans le domaine BitType
  return (["attack", "defense", "balance", "stamina"] as const).includes(
    low as BitType
  )
    ? (low as BitType)
    : "balance";
}

/**
 * readHeightFrom
 * --------------
 * Lecture robuste de la **hauteur** de la blade.
 *
 * Ordre de priorité :
 *   1) source.height
 *   2) source.blade?.height
 *   3) source.build?.blade?.height
 *   4) DEFAULT_STAT (fallback numérique)
 *
 * On vérifie que c’est bien un nombre > 0, sinon on retombe sur DEFAULT_STAT.
 *
 * Où tweaker :
 * - Remplacer DEFAULT_STAT par une valeur métier minimale (ex: 1)
 * - Ajouter un clamp supérieur si tu veux imposer un plafond
 */
export function readHeightFrom(
  source: Partial<CombatStats> & WithBuildData
): number {
  const h =
    source.height ??
    source.blade?.height ??
    source.build?.blade?.height ??
    DEFAULT_STAT;

  return typeof h === "number" && h > 0 ? h : DEFAULT_STAT;
}

/**
 * readNameFrom
 * ------------
 * Lecture d’un **displayName** “joli” pour les logs/UX.
 *
 * Ordre de priorité :
 *   1) source.blade?.name
 *   2) source.build?.blade?.name
 *   3) source.name
 *   4) fallback (ex: "Vous" ou "Ennemi" passé à l’appel)
 *
 * Où tweaker :
 * - Préfixer/suffixer le nom par le bit_type, la ligne (CX/FX), etc.
 */
export function readNameFrom(
  source: Partial<CombatStats> & WithBuildData,
  fallback: string
): string {
  return (
    source.blade?.name ??
    source.build?.blade?.name ??
    source.name ??
    fallback
  );
}

/**
 * makeMetaFrom
 * ------------
 * Construit un **FighterMeta** à partir d’un objet riche d’origine.
 *
 * meta = { bitType, height, displayName }
 *
 * Pourquoi séparer “meta” des stats dynamiques ?
 * - Les stats (attack/defense/stamina/propulsion) évoluent avec l’arène, le lancer, etc.
 * - Les métadonnées comme bitType/height/displayName viennent du build de départ
 *   et servent au calcul de précision/hit et au logging.
 *
 * Où tweaker :
 * - Ajouter des champs (ex: weightClass, line: "CX" | "FX", brand, etc.)
 * - Normaliser le displayName (uppercase, ajouter emojis par type de bit…)
 */
export function makeMetaFrom(
  source: Partial<CombatStats> & WithBuildData,
  fallbackName: string
): FighterMeta {
  return {
    bitType: readBitTypeFrom(source),
    height: readHeightFrom(source),
    displayName: readNameFrom(source, fallbackName),
  };
}
