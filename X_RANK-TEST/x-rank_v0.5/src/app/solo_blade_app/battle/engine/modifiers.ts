import { CombatStats, DEFAULT_STAT, LaunchType } from "@/app/solo_blade_app/types/pets";

/**
 * Applique les modificateurs de l'arène à un combattant.
 *
 * Règle actuelle (simple et lisible) :
 *  - Côté "X"  → bonus PROPULSION (+20%), malus STAMINA (-20%)
 *  - Côté "B"  → bonus STAMINA (+20%),     malus PROPULSION (-20%)
 *
 * Détails d’implémentation :
 *  - On lit les valeurs existantes avec un fallback sur DEFAULT_STAT (au cas où la stat est undefined)
 *  - On retourne **un nouvel objet** (pas de mutation)
 *  - On arrondit vers le bas (Math.floor) pour garder des entiers stables d’une frame à l’autre
 *
 * Où tweaker :
 *  - Les coefficients (1.2 / 0.8) pour affiner l’avantage arène
 *  - Remplacer le schéma binaire X/B par une table de règles plus riche (par type de terrain, météo…)
 *  - Ajouter un clamp si tu veux imposer des bornes min/max
 */
export function applyArenaModifiers<T extends CombatStats>(fighter: T, side: "X" | "B"): T {
  // Valeurs de base robustes
  const prop = fighter.propulsion ?? DEFAULT_STAT;
  const stam = fighter.stamina   ?? DEFAULT_STAT;

  return {
    ...fighter,
    // PROPULSION boostée côté X, réduite côté B
    propulsion: side === "X" ? Math.floor(prop * 1.2) : Math.floor(prop * 0.8),
    // STAMINA boostée côté B, réduite côté X
    stamina:    side === "B" ? Math.floor(stam * 1.2) : Math.floor(stam * 0.8),
  };
}

/**
 * Applique les modificateurs de LANCER (launch) à un combattant.
 *
 * Règle actuelle :
 *  - Chaque stat (attack/defense/stamina/propulsion) est multipliée par le modificateur correspondant
 *  - Les modificateurs undefined valent 1 (aucun effet)
 *  - On arrondit vers le bas pour garder des entiers stables
 *
 * Notes :
 *  - Cette fonction est **pure** (retourne un clone avec les valeurs modifiées)
 *  - Si tu ajoutes de nouvelles stats (ex: "balance", "weight", "friction"), étends la même logique ici
 *  - Les champs comme `spin_modifier`, `over_modifier`, etc. existent dans LaunchType mais
 *    sont utilisés ailleurs (ex: dans le calcul des chances de finish), pas ici.
 *
 * Où tweaker :
 *  - Changer l’arrondi (ceil/round) ou passer en flottants si tu veux des calculs plus fins
 *  - Ajouter un clamp global pour éviter des stats absurdes après multiplicateurs
 *  - Injecter des effets conditionnels (ex: si bitType === "attack", amplifier seulement l’attack_modifier)
 */
export function applyLaunchModifiers<T extends CombatStats>(fighter: T, launch: LaunchType): T {
  // Helper : applique un multiplicateur (m par défaut = 1) + fallback valeur de base
  const mult = (v: number | undefined, m?: number) =>
    Math.floor((v ?? DEFAULT_STAT) * (m ?? 1));

  return {
    ...fighter,
    attack:     mult(fighter.attack,     launch.attack_modifier),
    defense:    mult(fighter.defense,    launch.defense_modifier),
    stamina:    mult(fighter.stamina,    launch.stamina_modifier),
    propulsion: mult(fighter.propulsion, launch.propulsion_modifier),
  };
}
