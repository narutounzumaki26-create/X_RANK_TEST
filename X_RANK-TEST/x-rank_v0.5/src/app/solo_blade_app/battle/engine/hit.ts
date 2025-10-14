import { CombatStats, DEFAULT_STAT } from "@/app/solo_blade_app/types/pets";
import { FighterMeta } from "./types";
import { BIT_BASE_HIT, BIT_VS_BIT_HIT_MULT } from "./constants";
import { clamp } from "./utils";

/**
 * calculateHitChance
 * ------------------
 * Calcule la probabilité **[0..1]** qu'une attaque touche sa cible.
 *
 * Entrées :
 * - attackerStats / defenderStats : statistiques **dynamiques** du moment
 *   (après build, + arène, + launch, etc.). On lit ici surtout la propulsion.
 * - attackerMeta / defenderMeta : métadonnées **structurelles** du build
 *   (bitType, height, displayName). Elles décrivent le profil de la Bey.
 *
 * Pipeline du calcul (multiplicatif) :
 *   1) Base selon le type de bit attaquant      -> BIT_BASE_HIT[attacker.bitType]
 *   2) Matchup bit vs bit                       -> BIT_VS_BIT_HIT_MULT[atk][def]
 *   3) Avantage de taille (height ratio clampé) -> clamp(attH/defH, 0.85, 1.15)
 *   4) Avantage de propulsion (stats actuelles) -> clamp(aProp/dProp, 0.9, 1.1)
 *   5) Clamp final sécurité                     -> clamp(hit, 0.05, 0.95)
 *
 * Pourquoi du clamp partout ?
 * - Évite que des extrêmes (builds broken) fassent exploser la proba.
 * - Rend chaque facteur “pondéré” : bonus/malus limités, gameplay plus stable.
 *
 * Où tweaker ?
 * - Les bases par bit : BIT_BASE_HIT (ex: buff des Attack)
 * - Les matchups : BIT_VS_BIT_HIT_MULT (ex: nerf Attack vs Stamina)
 * - Les bornes clamp : tailles (0.85..1.15), propulsion (0.9..1.1), borne finale (0.05..0.95)
 * - Les stats utilisées : ici, la propulsion influence la précision ; tu peux
 *   introduire la stamina/defense si tu veux que l’esquive dépende d’autre chose.
 */
export function calculateHitChance(
  attackerStats: CombatStats,
  defenderStats: CombatStats,
  attackerMeta: FighterMeta,
  defenderMeta: FighterMeta
): number {
  // 1) Base selon le type de bit de l'attaquant (ex: Attack > base plus haute)
  let hit = BIT_BASE_HIT[attackerMeta.bitType];

  // 2) Modulateur de matchup entre types de bits (ex: Attack vs Defense ≠ Attack vs Stamina)
  hit *= BIT_VS_BIT_HIT_MULT[attackerMeta.bitType]?.[defenderMeta.bitType] ?? 1.0;

  // 3) Effet de la taille relative (avantage aux hauteurs supérieures, borné)
  hit *= clamp(
    attackerMeta.height / Math.max(defenderMeta.height, 1), // évite division par 0
    0.85, // => cap du malus si l'attaquant est beaucoup plus petit
    1.15  // => cap du bonus si l'attaquant est beaucoup plus grand
  );

  // 4) Effet de la propulsion courante (momentum / vitesse du round)
  //    On borne les valeurs minimales à 1 pour éviter divisons et ratios infinis.
  const aProp = Math.max(attackerStats.propulsion ?? DEFAULT_STAT, 1);
  const dProp = Math.max(defenderStats.propulsion ?? DEFAULT_STAT, 1);
  hit *= clamp(
    aProp / dProp,
    0.9, // petit malus si l'attaquant est nettement moins rapide
    1.1  // petit bonus s'il est plus rapide
  );

  // 5) Garde-fous globaux : on ne veut jamais <5% ni >95% (évite l’auto-hit/auto-miss)
  return clamp(hit, 0.05, 0.95);
}
