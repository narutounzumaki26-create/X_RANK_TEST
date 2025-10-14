/**
 * countdown
 * ---------
 * Joue une petite "séquence de compte à rebours" en appelant `onStep`
 * pour chaque valeur de `steps` avec un délai fixe entre chaque étape.
 *
 * ✅ Comportement actuel :
 *   - Itère sur `steps` dans l'ordre (ex: ["3","2","1","Go!"]).
 *   - À chaque itération :
 *       1) appelle `onStep(step)` pour afficher la valeur courante
 *       2) attend `delayMs` millisecondes
 *   - À la fin, appelle `onStep(null)` pour signaler la fin du compte à rebours.
 *
 * 🧩 Paramètres :
 *   @param steps   Liste des valeurs à afficher (texte, émojis, etc.).
 *   @param onStep  Callback invoqué à chaque étape, et une dernière fois avec `null`.
 *                  Typiquement, tu lui passes un setState React (ex: setCountdownVal).
 *   @param delayMs (optionnel) Délai entre étapes en ms (par défaut 800 ms).
 *
 * 💡 Exemples d'usage (React) :
 *   await countdown(["3","2","1","Go!"], setCountdownVal);
 *   // -> setCountdownVal("3")   …attend 800ms
 *   // -> setCountdownVal("2")   …attend 800ms
 *   // -> setCountdownVal("1")   …attend 800ms
 *   // -> setCountdownVal("Go!") …attend 800ms
 *   // -> setCountdownVal(null)  (fin)
 *
 * 🛑 Annulation :
 *   - Cette implémentation est volontairement simple et **ne gère pas l'annulation**.
 *   - Si tu veux pouvoir interrompre un countdown (ex: quitter l’écran),
 *     tu peux ajouter un flag externe (ex: `let canceled = false`) et tester ce flag
 *     dans la boucle, ou accepter un `AbortSignal` dans la signature (si tu veux évoluer).
 */
export async function countdown(
  steps: string[],
  onStep: (value: string | null) => void,
  delayMs = 800
): Promise<void> {
  for (const step of steps) {
    // 1) Pousse la valeur courante vers l’UI (ex: affiche "3", puis "2", etc.)
    onStep(step);

    // 2) Attend `delayMs` ms avant de passer à la prochaine étape
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 3) Signale explicitement la fin de la séquence au consommateur
  //    -> pratique pour masquer le gros texte de compte à rebours
  onStep(null);
}
