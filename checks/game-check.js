const assert = require('node:assert/strict');
const { initialState, stepTurn } = require('../dist/game.js');

{
  const s = initialState();
  s.player.stamina = 1;
  const n = stepTurn(s, 'rest', () => 0.99);
  assert.ok(n.player.stamina >= 7);
}

{
  const s = initialState();
  s.enemy.hp = 1;
  s.distance = 0;
  const n = stepTurn(s, 'attack', () => 0);
  assert.equal(n.result, 'victory');
}

console.log('game-check ok');
