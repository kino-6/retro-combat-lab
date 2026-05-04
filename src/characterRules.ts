import type { GameState, GrowthChoiceId } from './gameTypes.js';
import { clamp } from './gameUtils.js';

export function growthRank(state: GameState, choiceId: GrowthChoiceId): number {
  return state.growth.perks[choiceId] ?? 0;
}

export function materialDiscount(state: GameState): number {
  return state.backgroundId === 'mechanic' ? 1 : 0;
}

export function mechanicBonus(state: GameState): number {
  return state.backgroundId === 'mechanic' ? 3 : 0;
}

export function healBonus(state: GameState): number {
  return state.backgroundId === 'medic' ? 4 : 0;
}

export function moraleHitModifier(state: GameState): number {
  if (state.base.morale >= 85) return 0.04;
  if (state.base.morale >= 65) return 0.02;
  if (state.base.morale >= 35) return 0;
  if (state.base.morale >= 20) return -0.04;
  return -0.08;
}

export function weaponDamageModifier(state: GameState): number {
  if (state.weapon.condition <= 0) return -2;
  if (state.weapon.condition >= 17) return 2;
  if (state.weapon.condition >= 8) return 1;
  return 0;
}

export function weaponHitModifier(state: GameState): number {
  if (state.weapon.condition <= 0) return -0.16;
  if (state.weapon.condition <= 5) return -0.08;
  return 0;
}

export function damageWeapon(state: GameState, amount: number) {
  state.weapon.condition = clamp(state.weapon.condition - amount, 0, state.weapon.maxCondition);
}
