"use client";

import { Button } from "@/components/ui/button";
import { Enemy, UserBladeFullWithBuild } from "@/app/solo_blade_app/types/pets";

type BattleControlsProps = {
  onRunBattle: () => void;
  onExit: () => void;
  onReturn: () => void;
  onReset: () => void;
  hasOutcome: boolean;
  petHunger: number;
  userPet: UserBladeFullWithBuild;
  enemy: Enemy;
  battleRunning: boolean;
  userScore: number;
  enemyScore: number;
  round: number;
};

export default function BattleControls({
  onRunBattle,
  onExit,
  onReturn,
  onReset,
  hasOutcome,
  petHunger,
  battleRunning,
  userScore,
  enemyScore,
  round,
}: BattleControlsProps) {
  const matchOver = userScore >= 7 || enemyScore >= 7;
  const hungerFull = petHunger >= 100;

  return (
    <div className="flex flex-col items-center justify-center gap-3 mt-6">
      {!hasOutcome && !battleRunning && !matchOver && (
        <Button
          onClick={onRunBattle}
          disabled={hungerFull}
          className="px-6 py-3 bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-lg font-bold rounded-xl shadow-md transition"
        >
          🚀 {`Lancer le Round ${round}`}
        </Button>
      )}

      {hasOutcome && !matchOver && (
        <Button
          onClick={onReturn}
          className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold rounded-xl shadow-md transition"
        >
          🔁 Lancer le Round {round + 1}
        </Button>
      )}

      {matchOver && (
        <Button
          onClick={onReset}
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white text-lg font-bold rounded-xl shadow-md transition"
        >
          🔄 Rejouer un match
        </Button>
      )}

      <Button
        onClick={onExit}
        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl"
      >
        Quitter le combat
      </Button>

      {hungerFull && (
        <p className="text-red-400 text-xs font-semibold mt-1">
          Ton Blade est trop fatigué pour continuer !
        </p>
      )}
    </div>
  );
}
