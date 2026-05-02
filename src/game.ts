export type Action = 'attack' | 'heavy' | 'guard' | 'stepBack' | 'rest';

export interface Fighter {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  guardActive: boolean;
  bleedTurns: number;
  focusTurns: number;
}

export interface GameState {
  player: Fighter;
  enemy: Fighter;
  distance: number;
  turn: number;
  logs: string[];
  result: 'ongoing' | 'victory' | 'defeat';
}

export const CONFIG = {
  maxDistance: 3,
  minDistance: 0,
  logLimit: 10,
  staminaRegenPerTurn: 2,
  costs: { attack: 3, heavy: 6, guard: 2, stepBack: 2, rest: 0 }
};

export const initialState = (): GameState => ({
  player: { hp: 36, maxHp: 36, stamina: 12, maxStamina: 12, attack: 7, guardActive: false, bleedTurns: 0, focusTurns: 0 },
  enemy: { hp: 42, maxHp: 42, stamina: 999, maxStamina: 999, attack: 6, guardActive: false, bleedTurns: 0, focusTurns: 0 },
  distance: 1,
  turn: 1,
  logs: ['戦闘開始。敵は間合いを測っている。'],
  result: 'ongoing'
});

export const roll = (rng: () => number): number => rng();

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const hitChance = (distance: number, heavy: boolean) => clamp((heavy ? 0.72 : 0.85) - distance * 0.2, 0.15, 0.95);

function pushLog(state: GameState, msg: string) {
  state.logs = [msg, ...state.logs].slice(0, CONFIG.logLimit);
}

function applyUpkeep(state: GameState) {
  if (state.player.bleedTurns > 0) {
    state.player.hp -= 2; state.player.bleedTurns -= 1; pushLog(state, '出血で2ダメージ。');
  }
  if (state.enemy.bleedTurns > 0) {
    state.enemy.hp -= 2; state.enemy.bleedTurns -= 1; pushLog(state, '敵は出血で2ダメージ。');
  }
}

export function canUseAction(state: GameState, action: Action): boolean {
  return state.player.stamina >= CONFIG.costs[action] && state.result === 'ongoing';
}

export function stepTurn(prev: GameState, action: Action, rng: () => number): GameState {
  const state: GameState = structuredClone(prev);
  if (!canUseAction(state, action)) { pushLog(state, 'スタミナ不足で行動失敗。'); return state; }

  applyUpkeep(state);
  const p = state.player; const e = state.enemy;
  p.stamina = clamp(p.stamina - CONFIG.costs[action], 0, p.maxStamina);
  p.guardActive = false;

  if (action === 'attack' || action === 'heavy') {
    const heavy = action === 'heavy';
    const chance = hitChance(state.distance, heavy);
    if (roll(rng) < chance) {
      const base = heavy ? p.attack + 5 : p.attack;
      const dmg = Math.round(base * (1 - state.distance * 0.15) * (p.focusTurns > 0 ? 1.25 : 1));
      e.hp -= Math.max(1, dmg);
      if (heavy && roll(rng) < 0.35) { e.bleedTurns = 2; pushLog(state, '強打で敵が出血!'); }
      pushLog(state, `${heavy ? '強攻撃' : '攻撃'}命中 ${Math.max(1,dmg)}ダメージ。`);
    } else pushLog(state, `${heavy ? '強攻撃' : '攻撃'}は外れた。`);
    p.focusTurns = 0;
  } else if (action === 'guard') {
    p.guardActive = true; pushLog(state, 'ガード姿勢。次の被ダメージを軽減。');
  } else if (action === 'stepBack') {
    state.distance = clamp(state.distance + 1, CONFIG.minDistance, CONFIG.maxDistance);
    p.focusTurns = 1;
    pushLog(state, `後退して距離${state.distance}。次ターン攻撃集中。`);
  } else {
    p.stamina = clamp(p.stamina + 6, 0, p.maxStamina);
    pushLog(state, '呼吸を整えてスタミナ回復。');
  }

  if (e.hp <= 0) { state.result = 'victory'; pushLog(state, '敵を撃破!'); return state; }

  enemyAct(state, rng);
  p.stamina = clamp(p.stamina + CONFIG.staminaRegenPerTurn, 0, p.maxStamina);
  p.focusTurns = Math.max(0, p.focusTurns - 1);
  state.turn += 1;
  if (p.hp <= 0) { state.result = 'defeat'; pushLog(state, 'あなたは倒れた...'); }
  return state;
}

function enemyAct(state: GameState, rng: () => number) {
  const p = state.player; const e = state.enemy;
  const closeIn = state.distance > 1 && roll(rng) < 0.7;
  if (closeIn) { state.distance -= 1; pushLog(state, `敵が前進、距離${state.distance}。`); return; }
  const chance = clamp(0.8 - state.distance * 0.2, 0.2, 0.9);
  if (roll(rng) < chance) {
    let dmg = Math.round(e.attack * (1 - state.distance * 0.1));
    if (p.guardActive) { dmg = Math.floor(dmg * 0.4); p.guardActive = false; pushLog(state, 'ガードで被害軽減。'); }
    p.hp -= Math.max(1, dmg);
    if (roll(rng) < 0.25) { p.bleedTurns = 2; pushLog(state, '敵の攻撃で出血!'); }
    pushLog(state, `敵の攻撃 ${Math.max(1,dmg)}ダメージ。`);
  } else pushLog(state, '敵の攻撃を回避した。');
}
