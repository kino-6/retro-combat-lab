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
  canUseCombatAction,
  chooseBackground,
  chooseGrowth,
  combatLabels,
  cookMeal,
  defenseCost,
  endDay,
  getBackground,
  getCombatPreview,
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

const siteKeys: Record<SiteId, string> = { store: '1', clinic: '2', road: '3' };
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
        ${state.result === 'ongoing' ? `${state.base.day}日目/${CONFIG.maxDay}` : resultText()}
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
        ${renderResourceUsePanel()}
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
        <h2>拠点</h2>
        <span class="badge">${state.condition.name} / 夜の食料: ${CONFIG.nightFoodCost}</span>
      </div>
      <div class="stat-grid">
        ${stat('食料', base.food, '夜を越す。食事でHPと士気を戻す。')}
        ${stat('資材', base.materials, '防衛、診療所、武器整備に使う。')}
        ${stat('薬品', base.medicine, '治療、診療所改善に使う。')}
        ${stat('弾薬', base.ammo, '銃撃に使う。距離を安全に保つための資源。')}
        ${stat('防衛', base.defense, '夜の士気低下と探索遭遇率を少し抑える。')}
        ${stat('士気', base.morale, '撤退や飢えで下がり、0で崩壊。')}
        ${stat('診療所', base.infirmaryLevel, '治療と戦闘中の休息を強化。')}
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
        : '拠点の門';
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
          ${combatButton('guard')}
          ${combatButton('stepBack')}
          ${combatButton('rest')}
          <button class="danger" data-action="retreat">${buttonText('T', '撤退')}</button>
        </div>
      </section>
    `;
  }

  if (state.phase === 'aftermath') {
    const previousSite = state.lastSiteId ? getSite(state.lastSiteId) : SITES[0];
    const canRevisit = state.base.timeLeft >= previousSite.timeCost;
    return `
      <section class="panel command-panel">
        <h2>帰還判断</h2>
        <p class="summary">荷物はまだ安全ではありません。残り時間を使ってさらに漁るか、拠点へ戻って資源を確定します。</p>
        <div class="commands">
          <button data-action="explore" data-site="${previousSite.id}" ${canRevisit ? '' : 'disabled'}>${buttonText('C', `${previousSite.name}を再探索 (${previousSite.timeCost}h)`)}</button>
          <button data-action="return">${buttonText('Enter', '拠点へ戻る')}</button>
        </div>
        ${renderSites(true)}
      </section>
    `;
  }

  return `
    <section class="panel command-panel">
      <div class="panel-head">
        <h2>朝の判断</h2>
        <span class="badge">${CONFIG.maxDay}日目まで生存</span>
      </div>
      ${renderSites(false)}
      <div class="base-actions">
        <button data-action="reinforce">${buttonText('Q', `門を補強 (資材${defenseCost(state)})`)}</button>
        <button data-action="repair">${buttonText('V', `武器整備 (資材${weaponRepairCost(state)})`)}</button>
        <button data-action="infirmary">${buttonText('W', `診療所改善 (資材${infirmaryCost(state)} + 薬品1)`)}</button>
        <button data-action="treat">${buttonText('E', '治療 (薬品1)')}</button>
        <button data-action="meal">${buttonText('F', '食事 (食料1)')}</button>
        <button data-action="end-day">${buttonText('D', '日を終える')}</button>
        <button data-action="restart">${buttonText('X', '最初から')}</button>
      </div>
    </section>
  `;
}

function renderSites(compact: boolean): string {
  return `
    <div class="site-grid ${compact ? 'compact' : ''}">
      ${SITES.map((site) => `
        ${renderSiteCard(site.id, compact)}
      `).join('')}
    </div>
  `;
}

function renderSiteCard(siteId: SiteId, compact: boolean): string {
  const site = getSite(siteId);
  const profile = getSiteProfile(state, siteId);
  const conditionBadge = profile.conditionName ? `<span class="badge mini">${profile.conditionName}</span>` : '';
  const tagBadges = profile.tags.map((tag) => `<span class="badge mini" title="${tag.description}">${tag.name}</span>`).join('');
  return `
        <article class="site-card">
          <div class="site-title">
            <strong>${site.name}</strong>
            <span class="danger-pips">${'!'.repeat(profile.danger)}</span>
          </div>
          <p>${site.description}</p>
          <div class="hint">${site.rewardHint} ${conditionBadge}${tagBadges}</div>
          <div class="site-meta">
            <span>見返り x${profile.rewardMultiplier.toFixed(2)}</span>
            <span>希少 ${Math.round(profile.rareChance * 100)}%</span>
            <span>敵数 ${encounterCountHint(profile.danger)}</span>
            <span>時間 ${profile.timeCost}h</span>
            <span>接敵距離 ${profile.distanceRange[0]}-${profile.distanceRange[1]}</span>
            <span>${site.rareHint}</span>
          </div>
          <button data-action="explore" data-site="${site.id}" ${state.base.timeLeft >= profile.timeCost ? '' : 'disabled'}>${buttonText(siteKeys[site.id], compact ? `行く (${profile.timeCost}h)` : `探索 (${profile.timeCost}h)`)}</button>
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

function renderResourceUsePanel(): string {
  return `
    <section class="panel">
      <h2>資源の価値</h2>
      <div class="resource-help">
        <div><strong>食料</strong><span>夜を越す。食事でHPと士気を戻す。</span></div>
        <div><strong>資材</strong><span>門、防衛、武器整備。近接戦闘力にも直結。</span></div>
        <div><strong>薬品</strong><span>負傷を戻す。診療所で回復効率が伸びる。</span></div>
        <div><strong>弾薬</strong><span>銃撃で消費。距離を保つほど価値が高い。</span></div>
      </div>
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
      <p class="small-note">帰還するまで拠点資源にはなりません。</p>
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

  const siteByKey = SITES.find((site) => siteKeys[site.id] === key);
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
  ctx.fillStyle = '#7bdff2';
  ctx.fillRect(132, 136, 170 + game.base.defense * 12, 66);
  ctx.fillStyle = '#172033';
  ctx.fillRect(146, 150, 52, 52);
  ctx.fillRect(226, 160, 42, 42);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(174, 116, 10, 20);
  ctx.fillRect(176, 110, 6, 6);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(620, 160, 34, 44);
  ctx.fillStyle = '#f4d35e';
  ctx.fillText(`${game.base.day}日目: ${phaseText()}`, 92, 72);
  ctx.fillText(`荷物: ${resourceText(game.haul)}`, 92, 96);
  ctx.fillText(`武器状態: ${game.weapon.condition}/${game.weapon.maxCondition}`, 92, 120);
}

function drawCombat(ctx: CanvasRenderingContext2D, game: GameState) {
  if (!game.combat) return;
  const px = 210;
  const y = 178;

  ctx.fillStyle = '#64dfdf';
  ctx.fillRect(px, y - 38, 32, 38);
  ctx.fillRect(px + 8, y - 58, 16, 18);
  game.combat.enemies.forEach((enemy, index) => {
    const ex = 760 - game.combat!.distance * 118 + index * 42;
    ctx.fillStyle = index === 0 ? '#ff6b6b' : '#d95d65';
    ctx.fillRect(ex, y - 46, 34, 46);
    ctx.fillRect(ex + 9, y - 68, 16, 22);
    ctx.fillStyle = '#f4d35e';
    ctx.fillText(`${Math.max(0, enemy.hp)}`, ex + 3, y - 76);
  });
  const leadEnemyX = 760 - game.combat.distance * 118;
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
  `;
}

function phaseText(): string {
  if (state.phase === 'setup') return '経歴選択';
  if (state.phase === 'base') return '拠点';
  if (state.phase === 'combat') return '接敵';
  if (state.phase === 'aftermath') return '帰還判断';
  if (state.phase === 'growth') return '成長';
  return state.result === 'victory' ? '生存' : '喪失';
}

function encounterCountHint(danger: number): string {
  if (danger === 1) return '1-2';
  if (danger === 2) return '1-3';
  return '2-3';
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
