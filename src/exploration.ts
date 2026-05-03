import { BOX_TYPES, CONFIG, DAILY_CONDITIONS, SITES, SITE_TAGS } from './gameData.js';
import type {
  BoxType,
  DailyCondition,
  EnemyTemplate,
  GameState,
  SiteId,
  SiteProfile,
  SiteTag
} from './gameTypes.js';
import { clamp, pick, roll } from './gameUtils.js';

export function buildEncounter(site: SiteProfile, day: number, threat: number, rng: () => number): EnemyTemplate[] {
  const countRoll = roll(rng);
  const earlyRelief = day <= 2 ? -0.12 : 0;
  const midSpike = day >= 6 ? 0.08 : 0;
  const dayPressure = clamp((day - 1) * 0.025 + threat * 0.025 + earlyRelief + midSpike, -0.12, 0.34);
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

  if (threat >= 7 && roll(rng) < 0.28) count += 1;
  return Array.from({ length: clamp(count, 1, 4) }, () => pick(site.enemies, rng));
}

export function pickDailyCondition(day: number, rng: () => number): DailyCondition {
  if (day <= 1) return DAILY_CONDITIONS[0];
  return pick(DAILY_CONDITIONS, rng);
}

export function generateSiteTags(day: number, rng: () => number): Record<SiteId, SiteTag[]> {
  const result = emptySiteTags();
  for (const site of SITES) {
    const candidates = SITE_TAGS.filter((tag) => {
      if (tag.allowedSites && !tag.allowedSites.includes(site.id)) return false;
      if (day <= 2 && (tag.id === 'freshTracks' || tag.id === 'tightAlleys')) return false;
      return true;
    });
    const first = pick(candidates, rng);
    result[site.id].push(first);
    const secondChance = day <= 2 ? 0.05 : day >= 6 ? 0.34 : 0.22;
    if (roll(rng) < secondChance) {
      const secondCandidates = candidates.filter((tag) => tag.id !== first.id);
      const second = pick(secondCandidates, rng);
      if (second) result[site.id].push(second);
    }
  }
  return result;
}

export function emptySiteTags(): Record<SiteId, SiteTag[]> {
  return { store: [], clinic: [], road: [], gas: [], checkpoint: [] };
}

export function siteTagsSummary(state: GameState): string {
  const sites = state.availableSiteIds
    .map((siteId) => SITES.find((candidate) => candidate.id === siteId))
    .filter((site) => Boolean(site));
  return `今日の周辺候補: ${sites.map((site) => `${site!.name}=${(state.siteTags[site!.id] ?? []).map((tag) => tag.name).join('+') || '平常'}`).join(' / ')}`;
}

export function rollInitialDistance(site: SiteProfile, rng: () => number): number {
  const min = site.distanceRange[0];
  const max = site.distanceRange[1];
  if (max <= min) return min;
  return clamp(min + Math.floor(roll(rng) * (max - min + 1)), CONFIG.minDistance, CONFIG.maxDistance);
}

export function pickBoxType(siteId: SiteId, rng: () => number): BoxType {
  return pick(BOX_TYPES.filter((box) => !box.allowedSites || box.allowedSites.includes(siteId)), rng);
}
