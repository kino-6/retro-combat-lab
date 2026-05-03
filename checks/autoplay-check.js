import assert from 'node:assert/strict';
import {
  SITES,
  canUseCombatAction,
  chooseBackground,
  chooseGrowth,
  cookMeal,
  defenseCost,
  endDay,
  getSiteProfile,
  initialState,
  infirmaryCost,
  repairWeapon,
  reinforceDefense,
  resolveEventOption,
  retreat,
  returnToBase,
  startExploration,
  stepCombat,
  treatWounds,
  upgradeInfirmary,
  weaponRepairCost
} from '../dist/game.js';

const RUNS = 64;
const MAX_STEPS = 500;

let victories = 0;
let defeats = 0;
let sawCombat = false;
let sawReturn = false;
let sawUpgrade = false;
let sawDayAdvance = false;
let sawEvent = false;

for (let seed = 1; seed <= RUNS; seed += 1) {
  const rng = makeRng(seed);
  let state = initialState();
  state = chooseBackground(state, chooseBackgroundForSeed(seed));
  let expeditionDepth = 0;
  let sortiesToday = 0;
  let steps = 0;
  let localSawCombat = false;
  let localSawReturn = false;
  let localSawUpgrade = false;
  let localSawRepair = false;
  let localSawDayAdvance = false;
  let localSawEvent = false;

  while (state.result === 'ongoing' && steps < MAX_STEPS) {
    steps += 1;
    const beforeDay = state.base.day;

    if (state.phase === 'base') {
      const beforeDefense = state.base.defense;
      const beforeInfirmary = state.base.infirmaryLevel;
      const beforeWeapon = state.weapon.condition;
      state = playBaseTurn(state, rng, sortiesToday);
      if (state.phase === 'combat' || state.phase === 'aftermath') sortiesToday += 1;
      expeditionDepth = 0;
      localSawUpgrade ||= state.base.defense > beforeDefense || state.base.infirmaryLevel > beforeInfirmary;
      localSawRepair ||= state.weapon.condition > beforeWeapon;
    } else if (state.phase === 'aftermath') {
      const shouldReturn = state.player.hp < 22
        || resourceTotal(state.haul) >= 8
        || expeditionDepth >= 2
        || !hasExplorableTime(state)
        || rng() < 0.55;

      if (shouldReturn) {
        state = returnToBase(state);
        localSawReturn = true;
      } else {
        expeditionDepth += 1;
        sortiesToday += 1;
        state = startExploration(state, chooseAffordableSite(state, rng), rng);
      }
    } else if (state.phase === 'combat') {
      localSawCombat = true;
      state = playCombatTurn(state, rng);
    } else if (state.phase === 'event') {
      localSawEvent = true;
      state = resolveEventOption(state, chooseEventChoice(state, rng));
    } else if (state.phase === 'growth') {
      state = chooseGrowth(state, chooseGrowthChoice(state, rng));
    }

    localSawDayAdvance ||= state.base.day > beforeDay;
    if (state.base.day > beforeDay) sortiesToday = 0;
    assertValidState(state, seed, steps);
  }

  assert.notEqual(state.result, 'ongoing', `seed ${seed} did not finish within ${MAX_STEPS} steps`);
  victories += state.result === 'victory' ? 1 : 0;
  defeats += state.result === 'defeat' ? 1 : 0;
  sawCombat ||= localSawCombat;
  sawReturn ||= localSawReturn;
  sawUpgrade ||= localSawUpgrade;
  sawUpgrade ||= localSawRepair;
  sawDayAdvance ||= localSawDayAdvance;
  sawEvent ||= localSawEvent;
}

assert.ok(sawCombat, 'autoplay never entered combat');
assert.ok(sawReturn, 'autoplay never returned loot to base');
assert.ok(sawUpgrade, 'autoplay never upgraded the base');
assert.ok(sawDayAdvance, 'autoplay never advanced a day');
assert.ok(sawEvent, 'autoplay never saw a choice event');
assert.ok(victories > 0, 'autoplay found no winning run');
assert.ok(defeats > 0, 'autoplay found no losing run');

console.log(`autoplay-check ok: ${RUNS} runs, ${victories} victories, ${defeats} defeats`);

function playBaseTurn(state, rng, sortiesToday) {
  if (state.player.hp <= 18 && state.base.medicine > 0) return treatWounds(state);
  if (state.player.hp <= 24 && state.base.food > 3) return cookMeal(state);
  if (state.weapon.condition <= 8 && state.base.materials >= weaponRepairCost(state)) return repairWeapon(state);
  if (state.base.materials >= defenseCost(state) && state.base.defense < 4) return reinforceDefense(state);
  if (state.base.materials >= infirmaryCost(state) && state.base.medicine > 1 && state.base.infirmaryLevel < 3) return upgradeInfirmary(state);
  if (sortiesToday >= 2 + (state.player.hp > 30 ? 1 : 0)) return endDay(state);
  if (shouldExplore(state)) return startExploration(state, chooseAffordableSite(state, rng), rng);
  return endDay(state);
}

function playCombatTurn(state, rng) {
  if (state.player.hp <= 15) return retreat(state);
  if (!state.combat) return state;

  const enemy = state.combat.enemies.find((candidate) => candidate.hp > 0);
  if (!enemy) return state;
  const distance = state.combat.distance;
  const outnumbered = state.combat.enemies.filter((candidate) => candidate.hp > 0).length > 1;
  if (state.combat.turn > 25) return retreat(state);
  if (state.player.stamina < 3) return stepCombat(state, 'rest', rng);
  if (enemy.hp <= 10 && canUseCombatAction(state, 'heavy')) return stepCombat(state, 'heavy', rng);
  if (enemy.hp <= 10) return stepCombat(state, 'attack', rng);
  if ((distance >= 2 || outnumbered) && canUseCombatAction(state, 'shoot')) return stepCombat(state, 'shoot', rng);
  if (state.player.hp <= 20 && distance === 0 && canUseCombatAction(state, 'stepBack')) return stepCombat(state, 'stepBack', rng);
  if (state.player.hp <= 20 && canUseCombatAction(state, 'guard') && rng() < 0.25) return stepCombat(state, 'guard', rng);
  if (state.player.stamina >= 8 && distance <= 1 && rng() < 0.42 && canUseCombatAction(state, 'heavy')) {
    return stepCombat(state, 'heavy', rng);
  }
  return stepCombat(state, 'attack', rng);
}

function chooseEventChoice(state, rng) {
  if (rng() < 0.35) return 'special';
  if (state.base.materials > 2 && rng() < 0.45) return 'tools';
  if (state.weapon.condition > 6 && rng() < 0.35) return 'bold';
  return 'safe';
}

function chooseGrowthChoice(state, rng) {
  if (state.backgroundId === 'guard') return rng() < 0.75 ? 'melee' : 'fieldcraft';
  if (state.backgroundId === 'mechanic') return rng() < 0.7 ? 'firearms' : 'fieldcraft';
  if (state.player.hp < 24) return 'fieldcraft';
  return rng() < 0.55 ? 'fieldcraft' : 'melee';
}

function shouldExplore(state) {
  return state.player.hp >= 18
    && state.base.food > 0
    && state.base.day < 10
    && hasExplorableTime(state)
    && (state.base.food < 7 || state.base.materials < 8 || state.base.medicine < 2 || state.player.hp > 28);
}

function chooseAffordableSite(state, rng) {
  const preferred = chooseSite(state, rng);
  if (getSiteProfile(state, preferred).timeCost <= state.base.timeLeft) return preferred;
  return SITES.filter((site) => getSiteProfile(state, site.id).timeCost <= state.base.timeLeft)[0]?.id ?? preferred;
}

function chooseSite(state, rng) {
  const scored = SITES.map((site) => {
    const profile = getSiteProfile(state, site.id);
    const rewardNeed = profile.reward.food * (state.base.food < 6 ? 1.5 : 0.55)
      + profile.reward.materials * (state.base.materials < 9 ? 1.2 : 0.45)
      + profile.reward.medicine * (state.base.medicine < 3 || state.player.hp < 25 ? 1.6 : 0.5)
      + profile.reward.ammo * (state.base.ammo < 4 ? 1.1 : 0.35);
    const risk = profile.danger * 1.2 + Math.max(0, profile.timeCost - state.base.timeLeft) * 10;
    return { id: site.id, score: rewardNeed * profile.rewardMultiplier + profile.rareChance * 5 - risk + rng() * 1.5 };
  });
  return scored.sort((a, b) => b.score - a.score)[0].id;
}

function hasExplorableTime(state) {
  return SITES.some((site) => getSiteProfile(state, site.id).timeCost <= state.base.timeLeft);
}

function assertValidState(state, seed, steps) {
  const numbers = [
    state.base.day,
    state.base.timeLeft,
    state.base.food,
    state.base.materials,
    state.base.medicine,
    state.base.defense,
    state.base.morale,
    state.player.hp,
    state.player.stamina,
    state.haul.food,
    state.haul.materials,
    state.haul.medicine,
    state.haul.ammo,
    state.base.ammo,
    state.weapon.condition,
    state.growth.level,
    state.growth.xp,
    state.growth.nextXp
  ];
  for (const value of numbers) {
    assert.equal(Number.isFinite(value), true, `non-finite value at seed ${seed}, step ${steps}`);
  }
  assert.ok(state.base.day >= 1, `invalid day at seed ${seed}, step ${steps}`);
  assert.ok(state.base.defense >= 1, `invalid defense at seed ${seed}, step ${steps}`);
  assert.ok(state.player.stamina >= 0, `negative stamina at seed ${seed}, step ${steps}`);
  assert.ok(state.weapon.condition >= 0, `negative weapon condition at seed ${seed}, step ${steps}`);
}

function chooseBackgroundForSeed(seed) {
  if (seed % 3 === 0) return 'guard';
  if (seed % 3 === 1) return 'mechanic';
  return 'medic';
}

function resourceTotal(resources) {
  return resources.food + resources.materials + resources.medicine + resources.ammo;
}

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
