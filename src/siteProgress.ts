import type { ExplorationSite, GameState, LocationProgress, Resources, SiteId, SiteProfile } from './gameTypes.js';
import { clamp } from './gameUtils.js';
import { addResources, hasAnyResource, resourceText } from './resources.js';
import { grantRelic } from './relics.js';

export function initialLocationProgress(): Record<SiteId, LocationProgress> {
  return {
    store: { progress: 0, required: 3, cleared: false },
    clinic: { progress: 0, required: 3, cleared: false },
    road: { progress: 0, required: 3, cleared: false },
    gas: { progress: 0, required: 3, cleared: false },
    checkpoint: { progress: 0, required: 2, cleared: false }
  };
}

export function advanceLocationProgress(state: GameState, site: ExplorationSite, profile: SiteProfile): string[] {
  const messages: string[] = [];
  const progress = state.locationProgress[site.id];
  if (!progress || progress.cleared) return messages;

  progress.progress = clamp(progress.progress + 1, 0, progress.required);
  messages.push(`${site.name}: 調査進行 ${progress.progress}/${progress.required}。`);
  if (progress.progress < progress.required) return messages;

  progress.cleared = true;
  const reward = locationClearReward(profile);
  if (hasAnyResource(reward)) addResources(state.haul, reward);
  const upgrade = applyLocationClearUpgrade(state, site.id);
  messages.push(`${site.name}を漁り切った。確保品 ${resourceText(reward)}。${upgrade}以後、この場所は候補に出ない。`);
  return messages;
}

export function completionReward(site: ExplorationSite): Resources {
  const bonus = Math.max(1, site.danger - 1);
  if (site.id === 'clinic') return { food: 0, materials: 0, medicine: 1 + bonus, ammo: 0, grenades: 0, fuel: 0 };
  if (site.id === 'store') return { food: 2 + bonus, materials: 0, medicine: 0, ammo: 0, grenades: 0, fuel: 0 };
  if (site.id === 'checkpoint') return { food: 0, materials: 2 + bonus, medicine: 0, ammo: 2, grenades: 1, fuel: 1 };
  return { food: 0, materials: 2 + bonus, medicine: 0, ammo: 1, grenades: 0, fuel: 1 };
}

function locationClearReward(site: ExplorationSite): Resources {
  const reward = completionReward(site);
  if (site.id === 'store') return { ...reward, food: reward.food + 4, medicine: reward.medicine + 1 };
  if (site.id === 'clinic') return { ...reward, medicine: reward.medicine + 3, materials: reward.materials + 1 };
  if (site.id === 'road') return { ...reward, materials: reward.materials + 4, fuel: reward.fuel + 1 };
  if (site.id === 'gas') return { ...reward, fuel: reward.fuel + 5, materials: reward.materials + 1 };
  return { ...reward, materials: reward.materials + 2, ammo: reward.ammo + 4, grenades: reward.grenades + 1 };
}

function applyLocationClearUpgrade(state: GameState, siteId: SiteId): string {
  if (siteId === 'clinic') {
    state.base.infirmaryLevel += 1;
    return `処置台を移設し、救護棚+1。${grantRelic(state, 'triageManual')}`;
  }
  if (siteId === 'gas') {
    state.base.defense += 1;
    return `外装パネルを拾い、車体+1。${grantRelic(state, 'luckyBolt')}`;
  }
  if (siteId === 'road') {
    state.weapon.maxCondition += 2;
    state.weapon.condition = clamp(state.weapon.condition + 2, 0, state.weapon.maxCondition);
    return `工具で武器耐久上限+2。${grantRelic(state, 'roadAtlas')}`;
  }
  if (siteId === 'checkpoint') {
    state.weapon.maxCondition += 3;
    state.weapon.condition = clamp(state.weapon.condition + 3, 0, state.weapon.maxCondition);
    return `武器部品で武器耐久上限+3。${grantRelic(state, 'ammoGauge')}`;
  }

  state.base.morale = clamp(state.base.morale + 4, 0, 100);
  return `保存食の目録で士気+4。${grantRelic(state, 'luckyBolt')}`;
}
