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
  continueCombatResult,
  cookMeal,
  breachRouteBlockade,
  defenseCost,
  detourRouteBlockade,
  endDay,
  fieldPatchUp,
  getAvailableSites,
  getBackground,
  getCombatPreview,
  getForecastSites,
  getRelic,
  getRouteStage,
  getRetreatPreview,
  getSite,
  getSiteProfile,
  infirmaryCost,
  initialState,
  repairWeapon,
  reinforceDefense,
  resolveEventOption,
  restart,
  retreat,
  returnToBase,
  startExploration,
  startRouteBlockadeCombat,
  stepCombat,
  treatWounds,
  upgradeInfirmary,
  weaponRepairCost
} from './game.js';
import { clearPortraitOverride, drawPortraitCanvas, drawPortraitPreviewCanvas, drawSceneCanvas, storePortraitOverride } from './sceneRenderer.js';

let state = initialState();
const root = document.getElementById('app');
if (!root) throw new Error('app not found');
const app = root;

const backgroundKeys: Record<BackgroundId, string> = { guard: '1', mechanic: '2', medic: '3', courier: '4', hunter: '5', teacher: '6' };
const growthKeys: Record<GrowthChoiceId, string> = { melee: '1', firearms: '2', fieldcraft: '3' };

function draw() {
  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="eyebrow">避難車 走行記録 / ロサンゼルス東縁発</div>
        <h1>北東乾湖退避線への逃避行</h1>
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
        ${renderRiskPanel()}
        ${renderLogs()}
      </aside>
    </main>
  `;

  wireButtons();
  drawScene();
  drawBackgroundPreviews();
  drawPortrait();
}

function renderBasePanel(): string {
  const base = state.base;
  const routeStage = getRouteStage(state);
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>避難車</h2>
        <span class="badge">${state.condition.name} / ${base.day}日目 / 夜の食料: ${CONFIG.nightFoodCost}</span>
      </div>
      <div class="resource-strip">
        ${resourceChip('food', '食料', base.food, '夜を越す。食事でHPと士気を戻す。')}
        ${resourceChip('fuel', '燃料', base.fuel, '日没後の移動と手動走行に必要。')}
        ${resourceChip('materials', '資材', base.materials, '車体補強、救護棚、武器整備、応急手当に使う。')}
        ${resourceChip('medicine', '薬品', base.medicine, '治療と救護棚整理に使う。')}
        ${resourceChip('ammo', '弾薬', base.ammo, 'ハンドガンとショットガンに使う。')}
        ${resourceChip('grenades', '爆発物', base.grenades, '複数敵を崩す非常手段。')}
      </div>
      <div class="stat-grid status-grid">
        ${stat('進行', `${base.routeProgress}km`, `北東乾湖退避線まで${CONFIG.escapeDistance - base.routeProgress}km。車を進めて閉門前に近づく。`)}
        ${stat('車体', base.defense, '探索遭遇率を少し抑え、夜間走行距離も伸ばす。')}
        ${stat('士気', base.morale, '撤退や飢えで下がり、0で崩壊。高いと命中が少し上がり、低いと落ちる。')}
        ${stat('救護棚', base.infirmaryLevel, '治療と戦闘中の休息を強化。')}
        ${stat('時間', `${base.timeLeft}h`, '探索で消費する日中の残り時間。0に近いほど帰還判断が重要。')}
      </div>
      <p class="small-note">${routeStage.name}: ${routeStage.description}</p>
      <p class="small-note">${state.condition.description}</p>
    </section>
  `;
}

function renderScenePanel(): string {
  const title = state.phase === 'combat'
    ? `接敵 ${state.combat?.enemies.length ?? 0}体`
    : state.phase === 'combatResult'
      ? '周囲確認'
    : state.phase === 'aftermath'
      ? '帰還判断'
      : state.phase === 'setup'
        ? '誰が外へ出る？'
        : '北東乾湖退避線への道';
  return `
    <section class="panel scene-panel">
      <div class="panel-head">
        <h2>${title}</h2>
        <span class="badge">${phaseText()}</span>
      </div>
      <canvas id="scene" width="960" height="280"></canvas>
      ${renderMessageWindow()}
    </section>
  `;
}

function renderPhasePanel(): string {
  if (state.phase === 'ended') {
    return `
      <section class="panel command-panel">
        <h2>${state.result === 'victory' ? '退避線' : '崩壊'}</h2>
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
          <span class="badge">乗員記録</span>
        </div>
        <p class="summary">ロサンゼルス東縁の排水路車庫から、北東乾湖退避線まで約${CONFIG.escapeDistance}km。乾いた湖底には給水車、検疫フェンス、仮設滑走路があり、ゲートは${CONFIG.maxDay}日目の夜明けに閉じます。最初に外へ出る探索者を選んでください。</p>
        <div class="site-grid">
          ${BACKGROUNDS.map((background) => `
            <article class="site-card">
              <div class="site-title">
                <strong>${background.name}</strong>
                <span class="danger-pips">${backgroundKeys[background.id]}</span>
              </div>
              <div class="background-preview">
                <canvas data-background-preview="${background.id}" width="160" height="160" aria-label="${background.name}のプレビュー"></canvas>
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
    const eventChoices = state.event.choices.slice(0, 3);
    return `
      <section class="panel command-panel">
        <div class="panel-head">
          <h2>${state.event.title}</h2>
          <span class="badge">選択イベント</span>
        </div>
        <p class="summary">${state.event.description}</p>
        <div class="event-grid">
          ${eventChoices.map((choice, index) => `
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

  if (state.phase === 'combatResult' && state.combatResult) {
    return `
      <section class="panel command-panel result-panel">
        <div class="panel-head">
          <h2>脅威排除</h2>
          <span class="badge">沈黙</span>
        </div>
        <p class="summary">${state.combatResult.message}</p>
        <div class="enemy-list fallen-list">
          ${state.combatResult.defeatedNames.map((name) => `
            <div class="enemy-row fallen">
              <strong>${name}</strong>
              <span>沈黙</span>
            </div>
          `).join('')}
        </div>
        <div class="haul-row compact">${resourcePills(state.combatResult.reward)}</div>
        <div class="commands">
          <button data-action="continue-combat-result">${buttonText('Enter', '周囲を確認')}</button>
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
          ${state.combat.pendingSpawns.map((spawn) => `
            <div class="enemy-row pending">
              <strong>${spawn.enemy.name}</strong>
              <span>起き上がる</span>
              <span>銃声に反応 / 距離 ${spawn.distance}</span>
            </div>
          `).join('')}
        </div>
        <div class="commands">
          ${combatButton('attack')}
          ${combatButton('heavy')}
          ${combatButton('shoot')}
          ${combatButton('shotgun')}
          ${combatButton('grenade')}
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
    const canRevisit = state.base.timeLeft >= previousSite.timeCost && !state.locationProgress[previousSite.id]?.cleared;
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

  if (state.phase === 'base' && state.routeBlockade) return renderRouteBlockadePanel();

  return `
    <section class="panel command-panel">
      <div class="panel-head">
        <h2>朝の判断</h2>
        <span class="badge">退避線まで残り${CONFIG.escapeDistance - state.base.routeProgress}km</span>
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

function renderRouteBlockadePanel(): string {
  const id = state.routeBlockade;
  if (!id) return '';
  const isFinal = id === 'final';
  return `
    <section class="panel command-panel blockade-panel">
      <div class="panel-head">
        <h2>${isFinal ? '退避線前' : '封鎖検問'}</h2>
        <span class="badge danger">${isFinal ? '閉門前' : '封鎖線'}</span>
      </div>
      <p class="summary">${isFinal
        ? '退避線の照明は見えている。ゲート前の群れを抜けなければ、列には入れない。'
        : '古いバリケードと弾薬庫が道を塞いでいる。戦えば大きな物資、迂回すれば安全寄りだが代償は重い。'}</p>
      <div class="commands">
        <button data-action="assault-blockade">${buttonText('K', `${isFinal ? 'ゲートへ抜ける' : '検問を制圧'} (${CONFIG.blockadeAssaultTimeCost}h)`)}</button>
        ${isFinal ? '' : `<button data-action="detour-blockade">${buttonText('O', `迂回 (燃料${CONFIG.checkpointDetourFuelCost} / ${CONFIG.checkpointDetourTimeCost}h)`)}</button>`}
        ${isFinal ? '' : `<button data-action="breach-blockade">${buttonText('P', `爆破突破 (資材${CONFIG.checkpointBreachMaterialCost} / 爆発物1)`)}</button>`}
      </div>
      ${renderSites(true)}
    </section>
  `;
}

function renderSites(compact: boolean): string {
  const sites = getAvailableSites(state);
  if (sites.length === 0) {
    return `<p class="summary">周辺の目ぼしい場所は漁り切った。補修して進むか、日を送って別の道を探すしかない。</p>`;
  }
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
  const progress = state.locationProgress[siteId];
  const routeStage = getRouteStage(state);
  const tags = [routeStage.name, profile.conditionName, ...profile.tags.map((tag) => tag.name)].filter(Boolean).slice(0, 2).join(' / ');
  const key = String(index + 1);
  return `
        <article class="site-card">
          <div class="site-title">
            <strong><span class="site-sign">${siteIcon(site.id)}</span>${site.name}</strong>
            <span class="danger-pips">${'!'.repeat(profile.danger)}</span>
          </div>
          ${compact ? '' : `<p>${site.description}</p>`}
          <div class="hint">${site.rewardHint}${tags ? ` / ${tags}` : ''}</div>
          <div class="site-meta">
            <span>調査 ${progress.progress}/${progress.required}</span>
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
      <div class="portrait-frame">
        <canvas id="portrait" width="160" height="160" aria-label="探索者のドット絵スチル"></canvas>
        <div>
          <strong>${state.backgroundId ? portraitName(state.backgroundId) : '名もない探索者'}</strong>
          <span>${portraitFlavor()}</span>
          ${state.backgroundId ? `
            <div class="portrait-actions">
              <label class="mini-button">
                画像変更
                <input type="file" accept="image/*" data-portrait-upload="${state.backgroundId}" />
              </label>
              <button data-action="clear-portrait">既定に戻す</button>
            </div>
          ` : ''}
        </div>
      </div>
      ${meter('HP', player.hp, player.maxHp)}
      ${meter('STA', player.stamina, player.maxStamina)}
      <div class="small-note">${state.backgroundId ? getBackground(state.backgroundId).name : '経歴未選択'} / Lv ${state.growth.level} / EXP ${state.growth.xp}/${state.growth.nextXp}</div>
      <div class="stat-line"><b>基礎</b><span>攻撃 ${statScore(player.attack)} / 知性 ${statScore(player.intellect)} / 幸運 ${statScore(player.luck)}</span></div>
      <div class="stat-line"><b>技能Lv</b><span>近接 ${skillLevel(state.growth.perks.melee)} / 銃器 ${skillLevel(state.growth.perks.firearms)} / 野外 ${skillLevel(state.growth.perks.fieldcraft)}</span></div>
      <div class="equipment-line">武器: ${state.weapon.name} ${state.weapon.condition}/${state.weapon.maxCondition}</div>
      <div class="relic-row">
        <b>レリック</b>
        <span>${state.relics.length ? state.relics.map((relicId) => {
          const relic = getRelic(relicId);
          return `<em title="${relic.description}">${relic.name}</em>`;
        }).join('') : 'なし'}</span>
      </div>
    </section>
  `;
}

function renderRiskPanel(): string {
  const score = currentRiskScore();
  const lootTotal = resourceTotal(state.haul);
  const retreatPreview = getRetreatPreview(state);
  const inField = state.phase === 'combat' || state.phase === 'combatResult' || state.phase === 'event' || state.phase === 'aftermath';
  const badgeClass = riskBadgeClass(score);
  const routeStage = getRouteStage(state);
  const forecast = getForecastSites(state);
  return `
    <section class="panel risk-panel">
      <div class="panel-head">
        <h2>現場リスク</h2>
        <span class="badge ${badgeClass}">${riskLabel(score)}</span>
      </div>
      <div class="risk-meter" title="深度、脅威、未積載の荷物、HP、接敵状況から見た目安です。">
        <span style="width:${score}%"></span>
      </div>
      <div class="risk-list">
        ${riskRow('道域', routeStage.name, routeStage.description)}
        ${riskRow('深度', String(state.expeditionDepth), '連続して漁るほど報酬と危険が増える')}
        ${riskRow('脅威', String(state.threat), '銃声や深追いで周囲が騒がしくなる')}
        ${riskRow('未積載', String(lootTotal), '車へ戻るまで確定資源ではない')}
        ${state.phase === 'combat' && retreatPreview ? riskRow('撤退', `HP-${retreatPreview.hpLoss} / 士気-${retreatPreview.moraleLoss}`, `荷物 ${retreatPreview.haulKeepPercent}%保持`) : ''}
      </div>
      ${lootTotal > 0
        ? `<div class="risk-loot"><div class="small-note">未積載の荷物</div><div class="haul-row compact">${resourcePills(state.haul)}</div></div>`
        : `<p class="small-note">${inField ? 'まだ抱えている荷物はありません。' : '車内に積載済み。探索中の荷物はありません。'}</p>`}
      ${renderRouteMiniMap(forecast)}
    </section>
  `;
}

function renderRouteMiniMap(forecast: ReturnType<typeof getForecastSites>): string {
  const progress = Math.round((state.base.routeProgress / CONFIG.escapeDistance) * 100);
  const checkpoint = Math.round((CONFIG.checkpointGateKm / CONFIG.escapeDistance) * 100);
  const finalGate = Math.round((CONFIG.finalGateKm / CONFIG.escapeDistance) * 100);
  const forecastLabel = forecast.length ? forecast.map((site) => site.name).join(' / ') : '候補なし';
  const readDepth = state.relics.includes('roadAtlas')
    ? '道路地図で遠めまで読む'
    : state.player.intellect >= 8
      ? '知性で少し先を読む'
      : '近い先だけ読む';
  return `
    <div class="route-minimap">
      <div class="route-map-head">
        <b>ルート</b>
        <span>${state.base.routeProgress}/${CONFIG.escapeDistance}km</span>
      </div>
      <div class="route-track" aria-label="退避線までの進行">
        <span class="route-fill" style="width:${progress}%"></span>
        <i class="route-marker checkpoint" style="left:${checkpoint}%"></i>
        <i class="route-marker final" style="left:${finalGate}%"></i>
      </div>
      <div class="route-map-labels">
        <span>現在</span>
        <span>検問</span>
        <span>退避線</span>
      </div>
      <div class="forecast-box">
        <b>先読み</b>
        <span>${forecastLabel}</span>
        <small>${readDepth}。次に濃くなりそうな候補。</small>
      </div>
    </div>
  `;
}

function renderLogs(): string {
  return `
    <details class="panel logs-panel">
      <summary>履歴ログ</summary>
      <h2>日誌</h2>
      <div class="log">${state.journal.slice(0, 6).map((entry) => `<div>${entry}</div>`).join('')}</div>
      <h2>戦闘ログ</h2>
      <div class="log combat-log">${state.combatLog.length ? state.combatLog.slice(0, 5).map((entry) => `<div>${entry}</div>`).join('') : '<div>接敵なし。</div>'}</div>
    </details>
  `;
}

function renderMessageWindow(): string {
  const messages = recentVisibleMessages();
  return `
    <div class="message-window">
      <div class="message-head">
        <span>${state.phase === 'combat' || state.phase === 'combatResult' ? '戦闘ログ' : 'フィールドログ'}</span>
        <span>${phaseText()}</span>
      </div>
      <div class="message-lines">
        <div>${messages[0] ?? ''}</div>
      </div>
    </div>
  `;
}

function recentVisibleMessages(): string[] {
  if (state.phase === 'combat' && state.combatLog.length > 0) return [state.combatLog[0]];
  if (state.phase === 'combatResult' && state.combatResult) return [state.combatResult.message];
  if (state.phase === 'aftermath' && state.combatLog.length > 0) return [state.journal[0] ?? state.combatLog[0]];
  if (state.phase === 'event' && state.event) return [state.event.description];
  if (state.phase === 'growth') return ['探索者は経験から次の癖を覚えようとしている。'];
  return [state.journal[0] ?? ''];
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
  document.querySelectorAll<HTMLInputElement>('input[data-portrait-upload]').forEach((input) => {
    input.onchange = async () => {
      const backgroundId = input.dataset.portraitUpload as BackgroundId | undefined;
      const file = input.files?.[0];
      if (!backgroundId || !file) return;
      try {
        await storePortraitOverride(backgroundId, file);
        draw();
      } catch {
        state.journal = ['画像を保存できませんでした。小さめのPNG/JPGを試してください。', ...state.journal].slice(0, CONFIG.journalLimit);
        draw();
      }
    };
  });
}

function performAction(action: string | undefined, siteId?: SiteId, backgroundId?: BackgroundId, choiceId?: string, growthId?: GrowthChoiceId) {
  if (!action) return;
  if (action === 'background' && backgroundId) state = chooseBackground(state, backgroundId);
  if (action === 'event' && choiceId) state = resolveEventOption(state, choiceId as 'safe' | 'tools' | 'bold');
  if (action === 'growth' && growthId) state = chooseGrowth(state, growthId);
  if (action === 'explore' && siteId) state = startExploration(state, siteId, Math.random);
  if (action === 'return') state = returnToBase(state);
  if (action === 'field-patch') state = fieldPatchUp(state);
  if (action === 'continue-combat-result') state = continueCombatResult(state);
  if (action === 'assault-blockade') state = startRouteBlockadeCombat(state, Math.random);
  if (action === 'detour-blockade') state = detourRouteBlockade(state);
  if (action === 'breach-blockade') state = breachRouteBlockade(state, Math.random);
  if (action === 'advance') state = advanceRoute(state, Math.random);
  if (action === 'end-day') state = endDay(state, Math.random);
  if (action === 'reinforce') state = reinforceDefense(state);
  if (action === 'repair') state = repairWeapon(state);
  if (action === 'infirmary') state = upgradeInfirmary(state);
  if (action === 'treat') state = treatWounds(state);
  if (action === 'meal') state = cookMeal(state);
  if (action === 'retreat') state = retreat(state);
  if (action === 'restart') state = restart();
  if (action === 'clear-portrait' && state.backgroundId) clearPortraitOverride(state.backgroundId);
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
      k: 'assault-blockade',
      o: 'detour-blockade',
      p: 'breach-blockade',
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
      y: 'combat:shotgun',
      n: 'combat:grenade',
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

  if (state.phase === 'combatResult') {
    if (key === 'enter' || key === ' ') {
      event.preventDefault();
      performAction('continue-combat-result');
    }
    return;
  }

  if (state.phase === 'event') {
    const choiceKeys: Record<string, string> = {
      '1': 'safe',
      '2': 'tools',
      '3': 'bold'
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
  if (!canvas) return;
  drawSceneCanvas(canvas, state);
}

function drawPortrait() {
  const canvas = document.getElementById('portrait') as HTMLCanvasElement | null;
  if (!canvas) return;
  drawPortraitCanvas(canvas, state);
}

function drawBackgroundPreviews() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-background-preview]').forEach((canvas) => {
    const backgroundId = canvas.dataset.backgroundPreview as BackgroundId | undefined;
    if (!backgroundId) return;
    drawPortraitPreviewCanvas(canvas, state, backgroundId);
  });
}

function stat(label: string, value: number | string, title: string): string {
  return `<div class="stat" title="${title}"><span>${label}</span><strong>${value}</strong></div>`;
}

type ResourceIcon = 'food' | 'fuel' | 'materials' | 'medicine' | 'ammo' | 'grenades';

function resourceChip(kind: ResourceIcon, label: string, value: number, title: string): string {
  return `
    <div class="resource-chip" title="${title}">
      ${itemIcon(kind)}
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function itemIcon(kind: ResourceIcon): string {
  return `<i class="item-icon ${kind}" aria-hidden="true">${itemPixels(kind)}</i>`;
}

function itemPixels(kind: ResourceIcon): string {
  const pixels: Record<ResourceIcon, string> = {
    food: '0110 1111 1111 0110',
    fuel: '0110 1110 1110 1111',
    materials: '1100 1110 0111 0011',
    medicine: '0110 1111 1111 0110',
    ammo: '1010 1111 1111 1010',
    grenades: '0110 1111 1110 0100'
  };
  return pixels[kind].split(' ').flatMap((row) => row.split('').map((cell) => `<b class="${cell === '1' ? 'on' : ''}"></b>`)).join('');
}

function siteIcon(siteId: SiteId): string {
  const pixels: Record<SiteId, string> = {
    store: '11110 10010 11110 10110 11110',
    clinic: '01110 01000 11111 01000 01110',
    road: '10001 01010 00100 01010 10001',
    gas: '11100 10110 11110 10010 11110',
    checkpoint: '11111 10101 11111 01010 11011'
  };
  return `<i class="site-icon ${siteId}" aria-hidden="true">${pixels[siteId].split(' ').flatMap((row) => row.split('').map((cell) => `<b class="${cell === '1' ? 'on' : ''}"></b>`)).join('')}</i>`;
}

function meter(label: string, value: number, max: number): string {
  const shownValue = Math.max(0, value);
  const percent = Math.max(0, Math.min(100, Math.round((shownValue / max) * 100)));
  return `
    <div class="meter-row">
      <div class="meter-label"><span>${label}</span><strong>${shownValue}/${max}</strong></div>
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
  if (action === 'shotgun') return 'Y';
  if (action === 'grenade') return 'N';
  if (action === 'throwStone') return 'L';
  if (action === 'guard') return 'G';
  if (action === 'stepBack') return 'B';
  return 'R';
}

function resourcePills(resources: Resources): string {
  const chips = [
    resources.food > 0 ? resourceChip('food', '食料', resources.food, '持ち帰り予定の食料') : '',
    resources.materials > 0 ? resourceChip('materials', '資材', resources.materials, '持ち帰り予定の資材') : '',
    resources.medicine > 0 ? resourceChip('medicine', '薬品', resources.medicine, '持ち帰り予定の薬品') : '',
    resources.ammo > 0 ? resourceChip('ammo', '弾薬', resources.ammo, '持ち帰り予定の弾薬') : '',
    resources.grenades > 0 ? resourceChip('grenades', '爆発物', resources.grenades, '持ち帰り予定の爆発物') : '',
    resources.fuel > 0 ? resourceChip('fuel', '燃料', resources.fuel, '持ち帰り予定の燃料') : ''
  ].filter(Boolean);
  return chips.length ? chips.join('') : '<p class="small-note">なし</p>';
}

function statScore(value: number): string {
  return `${value}/10`;
}

function skillLevel(value: number): string {
  return `${value}/10`;
}

function resourceTotal(resources: Resources): number {
  return resources.food + resources.fuel + resources.materials + resources.medicine + resources.ammo + resources.grenades;
}

function currentRiskScore(): number {
  const depthRisk = Math.min(28, state.expeditionDepth * 9);
  const threatRisk = Math.min(24, state.threat * 5);
  const lootRisk = Math.min(18, resourceTotal(state.haul) * 2);
  const hpRatio = state.player.hp / state.player.maxHp;
  const hpRisk = Math.round(Math.max(0, 1 - hpRatio) * 24);
  const combatRisk = state.phase === 'combat' && state.combat ? 12 + state.combat.enemies.length * 7 : 0;
  const timeRisk = state.base.timeLeft <= 1 && state.phase !== 'base' ? 8 : 0;
  return Math.max(0, Math.min(100, depthRisk + threatRisk + lootRisk + hpRisk + combatRisk + timeRisk));
}

function riskLabel(score: number): string {
  if (score >= 72) return '限界';
  if (score >= 46) return '危険';
  if (score >= 20) return '注意';
  return '平常';
}

function riskBadgeClass(score: number): string {
  if (score >= 72) return 'danger';
  if (score >= 46) return 'warn';
  if (score >= 20) return 'watch';
  return 'safe';
}

function riskRow(label: string, value: string, detail: string): string {
  return `
    <div class="risk-row">
      <span>${label}</span>
      <strong>${value}</strong>
      <em>${detail}</em>
    </div>
  `;
}

function phaseText(): string {
  if (state.phase === 'setup') return '経歴選択';
  if (state.phase === 'base') return '車内';
  if (state.phase === 'combat') return '接敵';
  if (state.phase === 'combatResult') return '沈黙';
  if (state.phase === 'aftermath') return '帰還判断';
  if (state.phase === 'growth') return '成長';
  return state.result === 'victory' ? '生存' : '喪失';
}

function portraitName(backgroundId: BackgroundId): string {
  if (backgroundId === 'courier') return '地図を畳む元配達員';
  if (backgroundId === 'hunter') return '古い銃を抱える元猟師';
  if (backgroundId === 'teacher') return 'ノートを抱える元教師';
  if (backgroundId === 'mechanic') return 'レンチを持つ整備士';
  if (backgroundId === 'medic') return '救護鞄の野外救護員';
  return 'バールを握る元警備員';
}

function portraitFlavor(): string {
  if (!state.backgroundId) return 'まだ誰の物語にもなっていない。';
  if (state.player.hp <= Math.floor(state.player.maxHp * 0.4)) return '顔色が悪い。今日は無理をさせたくない。';
  if (state.phase === 'combat') return '目だけが暗がりを追っている。';
  if (state.base.morale < 35) return '黙ったまま、次の道を見ている。';
  if (state.growth.pending) return '何かを掴みかけている。';
  return 'まだ走れる。そういう顔をしている。';
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
