import { RELICS, CONFIG, SITES } from './gameData.js';
import type { ExplorationSite, GameState, Relic, RelicId } from './gameTypes.js';
import { growthRank } from './characterRules.js';
import { clamp, clone } from './gameUtils.js';
import { generateAvailableSiteIds } from './route.js';

export function getRelic(relicId: RelicId): Relic {
  const relic = RELICS.find((candidate) => candidate.id === relicId);
  if (!relic) throw new Error(`unknown relic: ${relicId}`);
  return relic;
}

export function hasRelic(state: GameState, relicId: RelicId): boolean {
  return state.relics.includes(relicId);
}

export function grantRelic(state: GameState, relicId: RelicId): string {
  if (state.relics.includes(relicId)) return '';
  state.relics.push(relicId);
  const relic = getRelic(relicId);
  return `レリック入手: ${relic.name}。`;
}

export function getForecastSites(state: GameState): ExplorationSite[] {
  const forecast = clone(state);
  const forecastDistance = hasRelic(state, 'roadAtlas')
    ? 52
    : state.player.intellect >= 8
      ? 40
      : 26;
  forecast.base.routeProgress = clamp(forecast.base.routeProgress + forecastDistance + growthRank(state, 'fieldcraft') * 6, 0, CONFIG.escapeDistance);
  forecast.availableSiteIds = generateAvailableSiteIds(forecast, () => 0.62);
  return forecast.availableSiteIds
    .filter((siteId) => !forecast.locationProgress[siteId]?.cleared)
    .map((siteId) => {
      const site = SITES.find((candidate) => candidate.id === siteId);
      if (!site) throw new Error(`unknown site: ${siteId}`);
      return site;
    });
}
