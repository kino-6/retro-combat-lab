import { CONFIG } from './gameData.js';
import type { CombatAction, GameState } from './gameTypes.js';
import { growthRank, weaponDamageModifier, weaponHitModifier } from './characterRules.js';
import { clamp, roll } from './gameUtils.js';

export function meleeHitChance(state: GameState, heavy: boolean): number {
  if (!state.combat) return 0;
  const guardBonus = state.backgroundId === 'guard' ? 0.05 : 0;
  return clamp((heavy ? 0.72 : 0.86) - state.combat.distance * 0.19 + weaponHitModifier(state) + guardBonus + growthRank(state, 'melee') * 0.025, 0.1, 0.96);
}

export function rangedHitChance(state: GameState): number {
  if (!state.combat) return 0;
  const byDistance = [0.42, 0.68, 0.84, 0.9, 0.93, 0.9][state.combat.distance] ?? 0.82;
  const intellectBonus = (state.player.intellect - 6) * 0.03;
  const mechanicBonus = state.backgroundId === 'mechanic' ? 0.07 : 0;
  return clamp(byDistance + intellectBonus + mechanicBonus + growthRank(state, 'firearms') * 0.04, 0.22, 0.97);
}

export function thrownHitChance(state: GameState): number {
  if (!state.combat) return 0;
  const byDistance = [0.7, 0.76, 0.72, 0.58, 0.42, 0.28][state.combat.distance] ?? 0.45;
  const intellectBonus = (state.player.intellect - 6) * 0.025;
  const fieldcraftBonus = growthRank(state, 'fieldcraft') * 0.04;
  return clamp(byDistance + intellectBonus + fieldcraftBonus, 0.18, 0.88);
}

export function expectedDamage(state: GameState, action: CombatAction): number {
  if (!state.combat) return 0;
  if (action === 'shoot') {
    const distanceBonus = Math.min(6, state.combat.distance * 2);
    const mechanicBonus = state.backgroundId === 'mechanic' ? 2 : 0;
    return Math.max(3, state.player.attack + 1 + distanceBonus + mechanicBonus + growthRank(state, 'firearms') * 2);
  }
  if (action === 'throwStone') {
    const distancePenalty = Math.max(0, state.combat.distance - 3);
    return Math.max(2, 4 + Math.floor(state.player.intellect / 3) + growthRank(state, 'fieldcraft') - distancePenalty);
  }
  const heavy = action === 'heavy';
  const guardBonus = state.backgroundId === 'guard' ? 1 : 0;
  const baseDamage = (heavy ? state.player.attack + 5 : state.player.attack) + weaponDamageModifier(state) + guardBonus + growthRank(state, 'melee');
  const focusBonus = state.player.focusTurns > 0 ? 1.25 : 1;
  return Math.max(1, baseDamage * Math.max(0.2, 1 - state.combat.distance * 0.16) * focusBonus);
}

export function rollDamage(state: GameState, action: CombatAction, rng: () => number): number {
  const variance = 0.88 + roll(rng) * 0.24;
  return Math.max(1, Math.round(expectedDamage(state, action) * variance));
}
