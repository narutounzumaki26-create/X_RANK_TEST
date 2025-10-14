import { CombatStats, DEFAULT_STAT } from "@/app/solo_blade_app/types/pets";
import { FinishType } from "./types";
import { clamp } from "./utils";

/**
 * calculateFinish (40% finish cap)
 * --------------------------------
 * Objectif : un **coup qui touche** ne produit un finish que **40% du temps** en moyenne.
 * - 60% => "none" (touche sans finish)
 * - 40% => répartis entre over / burst / xtreme selon leurs poids relatifs.
 *
 * Étapes :
 *  1) Construire des POIDS (pas des % directement) pour over/burst/xtreme à partir des stats.
 *  2) Clamper chaque poids individuellement pour rester dans des bornes stables.
 *  3) Calculer la somme des poids finish (totalFinishWeight).
 *  4) Si totalFinishWeight <= 0 => "none".
 *  5) Normaliser les poids en PROBABILITÉS sur un budget fixe de 0.40 (40%).
 *  6) Tirer avec un "noneProb" = 0.60.
 */
export function calculateFinish(attacker: CombatStats, defender: CombatStats): FinishType {
  // === 1) POIDS de base (dépendent des stats) ===============================

  // Sécurité: on met un plancher à 1 pour éviter divisions absurdes.
  const atk = Math.max(attacker.attack ?? DEFAULT_STAT, 1);
  const def = Math.max(defender.defense ?? DEFAULT_STAT, 1);
  const ratioATKDEF = atk / def; // >1 favorise l’attaquant

  // Propulsion pour l’effet "momentum"
  const aProp = Math.max(attacker.propulsion ?? DEFAULT_STAT, 1);
  const dProp = Math.max(defender.propulsion ?? DEFAULT_STAT, 1);
  const propRatio = aProp / dProp;

  // Hauteur & poids utilisables si présents (sinon DEFAULT_STAT)
  const aHeight = Math.max(attacker.height ?? DEFAULT_STAT, 1);
  const dHeight = Math.max(defender.height ?? DEFAULT_STAT, 1);
  const aWeight = Math.max(attacker.weight ?? DEFAULT_STAT, 1);
  const dWeight = Math.max(defender.weight ?? DEFAULT_STAT, 1);

  // Burst resistance (si tu l’ajoutes plus tard dans CombatStats)
  const dBurstRes = Math.max(defender.burst ?? DEFAULT_STAT, 1);

  // ---- Poids OVER ----------------------------------------------------------
  // plus ATK/DEF, DEF attaquant, STAM attaquant, WEIGHT attaquant, PROP attaquant ↑
  // plus HEIGHT attaquant ↑ => chances OVER ↓ (on pénalise via /aHeight)
  // côté défenseur : plus HEIGHT défenseur ↑ => chances OVER ↑
  //                  plus ATK/DEF/STAM/WEIGHT/PROP défenseur ↑ => chances OVER ↓
  let over = 0.07 * ratioATKDEF
           * ( ( (attacker.defense ?? DEFAULT_STAT) / DEFAULT_STAT ) * 1.00 )
           * ( ( (attacker.stamina ?? DEFAULT_STAT) / DEFAULT_STAT ) * 1.00 )
           * ( ( aWeight / DEFAULT_STAT ) * 1.00 )
           * ( ( aProp / DEFAULT_STAT ) * 1.00 )
           * ( DEFAULT_STAT / aHeight )                      // height attaquant pénalise
           * ( dHeight / DEFAULT_STAT )                      // height défenseur favorise
           * ( DEFAULT_STAT / Math.max(defender.attack ?? DEFAULT_STAT, 1) )
           * ( DEFAULT_STAT / Math.max(defender.defense ?? DEFAULT_STAT, 1) )
           * ( DEFAULT_STAT / Math.max(defender.stamina ?? DEFAULT_STAT, 1) )
           * ( DEFAULT_STAT / dWeight )
           * ( DEFAULT_STAT / dProp );

  // ---- Poids BURST ---------------------------------------------------------
  // Attaquant : ATK ↑, PROP ↑, HEIGHT attaquant ↑ => ↓ (donc /aHeight)
  // Défenseur : HEIGHT ↑, PROP ↑ => ↑ ; WEIGHT ↑, DEF ↑, BURST RES ↑ => ↓
  let burst = 0.05 * ratioATKDEF
            * ( aProp / DEFAULT_STAT )
            * ( DEFAULT_STAT / aHeight )                     // height attaquant pénalise
            * ( dHeight / DEFAULT_STAT )                     // height défenseur favorise
            * ( dProp / DEFAULT_STAT )                       // prop défenseur favorise burst (instabilité)
            * ( DEFAULT_STAT / Math.max(defender.defense ?? DEFAULT_STAT, 1) ) // défense ↓
            * ( DEFAULT_STAT / dWeight )                     // poids défenseur ↓
            * ( DEFAULT_STAT / dBurstRes );                  // burst resistance ↓

  // ---- Poids XTREME --------------------------------------------------------
  // Attaquant : doit avoir encore de la propulsion (on modélise via propRatio)
  //             ATK ↑, WEIGHT ↑, PROP ↑ ; HEIGHT attaquant ↑ => ↓
  // Défenseur : DEF ↑, HEIGHT ↑, WEIGHT ↑ => ↓
  const propMomentum = clamp((propRatio - 1) * 0.5, 0, 1);  // "a encore du jus"
  let xtreme = 0.03 * ratioATKDEF
             * (1 + propMomentum)                           // bonus si prop attaquant > défenseur
             * ( aProp / DEFAULT_STAT )
             * ( aWeight / DEFAULT_STAT )
             * ( DEFAULT_STAT / aHeight )                   // height attaquant pénalise
             * ( DEFAULT_STAT / Math.max(defender.defense ?? DEFAULT_STAT, 1) )
             * ( DEFAULT_STAT / dHeight )
             * ( DEFAULT_STAT / dWeight );

  // === 2) Clamp individuel des poids ========================================
  over   = clamp(over,   0, 0.6);
  burst  = clamp(burst,  0, 0.5);
  xtreme = clamp(xtreme, 0, 0.4);

  // === 3) Budget de probas : 60% none, 40% finish ===========================
  const noneProbBudget   = 0.60; // ← ce que tu demandes
  const finishProbBudget = 0.40;

  // Somme des poids finish (si 0 => aucun finish possible)
  const totalFinishWeight = over + burst + xtreme;
  if (totalFinishWeight <= 0) return "none";

  // === 4) Normalisation des poids vers des PROBAS (sur 40%) =================
  const overProb   = finishProbBudget * (over   / totalFinishWeight);
  const burstProb  = finishProbBudget * (burst  / totalFinishWeight);
  const xtremeProb = finishProbBudget * (xtreme / totalFinishWeight);
  const burstThreshold = xtremeProb + overProb + burstProb;

  // === 5) Tirage =============================================================
  const roll = Math.random();
  if (roll < noneProbBudget) return "none";
  const r2 = roll - noneProbBudget;

  if (r2 < xtremeProb) return "xtreme";
  if (r2 < xtremeProb + overProb) return "over";
  if (r2 <= burstThreshold) return "burst";
  return "none";
}
