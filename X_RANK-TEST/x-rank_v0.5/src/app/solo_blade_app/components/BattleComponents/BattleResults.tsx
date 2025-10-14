"use client";

import {
  BattleOutcome,
  UserBladeFullWithBuild,
  Enemy,
} from "@/app/solo_blade_app/types/pets";
import { motion } from "framer-motion";
import { BattleEvent } from "@/app/solo_blade_app/battle";
import type { JSX } from "react";

type BattleResultProps = {
  outcome: BattleOutcome;
  userPet: UserBladeFullWithBuild;
  enemy: Enemy;
  round?: number;
  totalUserScore?: number;
  totalEnemyScore?: number;
  battleLog?: BattleEvent[]; // ✅ journal narratif
};

export default function BattleResult({
  outcome,
  userPet,
  enemy,
  round = 1,
  totalUserScore,
  totalEnemyScore,
  battleLog = [], // ✅ défaut
}: BattleResultProps): JSX.Element {
  const winnerText =
    outcome.winner === "user"
      ? `${userPet.blade.name} remporte le Round ${round} ! 🎉`
      : outcome.winner === "enemy"
      ? `${enemy.name} gagne le Round ${round} ! 😢`
      : `Égalité au Round ${round} ⚖️`;

  const pointsEarned =
    outcome.winner === "user"
      ? outcome.userScore >= 3
        ? "+3 pts"
        : outcome.userScore === 2
        ? "+2 pts"
        : "+1 pt"
      : outcome.winner === "enemy"
      ? outcome.enemyScore >= 3
        ? "-3 pts"
        : outcome.enemyScore === 2
        ? "-2 pts"
        : "-1 pt"
      : "0 pt";

  const winnerColor =
    outcome.winner === "user"
      ? "text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]"
      : outcome.winner === "enemy"
      ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"
      : "text-gray-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 text-white"
    >
      {/* Résultat principal */}
      <div className="text-center mb-8">
        <motion.p
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 12 }}
          className={`text-3xl md:text-4xl font-extrabold ${winnerColor}`}
        >
          {winnerText}
        </motion.p>

        <p className="text-lg mt-3 text-gray-300">
          Résultat du round —{" "}
          <span className="text-fuchsia-400 font-bold">Vous</span> :{" "}
          {outcome.userScore} |{" "}
          <span className="text-blue-400 font-bold">Ennemi</span> :{" "}
          {outcome.enemyScore}
        </p>

        <p className="mt-2 text-sm text-emerald-300 font-bold">{pointsEarned}</p>

        {typeof totalUserScore !== "undefined" &&
          typeof totalEnemyScore !== "undefined" && (
            <p className="mt-2 text-sm text-gray-400">
              Score total —{" "}
              <span className="text-green-400 font-semibold">{totalUserScore}</span>{" "}
              /{" "}
              <span className="text-red-400 font-semibold">{totalEnemyScore}</span>
            </p>
          )}
      </div>

      

      {/* Journal narratif du combat */}
      {battleLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 p-4 rounded-xl border border-fuchsia-800/40 shadow-lg overflow-y-auto max-h-64"
        >
          <h3 className="text-fuchsia-400 text-lg font-bold mb-2 text-center">
            🧠 Journal du combat
          </h3>

          <div className="space-y-1 text-sm text-gray-200 font-mono">
            {battleLog.map((event, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={
                  event.type === "finish"
                    ? "text-yellow-400 font-semibold"
                    : event.type === "miss"
                    ? "text-gray-400 italic"
                    : event.type === "attack"
                    ? "text-blue-300"
                    : event.type === "stamina"
                    ? "text-emerald-300"
                    : "text-gray-200"
                }
              >
                {event.text}
              </motion.p>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
