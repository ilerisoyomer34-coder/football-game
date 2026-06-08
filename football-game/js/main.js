import { Game } from './Game.js';

const container = document.getElementById('canvas-container');
const uiContainer = document.getElementById('ui-container');

try {
  const game = new Game(container, uiContainer);
  window._game = game;
} catch (err) {
  console.error('Game init error:', err);
  document.body.innerHTML = `
    <div style="color:#fff;background:#111;padding:40px;font-family:monospace;font-size:14px;white-space:pre-wrap;">
      <h2 style="color:#f44">HATA / ERROR</h2>
      ${err.stack || err.message}
    </div>`;
}
