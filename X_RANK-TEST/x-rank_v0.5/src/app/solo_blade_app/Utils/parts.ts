// src/app/solo_blade_app/components/BattleComponents/utils/parts.ts
type Maybe<T> = T | null | undefined;
type Named = { name?: string | null } | null | undefined;

export type BuildLike = {
  bit?: Named;
  assist?: Named;
  ratchet?: Named;
  lockchip?: Named;
} | null | undefined;

export type FighterLike = {
  build?: BuildLike;
  bit?: Named;
  assist?: Named;
  ratchet?: Named;
  lockchip?: Named;
  blade?: Named;
};

export function getPartNames<T extends FighterLike>(f: T): string[] {
  const b = f?.build ?? null;
  const bit = b?.bit ?? f?.bit ?? null;
  const assist = b?.assist ?? f?.assist ?? null;
  const ratchet = b?.ratchet ?? f?.ratchet ?? null;
  const lock = b?.lockchip ?? f?.lockchip ?? null;

  const names: Array<Maybe<string>> = [
    bit?.name ?? null,
    assist?.name ?? null,
    ratchet?.name ?? null,
    lock?.name ?? null,
  ];
  return names.filter((n): n is string => typeof n === "string" && n.length > 0);
}

export function getFullLabel(
  bladeName?: string | null,
  parts: string[] = []
): string {
  if (!bladeName) return parts.length ? parts.join(" · ") : "—";
  return parts.length ? `${bladeName} (${parts.join(" · ")})` : bladeName;
}
