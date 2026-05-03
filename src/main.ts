import { Action, canUseAction, CONFIG, initialState, stepTurn } from './game';

let state = initialState();
const root = document.getElementById('app');
if (!root) throw new Error('app not found');
const app = root;

const labels: Record<Action,string> = {attack:'Attack', heavy:'Heavy Attack', guard:'Guard', stepBack:'Step Back', rest:'Rest'};

function draw() {
  const resultText = state.result === 'ongoing' ? `TURN ${state.turn}` : state.result === 'victory' ? 'VICTORY!' : 'DEFEAT...';
  app.innerHTML = `
  <div class="panel"><strong>RETRO COMBAT LAB</strong> <span class="badge">${resultText}</span></div>
  <div class="canvas-wrap panel"><canvas id="scene" width="940" height="220"></canvas></div>
  <div class="grid">
    <div class="panel">
      <h3>PLAYER</h3>
      <div>HP ${state.player.hp}/${state.player.maxHp}</div>
      <div>STA ${state.player.stamina}/${state.player.maxStamina}</div>
      <div>状態: ${[state.player.bleedTurns>0?'出血':'', state.player.guardActive?'ガード':'', state.player.focusTurns>0?'集中':''].filter(Boolean).join(' ') || 'なし'}</div>
    </div>
    <div class="panel">
      <h3>ENEMY</h3>
      <div>HP ${state.enemy.hp}/${state.enemy.maxHp}</div>
      <div>ATK ${state.enemy.attack}</div>
      <div>傾向: 近距離で攻撃 / 遠距離なら接近</div>
      <div>状態: ${state.enemy.bleedTurns>0?'出血':'なし'}</div>
    </div>
  </div>
  <div class="panel">距離: <strong>${state.distance}</strong> (0=密着, 3=遠距離)
    <div class="commands" id="commands"></div>
  </div>
  <div class="panel"><h3>戦闘ログ</h3><div class="log">${state.logs.map(x=>`<div>• ${x}</div>`).join('')}</div></div>
  <div class="panel footer">操作: 攻撃系は距離が近いほど有効。Guardは次被弾軽減、Step Backは安全だが命中低下、Restは回復だが無防備。</div>`;

  const scene = document.getElementById('scene') as HTMLCanvasElement;
  const ctx = scene.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d18'; ctx.fillRect(0,0,940,220);
    const py = 150; const ey = 150;
    const px = 220; const ex = 760 - state.distance * 140;
    ctx.fillStyle = '#53d7ff'; ctx.fillRect(px, py, 28, 28);
    ctx.fillStyle = '#ff5d7d'; ctx.fillRect(ex, ey, 28, 28);
    ctx.strokeStyle = '#8ad8ff'; ctx.beginPath(); ctx.moveTo(px+14,190); ctx.lineTo(ex+14,190); ctx.stroke();
    ctx.fillStyle = '#c6f7ff'; ctx.fillText(`distance:${state.distance}`, (px+ex)/2 - 30, 205);
  }

  const cmd = document.getElementById('commands');
  if (!cmd) return;
  (Object.keys(labels) as Action[]).forEach((action) => {
    const btn = document.createElement('button');
    btn.textContent = `${labels[action]} (${CONFIG.costs[action]})`;
    btn.disabled = !canUseAction(state, action);
    btn.onclick = () => { state = stepTurn(state, action, Math.random); draw(); };
    cmd.appendChild(btn);
  });
  const restart = document.createElement('button'); restart.textContent = 'Restart'; restart.onclick = ()=>{state=initialState();draw();}; cmd.appendChild(restart);
}

draw();
