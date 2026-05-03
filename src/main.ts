import {
  type BackgroundId,
  type CombatAction,
  type GameState,
  type GrowthChoiceId,
  type Resources,
  type SiteId,
  BACKGROUNDS,
  CONFIG,
  GROWTH_CHOICES,
  SITES,
  advanceRoute,
  canFieldPatch,
  canUseCombatAction,
  chooseBackground,
  chooseGrowth,
  combatLabels,
  cookMeal,
  defenseCost,
  endDay,
  fieldPatchUp,
  getAvailableSites,
  getBackground,
  getCombatPreview,
  getRetreatPreview,
  getSite,
  getSiteProfile,
  infirmaryCost,
  initialState,
  repairWeapon,
  reinforceDefense,
  resourceText,
  resolveEventOption,
  restart,
  retreat,
  returnToBase,
  startExploration,
  stepCombat,
  treatWounds,
  upgradeInfirmary,
  weaponRepairCost
} from './game.js';

let state = initialState();
const root = document.getElementById('app');
if (!root) throw new Error('app not found');
const app = root;

const backgroundKeys: Record<BackgroundId, string> = { guard: '1', mechanic: '2', medic: '3' };
const growthKeys: Record<GrowthChoiceId, string> = { melee: '1', firearms: '2', fieldcraft: '3' };

function draw() {
  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="eyebrow">POST-COLLAPSE FIELD LOG</div>
        <h1>レトロ終末戦闘研究所</h1>
      </div>
      <div class="result ${state.result}">
        ${state.result === 'ongoing' ? `${state.base.routeProgress}/${CONFIG.escapeDistance}km` : resultText()}
      </div>
    </header>

    <main class="layout">
      <section class="left-stack">
        ${renderBasePanel()}
        ${renderScenePanel()}
        ${renderPhasePanel()}
      </section>
      <aside class="right-stack">
        ${renderPlayerPanel()}
        ${renderHaulPanel()}
        ${renderLogs()}
      </aside>
    </main>
  `;

  wireButtons();
  drawScene();
}

function renderBasePanel(): string {
  const base = state.base;
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>避難車</h2>
        <span class="badge">${state.condition.name} / ${base.day}日目 / 夜の食料: ${CONFIG.nightFoodCost}</span>
      </div>
      <div class="stat-grid">
        ${stat('進行', `${base.routeProgress}km`, `北丘送信塔まで${CONFIG.escapeDistance - base.routeProgress}km。車を進めて勝利へ近づく。`)}
        ${stat('食料', base.food, '夜を越す。食事でHPと士気を戻す。')}
        ${stat('燃料', base.fuel, '日没後の移動と手動走行に必要。切れると足止めが痛い。')}
        ${stat('資材', base.materials, '車体補強、救護棚、武器整備、応急手当に使う。')}
        ${stat('薬品', base.medicine, '治療と救護棚整理に使う。')}
        ${stat('弾薬', base.ammo, '銃撃に使う。距離を安全に保つための資源。')}
        ${stat('車体', base.defense, '探索遭遇率を少し抑え、夜間走行距離も伸ばす。')}
        ${stat('士気', base.morale, '撤退や飢えで下がり、0で崩壊。')}
        ${stat('救護棚', base.infirmaryLevel, '治療と戦闘中の休息を強化。')}
        ${stat('時間', `${base.timeLeft}h`, '探索で消費する日中の残り時間。0に近いほど帰還判断が重要。')}
      </div>
      <p class="small-note">${state.condition.description}</p>
    </section>
  `;
}

function renderScenePanel(): string {
  const title = state.phase === 'combat'
    ? `接敵 ${state.combat?.enemies.length ?? 0}体`
    : state.phase === 'aftermath'
      ? '帰還判断'
      : state.phase === 'setup'
        ? '誰が外へ出る？'
        : '北丘送信塔への道';
  return `
    <section class="panel scene-panel">
      <div class="panel-head">
        <h2>${title}</h2>
        <span class="badge">${phaseText()}</span>
      </div>
      <canvas id="scene" width="960" height="280"></canvas>
    </section>
  `;
}

function renderPhasePanel(): string {
  if (state.phase === 'ended') {
    return `
      <section class="panel command-panel">
        <h2>${state.result === 'victory' ? '救援信号' : '崩壊'}</h2>
        <p class="summary">${state.resultReason}</p>
        <div class="commands"><button data-action="restart">${buttonText('X', '最初から')}</button></div>
      </section>
    `;
  }

  if (state.phase === 'setup') {
    return `
      <section class="panel command-panel">
        <div class="panel-head">
          <h2>経歴を選ぶ</h2>
          <span class="badge">キャラビルド</span>
        </div>
        <p class="summary">同じ食料・資材・薬品でも、誰が使うかで価値が変わります。探索者の過去を選んでください。</p>
        <div class="site-grid">
          ${BACKGROUNDS.map((background) => `
            <article class="site-card">
              <div class="site-title">
                <strong>${background.name}</strong>
                <span class="danger-pips">${backgroundKeys[background.id]}</span>
              </div>
              <p>${background.description}</p>
              <div class="hint">${background.perk}</div>
              <button data-action="background" data-background="${background.id}">${buttonText(backgroundKeys[background.id], '選択')}</button>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (state.phase === 'event' && state.event) {
    return `
      <section class="panel command-panel">
        <div class="panel-head">
          <h2>${state.event.title}</h2>
          <span class="badge">選択イベント</span>
        </div>
        <p class="summary">${state.event.description}</p>
        <div class="event-grid">
          ${state.event.choices.map((choice, index) => `
            <button data-action="event" data-choice="${choice.id}">
              ${buttonText(String(index + 1), choice.label)}
              <small>${choice.detail}</small>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (state.phase === 'growth') {
    return `
      <section class="panel command-panel">
        <div class="panel-head">
          <h2>成長方針</h2>
          <span class="badge">Lv ${state.growth.level}</span>
        </div>
        <p class="summary">探索者が経験を得ました。これからの生存方針を1つ伸ばしてください。</p>
        <div class="site-grid">
          ${GROWTH_CHOICES.map((choice) => `
            <article class="site-card">
              <div class="site-title">
                <strong>${choice.name}</strong>
                <span class="danger-pips">Rank ${state.growth.perks[choice.id]}</span>
              </div>
              <p>${choice.description}</p>
              <div class="hint">${choice.effect}</div>
              <button data-action="growth" data-growth="${choice.id}">${buttonText(growthKeys[choice.id], '伸ばす')}</button>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (state.phase === 'combat' && state.combat) {
    const retreatPreview = getRetreatPreview(state);
    return `
      <section class="panel command-panel">
        <div class="panel-head">
          <h2>戦闘</h2>
          <span class="badge">標的: 先頭 / 距離 ${state.combat.distance} / Turn ${state.combat.turn}</span>
        </div>
        <div class="enemy-list">
          ${state.combat.enemies.map((enemy, index) => `
            <div class="enemy-row ${index === 0 ? 'target' : ''}">
              <strong>${index === 0 ? '標的 ' : ''}${enemy.name}</strong>
              <span>HP ${Math.max(0, enemy.hp)}/${enemy.maxHp}</span>
              <span>${behaviorText(enemy.behavior)} / ${enemy.modifierName}</span>
            </div>
          `).join('')}
        </div>
        <div class="commands">
          ${combatButton('attack')}
          ${combatButton('heavy')}
          ${combatButton('shoot')}
          ${combatButton('throwStone')}
          ${combatButton('guard')}
          ${combatButton('stepBack')}
          ${combatButton('rest')}
          <button class="danger" data-action="retreat">
            ${buttonText('T', '撤退')}
            ${retreatPreview ? `<small>予想 HP-${retreatPreview.hpLoss} / 士気-${retreatPreview.moraleLoss}<br>荷物 ${retreatPreview.haulKeepPercent}%保持</small>` : ''}
          </button>
        </div>
      </section>
    `;
  }

  if (state.phase === 'aftermath') {
    const previousSite = state.lastSiteId ? getSite(state.lastSiteId) : SITES[0];
    const canRevisit = state.base.timeLeft >= previousSite.timeCost;
    const patchDisabled = canFieldPatch(state) ? '' : 'disabled';
    return `
      <section class="panel command-panel">
        <h2>帰還判断</h2>
        <p class="summary">荷物はまだ安全ではありません。さらに漁るほど探索深度が上がり、希少品も出やすくなりますが、脅威も濃くなります。</p>
        <div class="commands">
          <button data-action="explore" data-site="${previousSite.id}" ${canRevisit ? '' : 'disabled'}>${buttonText('C', `さらに漁る: ${previousSite.name} (${previousSite.timeCost}h)`)}</button>
          <button data-action="field-patch" ${patchDisabled}>${buttonText('H', `応急手当 (資材${CONFIG.fieldPatchMaterialCost} / ${CONFIG.fieldPatchTimeCost}h)`)}</button>
          <button data-action="return">${buttonText('Enter', '車へ戻る')}</button>
        </div>
        ${renderSites(true)}
      </section>
    `;
  }

  return `
    <section class="panel command-panel">
      <div class="panel-head">
        <h2>朝の判断</h2>
        <span class="badge">送信塔まで残り${CONFIG.escapeDistance - state.base.routeProgress}km</span>
      </div>
      ${renderSites(false)}
      <div class="base-actions">
        <button data-action="reinforce">${buttonText('Q', `車体補強 (資材${defenseCost(state)})`)}</button>
        <button data-action="repair">${buttonText('V', `武器整備 (資材${weaponRepairCost(state)})`)}</button>
        <button data-action="infirmary">${buttonText('W', `救護棚整理 (資材${infirmaryCost(state)} + 薬品1)`)}</button>
        <button data-action="treat">${buttonText('E', '治療 (薬品1)')}</button>
        <button data-action="meal">${buttonText('F', '食事 (食料1)')}</button>
        <button data-action="advance">${buttonText('M', `車を進める (燃料${CONFIG.travelFuelCost} / 食料${CONFIG.travelFoodCost} / ${CONFIG.travelTimeCost}h)`)}</button>
        <button data-action="end-day">${buttonText('D', '日を終える')}</button>
        <button data-action="restart">${buttonText('X', '最初から')}</button>
      </div>
    </section>
  `;
}

function renderSites(compact: boolean): string {
  const sites = getAvailableSites(state);
  return `
    <div class="site-grid ${compact ? 'compact' : ''}">
      ${sites.map((site, index) => `
        ${renderSiteCard(site.id, compact, index)}
      `).join('')}
    </div>
  `;
}

function renderSiteCard(siteId: SiteId, compact: boolean, index: number): string {
  const site = getSite(siteId);
  const profile = getSiteProfile(state, siteId);
  const tags = [profile.conditionName, ...profile.tags.map((tag) => tag.name)].filter(Boolean).slice(0, 2).join(' / ');
  const key = String(index + 1);
  return `
        <article class="site-card">
          <div class="site-title">
            <strong>${site.name}</strong>
            <span class="danger-pips">${'!'.repeat(profile.danger)}</span>
          </div>
          ${compact ? '' : `<p>${site.description}</p>`}
          <div class="hint">${site.rewardHint}${tags ? ` / ${tags}` : ''}</div>
          <div class="site-meta">
            <span>時間 ${profile.timeCost}h</span>
            <span>接敵距離 ${profile.distanceRange[0]}-${profile.distanceRange[1]}</span>
            <span>見返り x${profile.rewardMultiplier.toFixed(2)} / 希少 ${Math.round(profile.rareChance * 100)}%</span>
          </div>
          <button data-action="explore" data-site="${site.id}" ${state.base.timeLeft >= profile.timeCost ? '' : 'disabled'}>${buttonText(key, compact ? `行く (${profile.timeCost}h)` : `探索 (${profile.timeCost}h)`)}</button>
        </article>
  `;
}

function renderPlayerPanel(): string {
  const player = state.player;
  const status = [
    player.bleedTurns > 0 ? '出血' : '',
    player.guardActive ? 'ガード' : '',
    player.focusTurns > 0 ? '集中' : ''
  ].filter(Boolean).join(' / ') || '安定';

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>探索者</h2>
        <span class="badge">${status}</span>
      </div>
      ${meter('HP', player.hp, player.maxHp)}
      ${meter('STA', player.stamina, player.maxStamina)}
      <div class="small-note">${state.backgroundId ? getBackground(state.backgroundId).name : '経歴未選択'} / Lv ${state.growth.level} / EXP ${state.growth.xp}/${state.growth.nextXp}</div>
      <div class="small-note">攻撃 ${player.attack} / 知性 ${player.intellect} / 近接R${state.growth.perks.melee} / 銃器R${state.growth.perks.firearms} / 野外R${state.growth.perks.fieldcraft}</div>
      <div class="equipment-line">武器: ${state.weapon.name} ${state.weapon.condition}/${state.weapon.maxCondition}</div>
    </section>
  `;
}

function renderHaulPanel(): string {
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>フィールドパック</h2>
        <span class="badge">${state.phase === 'aftermath' ? '未帰還' : '安全'}</span>
      </div>
      <div class="haul-row">${resourcePills(state.haul)}</div>
      <p class="small-note">帰還するまで車内の安全な物資にはなりません。</p>
    </section>
  `;
}

function renderLogs(): string {
  return `
    <section class="panel logs-panel">
      <h2>日誌</h2>
      <div class="log">${state.journal.map((entry) => `<div>${entry}</div>`).join('')}</div>
      <h2>戦闘ログ</h2>
      <div class="log combat-log">${state.combatLog.length ? state.combatLog.map((entry) => `<div>${entry}</div>`).join('') : '<div>接敵なし。</div>'}</div>
    </section>
  `;
}

function wireButtons() {
  document.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.action;
      const siteId = button.dataset.site as SiteId | undefined;
      const backgroundId = button.dataset.background as BackgroundId | undefined;
      const growthId = button.dataset.growth as GrowthChoiceId | undefined;
      const choiceId = button.dataset.choice;
      performAction(action, siteId, backgroundId, choiceId, growthId);
    };
  });
}

function performAction(action: string | undefined, siteId?: SiteId, backgroundId?: BackgroundId, choiceId?: string, growthId?: GrowthChoiceId) {
  if (!action) return;
  if (action === 'background' && backgroundId) state = chooseBackground(state, backgroundId);
  if (action === 'event' && choiceId) state = resolveEventOption(state, choiceId as 'safe' | 'tools' | 'bold' | 'special');
  if (action === 'growth' && growthId) state = chooseGrowth(state, growthId);
  if (action === 'explore' && siteId) state = startExploration(state, siteId, Math.random);
  if (action === 'return') state = returnToBase(state);
  if (action === 'field-patch') state = fieldPatchUp(state);
  if (action === 'advance') state = advanceRoute(state, Math.random);
  if (action === 'end-day') state = endDay(state, Math.random);
  if (action === 'reinforce') state = reinforceDefense(state);
  if (action === 'repair') state = repairWeapon(state);
  if (action === 'infirmary') state = upgradeInfirmary(state);
  if (action === 'treat') state = treatWounds(state);
  if (action === 'meal') state = cookMeal(state);
  if (action === 'retreat') state = retreat(state);
  if (action === 'restart') state = restart();
  if (action.startsWith('combat:')) state = stepCombat(state, action.replace('combat:', '') as CombatAction, Math.random);
  draw();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

  const key = event.key.toLowerCase();
  const backgroundByKey = BACKGROUNDS.find((background) => backgroundKeys[background.id] === key);
  if (backgroundByKey && state.phase === 'setup') {
    event.preventDefault();
    performAction('background', undefined, backgroundByKey.id);
    return;
  }

  const siteByKey = getAvailableSites(state)[Number(key) - 1];
  if (siteByKey && (state.phase === 'base' || state.phase === 'aftermath')) {
    event.preventDefault();
    performAction('explore', siteByKey.id);
    return;
  }

  if (state.phase === 'base') {
    const baseKeys: Record<string, string> = {
      q: 'reinforce',
      v: 'repair',
      w: 'infirmary',
      e: 'treat',
      f: 'meal',
      m: 'advance',
      d: 'end-day',
      x: 'restart'
    };
    if (baseKeys[key]) {
      event.preventDefault();
      performAction(baseKeys[key]);
    }
    return;
  }

  if (state.phase === 'combat') {
    const combatKeys: Record<string, string> = {
      a: 'combat:attack',
      s: 'combat:heavy',
      f: 'combat:shoot',
      l: 'combat:throwStone',
      g: 'combat:guard',
      b: 'combat:stepBack',
      r: 'combat:rest',
      t: 'retreat'
    };
    if (combatKeys[key]) {
      event.preventDefault();
      performAction(combatKeys[key]);
    }
    return;
  }

  if (state.phase === 'event') {
    const choiceKeys: Record<string, string> = {
      '1': 'safe',
      '2': 'tools',
      '3': 'bold',
      '4': 'special'
    };
    if (choiceKeys[key]) {
      event.preventDefault();
      performAction('event', undefined, undefined, choiceKeys[key]);
    }
    return;
  }

  if (state.phase === 'growth') {
    const growthByKey = GROWTH_CHOICES.find((choice) => growthKeys[choice.id] === key);
    if (growthByKey) {
      event.preventDefault();
      performAction('growth', undefined, undefined, undefined, growthByKey.id);
    }
    return;
  }

  if (state.phase === 'aftermath') {
    if (key === 'enter') {
      event.preventDefault();
      performAction('return');
      return;
    }
    if (key === 'c' && state.lastSiteId) {
      event.preventDefault();
      performAction('explore', state.lastSiteId);
      return;
    }
    if (key === 'h') {
      event.preventDefault();
      performAction('field-patch');
    }
    return;
  }

  if (state.phase === 'ended' && key === 'x') {
    event.preventDefault();
    performAction('restart');
  }
}

function drawScene() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSky(ctx);
  drawGround(ctx);

  if (state.phase === 'combat' && state.combat) {
    drawCombat(ctx, state);
  } else {
    drawBase(ctx, state);
  }
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
  const progressRatio = game.base.routeProgress / CONFIG.escapeDistance;
  const vx = 132 + Math.round(540 * progressRatio);
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
  ctx.fillStyle = '#f4d35e';
  ctx.fillText(`${game.base.day}日目: 送信塔まで ${CONFIG.escapeDistance - game.base.routeProgress}km`, 92, 72);
  ctx.fillText(`荷物: ${resourceText(game.haul)}`, 92, 96);
  ctx.fillText(`現場: 深度${game.expeditionDepth} / 脅威${game.threat}  武器: ${game.weapon.condition}/${game.weapon.maxCondition}`, 92, 120);
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
    ctx.fillText(String(distance), tx - 3, 238);
  }
  game.combat.enemies.forEach((enemy, index) => {
    const ex = 330 + game.combat!.distance * 86 + index * 38;
    ctx.fillStyle = index === 0 ? '#ff6b6b' : '#d95d65';
    ctx.fillRect(ex, y - 46, 34, 46);
    ctx.fillRect(ex + 9, y - 68, 16, 22);
    ctx.fillStyle = '#f4d35e';
    ctx.fillText(`${Math.max(0, enemy.hp)}`, ex + 3, y - 76);
  });
  const leadEnemyX = 330 + game.combat.distance * 86;
  ctx.strokeStyle = '#f4d35e';
  ctx.beginPath();
  ctx.moveTo(px + 16, 218);
  ctx.lineTo(leadEnemyX + 17, 218);
  ctx.stroke();
  ctx.fillStyle = '#d7f3ff';
  ctx.fillText(`距離 ${game.combat.distance} / 敵 ${game.combat.enemies.length}`, (px + leadEnemyX) / 2 - 48, 236);
}

function stat(label: string, value: number | string, title: string): string {
  return `<div class="stat" title="${title}"><span>${label}</span><strong>${value}</strong></div>`;
}

function meter(label: string, value: number, max: number): string {
  const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return `
    <div class="meter-row">
      <div class="meter-label"><span>${label}</span><strong>${value}/${max}</strong></div>
      <div class="meter"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function combatButton(action: CombatAction): string {
  const disabled = canUseCombatAction(state, action) ? '' : 'disabled';
  const preview = getCombatPreview(state, action);
  const previewText = preview ? `<small>${preview.hitPercent}% / ${preview.damageMin}-${preview.damageMax} dmg<br>${preview.note}</small>` : '';
  return `<button data-action="combat:${action}" ${disabled}>${buttonText(combatKey(action), `${combatLabels[action]} (${CONFIG.combatCosts[action]})`)}${previewText}</button>`;
}

function combatKey(action: CombatAction): string {
  if (action === 'attack') return 'A';
  if (action === 'heavy') return 'S';
  if (action === 'shoot') return 'F';
  if (action === 'throwStone') return 'L';
  if (action === 'guard') return 'G';
  if (action === 'stepBack') return 'B';
  return 'R';
}

function resourcePills(resources: Resources): string {
  return `
    <span>食料 ${resources.food}</span>
    <span>資材 ${resources.materials}</span>
    <span>薬品 ${resources.medicine}</span>
    <span>弾薬 ${resources.ammo}</span>
    <span>燃料 ${resources.fuel}</span>
  `;
}

function phaseText(): string {
  if (state.phase === 'setup') return '経歴選択';
  if (state.phase === 'base') return '車内';
  if (state.phase === 'combat') return '接敵';
  if (state.phase === 'aftermath') return '帰還判断';
  if (state.phase === 'growth') return '成長';
  return state.result === 'victory' ? '生存' : '喪失';
}

function resultText(): string {
  return state.result === 'victory' ? '勝利' : '敗北';
}

function behaviorText(behavior: string): string {
  if (behavior === 'brute') return '強襲';
  if (behavior === 'skittish') return '臆病';
  return '追跡';
}

function buttonText(key: string, label: string): string {
  return `<span class="button-label"><kbd>${key}</kbd><span>${label}</span></span>`;
}

window.addEventListener('keydown', handleKeydown);
draw();
