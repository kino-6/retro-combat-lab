import assert from 'node:assert/strict';
import {
  CONFIG,
  advanceRoute,
  chooseBackground,
  chooseGrowth,
  canFieldPatch,
  breachRouteBlockade,
  continueCombatResult,
  detourRouteBlockade,
  fieldPatchUp,
  getAvailableSites,
  getCombatPreview,
  getRetreatPreview,
  getSiteProfile,
  initialState,
  repairWeapon,
  reinforceDefense,
  resolveEventOption,
  returnToBase,
  startRouteBlockadeCombat,
  startExploration,
  stepCombat,
  treatWounds
} from '../dist/game.js';

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  assert.equal(getAvailableSites(state).length, CONFIG.visibleSiteChoices);
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
  assert.equal(state.phase, 'combatResult');
  assert.ok(state.combatResult);
  state = continueCombatResult(state);
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
  state = chooseBackground(state, 'mechanic', sequence([0.1, 0.1, 0.1, 0.1, 0.1, 0.1]));
  assert.equal(getAvailableSites(state).length, 3);
  state.clearedBlockades.checkpoint = true;
  state.base.routeProgress = Math.floor(CONFIG.escapeDistance * 0.75);
  state.base.day = 8;
  state = advanceRoute(state, sequence([0.98, 0.98, 0.98, 0.98]));
  const lateSites = getAvailableSites(state).map((site) => site.id);
  assert.equal(lateSites.length, 3);
  assert.ok(lateSites.includes('checkpoint') || lateSites.includes('clinic') || lateSites.includes('gas'));
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state.base.routeProgress = CONFIG.checkpointGateKm - 1;
  state.base.fuel = 10;
  state = advanceRoute(state, () => 0);
  assert.equal(state.routeBlockade, 'checkpoint');
  assert.equal(state.base.routeProgress, CONFIG.checkpointGateKm);
  const fuelBefore = state.base.fuel;
  state = detourRouteBlockade(state);
  assert.equal(state.routeBlockade, null);
  assert.equal(state.clearedBlockades.checkpoint, true);
  assert.ok(state.base.fuel < fuelBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state.base.routeProgress = CONFIG.checkpointGateKm - 1;
  state.base.fuel = 10;
  state.base.materials = 10;
  state.base.grenades = 2;
  state = advanceRoute(state, () => 0);
  const ammoBefore = state.base.ammo;
  state = breachRouteBlockade(state, () => 0);
  assert.equal(state.routeBlockade, null);
  assert.equal(state.clearedBlockades.checkpoint, true);
  assert.ok(state.base.ammo > ammoBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state.base.routeProgress = CONFIG.checkpointGateKm - 1;
  state.base.fuel = 10;
  state = advanceRoute(state, () => 0);
  state = startRouteBlockadeCombat(state, sequence([0, 0, 0]));
  assert.equal(state.phase, 'combat');
  assert.equal(state.combat.blockadeId, 'checkpoint');
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
  assert.equal(state.event.kind, 'box');
  state = resolveEventOption(state, 'special');
  assert.equal(state.phase, 'aftermath');
  assert.ok(state.haul.food + state.haul.materials + state.haul.medicine + state.haul.ammo > 0);
}

{
  let state = initialState();
  state = chooseBackground(state, 'courier');
  const progressBefore = state.base.routeProgress;
  state = startExploration(state, 'road', sequence([0, 0.9, 0, 0]));
  assert.equal(state.phase, 'event');
  assert.equal(state.event.kind, 'road');
  state = resolveEventOption(state, 'special');
  assert.equal(state.phase, 'aftermath');
  assert.ok(state.base.routeProgress > progressBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  const baseProfile = getSiteProfile(state, 'road');
  state = startExploration(state, 'road', sequence([0.99, 0.99, 0]));
  assert.equal(state.phase, 'aftermath');
  state = startExploration(state, 'road', sequence([0.99, 0.99, 0]));
  assert.ok(state.expeditionDepth > 0);
  assert.ok(state.threat > 0);
  const deepProfile = getSiteProfile(state, 'road');
  assert.ok(deepProfile.rewardMultiplier > baseProfile.rewardMultiplier);
  assert.ok(deepProfile.rareChance > baseProfile.rareChance);
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
  state = chooseBackground(state, 'hunter');
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  state.base.ammo = 20;
  state = stepCombat(state, 'shoot', sequence([0, 0, 0, 0, 0]));
  assert.ok(state.combat);
  assert.ok(state.combat.pendingSpawns.length > 0);
  state = stepCombat(state, 'rest', () => 0);
  assert.ok(state.combat.enemies.length > 1);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state = startExploration(state, 'checkpoint', sequence([0.99, 0, 0, 0]));
  assert.equal(state.phase, 'combat');
  state.combat.distance = 1;
  state.combat.enemies = [state.combat.enemies[0], structuredClone(state.combat.enemies[0]), structuredClone(state.combat.enemies[0])];
  const totalHpBefore = state.combat.enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
  state = stepCombat(state, 'grenade', () => 0);
  const totalHpAfterGrenade = state.combat.enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
  assert.ok(totalHpAfterGrenade < totalHpBefore);
  assert.ok(state.combat.distance > 1);
}

{
  let state = initialState();
  state = chooseBackground(state, 'mechanic');
  state = startExploration(state, 'store', sequence([0.99, 0, 0]));
  assert.equal(state.phase, 'combat');
  state.combat.distance = 1;
  state.combat.enemies = [state.combat.enemies[0], structuredClone(state.combat.enemies[0])];
  const secondHpBefore = state.combat.enemies[1].hp;
  state = stepCombat(state, 'shotgun', () => 0);
  assert.ok(state.combat.enemies[0].hp < state.combat.enemies[0].maxHp);
  assert.ok(state.combat.enemies[1].hp < secondHpBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'medic');
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  const preview = getCombatPreview(state, 'throwStone');
  assert.ok(preview);
  assert.ok(preview.hitPercent > 20);
  const enemyHpBefore = state.combat.enemies[0].hp;
  state = stepCombat(state, 'throwStone', () => 0);
  assert.ok(state.combat.enemies[0].hp < enemyHpBefore);
}

{
  let state = initialState();
  state = chooseBackground(state, 'guard');
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  const retreatPreview = getRetreatPreview(state);
  assert.ok(retreatPreview);
  assert.ok(retreatPreview.hpLoss >= 3);
  assert.ok(retreatPreview.moraleLoss >= 6);
  state.combat.enemies = [state.combat.enemies[0]];
  state.combat.enemies[0].hp = 1;
  state.player.hp = 18;
  state = stepCombat(state, 'attack', () => 0);
  assert.equal(state.phase, 'combatResult');
  state = continueCombatResult(state);
  assert.equal(state.phase, 'aftermath');
  const materialsBefore = state.base.materials;
  assert.ok(canFieldPatch(state));
  state = fieldPatchUp(state);
  assert.ok(state.player.hp > 18);
  assert.ok(state.base.materials < materialsBefore);
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
  state = continueCombatResult(state);
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
  state.clearedBlockades.checkpoint = true;
  state.clearedBlockades.final = true;
  state.base.routeProgress = CONFIG.escapeDistance - 1;
  state.base.food = 4;
  state = advanceRoute(state, () => 0);
  assert.equal(state.result, 'victory');
}

{
  let state = initialState();
  state = chooseBackground(state, 'courier');
  assert.ok(state.base.fuel > 3);
  assert.ok(state.base.timeLeft > CONFIG.dayTime);
  assert.ok(state.growth.perks.fieldcraft > 0);
}

{
  let state = initialState();
  state = chooseBackground(state, 'hunter');
  assert.ok(state.base.ammo > 3);
  assert.ok(state.growth.perks.firearms > 0);
  state = startExploration(state, 'road', sequence([0.99, 0, 0]));
  assert.ok(state.combat);
  state.combat.distance = 5;
  const highMoralePreview = getCombatPreview(state, 'shoot');
  assert.ok(highMoralePreview);
  state.base.morale = 10;
  const lowMoralePreview = getCombatPreview(state, 'shoot');
  assert.ok(lowMoralePreview);
  assert.ok(highMoralePreview.hitPercent > lowMoralePreview.hitPercent);
}

{
  let state = initialState();
  state = chooseBackground(state, 'teacher');
  assert.ok(state.player.intellect >= 8);
  assert.ok(state.player.luck > 5);
  assert.ok(state.base.medicine > 2);
  assert.ok(state.growth.perks.fieldcraft > 0);
}

{
  let state = initialState();
  state = chooseBackground(state, 'teacher');
  const luckyRareChance = getSiteProfile(state, 'store').rareChance;
  state.player.luck = 3;
  const unluckyRareChance = getSiteProfile(state, 'store').rareChance;
  assert.ok(luckyRareChance > unluckyRareChance);
}

console.log('game-check ok');

function sequence(values) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
