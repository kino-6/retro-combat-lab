export type CombatAction = 'attack' | 'heavy' | 'shoot' | 'guard' | 'stepBack' | 'rest';
export type SiteId = 'store' | 'clinic' | 'road';
export type BackgroundId = 'guard' | 'mechanic' | 'medic';
export type Phase = 'setup' | 'base' | 'event' | 'combat' | 'aftermath' | 'growth' | 'ended';
export type GameResult = 'ongoing' | 'victory' | 'defeat';
export type EventChoiceId = 'safe' | 'tools' | 'bold' | 'special';
export type GrowthChoiceId = 'melee' | 'firearms' | 'fieldcraft';
export type DailyConditionId = 'clear' | 'fog' | 'rain' | 'raiders' | 'quiet';
export type SiteTagId = 'locked' | 'burned' | 'freshTracks' | 'shortcut' | 'openGround' | 'tightAlleys';
export type BoxId = 'foodCrate' | 'medCase' | 'ammoCan' | 'toolLocker' | 'survivorStash';
export type EnemyModifierId = 'none' | 'wounded' | 'armed' | 'frenzied' | 'lurker';

export interface Resources {
  food: number;
  materials: number;
  medicine: number;
  ammo: number;
}

export interface BaseState extends Resources {
  day: number;
  timeLeft: number;
  defense: number;
  morale: number;
  infirmaryLevel: number;
}

export interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  intellect: number;
  guardActive: boolean;
  bleedTurns: number;
  focusTurns: number;
}

export interface Background {
  id: BackgroundId;
  name: string;
  description: string;
  perk: string;
}

export interface WeaponState {
  name: string;
  condition: number;
  maxCondition: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  hp: number;
  attack: number;
  behavior: 'stalker' | 'brute' | 'skittish';
}

export interface ExplorationSite {
  id: SiteId;
  name: string;
  description: string;
  danger: number;
  timeCost: number;
  distanceRange: [number, number];
  rewardHint: string;
  rewardMultiplier: number;
  rareChance: number;
  rareHint: string;
  reward: Resources;
  enemies: EnemyTemplate[];
}

export interface SiteProfile extends ExplorationSite {
  encounterShift: number;
  conditionName: string;
  tags: SiteTag[];
}

export interface SiteTag {
  id: SiteTagId;
  name: string;
  description: string;
  allowedSites?: SiteId[];
  rewardScale: Partial<Resources>;
  dangerShift: number;
  rareBonus: number;
  encounterShift: number;
  timeShift: number;
  distanceShift: number;
}

export interface BoxType {
  id: BoxId;
  name: string;
  description: string;
  allowedSites?: SiteId[];
  rewardScale: Partial<Resources>;
  safeScale: number;
  toolsScale: number;
  boldScale: number;
  toolsCost: number;
  boldWeaponDamage: number;
  rareOnBold: boolean;
  specialLabel: string;
  specialDetail: string;
}

export interface EnemyModifier {
  id: EnemyModifierId;
  name: string;
  description: string;
  hpScale: number;
  attackShift: number;
  behavior?: EnemyTemplate['behavior'];
  ammoDrop: number;
  distanceShift: number;
}

export interface DailyCondition {
  id: DailyConditionId;
  name: string;
  description: string;
  siteId?: SiteId;
  rewardScale: Partial<Resources>;
  dangerShift: number;
  rareBonus: number;
  encounterShift: number;
  timeShift: number;
}

export interface EventChoice {
  id: EventChoiceId;
  label: string;
  detail: string;
}

export interface EventState {
  siteId: SiteId;
  boxId: BoxId;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface CombatPreview {
  hitPercent: number;
  damageMin: number;
  damageMax: number;
  note: string;
}

export interface GrowthChoice {
  id: GrowthChoiceId;
  name: string;
  description: string;
  effect: string;
}

export interface GrowthState {
  level: number;
  xp: number;
  nextXp: number;
  pending: boolean;
  perks: Record<GrowthChoiceId, number>;
}

export interface CombatState {
  siteId: SiteId;
  enemies: EnemyState[];
  distance: number;
  turn: number;
}

export interface EnemyState extends Fighter {
  behavior: EnemyTemplate['behavior'];
  modifierId: EnemyModifierId;
  modifierName: string;
  ammoDrop: number;
}

export interface GameState {
  phase: Phase;
  result: GameResult;
  resultReason: string;
  backgroundId: BackgroundId | null;
  base: BaseState;
  player: Fighter;
  weapon: WeaponState;
  growth: GrowthState;
  condition: DailyCondition;
  siteTags: Record<SiteId, SiteTag[]>;
  combat: CombatState | null;
  event: EventState | null;
  haul: Resources;
  lastSiteId: SiteId | null;
  journal: string[];
  combatLog: string[];
}

export const CONFIG = {
  maxDay: 10,
  maxDistance: 3,
  minDistance: 0,
  journalLimit: 12,
  combatLogLimit: 10,
  dayTime: 6,
  nightFoodCost: 2,
  nightMoralePressure: 4,
  staminaRegenPerTurn: 2,
  retreatHpLoss: 6,
  weaponRepairAmount: 8,
  combatCosts: {
    attack: 3,
    heavy: 6,
    shoot: 4,
    guard: 2,
    stepBack: 2,
    rest: 0
  } satisfies Record<CombatAction, number>
};

export const BACKGROUNDS: Background[] = [
  {
    id: 'guard',
    name: '元警備員',
    description: '殴り合いと恐怖に少し慣れている。',
    perk: '最大HP+6、攻撃+1、初期士気+3'
  },
  {
    id: 'mechanic',
    name: '整備士',
    description: '壊れた道具をまだ使える形に戻せる。',
    perk: '初期資材+3、弾薬+2、防衛+1、資材系コスト-1、射撃+'
  },
  {
    id: 'medic',
    name: '野外救護員',
    description: '手当ての優先順位を間違えない。',
    perk: '初期薬品+2、診療所+1、知性+1、治療量+4'
  }
];

export const SITES: ExplorationSite[] = [
  {
    id: 'store',
    name: '廃店舗',
    description: '倒れた棚、缶詰、見通しの悪いバックヤード。',
    danger: 2,
    timeCost: 2,
    distanceRange: [0, 1],
    rewardHint: '食料++ / 資材+ / 弾薬少',
    rewardMultiplier: 1.18,
    rareChance: 0.2,
    rareHint: '封の残った保存箱',
    reward: { food: 5, materials: 2, medicine: 0, ammo: 1 },
    enemies: [
      { id: 'feral', name: '飢えた略奪者', hp: 24, attack: 5, behavior: 'stalker' },
      { id: 'hound', name: 'ガラス牙の犬', hp: 18, attack: 6, behavior: 'skittish' }
    ]
  },
  {
    id: 'clinic',
    name: '廃診療所',
    description: '薬品ロッカーと、音を吸い込む静かな処置室。',
    danger: 3,
    timeCost: 3,
    distanceRange: [1, 2],
    rewardHint: '薬品++ / 食料+',
    rewardMultiplier: 1.45,
    rareChance: 0.38,
    rareHint: '抗生剤・上等な薬品',
    reward: { food: 1, materials: 1, medicine: 3, ammo: 0 },
    enemies: [
      { id: 'patient', name: 'うわ言の患者', hp: 28, attack: 6, behavior: 'stalker' },
      { id: 'orderly', name: '錆びた介護士', hp: 34, attack: 7, behavior: 'brute' }
    ]
  },
  {
    id: 'road',
    name: '草に沈む道路',
    description: '放置車両とスクラップ。開けているが隠れ場は少ない。',
    danger: 1,
    timeCost: 2,
    distanceRange: [2, 3],
    rewardHint: '資材++ / 弾薬+ / 低危険',
    rewardMultiplier: 1,
    rareChance: 0.1,
    rareHint: '工具箱',
    reward: { food: 1, materials: 5, medicine: 0, ammo: 2 },
    enemies: [
      { id: 'drifter', name: '腹を空かせた放浪者', hp: 20, attack: 4, behavior: 'skittish' },
      { id: 'crawler', name: '側溝の這うもの', hp: 26, attack: 5, behavior: 'stalker' }
    ]
  }
];

export const combatLabels: Record<CombatAction, string> = {
  attack: '攻撃',
  heavy: '強攻撃',
  shoot: '銃撃',
  guard: 'ガード',
  stepBack: '後退',
  rest: '息を整える'
};

export const GROWTH_CHOICES: GrowthChoice[] = [
  {
    id: 'melee',
    name: '近接訓練',
    description: 'バールの間合い、踏み込み、倒し切りを磨く。',
    effect: '攻撃+1、最大HP+2。近接命中と近接ダメージが少し伸びる。'
  },
  {
    id: 'firearms',
    name: '銃器運用',
    description: '少ない弾を当てるための構えと射線を覚える。',
    effect: '知性+1、弾薬+1。銃撃命中と銃撃ダメージが少し伸びる。'
  },
  {
    id: 'fieldcraft',
    name: '野外技術',
    description: '危険の匂い、退路、荷物のまとめ方がうまくなる。',
    effect: '最大STA+1、士気+3。探索遭遇率が少し下がる。'
  }
];

export const DAILY_CONDITIONS: DailyCondition[] = [
  {
    id: 'clear',
    name: '澄んだ朝',
    description: '遠くまで見える。危険も報酬も読みやすい。',
    rewardScale: {},
    dangerShift: 0,
    rareBonus: 0,
    encounterShift: -0.03,
    timeShift: 0
  },
  {
    id: 'fog',
    name: '濃霧',
    description: '見通しは悪いが、普段見逃す物資に気づける。',
    rewardScale: {},
    dangerShift: 1,
    rareBonus: 0.12,
    encounterShift: 0.08,
    timeShift: 0
  },
  {
    id: 'rain',
    name: '冷たい雨',
    description: '足場が悪く時間を食う。道路のスクラップは拾いやすい。',
    siteId: 'road',
    rewardScale: { materials: 1.35, ammo: 1.15 },
    dangerShift: 0,
    rareBonus: 0.03,
    encounterShift: -0.02,
    timeShift: 1
  },
  {
    id: 'raiders',
    name: '略奪者の噂',
    description: '廃店舗に人影が集まる。食料は多いが衝突しやすい。',
    siteId: 'store',
    rewardScale: { food: 1.45, ammo: 1.15 },
    dangerShift: 1,
    rareBonus: 0.05,
    encounterShift: 0.12,
    timeShift: 0
  },
  {
    id: 'quiet',
    name: '不自然な静けさ',
    description: '廃診療所が静まり返る。薬品の匂いだけが残っている。',
    siteId: 'clinic',
    rewardScale: { medicine: 1.45 },
    dangerShift: -1,
    rareBonus: 0.08,
    encounterShift: -0.08,
    timeShift: 0
  }
];

export const SITE_TAGS: SiteTag[] = [
  {
    id: 'locked',
    name: '施錠区画',
    description: '開けるには手間がかかるが、まとまった物資が残っている。',
    rewardScale: { materials: 1.2, medicine: 1.15, ammo: 1.15 },
    dangerShift: 0,
    rareBonus: 0.08,
    encounterShift: -0.02,
    timeShift: 1,
    distanceShift: 0
  },
  {
    id: 'burned',
    name: '火災跡',
    description: '食料は焼けたが、金属片と薬品棚の残骸が拾える。',
    rewardScale: { food: 0.65, materials: 1.35, medicine: 1.15 },
    dangerShift: 0,
    rareBonus: 0.02,
    encounterShift: -0.04,
    timeShift: 0,
    distanceShift: 0
  },
  {
    id: 'freshTracks',
    name: '足跡多数',
    description: '最近の足跡が多い。危険だが、誰かの荷物も残っている。',
    rewardScale: { food: 1.1, materials: 1.1, ammo: 1.2 },
    dangerShift: 1,
    rareBonus: 0.1,
    encounterShift: 0.12,
    timeShift: 0,
    distanceShift: -1
  },
  {
    id: 'shortcut',
    name: '近道発見',
    description: '崩れた塀の抜け道を使える。早いが、出会い頭になりやすい。',
    rewardScale: {},
    dangerShift: 0,
    rareBonus: 0,
    encounterShift: 0.04,
    timeShift: -1,
    distanceShift: -1
  },
  {
    id: 'openGround',
    name: '開けた視界',
    description: '遠くから気配を掴める。銃撃と撤退判断が活きる。',
    allowedSites: ['road'],
    rewardScale: {},
    dangerShift: -1,
    rareBonus: 0,
    encounterShift: -0.06,
    timeShift: 0,
    distanceShift: 1
  },
  {
    id: 'tightAlleys',
    name: '狭い路地',
    description: '遮蔽物だらけで物資は隠れているが、接敵距離が近い。',
    allowedSites: ['store', 'clinic'],
    rewardScale: { food: 1.1, medicine: 1.1 },
    dangerShift: 1,
    rareBonus: 0.06,
    encounterShift: 0.08,
    timeShift: 0,
    distanceShift: -1
  }
];

export const BOX_TYPES: BoxType[] = [
  {
    id: 'foodCrate',
    name: '保存食コンテナ',
    description: '缶詰と乾パンが詰まっている。重いが価値は明快だ。',
    allowedSites: ['store', 'road'],
    rewardScale: { food: 1.8, materials: 0.6, medicine: 0.4 },
    safeScale: 0.4,
    toolsScale: 0.8,
    boldScale: 1.05,
    toolsCost: 1,
    boldWeaponDamage: 1,
    rareOnBold: false,
    specialLabel: '中身を選別',
    specialDetail: '食料を多めに確保し、士気も少し回復。STA-2。'
  },
  {
    id: 'medCase',
    name: '医療ケース',
    description: '中身は壊れやすい。丁寧に開けるほど薬品を守れる。',
    allowedSites: ['clinic', 'store'],
    rewardScale: { food: 0.4, materials: 0.5, medicine: 2 },
    safeScale: 0.5,
    toolsScale: 0.95,
    boldScale: 0.8,
    toolsCost: 1,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '滅菌して回収',
    specialDetail: '薬品を丁寧に確保。救護員なら追加回復。STA-2。'
  },
  {
    id: 'ammoCan',
    name: '弾薬缶',
    description: '錆びた留め具の奥に、使える弾が残っているかもしれない。',
    allowedSites: ['road', 'store'],
    rewardScale: { food: 0.3, materials: 0.7, ammo: 2 },
    safeScale: 0.35,
    toolsScale: 0.75,
    boldScale: 1,
    toolsCost: 1,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '弾を選別',
    specialDetail: '使える弾薬を多めに確保。銃器運用でさらに+。STA-2。'
  },
  {
    id: 'toolLocker',
    name: '工具ロッカー',
    description: '資材と補修具が期待できる。こじ開ければ武器は傷む。',
    allowedSites: ['road', 'clinic'],
    rewardScale: { materials: 1.8, ammo: 0.8, medicine: 0.5 },
    safeScale: 0.45,
    toolsScale: 0.85,
    boldScale: 1.1,
    toolsCost: 1,
    boldWeaponDamage: 3,
    rareOnBold: false,
    specialLabel: '蝶番を外す',
    specialDetail: '資材を多めに確保。整備士なら武器状態も回復。STA-2。'
  },
  {
    id: 'survivorStash',
    name: '生存者の隠し箱',
    description: '中身は読めない。時間をかけるほど、取りこぼしが減る。',
    rewardScale: { food: 1.15, materials: 1.15, medicine: 1.15, ammo: 1.15 },
    safeScale: 0.55,
    toolsScale: 0.9,
    boldScale: 1.2,
    toolsCost: 2,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '痕跡を読む',
    specialDetail: 'バランスよく回収し、希少発見も狙う。知性が高いほど有効。'
  }
];

export const ENEMY_MODIFIERS: EnemyModifier[] = [
  {
    id: 'none',
    name: '',
    description: '通常個体。',
    hpScale: 1,
    attackShift: 0,
    ammoDrop: 0,
    distanceShift: 0
  },
  {
    id: 'wounded',
    name: '負傷した',
    description: 'HPは低いが、血の匂いで興奮している。',
    hpScale: 0.72,
    attackShift: 1,
    ammoDrop: 0,
    distanceShift: 0
  },
  {
    id: 'armed',
    name: '武装した',
    description: '危険だが、倒せば弾薬を拾える可能性がある。',
    hpScale: 1.08,
    attackShift: 2,
    ammoDrop: 1,
    distanceShift: 0
  },
  {
    id: 'frenzied',
    name: '興奮した',
    description: '距離を詰めやすく、攻撃も重い。',
    hpScale: 1,
    attackShift: 2,
    behavior: 'brute',
    ammoDrop: 0,
    distanceShift: -1
  },
  {
    id: 'lurker',
    name: '潜んでいた',
    description: '出会い頭になりやすいが、体力は低め。',
    hpScale: 0.9,
    attackShift: 0,
    behavior: 'stalker',
    ammoDrop: 0,
    distanceShift: -1
  }
];

export const initialState = (): GameState => ({
  phase: 'setup',
  result: 'ongoing',
  resultReason: '',
  backgroundId: null,
  base: {
    day: 1,
    timeLeft: CONFIG.dayTime,
    food: 8,
    materials: 4,
    medicine: 2,
    ammo: 3,
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
  condition: DAILY_CONDITIONS[0],
  siteTags: emptySiteTags(),
  combat: null,
  event: null,
  haul: emptyResources(),
  lastSiteId: null,
  journal: ['1日目: バリケードはまだ持つ。物資は持たない。'],
  combatLog: []
});

export const roll = (rng: () => number): number => rng();

export function canUseCombatAction(state: GameState, action: CombatAction): boolean {
  return state.result === 'ongoing'
    && state.phase === 'combat'
    && state.player.stamina >= CONFIG.combatCosts[action]
    && (action !== 'shoot' || state.base.ammo > 0);
}

export function getSite(siteId: SiteId): ExplorationSite {
  const site = SITES.find((candidate) => candidate.id === siteId);
  if (!site) throw new Error(`unknown site: ${siteId}`);
  return site;
}

export function getSiteProfile(state: GameState, siteId: SiteId): SiteProfile {
  const site = getSite(siteId);
  const conditionApplies = !state.condition.siteId || state.condition.siteId === siteId;
  const tags = state.siteTags[siteId] ?? [];
  const rewardScale = combineResourceScales([
    conditionApplies ? state.condition.rewardScale : {},
    ...tags.map((tag) => tag.rewardScale)
  ]);
  const dangerShift = (conditionApplies ? state.condition.dangerShift : 0) + tags.reduce((sum, tag) => sum + tag.dangerShift, 0);
  const rareBonus = (conditionApplies ? state.condition.rareBonus : 0) + tags.reduce((sum, tag) => sum + tag.rareBonus, 0);
  const encounterShift = (conditionApplies ? state.condition.encounterShift : 0) + tags.reduce((sum, tag) => sum + tag.encounterShift, 0);
  const timeShift = (conditionApplies ? state.condition.timeShift : 0) + tags.reduce((sum, tag) => sum + tag.timeShift, 0);
  const distanceShift = tags.reduce((sum, tag) => sum + tag.distanceShift, 0);
  const minDistance = clamp(site.distanceRange[0] + distanceShift, CONFIG.minDistance, CONFIG.maxDistance);
  const maxDistance = clamp(site.distanceRange[1] + distanceShift, minDistance, CONFIG.maxDistance);

  return {
    ...site,
    danger: clamp(site.danger + dangerShift, 1, 4),
    timeCost: clamp(site.timeCost + timeShift, 1, CONFIG.dayTime),
    distanceRange: [minDistance, maxDistance],
    rewardMultiplier: site.rewardMultiplier,
    rareChance: clamp(site.rareChance + rareBonus, 0.02, 0.75),
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
  state.siteTags = generateSiteTags(rng);
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

  pushJournal(state, `${getBackground(backgroundId).name}として探索を始める。${getBackground(backgroundId).perk}。`);
  pushJournal(state, `${state.condition.name}: ${state.condition.description}`);
  pushJournal(state, siteTagsSummary(state));
  return state;
}

export function startExploration(prev: GameState, siteId: SiteId, rng: () => number): GameState {
  const state = clone(prev);
  if (!canActAtBaseOrAftermath(state)) return state;

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

  const eventChance = clamp(0.12 + profile.danger * 0.08 + state.player.intellect * 0.01, 0.12, 0.45);
  if (roll(rng) < eventChance) {
    state.phase = 'event';
    state.event = createEvent(site, rng);
    pushJournal(state, `${site.name}で判断を迫られる発見。損ではなく、取り方を選べる機会だ。`);
    return state;
  }

  const encounterChance = clamp(0.42 + profile.danger * 0.12 + state.base.day * 0.015 - state.base.defense * 0.025 - growthRank(state, 'fieldcraft') * 0.025 + profile.encounterShift, 0.2, 0.88);
  if (roll(rng) > encounterChance) {
    const found = scaleReward(profile.reward, (0.55 + roll(rng) * 0.45) * profile.rewardMultiplier);
    addResources(state.haul, found);
    maybeGrantRareFind(state, site, rng);
    state.phase = 'aftermath';
    pushJournal(state, `静かな物色。${resourceText(found)}をフィールドパックへ。`);
    checkGameEnd(state);
    return state;
  }

  const enemyTemplates = buildEncounter(profile, state.base.day, rng);
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

  state.player.hp -= CONFIG.retreatHpLoss;
  state.base.morale -= 6;
  state.haul = scaleReward(state.haul, 0.35);
  state.phase = 'base';
  state.combat = null;
  state.combatLog = [];
  pushJournal(state, `撤退。HP-${CONFIG.retreatHpLoss}、士気-6。パックに残ったのは${resourceText(state.haul)}。`);
  checkGameEnd(state);
  return state;
}

export function returnToBase(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'aftermath') return state;

  const experience = Math.max(1, Math.min(5, Math.ceil(resourceTotal(state.haul) / 3)));
  addResources(state.base, state.haul);
  const moraleGain = hasAnyResource(state.haul) ? 2 : 0;
  state.base.morale = clamp(state.base.morale + moraleGain, 0, 100);
  pushJournal(state, `${resourceText(state.haul)}を拠点へ持ち帰った。`);
  gainExperience(state, experience, '帰還経験');
  state.haul = emptyResources();
  state.phase = 'base';
  checkGameEnd(state);
  openGrowthIfReady(state);
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

export function endDay(prev: GameState, rng: () => number = Math.random): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

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
    pushJournal(state, `夜警で食料${CONFIG.nightFoodCost}を消費。拠点は持ちこたえた。`);
  }

  state.player.stamina = state.player.maxStamina;
  state.player.guardActive = false;
  state.player.focusTurns = 0;
  state.base.day += 1;
  state.base.timeLeft = CONFIG.dayTime;
  state.condition = pickDailyCondition(state.base.day, rng);
  state.siteTags = generateSiteTags(rng);

  if (state.base.day >= CONFIG.maxDay) {
    return victory(state, `${CONFIG.maxDay}日目: 拠点は救援信号を上げられる日まで生き延びた。`);
  }

  pushJournal(state, `${state.base.day}日目: 探索、補修、治療、どれを優先するか。`);
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
    pushJournal(state, `門の補強には資材${cost}が必要。`);
    return state;
  }
  state.base.materials -= cost;
  state.base.defense += 1;
  state.base.morale = clamp(state.base.morale + 3, 0, 100);
  pushJournal(state, `門を補強。防衛力が${state.base.defense}へ上昇。`);
  return state;
}

export function upgradeInfirmary(prev: GameState): GameState {
  const state = clone(prev);
  if (state.result !== 'ongoing' || state.phase !== 'base') return state;

  const cost = infirmaryCost(state);
  if (state.base.materials < cost || state.base.medicine < 1) {
    pushJournal(state, `診療所の改善には資材${cost}と薬品1が必要。`);
    return state;
  }
  state.base.materials -= cost;
  state.base.medicine -= 1;
  state.base.infirmaryLevel += 1;
  pushJournal(state, `診療所Lv${state.base.infirmaryLevel}。治療と戦闘中の休息が強化。`);
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
  return `食料${resources.food} / 資材${resources.materials} / 薬品${resources.medicine} / 弾薬${resources.ammo}`;
}

export function getCombatPreview(state: GameState, action: CombatAction): CombatPreview | null {
  if (state.phase !== 'combat' || !state.combat) return null;
  if (action === 'guard') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: '次の被ダメージを大きく軽減' };
  if (action === 'stepBack') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: `距離${Math.min(CONFIG.maxDistance, state.combat.distance + 1)}へ。次攻撃に集中` };
  if (action === 'rest') return { hitPercent: 100, damageMin: 0, damageMax: 0, note: `STA +${7 + state.base.infirmaryLevel}` };
  if (action === 'shoot' && state.base.ammo <= 0) return { hitPercent: 0, damageMin: 0, damageMax: 0, note: '弾薬なし' };

  const hit = action === 'shoot' ? rangedHitChance(state) : meleeHitChance(state, action === 'heavy');
  const expected = expectedDamage(state, action);
  const uncertainty = Math.max(1, 6 - Math.floor(state.player.intellect / 2));
  return {
    hitPercent: Math.round(clamp(hit, 0.05, 0.98) * 100),
    damageMin: Math.max(1, Math.floor(expected * 0.9) - uncertainty),
    damageMax: Math.max(1, Math.ceil(expected * 1.1) + uncertainty),
    note: action === 'shoot' ? '高命中。弾薬1消費、銃声で敵が寄る可能性' : '近距離ほど有効。武器状態を消耗'
  };
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
    const closeChance = enemy.behavior === 'skittish' ? 0.34 : 0.62;
    if (wantsClose && roll(rng) < closeChance) {
      state.combat.distance = clamp(distance - 1, CONFIG.minDistance, CONFIG.maxDistance);
      pushCombat(state, `${enemy.name}が距離${state.combat.distance}まで詰める。`);
      continue;
    }

    const packPressure = Math.max(0, livingEnemies(state).length - 1) * 0.04;
    const chance = clamp((enemy.behavior === 'skittish' ? 0.66 : 0.76) - distance * 0.18 + packPressure, 0.18, 0.9);
    if (roll(rng) < chance) {
      let damage = Math.max(1, Math.round(enemy.attack * (1 - distance * 0.1)));
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

function checkGameEnd(state: GameState) {
  if (state.result !== 'ongoing') return;
  if (state.player.hp <= 0) {
    defeat(state, '探索者が倒れた。');
  } else if (state.base.food <= 0 && state.phase === 'base') {
    defeat(state, '食料が尽きた。夜明け前に拠点は崩れた。');
  } else if (state.base.morale <= 0) {
    defeat(state, '士気が崩壊。門は内側から開いた。');
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
    pushJournal(state, `探索者Lv${state.growth.level}。拠点で成長方針を選べる。`);
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
}

function emptyResources(): Resources {
  return { food: 0, materials: 0, medicine: 0, ammo: 0 };
}

function hasAnyResource(resources: Resources): boolean {
  return resources.food + resources.materials + resources.medicine + resources.ammo > 0;
}

function resourceTotal(resources: Resources): number {
  return resources.food + resources.materials + resources.medicine + resources.ammo;
}

function scaleReward(resources: Resources, scale: number): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * scale)),
    materials: Math.max(0, Math.round(resources.materials * scale)),
    medicine: Math.max(0, Math.round(resources.medicine * scale)),
    ammo: Math.max(0, Math.round(resources.ammo * scale))
  };
}

function scaleResourceByType(resources: Resources, scale: Partial<Resources>): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * (scale.food ?? 1))),
    materials: Math.max(0, Math.round(resources.materials * (scale.materials ?? 1))),
    medicine: Math.max(0, Math.round(resources.medicine * (scale.medicine ?? 1))),
    ammo: Math.max(0, Math.round(resources.ammo * (scale.ammo ?? 1)))
  };
}

function combineResourceScales(scales: Array<Partial<Resources>>): Partial<Resources> {
  const combined: Resources = { food: 1, materials: 1, medicine: 1, ammo: 1 };
  for (const scale of scales) {
    combined.food *= scale.food ?? 1;
    combined.materials *= scale.materials ?? 1;
    combined.medicine *= scale.medicine ?? 1;
    combined.ammo *= scale.ammo ?? 1;
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

function buildEncounter(site: SiteProfile, day: number, rng: () => number): EnemyTemplate[] {
  const countRoll = roll(rng);
  const dayPressure = clamp((day - 1) * 0.025, 0, 0.18);
  let count = 1;

  if (site.danger === 1) {
    count = day >= 6 && countRoll < 0.22 + dayPressure ? 2 : 1;
  } else if (site.danger === 2) {
    if (countRoll < 0.2 + dayPressure) count = 3;
    else if (countRoll < 0.68 + dayPressure) count = 2;
  } else {
    if (countRoll < 0.46 + dayPressure) count = 3;
    else if (countRoll < 0.88 + dayPressure) count = 2;
  }

  return Array.from({ length: count }, () => pick(site.enemies, rng));
}

function pickDailyCondition(day: number, rng: () => number): DailyCondition {
  if (day <= 1) return DAILY_CONDITIONS[0];
  return pick(DAILY_CONDITIONS, rng);
}

function generateSiteTags(rng: () => number): Record<SiteId, SiteTag[]> {
  const result = emptySiteTags();
  for (const site of SITES) {
    const candidates = SITE_TAGS.filter((tag) => !tag.allowedSites || tag.allowedSites.includes(site.id));
    const first = pick(candidates, rng);
    result[site.id].push(first);
    if (roll(rng) < 0.22) {
      const secondCandidates = candidates.filter((tag) => tag.id !== first.id);
      const second = pick(secondCandidates, rng);
      if (second) result[site.id].push(second);
    }
  }
  return result;
}

function emptySiteTags(): Record<SiteId, SiteTag[]> {
  return { store: [], clinic: [], road: [] };
}

function siteTagsSummary(state: GameState): string {
  return `今日の探索事情: ${SITES.map((site) => `${site.name}=${(state.siteTags[site.id] ?? []).map((tag) => tag.name).join('+') || '平常'}`).join(' / ')}`;
}

function rollInitialDistance(site: SiteProfile, rng: () => number): number {
  const min = site.distanceRange[0];
  const max = site.distanceRange[1];
  if (max <= min) return min;
  return clamp(min + Math.floor(roll(rng) * (max - min + 1)), CONFIG.minDistance, CONFIG.maxDistance);
}

function pickBoxType(siteId: SiteId, rng: () => number): BoxType {
  return pick(BOX_TYPES.filter((box) => !box.allowedSites || box.allowedSites.includes(siteId)), rng);
}

function getBoxType(boxId: BoxId): BoxType {
  const box = BOX_TYPES.find((candidate) => candidate.id === boxId);
  if (!box) throw new Error(`unknown box type: ${boxId}`);
  return box;
}

function pickEnemyModifier(rng: () => number): EnemyModifier {
  const rollValue = roll(rng);
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
  const modifier = pickEnemyModifier(rng);
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
  const chance = clamp(0.09 + profile.danger * 0.025 + Math.max(0, state.combat.enemies.length - 1) * 0.02 - growthRank(state, 'fieldcraft') * 0.025, 0.04, 0.24);
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
  if (site.id === 'clinic') return { food: 0, materials: 0, medicine: 2 + site.danger, ammo: 0 };
  if (site.id === 'store') return { food: 3 + site.danger, materials: 1, medicine: 0, ammo: 1 };
  return { food: 0, materials: 3 + site.danger, medicine: 0, ammo: 2 };
}

function meleeHitChance(state: GameState, heavy: boolean): number {
  if (!state.combat) return 0;
  const guardBonus = state.backgroundId === 'guard' ? 0.05 : 0;
  return clamp((heavy ? 0.72 : 0.86) - state.combat.distance * 0.19 + weaponHitModifier(state) + guardBonus + growthRank(state, 'melee') * 0.025, 0.1, 0.96);
}

function rangedHitChance(state: GameState): number {
  if (!state.combat) return 0;
  const byDistance = [0.42, 0.68, 0.86, 0.9][state.combat.distance] ?? 0.72;
  const intellectBonus = (state.player.intellect - 6) * 0.03;
  const mechanicBonus = state.backgroundId === 'mechanic' ? 0.07 : 0;
  return clamp(byDistance + intellectBonus + mechanicBonus + growthRank(state, 'firearms') * 0.04, 0.22, 0.97);
}

function expectedDamage(state: GameState, action: CombatAction): number {
  if (!state.combat) return 0;
  if (action === 'shoot') {
    const distanceBonus = state.combat.distance >= 2 ? 4 : state.combat.distance;
    const mechanicBonus = state.backgroundId === 'mechanic' ? 2 : 0;
    return Math.max(3, state.player.attack + 1 + distanceBonus + mechanicBonus + growthRank(state, 'firearms') * 2);
  }
  const heavy = action === 'heavy';
  const guardBonus = state.backgroundId === 'guard' ? 1 : 0;
  const baseDamage = (heavy ? state.player.attack + 5 : state.player.attack) + weaponDamageModifier(state) + guardBonus + growthRank(state, 'melee');
  const focusBonus = state.player.focusTurns > 0 ? 1.25 : 1;
  return Math.max(1, baseDamage * (1 - state.combat.distance * 0.15) * focusBonus);
}

function getGrowthChoice(choiceId: GrowthChoiceId): GrowthChoice {
  const choice = GROWTH_CHOICES.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`unknown growth choice: ${choiceId}`);
  return choice;
}

function growthRank(state: GameState, choiceId: GrowthChoiceId): number {
  return state.growth.perks[choiceId] ?? 0;
}

function rollDamage(state: GameState, action: CombatAction, rng: () => number): number {
  const variance = 0.88 + roll(rng) * 0.24;
  return Math.max(1, Math.round(expectedDamage(state, action) * variance));
}

function materialDiscount(state: GameState): number {
  return state.backgroundId === 'mechanic' ? 1 : 0;
}

function mechanicBonus(state: GameState): number {
  return state.backgroundId === 'mechanic' ? 3 : 0;
}

function healBonus(state: GameState): number {
  return state.backgroundId === 'medic' ? 4 : 0;
}

function weaponDamageModifier(state: GameState): number {
  if (state.weapon.condition <= 0) return -2;
  if (state.weapon.condition >= 17) return 2;
  if (state.weapon.condition >= 8) return 1;
  return 0;
}

function weaponHitModifier(state: GameState): number {
  if (state.weapon.condition <= 0) return -0.16;
  if (state.weapon.condition <= 5) return -0.08;
  return 0;
}

function damageWeapon(state: GameState, amount: number) {
  state.weapon.condition = clamp(state.weapon.condition - amount, 0, state.weapon.maxCondition);
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(roll(rng) * items.length)] ?? items[0];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
