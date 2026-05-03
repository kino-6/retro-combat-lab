export type CombatAction = 'attack' | 'heavy' | 'shoot' | 'throwStone' | 'guard' | 'stepBack' | 'rest';
export type SiteId = 'store' | 'clinic' | 'road' | 'gas' | 'checkpoint';
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
  fuel: number;
}

export interface BaseState extends Resources {
  day: number;
  timeLeft: number;
  routeProgress: number;
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

export interface RetreatPreview {
  hpLoss: number;
  moraleLoss: number;
  haulKeepPercent: number;
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
  availableSiteIds: SiteId[];
  combat: CombatState | null;
  event: EventState | null;
  haul: Resources;
  lastSiteId: SiteId | null;
  expeditionDepth: number;
  threat: number;
  journal: string[];
  combatLog: string[];
}
