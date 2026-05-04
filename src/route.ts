import { CONFIG, SITES } from './gameData.js';
import type { ExplorationSite, GameState, Resources, SiteId } from './gameTypes.js';
import { growthRank } from './characterRules.js';
import { clamp, roll } from './gameUtils.js';

export interface RouteStage {
  name: string;
  description: string;
  dangerShift: number;
  encounterShift: number;
  rareBonus: number;
  driveKmPenalty: number;
  travelWearChance: number;
}

export function getRouteStage(state: GameState): RouteStage {
  const progress = routeProgressRatio(state);
  if (progress < 0.25) {
    return {
      name: '郊外の逃げ道',
      description: 'まだ空いた道が残る。拾える物は平凡だが、死者の密度も薄い。',
      dangerShift: 0,
      encounterShift: -0.03,
      rareBonus: 0,
      driveKmPenalty: 0,
      travelWearChance: 0.04
    };
  }

  if (progress < 0.68) {
    return {
      name: '砂漠の迂回路',
      description: '補給地点は減り、使える道は迂回路に寄る。燃料と補修材の価値が上がる。',
      dangerShift: 0,
      encounterShift: 0.02,
      rareBonus: 0.02,
      driveKmPenalty: 1,
      travelWearChance: 0.1
    };
  }

  if (progress < 0.9) {
    return {
      name: '検疫圏',
      description: '退避線へ向かう車列、検問、置き去りの物資が増える。人も死者も同じ道へ集まる。',
      dangerShift: 1,
      encounterShift: 0.07,
      rareBonus: 0.04,
      driveKmPenalty: 3,
      travelWearChance: 0.2
    };
  }

  return {
    name: '退避線外縁',
    description: 'フェンスと放棄車両で道が痩せる。閉門前の混雑が、走るだけでも車を削る。',
    dangerShift: 2,
    encounterShift: 0.12,
    rareBonus: 0.06,
    driveKmPenalty: 5,
    travelWearChance: 0.32
  };
}

export function resolveNightDrive(state: GameState, rng: () => number): string {
  if (state.base.routeProgress >= CONFIG.escapeDistance) return '夜明け前、退避線の照明が砂煙の向こうに見えた。';

  if (state.base.fuel >= CONFIG.nightDriveFuelCost) {
    state.base.fuel -= CONFIG.nightDriveFuelCost;
    const routeStage = getRouteStage(state);
    const earlyEase = state.base.day <= 3 ? 4 : 0;
    const midWear = state.base.day >= 6 ? Math.floor((state.base.day - 4) / 2) : 0;
    const roadVariance = state.base.day <= 2 ? Math.floor(roll(rng) * 2) : Math.floor(roll(rng) * 5);
    const km = Math.max(5, 10 + earlyEase + Math.min(4, state.base.defense) * 2 + growthRank(state, 'fieldcraft') * 2 + roadVariance - routeStage.driveKmPenalty);
    state.base.routeProgress = clamp(state.base.routeProgress + km, 0, CONFIG.escapeDistance);
    if (midWear > 0) {
      if (state.base.materials > 0) {
        state.base.materials -= 1;
        return `夜間走行。燃料-${CONFIG.nightDriveFuelCost}、進行+${km}km。荒れた路面で資材-1。`;
      }
      state.base.morale = clamp(state.base.morale - midWear * 2, 0, 100);
      return `夜間走行。燃料-${CONFIG.nightDriveFuelCost}、進行+${km}km。補修材が足りず、士気-${midWear * 2}。`;
    }
    return `夜間走行。燃料-${CONFIG.nightDriveFuelCost}、進行+${km}km。`;
  }

  const stallLoss = state.base.day <= 3 ? 4 : 8 + Math.floor((state.base.day - 4) / 2) * 2;
  state.base.morale = clamp(state.base.morale - stallLoss, 0, 100);
  if (state.base.day >= 6) state.player.hp -= 2;
  return `燃料不足で夜間走行できない。迂回路で朝を待ち、士気-${stallLoss}${state.base.day >= 6 ? '、HP-2' : ''}。`;
}

export function generateAvailableSiteIds(state: GameState, rng: () => number): SiteId[] {
  const picked: SiteId[] = [];
  const attempts = [...SITES];
  while (picked.length < CONFIG.visibleSiteChoices && attempts.length > 0) {
    const totalWeight = attempts.reduce((sum, site) => sum + siteOfferWeight(state, site), 0);
    let cursor = roll(rng) * Math.max(0.01, totalWeight);
    let index = 0;
    for (let i = 0; i < attempts.length; i += 1) {
      cursor -= siteOfferWeight(state, attempts[i]);
      if (cursor <= 0) {
        index = i;
        break;
      }
    }
    picked.push(attempts[index].id);
    attempts.splice(index, 1);
  }

  if (picked.length < CONFIG.visibleSiteChoices) {
    for (const site of SITES) {
      if (!picked.includes(site.id)) picked.push(site.id);
      if (picked.length >= CONFIG.visibleSiteChoices) break;
    }
  }

  return picked;
}

export function getRouteSiteAdjustment(state: GameState, site: ExplorationSite): {
  rewardScale: Partial<Resources>;
  dangerShift: number;
  rareBonus: number;
  encounterShift: number;
  timeShift: number;
  distanceShift: number;
} {
  const progress = routeProgressRatio(state);
  const stage = getRouteStage(state);
  if (progress < 0.25) {
    return {
      rewardScale: {},
      dangerShift: (site.id === 'road' || site.id === 'store' || site.id === 'gas' ? -1 : 0) + stage.dangerShift,
      rareBonus: stage.rareBonus,
      encounterShift: -0.04 + stage.encounterShift,
      timeShift: 0,
      distanceShift: site.id === 'road' ? 1 : 0
    };
  }

  if (progress < 0.68) {
    return {
      rewardScale: site.id === 'gas' ? { fuel: 1.2 } : {},
      dangerShift: (site.id === 'road' ? 1 : 0) + stage.dangerShift,
      rareBonus: (site.id === 'clinic' || site.id === 'checkpoint' ? 0.04 : 0) + stage.rareBonus,
      encounterShift: (site.id === 'road' ? 0.04 : 0) + stage.encounterShift,
      timeShift: 0,
      distanceShift: site.id === 'store' ? -1 : 0
    };
  }

  return {
    rewardScale: site.id === 'checkpoint' ? { ammo: 1.25, materials: 1.15 } : site.id === 'clinic' ? { medicine: 1.2 } : {},
    dangerShift: (site.id === 'checkpoint' ? 1 : site.id === 'road' || site.id === 'store' ? 2 : 1) + stage.dangerShift,
    rareBonus: (site.id === 'checkpoint' || site.id === 'clinic' ? 0.08 : 0.03) + stage.rareBonus,
    encounterShift: (site.id === 'road' || site.id === 'store' ? 0.1 : 0.06) + stage.encounterShift,
    timeShift: site.id === 'road' ? 1 : 0,
    distanceShift: site.id === 'road' ? -1 : site.id === 'checkpoint' ? -1 : 0
  };
}

function siteOfferWeight(state: GameState, site: ExplorationSite): number {
  const progress = routeProgressRatio(state);
  let weight = 1;

  if (progress < 0.25) {
    const earlyWeights: Record<SiteId, number> = { road: 5, store: 4, gas: 3.4, clinic: 1.1, checkpoint: state.base.day <= 2 ? 0.05 : 0.6 };
    weight = earlyWeights[site.id];
  } else if (progress < 0.68) {
    const midWeights: Record<SiteId, number> = { road: 1.3, store: 2.1, gas: 3.1, clinic: 3, checkpoint: 2.7 };
    weight = midWeights[site.id];
  } else {
    const lateWeights: Record<SiteId, number> = { road: 0.25, store: 1.2, gas: 2.8, clinic: 3.4, checkpoint: 5 };
    weight = lateWeights[site.id];
  }

  if (state.base.day >= 6) {
    if (site.id === 'road') weight *= 0.45;
    if (site.id === 'store') weight *= 0.75;
    if (site.id === 'clinic') weight *= 1.25;
    if (site.id === 'checkpoint') weight *= 1.45;
  }

  if (state.base.food <= 3 && site.id === 'store') weight += 2.6;
  if (state.base.fuel <= 2 && site.id === 'gas') weight += 3.2;
  if (state.base.medicine <= 1 && site.id === 'clinic') weight += 2.4;
  if (state.base.ammo <= 1 && site.id === 'checkpoint') weight += 1.6;

  return Math.max(0.05, weight);
}

function routeProgressRatio(state: GameState): number {
  return clamp(state.base.routeProgress / CONFIG.escapeDistance, 0, 1);
}
