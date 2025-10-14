// src/app/solo_blade_app/components/Battle.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  UserBladeFullWithBuild,
  Enemy,
  BattleOutcome,
  LaunchType,
} from "@/app/solo_blade_app/types/pets";

import BattleHeader from "./BattleComponents/BattleHeader";
import BattleFighters from "./BattleComponents/BattleFighters";
import BattleControls from "./BattleComponents/BattleControls";
import BattleResult from "./BattleComponents/BattleResults";
import { PartsSummary } from "@/app/solo_blade_app/components/ui/PartsSummary";

import { flipArenaSide, computeRound, countdown, BattleEvent } from "@/app/solo_blade_app/battle";

import { useHydratedBuild } from "@/app/solo_blade_app/hooks/useHydratedBuild";
import { useEnemy } from "@/app/solo_blade_app/hooks/useEnemy";
import { useLaunches } from "@/app/solo_blade_app/hooks/useLaunches";
import { getPartNames, type FighterLike } from "@/app/solo_blade_app/Utils/parts";

export default function Battle({
  selectedPet,
  onExit,
  onUpdatePet,
  onWin,
}: {
  selectedPet: UserBladeFullWithBuild;
  onExit: () => void;
  onUpdatePet: (updated: UserBladeFullWithBuild) => void;
  onWin?: () => void | Promise<void>;
}) {
  const { hydrated } = useHydratedBuild(selectedPet);
  const enemy = useEnemy();

  const launches = useLaunches();
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchType | null>(null);

  const [battleOutcome, setBattleOutcome] = useState<BattleOutcome | null>(null);
  const [battleRunning, setBattleRunning] = useState(false);
  const [countdownVal, setCountdownVal] = useState<string | null>(null);
  const [arenaSide, setArenaSide] = useState<"X" | "B" | null>(null);

  const [round, setRound] = useState(1);
  const [userScore, setUserScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleEvent[]>([]);
  const [rewardGranted, setRewardGranted] = useState(false);

  const userPartsNames = useMemo<string[]>(
    () => getPartNames(hydrated),
    [hydrated]
  );

  const enemyPartsNames = useMemo<string[]>(
    () => (enemy ? getPartNames(enemy as unknown as FighterLike) : []),
    [enemy]
  );

  const handleFlipArena = () => {
    if (!arenaSide) setArenaSide(flipArenaSide());
  };

  const handleRunBattle = async () => {
    if (!enemy || !selectedLaunch || !arenaSide) {
      alert("Tu dois d'abord choisir ton côté et ton lancer !");
      return;
    }
    setBattleRunning(true);
    setBattleOutcome(null);
    setBattleLog([]);

    await countdown(["3", "2", "1", "Go!"], setCountdownVal);

    const { outcome, userPoints, enemyPoints, battleLog } = computeRound(
      hydrated,
      enemy as Enemy,
      arenaSide,
      selectedLaunch
    );

    setTimeout(() => {
      setUserScore((p) => p + userPoints);
      setEnemyScore((p) => p + enemyPoints);
      setBattleOutcome(outcome);
      setBattleLog(battleLog);
      setBattleRunning(false);
    }, 600);
  };

  const handleNextRound = () => {
    setBattleOutcome(null);
    setCountdownVal(null);
    setSelectedLaunch(null);
    setBattleLog([]);
    setRound((r) => r + 1);
  };

  const matchOver = userScore >= 7 || enemyScore >= 7;

  if (matchOver) {
    const hunger = Math.min(100, hydrated.hunger + 10);
    const xp = hydrated.xp + (userScore > enemyScore ? 100 : 40);
    const happiness =
      userScore > enemyScore
        ? Math.min(100, hydrated.happiness + 20)
        : Math.max(0, hydrated.happiness - 10);
    onUpdatePet({ ...hydrated, hunger, xp, happiness });
  }

  const handleExit = () => {
    setBattleOutcome(null);
    setCountdownVal(null);
    setBattleRunning(false);
    setArenaSide(null);
    setSelectedLaunch(null);
    setUserScore(0);
    setEnemyScore(0);
    setRound(1);
    setBattleLog([]);
    setRewardGranted(false);
    onExit();
  };

  useEffect(() => {
    if (matchOver && userScore > enemyScore && !rewardGranted) {
      setRewardGranted(true);
      void onWin?.();
    }
  }, [matchOver, userScore, enemyScore, rewardGranted, onWin]);

  if (!enemy)
    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-center">
        <p className="text-lg animate-pulse">Chargement de l’adversaire...</p>
        <div className="mt-4 w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full">
      <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-red-600 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <BattleHeader userPet={hydrated} enemy={enemy} />

        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <PartsSummary side="user" label={hydrated.blade?.name ?? "—"} parts={userPartsNames} align="right" />
          <PartsSummary side="enemy" label={enemy.name} parts={enemyPartsNames} align="left" />
        </div>

        <div className="text-center mt-2 text-gray-300 text-sm">
          🕹️ Round {round} — Score {userScore} / {enemyScore}
        </div>

        {!arenaSide && (
          <div className="flex justify-center gap-4 my-4">
            <button onClick={handleFlipArena} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-white font-bold">
              🎲 Tirer pile ou face
            </button>
          </div>
        )}

        {arenaSide && (
          <p className="text-center text-sm mb-2">
            🎯 Côté{" "}
            <span className={`font-bold ${arenaSide === "X" ? "text-cyan-300" : "text-emerald-300"}`}>
              {arenaSide === "X" ? "X (attaque rapide)" : "B (endurance)"}
            </span>
          </p>
        )}

        {arenaSide && !selectedLaunch && !(userScore >= 7 || enemyScore >= 7) && (
          <div className="text-center my-4">
            <p className="text-gray-300 mb-2">Choisis ton type de lancer :</p>
            <div className="flex flex-wrap justify-center gap-3">
              {launches.map((launch: LaunchType) => (
                <button
                  key={launch.id}
                  onClick={() => setSelectedLaunch(launch)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white"
                >
                  {launch.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <BattleFighters userPet={hydrated} enemy={enemy} />
        </div>

        <AnimatePresence>
          {battleRunning && countdownVal && (
            <motion.div
              key={countdownVal}
              initial={{ scale: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-extrabold text-red-500"
            >
              {countdownVal}
            </motion.div>
          )}
        </AnimatePresence>

        <BattleControls
          onRunBattle={handleRunBattle}
          onExit={handleExit}
          onReturn={handleNextRound}
          hasOutcome={!!battleOutcome}
          onReset={handleExit}
          petHunger={hydrated.hunger}
          userPet={hydrated}
          enemy={enemy}
          battleRunning={battleRunning}
          userScore={userScore}
          enemyScore={enemyScore}
          round={round}
        />

        <AnimatePresence>
          {battleOutcome && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <BattleResult
                outcome={battleOutcome}
                userPet={hydrated}
                enemy={enemy}
                round={round}
                totalUserScore={userScore}
                totalEnemyScore={enemyScore}
                battleLog={battleLog}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {userScore >= 7 || enemyScore >= 7 ? (
          <div className="text-center mt-6 text-lg text-yellow-300 font-bold animate-pulse">
            🏁 Match terminé !
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
