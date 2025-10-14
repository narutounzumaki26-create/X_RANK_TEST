import { BitType } from "./types";

/**
 * BIT_VS_BIT_HIT_MULT
 * -------------------
 * Matrice des *matchups* "type de bit attaquant" → "type de bit défenseur" → multiplicateur
 * appliqué à la probabilité de toucher.
 *
 * ✅ Comment c’est utilisé :
 *   - Dans `calculateHitChance`, on part d’une base (BIT_BASE_HIT[attackerType])
 *     puis on multiplie par `BIT_VS_BIT_HIT_MULT[attackerType][defenderType]`.
 *
 * 🎯 Lecture :
 *   - >1.0  => l’attaquant a un bonus de précision contre ce type de défenseur
 *   - <1.0  => malus (plus de ratés contre ce type)
 *   - =1.0  => neutre
 *
 * 💡 Tweaks usuels :
 *   - Augmenter un matchup fort (ex: attack vs defense) → combats plus "rock-paper-scissors"
 *   - Revenir vers 1.0 → effets de type plus discrets
 *
 * ⚠️ Bonnes pratiques :
 *   - Rester dans une fourchette raisonnable (ex: 0.85–1.20) pour éviter des combats trop swingy.
 */
export const BIT_VS_BIT_HIT_MULT: Record<BitType, Record<BitType, number>> = {
  attack: { defense: 1.15, balance: 1.0, stamina: 0.9,  attack: 1.2 },
  defense:{ stamina: 0.9,  attack: 1.15,  balance: 1.0,  defense: 1.2  },
  balance:{ attack: 1.0, defense: 1.0, stamina: 1.0,  balance: 1.0  },
  stamina:{ balance: 1.0, attack: 1.1,  defense: 0.95, stamina: 1.2  },
};

/**
 * BIT_BASE_HIT
 * ------------
 * Probabilité de toucher "de base" selon le type de l’attaquant,
 * avant d’appliquer les autres facteurs (matchup, tailles, propulsion, etc.).
 *
 * ✅ Comment c’est utilisé :
 *   - `calculateHitChance` commence par `hit = BIT_BASE_HIT[attackerType]`
 *     puis applique des multiplicateurs successifs.
 *
 * 🎯 Intention actuelle :
 *   - attack  > balance > defense > stamina
 *     (les attaquants frappent plus souvent, les stamina moins)
 *
 * 💡 Tweaks usuels :
 *   - Monter toutes les valeurs → combats plus rapides (moins de miss).
 *   - Descendre toutes les valeurs → combats plus “danse”, basés sur la stamina.
 *   - Écarter les valeurs entre types → renforce l’identité de chaque style.
 *
 * ⚠️ Échelle :
 *   - Ces nombres sont des probabilités (0–1). Évite des extrêmes (ex: 0.95 de base)
 *     car les autres multiplicateurs peuvent encore pousser trop haut/bas.
 */
export const BIT_BASE_HIT: Record<BitType, number> = {
  attack:  0.70,
  balance: 0.68,
  defense: 0.66,
  stamina: 0.64,
};
