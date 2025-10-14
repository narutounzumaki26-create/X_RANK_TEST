export const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

export const defaultRNG = () => Math.random();

export function flipArenaSide(rng: () => number = defaultRNG): "X" | "B" {
  return rng() < 0.5 ? "X" : "B";
}