import { CombatStats, LaunchType } from "@/app/solo_blade_app/types/pets";

export type BitType = "attack" | "defense" | "balance" | "stamina";

export type FighterMeta = {
  bitType: BitType;
  height: number;
  displayName: string;
};

export type FinishType = "none" | "spin" | "over" | "burst" | "xtreme";

export type BattleEvent = {
  type: "attack" | "miss" | "finish" | "stamina" | "end";
  actor: "user" | "enemy";
  text: string;
};

export type RNG = () => number; // pour DI (tests déterministes)
export type HitChanceFn = (
  attackerStats: CombatStats,
  defenderStats: CombatStats,
  attackerMeta: FighterMeta,
  defenderMeta: FighterMeta
) => number;

export type FinishFn = (attacker: CombatStats, defender: CombatStats) => FinishType;

export type Modifiers = {
  applyArena<T extends CombatStats>(f: T, side: "X" | "B"): T;
  applyLaunch<T extends CombatStats>(f: T, launch: LaunchType): T;
};
