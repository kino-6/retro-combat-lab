import type { BackgroundId, GameState, SiteId } from './gameTypes.js';
import { CONFIG } from './gameData.js';

type PortraitManifest = Partial<Record<BackgroundId, string>>;
type CachedPortrait = HTMLImageElement | 'loading' | 'error';

const portraitStoragePrefix = 'retro-combat-lab:portrait:';
let portraitManifest: PortraitManifest | null = null;
let portraitManifestRequested = false;
const portraitImageCache = new Map<string, CachedPortrait>();
let latestPortraitCanvas: HTMLCanvasElement | null = null;
let latestPortraitState: GameState | null = null;

export function drawSceneCanvas(canvas: HTMLCanvasElement, state: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.phase === 'combat' && state.combat) {
    drawSiteStill(ctx, state.combat.siteId, 'combat');
    drawCombat(ctx, state);
  } else if (state.phase === 'combatResult' && state.combatResult) {
    drawSiteStill(ctx, state.combatResult.siteId, 'result');
    drawFallenStill(ctx, state.combatResult.defeatedNames.length);
  } else if (state.phase === 'event' && state.event) {
    drawSiteStill(ctx, state.event.siteId, 'event');
  } else if (state.phase === 'aftermath' && state.lastSiteId) {
    drawSiteStill(ctx, state.lastSiteId, 'aftermath');
  } else if (state.routeBlockade) {
    drawSiteStill(ctx, 'checkpoint', 'result');
    drawRouteBlockadeStill(ctx, state.routeBlockade === 'final');
  } else {
    drawBase(ctx, state);
  }
}

export function drawPortraitCanvas(canvas: HTMLCanvasElement, state: GameState) {
  drawPortrait(canvas, state, true);
}

export function drawPortraitPreviewCanvas(canvas: HTMLCanvasElement, state: GameState, backgroundId: BackgroundId) {
  const previewState = structuredClone(state);
  previewState.backgroundId = backgroundId;
  previewState.player.hp = previewState.player.maxHp;
  previewState.phase = 'setup';
  drawPortrait(canvas, previewState, false);
}

function drawPortrait(canvas: HTMLCanvasElement, state: GameState, trackLatest: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (trackLatest) {
    latestPortraitCanvas = canvas;
    latestPortraitState = state;
  }

  const scale = 4;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  px(ctx, 0, 0, 40, 40, '#070a12', scale);
  px(ctx, 1, 1, 38, 38, '#111827', scale);
  px(ctx, 3, 4, 34, 28, '#182033', scale);
  px(ctx, 4, 30, 32, 4, '#0c1322', scale);

  const palette = portraitPalette(state);
  px(ctx, 14, 6, 12, 4, palette.hair, scale);
  px(ctx, 12, 10, 16, 10, palette.skin, scale);
  px(ctx, 12, 9, 4, 4, palette.hair, scale);
  px(ctx, 24, 9, 4, 4, palette.hair, scale);
  px(ctx, 15, 13, 2, 2, '#08111d', scale);
  px(ctx, 23, 13, 2, 2, '#08111d', scale);
  px(ctx, 18, 17, 5, 1, '#8f4c4c', scale);
  px(ctx, 13, 20, 14, 3, palette.shadow, scale);

  px(ctx, 10, 23, 20, 12, palette.coat, scale);
  px(ctx, 13, 23, 14, 4, palette.vest, scale);
  px(ctx, 8, 25, 5, 10, palette.coatDark, scale);
  px(ctx, 27, 25, 5, 10, palette.coatDark, scale);
  px(ctx, 16, 27, 8, 7, '#0b1220', scale);
  px(ctx, 18, 24, 4, 2, palette.badge, scale);

  if (state.backgroundId === 'mechanic') {
    px(ctx, 7, 30, 10, 2, '#b7c0c8', scale);
    px(ctx, 5, 31, 4, 3, '#8391ac', scale);
  } else if (state.backgroundId === 'medic') {
    px(ctx, 27, 23, 5, 7, '#d9f6ff', scale);
    px(ctx, 29, 24, 1, 5, '#ff6b6b', scale);
    px(ctx, 27, 26, 5, 1, '#ff6b6b', scale);
  } else if (state.backgroundId === 'courier') {
    px(ctx, 6, 24, 7, 8, '#b7c0c8', scale);
    px(ctx, 7, 25, 5, 1, '#40506d', scale);
    px(ctx, 7, 28, 5, 1, '#40506d', scale);
  } else if (state.backgroundId === 'hunter') {
    px(ctx, 25, 24, 10, 2, '#8a5a38', scale);
    px(ctx, 31, 22, 2, 7, '#8391ac', scale);
  } else if (state.backgroundId === 'teacher') {
    px(ctx, 7, 24, 8, 7, '#d9f6ff', scale);
    px(ctx, 8, 25, 6, 1, '#40506d', scale);
    px(ctx, 8, 28, 5, 1, '#40506d', scale);
    px(ctx, 27, 24, 5, 8, '#f4d35e', scale);
  } else {
    px(ctx, 28, 24, 2, 10, '#d9f6ff', scale);
    px(ctx, 30, 23, 2, 5, '#8391ac', scale);
  }

  const hpRatio = state.player.hp / state.player.maxHp;
  if (hpRatio < 0.45) {
    px(ctx, 25, 18, 2, 2, '#ff6b6b', scale);
    px(ctx, 9, 26, 2, 3, '#ff6b6b', scale);
  }
  if (state.phase === 'combat') px(ctx, 4, 4, 4, 4, '#f4d35e', scale);
  drawCustomPortraitIfAvailable(canvas, ctx, state);
}

export function storePortraitOverride(backgroundId: BackgroundId, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const src = typeof reader.result === 'string' ? reader.result : '';
        if (!src) {
          reject(new Error('portrait file could not be read'));
          return;
        }
        localStorage.setItem(portraitStorageKey(backgroundId), src);
        portraitImageCache.delete(src);
        redrawLatestPortrait();
        resolve();
      } catch (error) {
        reject(error);
        return;
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('portrait file could not be read'));
    reader.readAsDataURL(file);
  });
}

export function clearPortraitOverride(backgroundId: BackgroundId) {
  localStorage.removeItem(portraitStorageKey(backgroundId));
  portraitImageCache.clear();
  redrawLatestPortrait();
}

function drawCustomPortraitIfAvailable(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.backgroundId) {
    const overrideSrc = getPortraitOverride(state.backgroundId);
    if (overrideSrc && drawPortraitSource(canvas, ctx, state, overrideSrc)) return;
  }

  if (!portraitManifest) {
    requestPortraitManifest(canvas, state);
    return;
  }
  if (!state.backgroundId) return;

  const src = portraitManifest[state.backgroundId]?.trim();
  if (!src) return;

  drawPortraitSource(canvas, ctx, state, src);
}

function drawPortraitSource(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, state: GameState, src: string): boolean {
  const cached = portraitImageCache.get(src);
  if (cached instanceof HTMLImageElement && cached.complete && cached.naturalWidth > 0) {
    drawPortraitImage(ctx, cached, canvas.width, canvas.height);
    return true;
  }
  if (cached === 'loading' || cached === 'error') return false;

  const image = new Image();
  portraitImageCache.set(src, 'loading');
  image.onload = () => {
    portraitImageCache.set(src, image);
    redrawLatestPortrait();
  };
  image.onerror = () => {
    portraitImageCache.set(src, 'error');
  };
  image.src = src;
  return false;
}

function requestPortraitManifest(canvas: HTMLCanvasElement, state: GameState) {
  if (portraitManifestRequested) return;
  portraitManifestRequested = true;
  fetch('assets/portraits/portrait-manifest.json', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() as Promise<PortraitManifest> : {})
    .then((manifest) => {
      portraitManifest = manifest;
      redrawLatestPortrait();
    })
    .catch(() => {
      portraitManifest = {};
    });
}

function redrawLatestPortrait() {
  if (!latestPortraitCanvas || !latestPortraitState) return;
  drawPortraitCanvas(latestPortraitCanvas, latestPortraitState);
}

function getPortraitOverride(backgroundId: BackgroundId): string {
  try {
    return localStorage.getItem(portraitStorageKey(backgroundId)) ?? '';
  } catch {
    return '';
  }
}

function portraitStorageKey(backgroundId: BackgroundId): string {
  return `${portraitStoragePrefix}${backgroundId}`;
}

function drawPortraitImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = Math.max(0, (image.naturalWidth - sw) / 2);
  const sy = Math.max(0, (image.naturalHeight - sh) / 2);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

function drawSky(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#11182a';
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(70 + i * 97, 36 + (i % 3) * 17, 3, 3);
  }
  ctx.fillStyle = '#26334f';
  ctx.fillRect(0, 205, 960, 75);
}

function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#151116';
  ctx.fillRect(0, 230, 960, 50);
  ctx.fillStyle = '#2d2a35';
  for (let x = 0; x < 960; x += 48) {
    ctx.fillRect(x, 242, 26, 4);
  }
}

function drawBase(ctx: CanvasRenderingContext2D, game: GameState) {
  drawSky(ctx);
  drawGround(ctx);
  const progressRatio = game.base.routeProgress / CONFIG.escapeDistance;
  const vx = 132 + Math.round(540 * progressRatio);
  drawRoadStillDetails(ctx, progressRatio);
  ctx.fillStyle = '#7bdff2';
  ctx.fillRect(vx, 146, 180 + game.base.defense * 12, 52);
  ctx.fillRect(vx + 30, 122, 92, 32);
  ctx.fillStyle = '#172033';
  ctx.fillRect(vx + 18, 154, 48, 30);
  ctx.fillRect(vx + 84, 132, 34, 22);
  ctx.fillRect(vx + 128, 156, 44, 28);
  ctx.fillStyle = '#080b12';
  ctx.fillRect(vx + 28, 194, 28, 18);
  ctx.fillRect(vx + 142, 194, 28, 18);
  ctx.fillStyle = '#d7f3ff';
  ctx.fillRect(vx + 74, 142, 18, 8);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(vx + 12, 138, 12, 8);
  ctx.fillRect(vx + 176 + game.base.defense * 12, 158, 8, 10);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(760, 122, 30, 82);
  ctx.fillRect(746, 122, 58, 8);
  ctx.fillStyle = '#40506d';
  ctx.fillRect(132, 218, 660, 4);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(132, 216, Math.round(660 * progressRatio), 8);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(620, 160, 34, 44);
}

function drawRoadStillDetails(ctx: CanvasRenderingContext2D, progressRatio: number) {
  ctx.fillStyle = '#101827';
  ctx.fillRect(80, 118, 120, 88);
  ctx.fillRect(226, 142, 88, 64);
  ctx.fillStyle = '#25344e';
  ctx.fillRect(92, 132, 34, 26);
  ctx.fillRect(146, 132, 34, 26);
  ctx.fillRect(244, 154, 20, 20);
  ctx.fillRect(278, 154, 20, 20);
  ctx.fillStyle = '#ff6b6b';
  if (progressRatio > 0.32) {
    ctx.fillRect(402, 194, 60, 22);
    ctx.fillRect(474, 188, 30, 28);
  }
  if (progressRatio > 0.66) {
    ctx.fillStyle = '#d9f6ff';
    ctx.fillRect(770, 68, 16, 148);
    ctx.fillRect(742, 82, 72, 10);
    ctx.fillRect(760, 56, 36, 12);
  }
}

function drawSiteStill(ctx: CanvasRenderingContext2D, siteId: SiteId, mode: 'event' | 'aftermath' | 'combat' | 'result') {
  drawSky(ctx);
  ctx.fillStyle = siteId === 'road' ? '#171923' : '#11131d';
  ctx.fillRect(0, 184, 960, 96);
  ctx.fillStyle = '#2d2a35';
  for (let x = 0; x < 960; x += 44) ctx.fillRect(x, 240, 24, 4);

  if (siteId === 'store') drawStoreStill(ctx);
  if (siteId === 'clinic') drawClinicStill(ctx);
  if (siteId === 'road') drawRoadSiteStill(ctx);
  if (siteId === 'gas') drawGasStill(ctx);
  if (siteId === 'checkpoint') drawCheckpointStill(ctx);

  if (mode === 'event') drawEventFocus(ctx, siteId);
  if (mode === 'aftermath') drawLootStill(ctx);
  if (mode === 'result') {
    ctx.fillStyle = 'rgba(123, 216, 143, 0.08)';
    ctx.fillRect(0, 0, 960, 280);
    drawLootStill(ctx);
  }
  if (mode === 'combat') {
    ctx.fillStyle = 'rgba(255, 107, 107, 0.08)';
    ctx.fillRect(0, 0, 960, 280);
    drawZombieWarning(ctx);
  }
}

function drawStoreStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#233049';
  ctx.fillRect(120, 92, 280, 112);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(138, 78, 244, 22);
  ctx.fillStyle = '#111827';
  ctx.fillRect(154, 120, 54, 60);
  ctx.fillRect(238, 126, 132, 36);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(250, 136, 18, 12);
  ctx.fillRect(294, 136, 18, 12);
}

function drawClinicStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#d9f6ff';
  ctx.fillRect(128, 92, 250, 110);
  ctx.fillStyle = '#182033';
  ctx.fillRect(150, 122, 54, 58);
  ctx.fillRect(238, 118, 104, 30);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(274, 90, 18, 62);
  ctx.fillRect(250, 112, 66, 18);
  ctx.fillStyle = '#7bd88f';
  ctx.fillRect(420, 150, 74, 42);
}

function drawRoadSiteStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#40506d';
  ctx.fillRect(70, 196, 820, 22);
  ctx.fillStyle = '#f4d35e';
  for (let x = 120; x < 820; x += 82) ctx.fillRect(x, 205, 34, 4);
  ctx.fillStyle = '#7bd88f';
  ctx.fillRect(108, 168, 44, 32);
  ctx.fillRect(690, 154, 84, 42);
  ctx.fillStyle = '#8391ac';
  ctx.fillRect(250, 166, 120, 34);
  ctx.fillRect(280, 148, 50, 24);
}

function drawGasStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#25344e';
  ctx.fillRect(120, 102, 240, 92);
  ctx.fillStyle = '#7bdff2';
  ctx.fillRect(146, 82, 186, 28);
  ctx.fillStyle = '#d9f6ff';
  ctx.fillRect(422, 124, 34, 76);
  ctx.fillRect(492, 124, 34, 76);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(430, 112, 18, 14);
  ctx.fillRect(500, 112, 18, 14);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(620, 178, 34, 22);
}

function drawCheckpointStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#40506d';
  for (let x = 118; x < 400; x += 46) ctx.fillRect(x, 174, 34, 24);
  ctx.fillStyle = '#233049';
  ctx.fillRect(480, 108, 130, 90);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(498, 88, 92, 24);
  ctx.fillStyle = '#d9f6ff';
  ctx.fillRect(636, 88, 12, 112);
  ctx.fillRect(616, 98, 52, 8);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(210, 158, 28, 12);
  ctx.fillRect(250, 158, 28, 12);
}

function drawEventFocus(ctx: CanvasRenderingContext2D, siteId: SiteId) {
  const x = siteId === 'checkpoint' ? 250 : 560;
  ctx.fillStyle = '#0c1322';
  ctx.fillRect(x, 150, 86, 54);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(x + 12, 160, 62, 10);
  ctx.fillRect(x + 20, 176, 46, 16);
}

function drawLootStill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(590, 164, 54, 34);
  ctx.fillStyle = '#0c1322';
  ctx.fillRect(602, 174, 30, 14);
  ctx.fillStyle = '#7bd88f';
  ctx.fillRect(666, 172, 32, 24);
}

function drawFallenStill(ctx: CanvasRenderingContext2D, count: number) {
  const shown = Math.max(1, Math.min(4, count));
  for (let index = 0; index < shown; index += 1) {
    const x = 360 + index * 54;
    const y = 202 - (index % 2) * 8;
    ctx.fillStyle = '#472c35';
    ctx.fillRect(x, y, 40, 10);
    ctx.fillRect(x + 8, y - 8, 20, 12);
    ctx.fillStyle = '#182033';
    ctx.fillRect(x + 4, y + 8, 52, 5);
  }
  ctx.fillStyle = '#7bd88f';
  ctx.fillRect(300, 166, 34, 34);
  ctx.fillRect(344, 178, 42, 22);
}

function drawRouteBlockadeStill(ctx: CanvasRenderingContext2D, final: boolean) {
  ctx.fillStyle = final ? '#d9f6ff' : '#ff6b6b';
  ctx.fillRect(700, 70, 22, 132);
  ctx.fillRect(674, 88, 74, 14);
  ctx.fillRect(688, 56, 46, 16);
  ctx.fillStyle = final ? 'rgba(255, 107, 107, 0.55)' : '#472c35';
  const count = final ? 5 : 3;
  for (let index = 0; index < count; index += 1) {
    const x = 438 + index * 48;
    ctx.fillRect(x, 176 - (index % 2) * 10, 30, 34);
    ctx.fillRect(x + 8, 158 - (index % 2) * 10, 16, 20);
  }
}

function drawZombieWarning(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(74, 58, 58, 8);
  ctx.fillRect(74, 74, 36, 8);
}

function drawCombat(ctx: CanvasRenderingContext2D, game: GameState) {
  if (!game.combat) return;
  const px = 210;
  const y = 178;

  ctx.fillStyle = '#64dfdf';
  ctx.fillRect(px, y - 38, 32, 38);
  ctx.fillRect(px + 8, y - 58, 16, 18);
  ctx.strokeStyle = '#40506d';
  ctx.beginPath();
  ctx.moveTo(330, 222);
  ctx.lineTo(760, 222);
  ctx.stroke();
  ctx.fillStyle = '#8391ac';
  for (let distance = CONFIG.minDistance; distance <= CONFIG.maxDistance; distance += 1) {
    const tx = 330 + distance * 86;
    ctx.fillRect(tx, 216, 2, 12);
  }
  game.combat.enemies.forEach((enemy, index) => {
    const ex = 330 + game.combat!.distance * 86 + index * 38;
    ctx.fillStyle = index === 0 ? '#ff6b6b' : '#d95d65';
    ctx.fillRect(ex, y - 46, 34, 46);
    ctx.fillRect(ex + 9, y - 68, 16, 22);
    drawSmallHpBar(ctx, ex, y - 78, enemy.hp, enemy.maxHp);
  });
  game.combat.pendingSpawns.forEach((spawn, index) => {
    const ex = 330 + spawn.distance * 86 + index * 28;
    const rise = spawn.turns > 0 ? 18 : 8;
    ctx.fillStyle = '#6b2f3f';
    ctx.fillRect(ex, y - 12, 34, 12);
    ctx.fillRect(ex + 8, y - 30 + rise, 18, 24);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(ex + 6, y - 36 + rise, 22, 6);
  });
  const leadEnemyX = 330 + game.combat.distance * 86;
  ctx.strokeStyle = '#f4d35e';
  ctx.beginPath();
  ctx.moveTo(px + 16, 218);
  ctx.lineTo(leadEnemyX + 17, 218);
  ctx.stroke();
}

function drawSmallHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = '#0a111e';
  ctx.fillRect(x, y, 34, 5);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(x, y, Math.round(34 * ratio), 5);
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, scale: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function portraitPalette(state: GameState) {
  if (state.backgroundId === 'courier') {
    return { skin: '#c58f69', hair: '#2f2430', shadow: '#7d4f3f', coat: '#6f6fb0', coatDark: '#3b416f', vest: '#f4d35e', badge: '#7bdff2' };
  }
  if (state.backgroundId === 'hunter') {
    return { skin: '#c99b72', hair: '#4a3324', shadow: '#7b5d4b', coat: '#536f48', coatDark: '#2f4f35', vest: '#2b3524', badge: '#d9f6ff' };
  }
  if (state.backgroundId === 'teacher') {
    return { skin: '#d6a47d', hair: '#2b2635', shadow: '#7b5d4b', coat: '#6f5fa8', coatDark: '#3d365f', vest: '#d9f6ff', badge: '#f4d35e' };
  }
  if (state.backgroundId === 'mechanic') {
    return { skin: '#c99b72', hair: '#2f2430', shadow: '#7b5d4b', coat: '#d08c45', coatDark: '#7a4e2b', vest: '#2f5f7e', badge: '#b7c0c8' };
  }
  if (state.backgroundId === 'medic') {
    return { skin: '#d6a47d', hair: '#3b2a25', shadow: '#8f5f4a', coat: '#5fbf9f', coatDark: '#2f6f62', vest: '#d9f6ff', badge: '#ff6b6b' };
  }
  return { skin: '#c58f69', hair: '#1a1418', shadow: '#7d4f3f', coat: '#4f6f9f', coatDark: '#2a3d66', vest: '#222b3f', badge: '#f4d35e' };
}
