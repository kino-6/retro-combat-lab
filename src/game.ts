import type {
  Background,
  BackgroundId,
  BoxId,
  BoxType,
  CombatAction,
  CombatPreview,
  CombatState,
  EnemyModifier,
  EnemyModifierId,
  EnemyState,
  EnemyTemplate,
  EventChoiceId,
  EventState,
  ExplorationSite,
  GameResult,
  GameState,
  GrowthChoice,
  GrowthChoiceId,
  Resources,
  RetreatPreview,
  SiteId,
  SiteProfile,
  SiteTag
} from './gameTypes.js';
import {
  damageWeapon,
  growthRank,
  healBonus,
  materialDiscount,
  mechanicBonus
} from './characterRules.js';
import {
  expectedDamage,
  meleeHitChance,
  rangedHitChance,
  rollDamage,
  thrownHitChance
} from './combat.js';
import {
  buildEncounter,
  emptySiteTags,
  generateSiteTags,
  pickBoxType,
  pickDailyCondition,
  rollInitialDistance,
  siteTagsSummary
} from './exploration.js';
import {
  BACKGROUNDS,
  BOX_TYPES,
  CONFIG,
  ENEMY_MODIFIERS,
  GROWTH_CHOICES,
  SITES
} from './gameData.js';
import { clamp, clone, pick, roll } from './gameUtils.js';
import {
  generateAvailableSiteIds,
  getRouteSiteAdjustment,
  resolveNightDrive
} from './route.js';

export type {
  BackgroundId,
  BoxId,
  BoxType,
  CombatAction,
  CombatPreview,
  CombatState,
  DailyCondition,
  EnemyModifier,
  EnemyModifierId,
  EnemyState,
  EnemyTemplate,
  EventChoiceId,
  EventState,
  ExplorationSite,
  GameResult,
  GameState,
  GrowthChoice,
  GrowthChoiceId,
  Resources,
  RetreatPreview,
  SiteId,
  SiteProfile,
  SiteTag
} from './gameTypes.js';
export {
  BACKGROUNDS,
  BOX_TYPES,
  CONFIG,
  ENEMY_MODIFIERS,
  GROWTH_CHOICES,
  SITES,
  combatLabels
} from './gameData.js';

export const initialState = (): GameState => ({
  phase: 'setup',
  result: 'ongoing',
  resultReason: '',
  backgroundId: null,
  base: {
    day: 1,
    timeLeft: CONFIG.dayTime,
    routeProgress: 0,
    food: 8,
    materials: 4,
    medicine: 2,
    ammo: 3,
    fuel: 3,
    defense: 1,
    morale: 72,
    infirmaryLevel: 1
  },
  player: {
    name: '探索者',
    hp: 36,
    maxHp: 36,
    stamina: 12,
    maxStamina: 12,
    attack: 7,
    intellect: 6,
    guardActive: false,
    bleedTurns: 0,
    focusTurns: 0
  },
  weapon: {
    name: '補修したバール',
    condition: 16,
    maxCondition: 24
  },
  growth: {
    level: 1,
    xp: 0,
    nextXp: 7,
    pending: false,
    perks: {
      melee: 0,
      firearms: 0,
      fieldcraft: 0
    }
  },
  condition: pickDailyCondition(1, () => 0),
  siteTags: emptySiteTags(),
  availableSiteIds: ['road', 'store', 'gas'],
  combat: null,
  event: null,
  haul: emptyResources(),
  lastSiteId: null,
  expeditionDepth: 0,
  threat: 0,
  journal: [
    '目標: 北丘送信塔まで180km。そこからなら、まだ外へ届く。',
    '1日目: 改造ワゴンは崩れかけた高架下でエンジンを温めている。'
  ],
  combatLog: []
});

export function canUseCombatAction(state: GameState, action: CombatAction): boolean {
  return state.result === 'ongoing'
    && state.phase === 'combat'
    && state.player.stamina >= CONFIG.combatCosts[action]
    && (action !== 'shoot' || state.base.ammo > 0);
}

export function canFieldPatch(state: GameState): boolean {
  return state.result === 'ongoing'
    && state.phase === 'aftermath'
    && state.base.materials >= CONFIG.fieldPatchMaterialCost
    && state.base.timeLeft >= CONFIG.fieldPatchTimeCost
    && state.player.hp < state.player.maxHp;
}

export function getSite(siteId: SiteId): ExplorationSite {
  const site = SITES.find((candidate) => candidate.id === siteId);
  if (!site) throw new Error(`unknown site: ${siteId}`);
  return site;
}

export function getAvailableSites(state: GameState): ExplorationSite[] {
  return state.availableSiteIds.map(getSite);
}

export function getSiteProfile(state: GameState, siteId: SiteId): SiteProfile {
  const site = getSite(siteId);
  const routeAdjustment = getRouteSiteAdjustment(state, site);
  const depthBonus = expeditionRewardBonus(state);
  const pressure = state.threat;
  const threatDanger = Math.floor(pressure / 3);
  const threatDistanceShift = -Math.floor(pressure / 4);
  const conditionApplies = !state.condition.siteId || state.condition.siteId === siteId;
  const tags = state.siteTags[siteId] ?? [];
  const rewardScale = combineResourceScales([
    routeAdjustment.rewardScale,
    conditionApplies ? state.condition.rewardScale : {},
    ...tags.map((tag) => tag.rewardScale)
  ]);
  const dangerShift = routeAdjustment.dangerShift + (conditionApplies ? state.condition.dangerShift : 0) + tags.reduce((sum, tag) => sum + tag.dangerShift, 0);
  const rareBonus = routeAdjustment.rareBonus + (conditionApplies ? state.condition.rareBonus : 0) + tags.reduce((sum, tag) => sum + tag.rareBonus, 0);
  const encounterShift = routeAdjustment.encounterShift + (conditionApplies ? state.condition.encounterShift : 0) + tags.reduce((sum, tag) => sum + tag.encounterShift, 0);
  const timeShift = routeAdjustment.timeShift + (conditionApplies ? state.condition.timeShift : 0) + tags.reduce((sum, tag) => sum + tag.timeShift, 0);
  const distanceShift = routeAdjustment.distanceShift + tags.reduce((sum, tag) => sum + tag.distanceShift, 0) + threatDistanceShift;
  const minDistance = clamp(site.distanceRange[0] + distanceShift, CONFIG.minDistance, CONFIG.maxDistance);
  const maxDistance = clamp(site.distanceRange[1] + distanceShift, minDistance, CONFIG.maxDistance);

  return {
    ...site,
    danger: clamp(site.danger + dangerShift + threatDanger, 1, 5),
    timeCost: clamp(site.timeCost + timeShift, 1, CONFIG.dayTime),
    distanceRange: [minDistance, maxDistance],
    rewardMultiplier: site.rewardMultiplier + depthBonus,
    rareChance: clamp(site.rareChance + rareBonus + state.expeditionDepth * 0.045 + state.threat * 0.01, 0.02, 0.82),
    reward: scaleResourceByType(site.reward, rewardScale),
    encounterShift,
    conditionName: conditionApplies ? state.condition.name : '',
    tags
  };
}

export function getBackground(backgroundId: BackgroundId): Background {
  const background = BACKGROUNDS.find((candidate) => candidate.id === backgroundId);
  if (!background) throw new Error(`unknown background: ${backgroundId}`);
  return background;
}

export function chooseBackground(prev: GameState, backgroundId: BackgroundId, rng: () => number = Math.random): GameState {
  const state = clone(prev);
  if (state.phase !== 'setup' || state.backgroundId) return state;

  state.backgroundId = backgroundId;
  state.phase = 'base';
  state.condition = pickDailyCondition(state.base.day, rng);
  state.siteTags = generateSiteTags(state.base.day, rng);
  if (backgroundId === 'guard') {
    state.player.maxHp += 6;
    state.player.hp += 6;
    state.player.attack += 1;
    state.player.intellect -= 1;
    state.base.morale += 3;
  } else if (backgroundId === 'mechanic') {
    state.base.materials += 3;
    state.base.ammo += 2;
    state.base.defense += 1;
    state.player.intellect += 1;
    state.weapon.condition = clamp(state.weapon.condition + 4, 0, state.weapon.maxCondition);
  } else {
    state.base.medicine += 2;
    state.base.infirmaryLevel += 1;
    state.player.intellect += 1;
  }

  state.availableSiteIds = generateAvailableSiteIds(state, rng);
  pushJournal(state, `${getBackground(backgroundId).name}として探索を始める。${getBackground(backgroundId).perk}。`);
  pushJournal(state, `${state.condition.name}: ${state.condition.description}`);
  pushJournal(state, siteTagsSummary(state));
  return state;
}

export function startExploration(prev: GameState, siteId: SiteId, rng: () => number): GameState {
  const state = clone(prev);
  if (!canActAtBaseOrAftermath(state)) return state;

  const pushingDeeper = state.phase === 'aftermath';
  if (!pushingDeeper) {
    state.expeditionDepth = 0;
    state.threat = 0;
  } else {
    state.expeditionDepth += 1;
    raiseThreat(state, 1 + Math.max(0, getSite(siteId).danger - 2), rng);
  }

  const site = getSite(siteId);
  const profile = getSiteProfile(state, siteId);
  if (state.base.timeLeft < profile.timeCost) {
    pushJournal(state, `${site.name}へ向かうには残り時間が足りない。帰還するか、日を終える必要がある。`);
    return state;
  }

  state.base.timeLeft -= profile.timeCost;
  state.lastSiteId = siteId;
  state.player.stamina = clamp(state.player.stamina + 2, 0, state.player.maxStamina);
  pushJournal(state, `${site.name}へ向かう。時間-${profile.timeCost}h、残り${state.base.timeLeft}h。${site.rewardHint}。危険度${profile.danger} / 見返りx${profile.rewardMultiplier.toFixed(2)} / 希少${Math.round(profile.rareChance * 100)}%。`);
  if (pushingDeeper) {
    pushJournal(state, `さらに奥へ踏み込む。探索深度${state.expeditionDepth}、脅威${state.threat}。良い物は増えるが、退路も騒がしくなる。`);
  }

  const eventChance = clamp(0.12 + profile.danger * 0.08 + state.player.intellect * 0.01 + state.expeditionDepth * 0.025, 0.12, 0.55);
  if (roll(rng) < eventChance) {
    state.phase = 'event';
    state.event = createEvent(site, rng);
    pushJournal(state, `${site.name}で判断を迫られる発見。損ではなく、取り方を選べる機会だ。`);
    return state;
  }

  const encounterChance = clamp(0.42 + profile.danger * 0.12 + state.base.day * 0.015 + state.threat * 0.025 - state.base.defense * 0.025 - growthRank(state, 'fieldcraft') * 0.025 + profile.encounterShift, 0.2, 0.92);
  if (roll(rng) > encounterChance) {
    const found = scaleReward(profile.reward, (0.55 + roll(rng) * 0.45) * profile.rewardMultiplier);
    addResources(state.haul, found);
    maybeGrantRareFind(state, site, rng);
    state.phase = 'aftermath';
    pushJournal(state, `静かな物色。${resourceText(found)}をフィールドパックへ。`);
    checkGameEnd(state);
    return state;
  }

  const enemyTemplates = buildEncounter(profile, state.base.day, state.threat, rng);
  const enemies = enemyTemplates.map((enemyTemplate) => createEnemy(enemyTemplate, state.base.day, rng));
  const modifierDistanceShift = enemies.reduce((shift, enemy) => Math.min(shift, enemy.modifierId === 'lurker' || enemy.modifierId === 'frenzied' ? -1 : 0), 0);
  state.phase = 'combat';
  state.combat = {
    siteId,
    enemies,
    distance: clamp(rollInitialDistance(profile, rng) + modifierDistanceShift, CONFIG.minDistance, CONFIG.maxDistance),
    turn: 1
  };
  state.combatLog = [`${site.name}で${enemies.map((enemy) => enemy.name).join('、')}と遭遇。距離${state.combat.distance}。`];
  return state;
}

export function stepCombat(prev: GameState, action: CombatAction, rng: () => number): GameState {
  const state = clone(prev);
  if (!state.combat || !canUseCombatAction(state, action)) {
    pushCombat(state, 'スタミナ不足、または攻撃対象がない。');
    return state;
  }

  applyBleed(state);
  if (state.player.hp <= 0) return defeat(state, '出血で探索者が倒れた。');
  if (allEnemiesDown(state)) return winCombat(state, rng);

  const player = state.player;
  const combat = state.combat;
  const target = activeEnemy(state);
  if (!target) return winCombat(state, rng);
  player.stamina = clamp(player.stamina - CONFIG.combatCosts[action], 0, player.maxStamina);
  player.guardActive = false;

  if (action === 'attack' || action === 'heavy') {
    const heavy = action === 'heavy';
    damageWeapon(state, heavy ? 2 : 1);
    const chance = meleeHitChance(state, heavy);
    if (roll(rng) < chance) {
      const damage = rollDamage(state, action, rng);
      target.hp -= damage;
      pushCombat(state, `${target.name}へ${heavy ? '強攻撃' : '攻撃'}命中。${damage}ダメージ。武器状態 ${state.weapon.condition}/${state.weapon.maxCondition}。`);
      if (heavy && roll(rng) < 0.34) {
        target.bleedTurns = 2;
        pushCombat(state, `${target.name}が出血。`);
      }
    } else {
      pushCombat(state, `${heavy ? '強攻撃' : '攻撃'}は暗がりで外れた。`);
    }
    player.focusTurns = 0;
  } else if (action === 'shoot') {
    state.base.ammo -= 1;
    raiseThreat(state, 2, rng);
    const chance = rangedHitChance(state);
    if (roll(rng) < chance) {
      const damage = rollDamage(state, action, rng);
      target.hp -= damage;
      pushCombat(state, `${target.name}へ銃撃命中。弾薬-1。${damage}ダメージ。距離${combat.distance}では有効。`);
    } else {
      pushCombat(state, '銃撃は外れた。弾薬-1。距離が近すぎるか、狙いが甘い。');
    }
    maybeAttractEnemyByGunshot(state, rng);
    player.focusTurns = 0;
  } else if (action === 'throwStone') {
    const chance = thrownHitChance(state);
    if (roll(rng) < chance) {
      const damage = rollDamage(state, action, rng);
      target.hp -= damage;
      pushCombat(state, `${target.name}へ投石命中。${damage}ダメージ。音は小さいが決定力は低い。`);
      if (roll(rng) < 0.28) {
        combat.distance = clamp(combat.distance + 1, CONFIG.minDistance, CONFIG.maxDistance);
        player.focusTurns = 1;
        pushCombat(state, `${target.name}がひるむ。距離${combat.distance}へ。`);
      }
    } else {
      pushCombat(state, '投石は外れた。弾薬は温存できた。');
    }
    player.focusTurns = 0;
  } else if (action === 'guard') {
    player.guardActive = true;
    pushCombat(state, 'ガードを固める。次の被弾を軽減。');
  } else if (action === 'stepBack') {
    combat.distance = clamp(combat.distance + 1, CONFIG.minDistance, CONFIG.maxDistance);
    player.focusTurns = 1;
    pushCombat(state, `距離${combat.distance}へ後退。次の攻撃に集中。`);
  } else {
    player.stamina = clamp(player.stamina + 7 + state.base.infirmaryLevel, 0, player.maxStamina);
    pushCombat(state, '遮蔽物の陰で息を整え、スタミナ回復。');
  }

  removeDefeatedEnemies(state);
  if (allEnemiesDown(state)) return winCombat(state, rng);

  enemyAct(state, rng);
  player.stamina = clamp(player.stamina + CONFIG.staminaRegenPerTurn, 0, player.maxStamina);
  player.focusTurns = Math.max(0, player.focusTurns - 1);
  combat.turn += 1;

  if (player.hp <= 0) return defeat(state, '探索者は戻らなかった。');
  checkGameEnd(state);
  return state;
}

export function retreat(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'combat') return state;

  const preview = getRetreatPreview(state);
  if (!preview) return state;
  state.player.hp -= preview.hpLoss;
  state.base.morale -= preview.moraleLoss;
  state.haul = scaleReward(state.haul, preview.haulKeepPercent / 100);
  state.phase = 'base';
  state.combat = null;
  state.combatLog = [];
  state.expeditionDepth = 0;
  state.threat = 0;
  pushJournal(state, `撤退。HP-${preview.hpLoss}、士気-${preview.moraleLoss}。パックに残ったのは${resourceText(state.haul)}。`);
  checkGameEnd(state);
  return state;
}

export function returnToBase(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'aftermath') return state;

  if (state.lastSiteId) {
    const completion = completionReward(getSiteProfile(state, state.lastSiteId));
    if (hasAnyResource(completion)) {
      addResources(state.haul, completion);
      pushJournal(state, `探索完了: 帰路で${resourceText(completion)}を追加回収。`);
    }
  }
  const experience = Math.max(1, Math.min(5, Math.ceil(resourceTotal(state.haul) / 3)));
  addResources(state.base, state.haul);
  const moraleGain = hasAnyResource(state.haul) ? 2 : 0;
  state.base.morale = clamp(state.base.morale + moraleGain, 0, 100);
  pushJournal(state, `${resourceText(state.haul)}を避難車へ積み込んだ。`);
  gainExperience(state, experience, '帰還経験');
  state.haul = emptyResources();
  state.expeditionDepth = 0;
  state.threat = 0;
  state.phase = 'base';
  checkGameEnd(state);
  openGrowthIfReady(state);
  return state;
}

export function fieldPatchUp(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'aftermath') return state;
  if (!canFieldPatch(state)) {
    pushJournal(state, `探索中の応急手当には資材${CONFIG.fieldPatchMaterialCost}、時間${CONFIG.fieldPatchTimeCost}h、負傷が必要。`);
    return state;
  }

  state.base.materials -= CONFIG.fieldPatchMaterialCost;
  state.base.timeLeft -= CONFIG.fieldPatchTimeCost;
  const healed = 6 + growthRank(state, 'fieldcraft') * 2 + (state.backgroundId === 'medic' ? 2 : 0);
  const hpBefore = state.player.hp;
  state.player.hp = clamp(state.player.hp + healed, 1, state.player.maxHp);
  state.player.bleedTurns = 0;
  state.player.stamina = clamp(state.player.stamina + 2, 0, state.player.maxStamina);
  pushJournal(state, `探索中に応急手当。資材-${CONFIG.fieldPatchMaterialCost}、時間-${CONFIG.fieldPatchTimeCost}h、HP+${state.player.hp - hpBefore}。`);
  return state;
}

export function resolveEventOption(prev: GameState, choiceId: EventChoiceId): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'event' || !state.event) return state;

  const site = getSite(state.event.siteId);
  const profile = getSiteProfile(state, state.event.siteId);
  const box = getBoxType(state.event.boxId);
  const rewardBase = scaleResourceByType(profile.reward, box.rewardScale);
  if (choiceId === 'safe') {
    const reward = scaleReward(rewardBase, box.safeScale * profile.rewardMultiplier);
    addResources(state.haul, reward);
    state.player.stamina = clamp(state.player.stamina - 1, 0, state.player.maxStamina);
    pushJournal(state, `${box.name}を慎重に回収。${resourceText(reward)}を得た。`);
  } else if (choiceId === 'tools') {
    if (state.base.materials >= box.toolsCost) {
      state.base.materials -= box.toolsCost;
      const reward = scaleReward(rewardBase, box.toolsScale * profile.rewardMultiplier);
      addResources(state.haul, reward);
      pushJournal(state, `資材${box.toolsCost}で${box.name}を開封。${resourceText(reward)}を得た。`);
    } else {
      const reward = scaleReward(rewardBase, Math.max(0.25, box.safeScale - 0.1) * profile.rewardMultiplier);
      addResources(state.haul, reward);
      pushJournal(state, `工具が足りず、手早く回収。${resourceText(reward)}を得た。`);
    }
  } else {
    if (choiceId === 'special') {
      resolveBoxSpecial(state, site, profile, box, rewardBase);
      state.event = null;
      state.phase = 'aftermath';
      checkGameEnd(state);
      return state;
    }
    damageWeapon(state, box.boldWeaponDamage);
    state.threat = clamp(state.threat + 1, 0, 12);
    const reward = scaleReward(rewardBase, box.boldScale * profile.rewardMultiplier);
    addResources(state.haul, reward);
    if (box.rareOnBold) maybeGrantRareFind(state, site, () => 0);
    pushJournal(state, `${box.name}へ強引に踏み込んだ。武器状態-${box.boldWeaponDamage}、${resourceText(reward)}を得た。`);
  }

  state.event = null;
  state.phase = 'aftermath';
  checkGameEnd(state);
  return state;
}

export function advanceRoute(prev: GameState, rng: () => number = Math.random): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;
  if (state.base.timeLeft < CONFIG.travelTimeCost) {
    pushJournal(state, `避難車を進めるには時間${CONFIG.travelTimeCost}hが必要。`);
    return state;
  }
  if (state.base.fuel < CONFIG.travelFuelCost) {
    pushJournal(state, `車を走らせる燃料が足りない。燃料${CONFIG.travelFuelCost}が必要。`);
    return state;
  }
  if (state.base.food < CONFIG.travelFoodCost) {
    pushJournal(state, `運転と警戒を続けるには食料${CONFIG.travelFoodCost}が必要。`);
    return state;
  }

  state.base.timeLeft -= CONFIG.travelTimeCost;
  state.base.food -= CONFIG.travelFoodCost;
  state.base.fuel -= CONFIG.travelFuelCost;
  const baseKm = 16 + Math.min(5, state.base.defense) * 3 + growthRank(state, 'fieldcraft') * 2;
  const routeFind = roll(rng) < 0.28 + state.player.intellect * 0.015 + growthRank(state, 'fieldcraft') * 0.04 ? 8 : 0;
  const km = baseKm + routeFind;
  state.base.routeProgress = clamp(state.base.routeProgress + km, 0, CONFIG.escapeDistance);
  state.availableSiteIds = generateAvailableSiteIds(state, rng);
  state.base.morale = clamp(state.base.morale + (routeFind > 0 ? 2 : 0), 0, 100);
  pushJournal(state, `避難車を進める。燃料-${CONFIG.travelFuelCost}、食料-${CONFIG.travelFoodCost}、時間-${CONFIG.travelTimeCost}h、進行+${km}km${routeFind > 0 ? '。抜け道を拾い、士気+2。' : '。'}`);
  checkGameEnd(state);
  return state;
}

export function endDay(prev: GameState, rng: () => number = Math.random): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

  const nightDrive = resolveNightDrive(state, rng);
  const foodPaid = Math.min(state.base.food, CONFIG.nightFoodCost);
  state.base.food -= foodPaid;
  const hunger = CONFIG.nightFoodCost - foodPaid;
  if (hunger > 0) {
    state.base.morale -= 14 * hunger;
    state.player.hp -= 3 * hunger;
    pushJournal(state, `夜の食料が${hunger}不足。士気とHPが落ちる。`);
  } else {
    state.base.morale -= Math.max(0, CONFIG.nightMoralePressure - state.base.defense);
    state.player.hp = clamp(state.player.hp + 2 + state.base.infirmaryLevel, 1, state.player.maxHp);
    pushJournal(state, `夜警で食料${CONFIG.nightFoodCost}を消費。避難車は持ちこたえた。`);
  }

  state.player.stamina = state.player.maxStamina;
  state.player.guardActive = false;
  state.player.focusTurns = 0;
  state.base.day += 1;
  state.base.timeLeft = CONFIG.dayTime;
  state.condition = pickDailyCondition(state.base.day, rng);
  state.siteTags = generateSiteTags(state.base.day, rng);
  state.availableSiteIds = generateAvailableSiteIds(state, rng);

  pushJournal(state, nightDrive);
  if (state.base.routeProgress >= CONFIG.escapeDistance) {
    checkGameEnd(state);
    return state;
  }

  if (state.base.day > CONFIG.maxDay) {
    return defeat(state, `${CONFIG.maxDay}日目の夜明け。包囲線が閉じ、送信塔への道は失われた。`);
  }

  pushJournal(state, `${state.base.day}日目: 送信塔まで残り${CONFIG.escapeDistance - state.base.routeProgress}km。探索、補修、移動、どれを優先するか。`);
  pushJournal(state, `${state.condition.name}: ${state.condition.description}`);
  pushJournal(state, siteTagsSummary(state));
  checkGameEnd(state);
  openGrowthIfReady(state);
  return state;
}

export function chooseGrowth(prev: GameState, choiceId: GrowthChoiceId): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'growth' || !state.growth.pending) return state;

  const choice = getGrowthChoice(choiceId);
  state.growth.perks[choiceId] += 1;
  state.growth.pending = false;

  if (choiceId === 'melee') {
    state.player.attack += 1;
    state.player.maxHp += 2;
    state.player.hp = clamp(state.player.hp + 2, 1, state.player.maxHp);
  } else if (choiceId === 'firearms') {
    state.player.intellect += 1;
    state.base.ammo += 1;
  } else {
    state.player.maxStamina += 1;
    state.player.stamina = state.player.maxStamina;
    state.base.morale = clamp(state.base.morale + 3, 0, 100);
  }

  state.phase = 'base';
  pushJournal(state, `成長: ${choice.name} Rank ${state.growth.perks[choiceId]}。${choice.effect}`);
  return state;
}

export function reinforceDefense(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

  const cost = defenseCost(state);
  if (state.base.materials < cost) {
    pushJournal(state, `車体補強には資材${cost}が必要。`);
    return state;
  }
  state.base.materials -= cost;
  state.base.defense += 1;
  state.base.morale = clamp(state.base.morale + 3, 0, 100);
  pushJournal(state, `車体を補強。車体強度が${state.base.defense}へ上昇。移動時の安全も少し増す。`);
  return state;
}

export function upgradeInfirmary(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

  const cost = infirmaryCost(state);
  if (state.base.materials < cost || state.base.medicine < 1) {
    pushJournal(state, `救護棚の整理には資材${cost}と薬品1が必要。`);
    return state;
  }
  state.base.materials -= cost;
  state.base.medicine -= 1;
  state.base.infirmaryLevel += 1;
  pushJournal(state, `救護棚Lv${state.base.infirmaryLevel}。治療と戦闘中の休息が強化。`);
  return state;
}

export function treatWounds(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;
  if (state.base.medicine < 1) {
    pushJournal(state, '治療に使える薬品がない。');
    return state;
  }

  state.base.medicine -= 1;
  const healed = 9 + state.base.infirmaryLevel * 3 + healBonus(state);
  state.player.hp = clamp(state.player.hp + healed, 1, state.player.maxHp);
  state.player.bleedTurns = 0;
  pushJournal(state, `薬品を使い、HPを${healed}回復。`);
  checkGameEnd(state);
  return state;
}

export function cookMeal(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;
  if (state.base.food < 1) {
    pushJournal(state, '温かい食事に回せる食料がない。');
    return state;
  }

  state.base.food -= 1;
  state.player.hp = clamp(state.player.hp + 4 + state.base.infirmaryLevel, 1, state.player.maxHp);
  state.base.morale = clamp(state.base.morale + 5, 0, 100);
  pushJournal(state, '温かい食事で手の震えが止まり、士気が上がる。');
  checkGameEnd(state);
  return state;
}

export function repairWeapon(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

  const cost = weaponRepairCost(state);
  if (state.base.materials < cost) {
    pushJournal(state, `武器整備には資材${cost}が必要。`);
    return state;
  }
  if (state.weapon.condition >= state.weapon.maxCondition) {
    pushJournal(state, '武器はこれ以上整備できない。');
    return state;
  }

  state.base.materials -= cost;
  state.weapon.condition = clamp(state.weapon.condition + CONFIG.weaponRepairAmount + mechanicBonus(state), 0, state.weapon.maxCondition);
  pushJournal(state, `${state.weapon.name}を整備。武器状態 ${state.weapon.condition}/${state.weapon.maxCondition}。`);
  return state;
}

export function restart(): GameState {
  return initialState();
}

export function defenseCost(state: GameState): number {
  return Math.max(2, 4 + state.base.defense * 2 - materialDiscount(state));
}

export function infirmaryCost(state: GameState): number {
  return Math.max(3, 5 + state.base.infirmaryLevel * 3 - materialDiscount(state));
}

export function weaponRepairCost(state: GameState): number {
  return Math.max(1, 3 - materialDiscount(state));
}

export function resourceText(resources: Resources): string {
  return `食料${resources.food} / 資材${resources.materials} / 薬品${resources.medicine} / 弾薬${resources.ammo} / 燃料${resources.fuel}`;
}

export function getCombatPreview(state: GameState, action: CombatAction): CombatPreview | null {
  if (state.phase !== 'combat' || !state.combat) return null;
  if (action === 'guard') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: '次の被ダメージを大きく軽減' };
  if (action === 'stepBack') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: `距離${Math.min(CONFIG.maxDistance, state.combat.distance + 1)}へ。次攻撃に集中` };
  if (action === 'rest') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: `STA +${7 + state.base.infirmaryLevel}` };
  if (action === 'shoot' && state.base.ammo <= 0) return { hitPercent: 0, damageMin: 0, damageMax: 0, note: '弾薬なし' };

  const hit = action === 'shoot'
    ? rangedHitChance(state)
    : action === 'throwStone'
      ? thrownHitChance(state)
      : meleeHitChance(state, action === 'heavy');
  const expected = expectedDamage(state, action);
  const uncertainty = Math.max(1, 6 - Math.floor(state.player.intellect / 2));
  return {
    hitPercent: Math.round(clamp(hit, 0.05, 0.98) * 100),
    damageMin: Math.max(1, Math.floor(expected * 0.9) - uncertainty),
    damageMax: Math.max(1, Math.ceil(expected * 1.1) + uncertainty),
    note: action === 'shoot'
      ? '高命中。弾薬1消費、銃声で敵が寄る可能性'
      : action === 'throwStone'
        ? '弾薬なし。中距離で牽制、まれに距離を稼ぐ'
        : '近距離ほど有効。武器状態を消耗'
  };
}

export function getRetreatPreview(state: GameState): RetreatPreview | null {
  if (state.result !== 'ongoing' || state.phase !== 'combat') return null;
  const threatLoss = Math.floor(state.threat / 2);
  const outnumberedLoss = Math.max(0, livingEnemies(state).length - 1);
  const distanceRelief = state.combat ? Math.floor(state.combat.distance / 3) : 0;
  const hpLoss = Math.max(3, CONFIG.retreatHpLoss + threatLoss + outnumberedLoss - distanceRelief);
  const moraleLoss = 6 + threatLoss;
  const haulKeepPercent = Math.round(Math.max(20, 35 - state.threat * 2 - outnumberedLoss * 3));
  return { hpLoss, moraleLoss, haulKeepPercent };
}

function winCombat(state: GameState, rng: () => number): GameState {
  if (!state.combat) return state;
  const site = getSite(state.combat.siteId);
  const profile = getSiteProfile(state, state.combat.siteId);
  const reward = scaleReward(profile.reward, (0.85 + roll(rng) * 0.5) * profile.rewardMultiplier);
  addResources(state.haul, reward);
  maybeGrantRareFind(state, site, rng);
  state.player.stamina = clamp(state.player.stamina + 3, 0, state.player.maxStamina);
  state.base.morale = clamp(state.base.morale + 2, 0, 100);
  state.threat = clamp(state.threat + 1, 0, 12);
  gainExperience(state, 2 + site.danger, '戦闘経験');
  pushCombat(state, '敵をすべて退けた。');
  pushJournal(state, `${site.name}で勝利。${resourceText(reward)}をフィールドパックへ。`);
  state.phase = 'aftermath';
  state.combat = null;
  checkGameEnd(state);
  return state;
}

function enemyAct(state: GameState, rng: () => number) {
  if (!state.combat) return;

  const player = state.player;
  for (const enemy of livingEnemies(state)) {
    const distance = state.combat.distance;
    const wantsClose = enemy.behavior === 'brute' ? distance > 0 : distance > 1;
    const closeChance = clamp((enemy.behavior === 'skittish' ? 0.34 : 0.62) + Math.max(0, distance - 3) * 0.08, 0.2, 0.82);
    if (wantsClose && roll(rng) < closeChance) {
      state.combat.distance = clamp(distance - 1, CONFIG.minDistance, CONFIG.maxDistance);
      pushCombat(state, `${enemy.name}が距離${state.combat.distance}まで詰める。`);
      continue;
    }

    const packPressure = Math.max(0, livingEnemies(state).length - 1) * 0.04;
    const chance = clamp((enemy.behavior === 'skittish' ? 0.66 : 0.76) - distance * 0.16 + packPressure, 0.08, 0.9);
    if (roll(rng) < chance) {
      let damage = Math.max(1, Math.round(enemy.attack * (1 - distance * 0.08)));
      if (player.guardActive) {
        damage = Math.max(1, Math.floor(damage * 0.4));
        player.guardActive = false;
        pushCombat(state, 'ガードで被害を抑えた。');
      }
      player.hp -= damage;
      if (roll(rng) < 0.14 + (enemy.behavior === 'brute' ? 0.08 : 0)) {
        player.bleedTurns = 2;
        pushCombat(state, '傷口が開き、出血。');
      }
      pushCombat(state, `${enemy.name}の攻撃。${damage}ダメージ。`);
    } else {
      pushCombat(state, `${enemy.name}の攻撃は外れた。`);
    }
  }
}

function applyBleed(state: GameState) {
  state.player.guardActive = false;
  if (state.player.bleedTurns > 0) {
    state.player.hp -= 2;
    state.player.bleedTurns -= 1;
    pushCombat(state, '出血でHP-2。');
  }
  if (state.combat) {
    for (const enemy of livingEnemies(state)) {
      if (enemy.bleedTurns > 0) {
        enemy.hp -= 2;
        enemy.bleedTurns -= 1;
        pushCombat(state, `${enemy.name}は出血で2ダメージ。`);
      }
    }
    removeDefeatedEnemies(state);
  }
}

function canActAtBaseOrAftermath(state: GameState): boolean {
  return state.result === 'ongoing' && (state.phase === 'base' || state.phase === 'aftermath');
}

function expeditionRewardBonus(state: GameState): number {
  if (state.phase === 'base' || state.phase === 'setup' || state.phase === 'growth' || state.phase === 'ended') return 0;
  return state.expeditionDepth * 0.18 + Math.min(0.24, state.threat * 0.025);
}

function raiseThreat(state: GameState, amount: number, rng: () => number) {
  const fieldcraftMitigation = growthRank(state, 'fieldcraft') > 0 && roll(rng) < growthRank(state, 'fieldcraft') * 0.16 ? 1 : 0;
  state.threat = clamp(state.threat + Math.max(0, amount - fieldcraftMitigation), 0, 12);
}

function checkGameEnd(state: GameState) {
  if (state.result !== 'ongoing') return;
  if (state.base.routeProgress >= CONFIG.escapeDistance) {
    victory(state, `北丘送信塔に到達。古い中継器はまだ息をしていた。外へ向けて救援信号を放った。`);
  } else if (state.player.hp <= 0) {
    defeat(state, '探索者が倒れた。');
  } else if (state.base.food <= 0 && state.phase === 'base') {
    defeat(state, '食料が尽きた。夜明け前に避難車の中から動けなくなった。');
  } else if (state.base.morale <= 0) {
    defeat(state, '士気が崩壊。誰も次の運転席に座ろうとしなかった。');
  }
}

function victory(state: GameState, reason: string): GameState {
  state.result = 'victory';
  state.resultReason = reason;
  state.phase = 'ended';
  state.combat = null;
  pushJournal(state, reason);
  return state;
}

function defeat(state: GameState, reason: string): GameState {
  state.result = 'defeat';
  state.resultReason = reason;
  state.phase = 'ended';
  state.combat = null;
  pushJournal(state, reason);
  return state;
}

function pushJournal(state: GameState, message: string) {
  state.journal = [message, ...state.journal].slice(0, CONFIG.journalLimit);
}

function pushCombat(state: GameState, message: string) {
  state.combatLog = [message, ...state.combatLog].slice(0, CONFIG.combatLogLimit);
}

function gainExperience(state: GameState, amount: number, reason: string) {
  if (amount <= 0 || state.growth.level >= 4) return;

  state.growth.xp += amount;
  pushJournal(state, `${reason}: EXP +${amount}。`);
  while (state.growth.xp >= state.growth.nextXp && state.growth.level < 4) {
    state.growth.xp -= state.growth.nextXp;
    state.growth.level += 1;
    state.growth.nextXp += 3;
    state.growth.pending = true;
    pushJournal(state, `探索者Lv${state.growth.level}。避難車で成長方針を選べる。`);
  }
}

function openGrowthIfReady(state: GameState) {
  if (state.result === 'ongoing' && state.phase === 'base' && state.growth.pending) {
    state.phase = 'growth';
  }
}

function addResources(target: Resources, incoming: Resources) {
  target.food += incoming.food;
  target.materials += incoming.materials;
  target.medicine += incoming.medicine;
  target.ammo += incoming.ammo;
  target.fuel += incoming.fuel;
}

function emptyResources(): Resources {
  return { food: 0, materials: 0, medicine: 0, ammo: 0, fuel: 0 };
}

function hasAnyResource(resources: Resources): boolean {
  return resources.food + resources.materials + resources.medicine + resources.ammo + resources.fuel > 0;
}

function resourceTotal(resources: Resources): number {
  return resources.food + resources.materials + resources.medicine + resources.ammo + resources.fuel;
}

function scaleReward(resources: Resources, scale: number): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * scale)),
    materials: Math.max(0, Math.round(resources.materials * scale)),
    medicine: Math.max(0, Math.round(resources.medicine * scale)),
    ammo: Math.max(0, Math.round(resources.ammo * scale)),
    fuel: Math.max(0, Math.round(resources.fuel * scale))
  };
}

function scaleResourceByType(resources: Resources, scale: Partial<Resources>): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * (scale.food ?? 1))),
    materials: Math.max(0, Math.round(resources.materials * (scale.materials ?? 1))),
    medicine: Math.max(0, Math.round(resources.medicine * (scale.medicine ?? 1))),
    ammo: Math.max(0, Math.round(resources.ammo * (scale.ammo ?? 1))),
    fuel: Math.max(0, Math.round(resources.fuel * (scale.fuel ?? 1)))
  };
}

function combineResourceScales(scales: Array<Partial<Resources>>): Partial<Resources> {
  const combined: Resources = { food: 1, materials: 1, medicine: 1, ammo: 1, fuel: 1 };
  for (const scale of scales) {
    combined.food *= scale.food ?? 1;
    combined.materials *= scale.materials ?? 1;
    combined.medicine *= scale.medicine ?? 1;
    combined.ammo *= scale.ammo ?? 1;
    combined.fuel *= scale.fuel ?? 1;
  }
  return combined;
}

function createEvent(site: ExplorationSite, rng: () => number): EventState {
  const box = pickBoxType(site.id, rng);
  return {
    siteId: site.id,
    boxId: box.id,
    title: `${site.name}の${box.name}`,
    description: `${box.description} どう開けるかで、得るものと消耗が変わる。`,
    choices: [
      { id: 'safe', label: '慎重に調べる', detail: '小さめの報酬。STA-1。失敗なし。' },
      { id: 'tools', label: '工具で開ける', detail: `資材${box.toolsCost}を使い、中量の報酬。資材がなければ控えめ。` },
      { id: 'bold', label: '強引に踏み込む', detail: `大きめの報酬${box.rareOnBold ? 'と希少発見' : ''}。武器状態-${box.boldWeaponDamage}。` },
      { id: 'special', label: box.specialLabel, detail: box.specialDetail }
    ]
  };
}

function resolveBoxSpecial(state: GameState, site: ExplorationSite, profile: SiteProfile, box: BoxType, rewardBase: Resources) {
  state.player.stamina = clamp(state.player.stamina - 2, 0, state.player.maxStamina);

  if (box.id === 'foodCrate') {
    const reward = scaleReward(rewardBase, 0.9 * profile.rewardMultiplier);
    reward.food += 1;
    addResources(state.haul, reward);
    state.base.morale = clamp(state.base.morale + 2, 0, 100);
    pushJournal(state, `${box.name}を選別。${resourceText(reward)}を得て、士気+2。`);
    return;
  }

  if (box.id === 'medCase') {
    const reward = scaleReward(rewardBase, (state.backgroundId === 'medic' ? 1.12 : 0.9) * profile.rewardMultiplier);
    addResources(state.haul, reward);
    if (state.backgroundId === 'medic') state.player.hp = clamp(state.player.hp + 3, 1, state.player.maxHp);
    pushJournal(state, `${box.name}を滅菌して回収。${resourceText(reward)}を得た${state.backgroundId === 'medic' ? '。HP+3。' : '。'}`);
    return;
  }

  if (box.id === 'ammoCan') {
    const reward = scaleReward(rewardBase, (0.85 + growthRank(state, 'firearms') * 0.12) * profile.rewardMultiplier);
    reward.ammo += 1 + growthRank(state, 'firearms');
    addResources(state.haul, reward);
    pushJournal(state, `${box.name}から使える弾を選別。${resourceText(reward)}を得た。`);
    return;
  }

  if (box.id === 'toolLocker') {
    const reward = scaleReward(rewardBase, (state.backgroundId === 'mechanic' ? 1.08 : 0.88) * profile.rewardMultiplier);
    addResources(state.haul, reward);
    if (state.backgroundId === 'mechanic') state.weapon.condition = clamp(state.weapon.condition + 2, 0, state.weapon.maxCondition);
    pushJournal(state, `${box.name}の蝶番を外す。${resourceText(reward)}を得た${state.backgroundId === 'mechanic' ? '。武器状態+2。' : '。'}`);
    return;
  }

  const intellectScale = state.player.intellect >= 7 ? 1.05 : 0.82;
  const reward = scaleReward(rewardBase, intellectScale * profile.rewardMultiplier);
  addResources(state.haul, reward);
  if (state.player.intellect >= 7 || growthRank(state, 'fieldcraft') > 0) maybeGrantRareFind(state, site, () => 0);
  pushJournal(state, `${box.name}の痕跡を読む。${resourceText(reward)}を得た。`);
}

function getBoxType(boxId: BoxId): BoxType {
  const box = BOX_TYPES.find((candidate) => candidate.id === boxId);
  if (!box) throw new Error(`unknown box type: ${boxId}`);
  return box;
}

function pickEnemyModifier(rng: () => number, day = 1): EnemyModifier {
  const rollValue = roll(rng);
  if (day <= 2) {
    if (rollValue < 0.72) return ENEMY_MODIFIERS[0];
    if (rollValue < 0.86) return getEnemyModifier('wounded');
    if (rollValue < 0.94) return getEnemyModifier('lurker');
    return getEnemyModifier('armed');
  }
  if (day >= 6) {
    if (rollValue < 0.38) return ENEMY_MODIFIERS[0];
    if (rollValue < 0.5) return getEnemyModifier('wounded');
    if (rollValue < 0.68) return getEnemyModifier('armed');
    if (rollValue < 0.86) return getEnemyModifier('frenzied');
    return getEnemyModifier('lurker');
  }
  if (rollValue < 0.52) return ENEMY_MODIFIERS[0];
  if (rollValue < 0.66) return getEnemyModifier('wounded');
  if (rollValue < 0.78) return getEnemyModifier('armed');
  if (rollValue < 0.9) return getEnemyModifier('frenzied');
  return getEnemyModifier('lurker');
}

function getEnemyModifier(modifierId: EnemyModifierId): EnemyModifier {
  const modifier = ENEMY_MODIFIERS.find((candidate) => candidate.id === modifierId);
  if (!modifier) throw new Error(`unknown enemy modifier: ${modifierId}`);
  return modifier;
}

function createEnemy(template: EnemyTemplate, day: number, rng: () => number): EnemyState {
  const dayScaling = Math.max(0, day - 1);
  const modifier = pickEnemyModifier(rng, day);
  const maxHp = Math.max(1, Math.round((template.hp + dayScaling * 2) * modifier.hpScale));
  const behavior = modifier.behavior ?? template.behavior;
  return {
    name: `${modifier.name}${template.name}`,
    hp: maxHp,
    maxHp,
    stamina: 0,
    maxStamina: 0,
    attack: Math.max(1, template.attack + Math.floor(dayScaling / 3) + modifier.attackShift),
    intellect: 0,
    guardActive: false,
    bleedTurns: 0,
    focusTurns: 0,
    behavior,
    modifierId: modifier.id,
    modifierName: modifier.name || '通常',
    ammoDrop: modifier.ammoDrop
  };
}

function maybeAttractEnemyByGunshot(state: GameState, rng: () => number) {
  if (!state.combat) return;
  if (state.combat.enemies.length >= 5) return;

  const profile = getSiteProfile(state, state.combat.siteId);
  const chance = clamp(0.05 + profile.danger * 0.018 + state.threat * 0.018 + Math.max(0, state.combat.enemies.length - 1) * 0.015 - growthRank(state, 'fieldcraft') * 0.025, 0.02, 0.24);
  if (roll(rng) >= chance) return;

  const template = pick(profile.enemies, rng);
  const enemy = createEnemy(template, state.base.day, rng);
  state.combat.enemies.push(enemy);
  state.combat.distance = clamp(Math.min(state.combat.distance, 2), CONFIG.minDistance, CONFIG.maxDistance);
  pushCombat(state, `銃声に引かれて${enemy.name}が寄ってきた。`);
}

function livingEnemies(state: GameState): CombatState['enemies'] {
  return state.combat?.enemies.filter((enemy) => enemy.hp > 0) ?? [];
}

function activeEnemy(state: GameState): CombatState['enemies'][number] | null {
  return livingEnemies(state)[0] ?? null;
}

function allEnemiesDown(state: GameState): boolean {
  return livingEnemies(state).length === 0;
}

function removeDefeatedEnemies(state: GameState) {
  if (!state.combat) return;

  for (const enemy of state.combat.enemies) {
    if (enemy.hp <= 0 && enemy.ammoDrop > 0) {
      state.haul.ammo += enemy.ammoDrop;
      pushCombat(state, `${enemy.name}から弾薬${enemy.ammoDrop}を回収。`);
      enemy.ammoDrop = 0;
    }
  }
  const before = state.combat.enemies.length;
  state.combat.enemies = state.combat.enemies.filter((enemy) => enemy.hp > 0);
  const defeated = before - state.combat.enemies.length;
  if (defeated > 0 && state.combat.enemies.length > 0) {
    pushCombat(state, `敵${defeated}体を倒した。残り${state.combat.enemies.length}体。`);
  }
}

function maybeGrantRareFind(state: GameState, site: ExplorationSite, rng: () => number) {
  const profile = getSiteProfile(state, site.id);
  if (roll(rng) >= profile.rareChance) return;

  const rare = rareReward(profile);
  addResources(state.haul, rare);
  pushJournal(state, `希少発見: ${site.rareHint}。追加で${resourceText(rare)}。`);
}

function rareReward(site: ExplorationSite): Resources {
  if (site.id === 'clinic') return { food: 0, materials: 0, medicine: 2 + site.danger, ammo: 0, fuel: 0 };
  if (site.id === 'store') return { food: 3 + site.danger, materials: 1, medicine: 0, ammo: 1, fuel: 0 };
  return { food: 0, materials: 3 + site.danger, medicine: 0, ammo: 2, fuel: 1 };
}

function completionReward(site: ExplorationSite): Resources {
  const bonus = Math.max(1, site.danger - 1);
  if (site.id === 'clinic') return { food: 0, materials: 0, medicine: 1 + bonus, ammo: 0, fuel: 0 };
  if (site.id === 'store') return { food: 2 + bonus, materials: 0, medicine: 0, ammo: 0, fuel: 0 };
  return { food: 0, materials: 2 + bonus, medicine: 0, ammo: 1, fuel: 1 };
}

function getGrowthChoice(choiceId: GrowthChoiceId): GrowthChoice {
  const choice = GROWTH_CHOICES.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`unknown growth choice: ${choiceId}`);
  return choice;
}
