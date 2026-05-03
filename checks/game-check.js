import assert from 'node:assert/strict';
import {
  chooseBackground,
  chooseGrowth,
  endDay,
  getCombatPreview,
  getSiteProfile,
  initialState,
  repairWeapon,
  reinforceDefense,
  resolveEventOption,
  returnToBase,
  startExploration,
  stepCombat,
  treatWounds
} from '../dist/game.js';

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  const timeBeforeExplore = state.base.timeLeft;
  const roadProfile = getSiteProfile(state, 'road');
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  assert.equal(state.phase, 'combat');
  assert.ok(state.combat);
  assert.equal(state.base.timeLeft, timeBeforeExplore - roadProfile.timeCost);
  assert.ok(state.combat.distance >= roadProfile.distanceRange[0]);
  assert.ok(state.combat.distance <= roadProfile.distanceRange[1]);

  state.combat.enemies = [state.combat.enemies[0]];
  state.combat.enemies[0].hp = 1;
  state = stepCombat(state, 'attack', () => 0);
  assert.equal(state.phase, 'aftermath');
  assert.ok(state.haul.materials > 0);

  const materialsBeforeReturn = state.base.materials;
  state = returnToBase(state);
  if (state.phase === 'growth') state = chooseGrowth(state, 'melee');
  assert.equal(state.phase, 'base');
  assert.ok(state.base.materials > materialsBeforeReturn);

  const defenseBefore = state.base.defense;
  state = reinforceDefense(state);
  assert.equal(state.base.defense, defenseBefore + 1);

  state.weapon.condition = 1;
  const conditionBefore = state.weapon.condition;
  state = repairWeapon(state);
  assert.ok(state.weapon.condition > conditionBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'medic');
  state = startExploration(state, 'clinic', () => 0);
  assert.equal(state.phase, 'event');
  assert.ok(state.event.boxId);
  state = resolveEventOption(state, 'bold');
  assert.equal(state.phase, 'aftermath');
  assert.ok(state.haul.medicine > 0);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state = startExploration(state, 'road', () => 0);
  assert.equal(state.phase, 'event');
  state = resolveEventOption(state, 'special');
  assert.equal(state.phase, 'aftermath');
  assert.ok(state.haul.food + state.haul.materials + state.haul.medicine + state.haul.ammo > 0);
}

{
  let state = initialState();
  state = chooseBackground(state, 'guard');
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  const preview = getCombatPreview(state, 'shoot');
  assert.ok(preview);
  assert.ok(preview.hitPercent > 50);
  const enemyHpBefore = state.combat.enemies[0].hp;
  state = stepCombat(state, 'shoot', () => 0);
  assert.ok(state.combat.enemies[0].hp < enemyHpBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state = startExploration(state, 'clinic', sequence([0.99, 0, 0, 0, 0, 0]));
  assert.equal(state.phase, 'combat');
  assert.ok(state.combat);
  assert.ok(state.combat.enemies.length > 1);
}

{
  let state = initialState();
  state = chooseBackground(state, 'guard');
  state.growth.xp = state.growth.nextXp - 1;
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  state.combat.enemies = [state.combat.enemies[0]];
  state.combat.enemies[0].hp = 1;
  state = stepCombat(state, 'attack', () => 0);
  state = returnToBase(state);
  assert.equal(state.phase, 'growth');
  const attackBefore = state.player.attack;
  state = chooseGrowth(state, 'melee');
  assert.equal(state.phase, 'base');
  assert.equal(state.growth.perks.melee, 1);
  assert.ok(state.player.attack > attackBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'medic');
  state.player.hp = 10;
  const medicineBefore = state.base.medicine;
  state = treatWounds(state);
  assert.ok(state.player.hp > 10);
  assert.equal(state.base.medicine, medicineBefore - 1);
}

{
  let state = initialState();
  state = chooseBackground(state, 'guard');
  state.base.day = 9;
  state.base.food = 4;
  state.base.timeLeft = 0;
  state = endDay(state, () => 0);
  assert.equal(state.result, 'victory');
}

console.log('game-check ok');

function sequence(values) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
