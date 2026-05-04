import type { Resources } from './gameTypes.js';

export function addResources(target: Resources, incoming: Resources) {
  target.food += incoming.food;
  target.materials += incoming.materials;
  target.medicine += incoming.medicine;
  target.ammo += incoming.ammo;
  target.grenades += incoming.grenades;
  target.fuel += incoming.fuel;
}

export function emptyResources(): Resources {
  return { food: 0, materials: 0, medicine: 0, ammo: 0, grenades: 0, fuel: 0 };
}

export function hasAnyResource(resources: Resources): boolean {
  return resourceTotal(resources) > 0;
}

export function resourceTotal(resources: Resources): number {
  return resources.food + resources.materials + resources.medicine + resources.ammo + resources.grenades + resources.fuel;
}

export function resourceText(resources: Resources): string {
  return `食料${resources.food} / 資材${resources.materials} / 薬品${resources.medicine} / 弾薬${resources.ammo} / 爆発物${resources.grenades} / 燃料${resources.fuel}`;
}

export function scaleReward(resources: Resources, scale: number): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * scale)),
    materials: Math.max(0, Math.round(resources.materials * scale)),
    medicine: Math.max(0, Math.round(resources.medicine * scale)),
    ammo: Math.max(0, Math.round(resources.ammo * scale)),
    grenades: Math.max(0, Math.round(resources.grenades * scale)),
    fuel: Math.max(0, Math.round(resources.fuel * scale))
  };
}

export function scaleResourceByType(resources: Resources, scale: Partial<Resources>): Resources {
  return {
    food: Math.max(0, Math.round(resources.food * (scale.food ?? 1))),
    materials: Math.max(0, Math.round(resources.materials * (scale.materials ?? 1))),
    medicine: Math.max(0, Math.round(resources.medicine * (scale.medicine ?? 1))),
    ammo: Math.max(0, Math.round(resources.ammo * (scale.ammo ?? 1))),
    grenades: Math.max(0, Math.round(resources.grenades * (scale.grenades ?? 1))),
    fuel: Math.max(0, Math.round(resources.fuel * (scale.fuel ?? 1)))
  };
}

export function combineResourceScales(scales: Array<Partial<Resources>>): Partial<Resources> {
  const combined: Partial<Resources> = {};
  for (const scale of scales) {
    for (const [key, value] of Object.entries(scale) as Array<[keyof Resources, number]>) {
      combined[key] = (combined[key] ?? 1) * value;
    }
  }
  return combined;
}
