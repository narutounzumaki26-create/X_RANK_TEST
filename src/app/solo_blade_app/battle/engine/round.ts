import {
  UserBladeFullWithBuild,
  Enemy,
  BattleOutcome,
  DEFAULT_STAT,
  applyBuildStats,     // ← agrège le build complet (blade + bit + ratchet + assist...) en CombatStats
  CombatStats,
  LaunchType,
} from "@/app/solo_blade_app/types/pets";

import { calculateHitChance } from "./hit";           // ← calcule la proba de toucher (stats dynamiques + meta build)
import { calculateFinish } from "./finish";           // ← calcule le type de finish après un hit (Over/Burst/Xtreme)
import { makeMetaFrom } from "./metadata";            // ← extrait meta "statiques" (bitType, height, displayName)
import { applyArenaModifiers, applyLaunchModifiers } from "./modifiers"; // ← boosts de l’arène et du lancer
import { BattleEvent, FinishType } from "./types";

// Petit alias pour typer la source de makeMetaFrom sans dupliquer les déclarations
type WithBuildData = Parameters<typeof makeMetaFrom>[0];

/**
 * Calcule un round complet (une manche), renvoie:
 *  - outcome: résumé du round (vainqueur, types de finish atteints, score gagné dans ce round)
 *  - userPoints / enemyPoints: points à ajouter au score total du match
 *  - battleLog: journal textuel des étapes de la manche (pratique pour l’UI)
 *
 * Pipeline (dans cet ordre):
 *  1) applyBuildStats → 2) applyArenaModifiers → 3) applyLaunchModifiers →
 *  4) makeMetaFrom (bitType/height/nom) → 5) boucle de round (hit → finish / stamina)
 */
export function computeRound(
  user: UserBladeFullWithBuild,
  enemy: Enemy,
  side: "X" | "B",
  userLaunch: LaunchType
): {
  outcome: BattleOutcome;
  userPoints: number;
  enemyPoints: number;
  battleLog: BattleEvent[];
} {
  // ---------------------------------------------------------------------------
  // 1) Stats dynamiques de base (post-build)
  //    - pour le joueur: on agrège le build complet => Attack/Defense/Stamina/Propulsion
  //    - pour l’ennemi: on part d’un objet compatible CombatStats
  // ---------------------------------------------------------------------------
  let u = applyBuildStats(user);           // ← fusionne blade + bit + autres pièces → CombatStats
  let e: CombatStats = enemy as CombatStats;

  // ---------------------------------------------------------------------------
  // 2) Modificateurs liés à l’arène
  //    - côté X booste la propulsion, côté B booste la stamina (et pénalise l’autre stat)
  //    - l’ennemi prend l’autre côté automatiquement
  // ---------------------------------------------------------------------------
  u = applyArenaModifiers(u, side);
  e = applyArenaModifiers(e, side === "X" ? "B" : "X");

  // ---------------------------------------------------------------------------
  // 3) Modificateurs de lancer (launch)
  //    - on applique le launch sélectionné par le joueur
  //    - pour l’ennemi: pour l’instant, on choisit un “dummy launch” aléatoire
  //      (tu pourras remplacer par une IA: pickEnemyLaunch(enemy, contexte) )
  // ---------------------------------------------------------------------------
  u = applyLaunchModifiers(u, userLaunch);

  const dummyLaunch: LaunchType = {
    id: "rand",
    name: "Random Launch",
    level: 1,
    // ±10% de variance sur chaque stat (exemple simple — remplaçable par une vraie logique)
    attack_modifier:     1 + (Math.random() * 0.2 - 0.1),
    defense_modifier:    1 + (Math.random() * 0.2 - 0.1),
    stamina_modifier:    1 + (Math.random() * 0.2 - 0.1),
    propulsion_modifier: 1 + (Math.random() * 0.2 - 0.1),
    // Modifs de probas de finish KO/Over/Burst/Xtreme/SelfKO (non utilisées ici mais dispo)
    spin_modifier:   1,
    over_modifier:   1,
    burst_modifier:  1,
    xtreme_modifier: 1,
    selfko_modifier: 1,
  };
  e = applyLaunchModifiers(e, dummyLaunch);

  // ---------------------------------------------------------------------------
  // 4) Métadonnées “statiques” de build (bitType, height, affichage du nom)
  //    - IMPORTANT: elles sont lues depuis les objets riches (user/enemy) et
  //      ne sont pas affectées par les modifs dynamiques (arena/launch)
  //    - mix parfait: stats dynamiques ↔ meta build
  // ---------------------------------------------------------------------------
  const userMeta  = makeMetaFrom(user  as Partial<CombatStats> & WithBuildData, "Vous");
  const enemyMeta = makeMetaFrom(enemy as Partial<CombatStats> & WithBuildData, "Ennemi");

  // ---------------------------------------------------------------------------
  // 5) Préparation des ressources du round (propulsion / stamina)
  //    - ces valeurs sont consommées au fil des tentatives
  // ---------------------------------------------------------------------------
  let userProp = Math.max(u.propulsion ?? DEFAULT_STAT, 0);
  let enemyProp = Math.max(e.propulsion ?? DEFAULT_STAT, 0);
  let userStam = Math.max(u.stamina   ?? DEFAULT_STAT, 0);
  let enemyStam = Math.max(e.stamina  ?? DEFAULT_STAT, 0);

  // “base*” = valeur de référence pour calculer la conso de propulsion
  const baseUserProp  = Math.max(u.propulsion ?? DEFAULT_STAT, 1);
  const baseEnemyProp = Math.max(e.propulsion ?? DEFAULT_STAT, 1);

  // États de fin pour chacun (tant que "none" → la manche continue)
  let userFinish:  FinishType = "none";
  let enemyFinish: FinishType = "none";

  // Initiative: celui qui a la propulsion la plus haute commence
  let turn: "user" | "enemy" = userProp >= enemyProp ? "user" : "enemy";

  // Garde-fou pour éviter les boucles infinies (par ex. builds quasi éternels)
  let guard = 0;
  const MAX_STEPS = 100;

  // Journal des événements du round (pour l’UI/battlelog)
  const battleLog: BattleEvent[] = [];
  const log = (entry: BattleEvent) => battleLog.push(entry);

  // ---------------------------------------------------------------------------
  // Consommation d’énergie par tentative
  // Règle simple:
  //   - si propulsion restante > 0 → consomme ~20% de la “base” (arrondi up)
  //   - sinon → on entame la stamina (20% restant, arrondi down)
  // Hooks parfaits pour des skills (ex: “réduit la conso de 25%”)
  // ---------------------------------------------------------------------------
  const consumeForAttempt = (who: "user" | "enemy"): void => {
    if (who === "user") {
      if (userProp > 0) userProp = Math.max(0, userProp - Math.ceil(baseUserProp * 0.2));
      else              userStam = Math.max(0, userStam - Math.floor(userStam * 0.2));
    } else {
      if (enemyProp > 0) enemyProp = Math.max(0, enemyProp - Math.ceil(baseEnemyProp * 0.2));
      else               enemyStam = Math.max(0, enemyStam - Math.floor(enemyStam * 0.2));
    }
  };

  // ---------------------------------------------------------------------------
  // Boucle principale du round
  //   - s’arrête si l’un des finish est déclenché OU stamina d’un des deux tombe à 0
  //   - sinon alterne les tours en consommant propulsion/stamina à chaque tentative
  // ---------------------------------------------------------------------------
  while (userFinish === "none" && enemyFinish === "none" && guard++ < MAX_STEPS) {
    // 💫 Condition d’épuisement: SPIN FINISH (par la stamina uniquement)
    if (userStam <= 0 || enemyStam <= 0) {
      if (userStam <= 0 && enemyStam <= 0) {
        log({ type: "end", actor: "user", text: "⚙️ Les deux Blades s’épuisent ! Double Spin !" });
        userFinish  = "spin";
        enemyFinish = "spin";
      } else if (userStam <= 0) {
        log({ type: "finish", actor: "enemy", text: "💫 Votre Blade s’épuise — Spin Finish pour l’adversaire !" });
        enemyFinish = "spin";
      } else {
        log({ type: "finish", actor: "user",  text: "💫 L’adversaire s’épuise — Spin Finish pour vous !" });
        userFinish  = "spin";
      }
      break;
    }

    // Qui attaque / qui défend pour ce tour ?
    const atkStats = turn === "user" ? u : e;
    const defStats = turn === "user" ? e : u;

    // Meta correspondante (bitType/height/nom) pour calculer la précision
    const atkMeta  = turn === "user" ? userMeta  : enemyMeta;
    const defMeta  = turn === "user" ? enemyMeta : userMeta;

    const attackerName = atkMeta.displayName;

    // 🎯 Précision du coup (combine bit vs bit, height ratio, propulsion ratio)
    const hitChance = calculateHitChance(atkStats, defStats, atkMeta, defMeta);
    log({
      type: "attack",
      actor: turn,
      text: `🌀 ${attackerName} attaque ! (Précision ${(hitChance * 100).toFixed(0)}%)`,
    });

    // Tirage du hit (RNG)
    const didHit = Math.random() < hitChance;

    if (didHit) {
      // 💥 Si hit → déterminer le type de finish (Over/Burst/Xtreme) selon Attack/Defense/Propulsion
      const finish = calculateFinish(atkStats, defStats);

      if (finish !== "none") {
        log({ type: "finish", actor: turn, text: `💥 ${attackerName} réussit un ${finish.toUpperCase()} FINISH !` });
        if (turn === "user") userFinish = finish;
        else                 enemyFinish = finish;
        break; // fin de la manche dès qu’un finish non-spin est déclenché
      } else {
        // Hit “simple” sans finish (utile si tu veux pousser des dégâts persistants plus tard)
        log({ type: "attack", actor: turn, text: `✅ ${attackerName} touche, mais sans finish.` });
      }
    } else {
      // ❌ Miss
      log({ type: "miss", actor: turn, text: `❌ ${attackerName} rate son attaque !` });
    }

    // Consommation d’énergie et inversion de tour
    consumeForAttempt(turn);
    turn = turn === "user" ? "enemy" : "user";
  }

  // ⌛ Sécurité: si on dépasse MAX_STEPS → round trop long → double spin
  if (guard >= MAX_STEPS && userFinish === "none" && enemyFinish === "none") {
    log({ type: "end", actor: "user", text: "⌛ Round interrompu : trop long ! Double Spin !" });
    userFinish  = "spin";
    enemyFinish = "spin";
  }

  // ---------------------------------------------------------------------------
  // Scoring du round
  //   - Spin = 1 point (au survivant)
  //   - Over/Burst = 2 points ; Xtreme = 3 points
  // ---------------------------------------------------------------------------
  let winner: "user" | "enemy" | "draw" = "draw";
  let userPoints = 0;
  let enemyPoints = 0;

  const pointValue: Record<"over" | "burst" | "xtreme", number> = {
    over: 2,
    burst: 2,
    xtreme: 3,
  };

  if (userFinish === "spin" && enemyFinish !== "spin") {
    winner = "enemy";
    enemyPoints = 1;
  } else if (enemyFinish === "spin" && userFinish !== "spin") {
    winner = "user";
    userPoints = 1;
  } else if (userFinish !== "none" && userFinish !== "spin") {
    winner = "user";
    userPoints = pointValue[userFinish as "over" | "burst" | "xtreme"] ?? 1;
  } else if (enemyFinish !== "none" && enemyFinish !== "spin") {
    winner = "enemy";
    enemyPoints = pointValue[enemyFinish as "over" | "burst" | "xtreme"] ?? 1;
  }

  // (Optionnel) message final dans le log
  // Tu pourrais ici enrichir avec des pourcentages, dégâts cumulés, etc.
  // log({
  //   type: "end",
  //   actor: winner === "user" ? "user" : "enemy",
  //   text: winner === "draw"
  //     ? "⚖️ Égalité parfaite."
  //     : winner === "user"
  //       ? "🏆 Vous remportez le round !"
  //       : "💀 L’adversaire remporte le round !",
  // });

  // ---------------------------------------------------------------------------
  // Construction de l’outcome (structure consommée par l’UI)
  // ---------------------------------------------------------------------------
  const outcome: BattleOutcome = {
    winner,
    userResult: {
      spin:   userFinish === "spin",
      over:   userFinish === "over",
      burst:  userFinish === "burst",
      xtreme: userFinish === "xtreme",
    },
    enemyResult: {
      spin:   enemyFinish === "spin",
      over:   enemyFinish === "over",
      burst:  enemyFinish === "burst",
      xtreme: enemyFinish === "xtreme",
    },
    userPercent:  { spin: 0, over: 0, burst: 0, xtreme: 0 },  // placeholders si tu veux afficher des odds
    enemyPercent: { spin: 0, over: 0, burst: 0, xtreme: 0 },  // idem

    // score gagné sur CE round (utilisé par le composant parent pour cumuler)
    userScore:  userPoints,
    enemyScore: enemyPoints,
  };

  return { outcome, userPoints, enemyPoints, battleLog };
}
