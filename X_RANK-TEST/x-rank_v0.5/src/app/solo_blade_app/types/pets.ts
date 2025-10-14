// ===============================================
//  Central types for PetDashboard & Battle System
// ===============================================

/* =======================
   1. Shared Combat Stats
======================= */
export type CombatStats = {
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
};

/* =======================
   1.1 Master Data (Skills / Launch types)
======================= */

export type Skill = {
  skill_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  effect_json: Record<string, unknown>;
  trigger_type?: string | null; // 'passive', 'on_start', etc.
  icon_url?: string | null;
  created_at?: string;
};

/**
 * Représente un type de lancer (launch_types)
 */
export type LaunchType = {
  id: string; // uuid
  name: string; // ex: "Booster Launch"
  level: number; // niveau du lancer (1 = basique)
  stamina_modifier: number;
  attack_modifier: number;
  defense_modifier: number;
  propulsion_modifier: number;

  // chances de finish (pondérations)
  spin_modifier: number;
  over_modifier: number;
  burst_modifier: number;
  xtreme_modifier: number;
  selfko_modifier: number;

  // lien optionnel vers une skill
  skill_id?: string | null;
  skill?: Skill | null; // jointure facultative
  created_at?: string;
};

/**
 * Représente le lien entre un joueur et ses lancers (player_launches)
 */
export type PlayerLaunch = {
  id: string;
  player_id: string;
  launch_type_id: string;
  mastery_level: number;
  unlocked_at: string;
  last_used_at?: string | null;

  // jointure facultative pour simplifier l’affichage
  launch_type?: LaunchType | null;
};

/* =======================
   2. Blades & Pets
======================= */
export type Blade = {
  blade_id: string;
  name: string;
  level?: number;
  type?: string | null;
  line?: string | null; // BX / UX / CX
  archetype?: string | null; // animals, creature, hero, champion, retool, persona
  status?: string | null; // 'solo_only' | 'tournament_only' | 'both'
  image_url?: string | null;
  skills?: string | null; // FK -> skills.skill_id

  // 🔽 stats explicites
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
};

export type UserBlade = {
  id: string;
  player_id: string;
  blade_id: string;
  xp: number;
  hunger: number;
  happiness: number;
  created_at: string;

  // champs optionnels hydratés de blade
  level?: number;
  type?: string | null;
  line?: string | null;
  archetype?: string | null;
  status?: string | null;
  image_url?: string | null;
  skills?: string | null;

  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
};

export type UserBladeFull = UserBlade & {
  blade: Blade; // jointure complète
};

/* =======================
   2.2. Build système
======================= */
export type UserBladeBuild = {
  id: string;
  user_blade_id: string;
  assist_id?: string | null;
  ratchet_id?: string | null;
  bit_id?: string | null;
  lock_chip_id?: string | null; // ignoré en solo si tu le souhaites
  created_at?: string;
  updated_at?: string;
};

export type Assist = {
  assist_id: string;
  name: string;
  level?: number;
  type?: string | null;
  image_url?: string | null;
  status?: string | null;
  skills?: string | null;
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
  created_at?: string;
};

export type Ratchet = {
  ratchet_id: string;
  name: string;
  level?: number;
  type?: string | null;
  image_url?: string | null;
  status?: string | null;
  skills?: string | null;
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
  created_at?: string;
};

export type Bit = {
  bit_id: string;
  name: string;
  level?: number;
  type?: string | null;
  initials?: string | null;
  image_url?: string | null;
  status?: string | null;
  skills?: string | null;
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number; // par défaut 2.2 côté BDD
  created_at?: string;
};

export type LockChip = {
  lock_chip_id: string;
  name: string;
  image_url?: string | null;
  created_at?: string;
};

export type UserBladeBuildFull = UserBladeBuild & {
  assist?: Assist | null;
  ratchet?: Ratchet | null;
  bit?: Bit | null;
  lock_chip?: LockChip | null;
};

export type UserBladeFullWithBuild = UserBladeFull & {
  build?: UserBladeBuildFull | null;
};

/* =======================
   2.4. Équipement générique
======================= */
export type Equipement = Assist | Ratchet | Bit | LockChip;

/* =======================
   3. Solo Combos
======================= */
export type SoloCombo = {
  solo_combo_id: string;
  player_id: string;
  blade_id: string;
  assist_id?: string | null;
  ratchet_id: string;
  bit_id: string;
  lock_chip_id?: string | null;
  name: string;
  created_at: string;
  updated_at?: string;
};

/* =======================
   4. Inventory
======================= */
export type PlayerInventoryRow = {
  inventory_id: string;
  player_id: string;
  item_id: string;
  item_type: "assist" | "ratchet" | "bit" | "lock_chip";
  quantity: number;
  acquired_at?: string;
};

export type InventoryItemResolved = {
  id: string;
  item_id: string;
  item_type: "assist" | "ratchet" | "bit" | "lock_chip";
  quantity: number;
  equipement: Assist | Ratchet | Bit | LockChip | null;
};

/* =======================
   5. Rewards
======================= */
export type UserReward = {
  id: string;
  user_id: string;
  reward_type: string;
  created_at: string;
};

/* =======================
   6. Battle System
======================= */
export type Enemy = {
  enemy_id: string;
  name: string;
  image_url?: string | null;
  attack?: number;
  defense?: number;
  stamina?: number;
  height?: number;
  propulsion?: number;
  burst?: number;
  weight?: number;
};

/* =======================
   Battle types & results
======================= */
export type BattleEntity = CombatStats;
export type Percentages = { spin: number; burst: number; over: number; xtreme: number };
export type BattleBooleans = { spin: boolean; burst: boolean; over: boolean; xtreme: boolean };

export type BattleOutcome = {
  userPercent: Percentages;
  enemyPercent: Percentages;
  userResult: BattleBooleans;
  enemyResult: BattleBooleans;
  userScore: number;
  enemyScore: number;
  winner: "user" | "enemy" | "draw";
};

/* =======================
   7. Helpers
======================= */
export const DEFAULT_STAT = 50;

export function hasBattleStats(pet: unknown): pet is CombatStats {
  if (typeof pet !== "object" || pet === null) return false;
  const keys: (keyof CombatStats)[] = [
    "attack",
    "defense",
    "stamina",
    "height",
    "propulsion",
    "burst",
    "weight",
  ];
  return keys.some((k) => k in (pet as object));
}

export function toBattleEntity(pet: UserBlade | Enemy | CombatStats): BattleEntity {
  if (!hasBattleStats(pet)) {
    return {
      attack: DEFAULT_STAT,
      defense: DEFAULT_STAT,
      stamina: DEFAULT_STAT,
      height: DEFAULT_STAT,
      propulsion: DEFAULT_STAT,
      burst: DEFAULT_STAT,
      weight: 0,
    };
  }
  return {
    attack: pet.attack ?? DEFAULT_STAT,
    defense: pet.defense ?? DEFAULT_STAT,
    stamina: pet.stamina ?? DEFAULT_STAT,
    height: pet.height ?? DEFAULT_STAT,
    propulsion: pet.propulsion ?? DEFAULT_STAT,
    burst: pet.burst ?? DEFAULT_STAT,
    weight: pet.weight ?? 0,
  };
}

/* =======================
   ✅ 7.5 — Fusion du build complet
======================= */
export function applyBuildStats(blade: UserBladeFullWithBuild): Enemy {
  const base = blade.blade;
  const build = blade.build;

  const add = (a?: number, b?: number) => (a ?? 0) + (b ?? 0);

  return {
    enemy_id: blade.id,
    name: base.name,
    image_url: base.image_url,
    attack:
      add(base.attack, build?.assist?.attack) +
      add(build?.bit?.attack, build?.ratchet?.attack),
    defense:
      add(base.defense, build?.assist?.defense) +
      add(build?.bit?.defense, build?.ratchet?.defense),
    stamina:
      add(base.stamina, build?.assist?.stamina) +
      add(build?.bit?.stamina, build?.ratchet?.stamina),
    height:
      add(base.height, build?.assist?.height) +
      add(build?.bit?.height, build?.ratchet?.height),
    propulsion:
      add(base.propulsion, build?.assist?.propulsion) +
      add(build?.bit?.propulsion, build?.ratchet?.propulsion),
    burst:
      add(base.burst, build?.assist?.burst) +
      add(build?.bit?.burst, build?.ratchet?.burst),
    weight:
      add(base.weight, build?.assist?.weight) +
      add(build?.bit?.weight, build?.ratchet?.weight),
  };
}

/* =======================
   8. Battle Calculations
======================= */
export function calcPercent(a: BattleEntity, b: BattleEntity): Percentages {
  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const spin = clamp(
    (a.stamina ?? DEFAULT_STAT) +
      (a.defense ?? DEFAULT_STAT) +
      (a.weight ?? 0) -
      (b.attack ?? DEFAULT_STAT) +
      30
  );

  const burst = clamp(
    (a.attack ?? DEFAULT_STAT) +
      (a.propulsion ?? DEFAULT_STAT) -
      (b.defense ?? DEFAULT_STAT) -
      (b.weight ?? 0) +
      50
  );

  const over = clamp(
    (a.propulsion ?? DEFAULT_STAT) +
      (a.attack ?? DEFAULT_STAT) -
      (b.height ?? DEFAULT_STAT) -
      (b.defense ?? DEFAULT_STAT) +
      50
  );

  const xtreme = clamp(
    (a.attack ?? DEFAULT_STAT) +
      (a.propulsion ?? DEFAULT_STAT) -
      (a.weight ?? 0) -
      (b.defense ?? DEFAULT_STAT) +
      50
  );

  return { spin, burst, over, xtreme };
}

export function rollBooleans(p: Percentages): BattleBooleans {
  const roll = (chance: number) => Math.random() * 100 < chance;
  return { spin: roll(p.spin), burst: roll(p.burst), over: roll(p.over), xtreme: roll(p.xtreme) };
}

export function computeOutcome(user: CombatStats, enemy: CombatStats): BattleOutcome {

  const u = toBattleEntity(user);
  const e = toBattleEntity(enemy);
  const userPercent = calcPercent(u, e);
  const enemyPercent = calcPercent(e, u);
  const userResult = rollBooleans(userPercent);
  const enemyResult = rollBooleans(enemyPercent);
  const userScore = Object.values(userResult).filter(Boolean).length;
  const enemyScore = Object.values(enemyResult).filter(Boolean).length;
  const winner = userScore > enemyScore ? "user" : enemyScore > userScore ? "enemy" : "draw";
  return { userPercent, enemyPercent, userResult, enemyResult, userScore, enemyScore, winner };
}

/* =======================
   9. Battle Display Helpers
======================= */
export function getBattleButtonLabel(isRunning: boolean, hunger: number): string {
  if (isRunning) return "Combat en cours...";
  if (hunger >= 90) return "Trop affamé";
  return "Lancer le combat";
}
export function canBattle(hunger: number): boolean {
  return hunger < 90;
}
