export const roll = (rng: () => number): number => rng();

export function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(roll(rng) * items.length)] ?? items[0];
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
