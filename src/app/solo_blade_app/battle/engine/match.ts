import {
  UserBladeFullWithBuild,
  Enemy,
  LaunchType,
  BattleOutcome,
} from "@/app/solo_blade_app/types/pets";
import { computeRound } from "./round";

/**
 * computeMatch
 * ------------
 * Orchestration d’un **match complet** en enchaînant des rounds
 * jusqu’à ce qu’un des joueurs atteigne 7 points.
 *
 * Entrées :
 * - user:   blade de l'utilisateur (hydratée avec build si possible)
 * - enemy:  blade adverse
 * - side:   "X" | "B" => influence les modifs d'arène appliquées dans computeRound
 * - userLaunch: type de lancer choisi par l'utilisateur
 * - onRound?: callback optionnel appelé **après chaque round** avec son BattleOutcome
 *
 * Sortie :
 * - finalUser: score final utilisateur
 * - finalEnemy: score final adversaire
 * - rounds:    la liste des BattleOutcome de chaque round joué
 *
 * Notes :
 * - La responsabilité du **calcul d’un round** est entièrement déléguée à `computeRound`.
 * - Ici on ne gère que l’agrégation des scores + la boucle d’arrêt du match.
 * - Un petit setTimeout (via Promise) est laissé entre les rounds pour laisser
 *   respirer l’UI/animations. Ajuste ou enlève selon tes besoins.
 */
export async function computeMatch(
  user: UserBladeFullWithBuild,
  enemy: Enemy,
  side: "X" | "B",
  userLaunch: LaunchType,
  onRound?: (r: BattleOutcome) => void
): Promise<{ finalUser: number; finalEnemy: number; rounds: BattleOutcome[] }> {
  // Compteurs de points cumulés au fil des rounds
  let userScore = 0;
  let enemyScore = 0;

  // Historique des issues de round (utile pour un récap ou un replay)
  const rounds: BattleOutcome[] = [];

  // 🔁 Boucle principale : on enchaîne des rounds tant que personne n’a 7 points
  // (7 est la "win condition" actuelle — tweak facile ci-dessous si tu veux un autre score).
  while (userScore < 7 && enemyScore < 7) {
    // 1) On joue un round complet (toute la logique se trouve dans computeRound)
    const { outcome, userPoints, enemyPoints } = computeRound(
      user,
      enemy,
      side,
      userLaunch
    );

    // 2) On stocke l’outcome pour afficher l’historique du match (UI, replays, analytics)
    rounds.push(outcome);

    // 3) On met à jour les scores avec les points gagnés sur ce round
    userScore += userPoints;
    enemyScore += enemyPoints;

    // 4) Callbacks UI: permet d’animer / logger / persister round par round
    onRound?.(outcome);

    // 5) Petite pause entre les rounds (UX/animations) — tweakable
    //    - Baisse/augmente la durée
    //    - Remplace par un signal depuis l’UI (“Next round”)
    await new Promise((res) => setTimeout(res, 500));
  }

  // Récap final du match
  return {
    finalUser: userScore,
    finalEnemy: enemyScore,
    rounds,
  };
}

/* =========================
   Où TWEAKER rapidement ?
   =========================
  - Condition de victoire :
    while (userScore < TARGET && enemyScore < TARGET) { ... }
    -> Extraire TARGET dans une constante (ex: const TARGET = 7).

  - Tempo entre rounds :
    setTimeout(...) ou supprime la pause si tu veux un mode “simul instantané”.

  - Hooks/événements :
    onRound?.(outcome) est le bon endroit pour:
      * jouer des sons / animations
      * logger des stats
      * persister des données côté serveur

  - Variant rulesets :
    Si tu ajoutes des règles différentes (BO3, BO5, score cap dynamique, tie-break),
    c’est **ici** que tu branches la logique d’arrêt et d’agrégation des points.
*/
