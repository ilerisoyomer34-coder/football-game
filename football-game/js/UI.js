export class UI {
  constructor(container) {
    this.container = container;
    this._injectStyles();
    this._buildHTML();
    this._cacheElements();
    this._startCallback = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  STYLES
  // ─────────────────────────────────────────────────────────────────────────────
  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700;900&display=swap');

      *, *::before, *::after { box-sizing: border-box; }

      #hud {
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 10;
        font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif;
      }

      /* ── SCOREBOARD ── */
      #scoreboard {
        position: absolute;
        top: 0; left: 50%; transform: translateX(-50%);
        display: flex; align-items: stretch;
        background: rgba(0,0,0,0.82);
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
        overflow: hidden;
        min-width: 380px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.6);
      }

      .sb-team {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 16px;
        min-width: 130px;
      }
      .sb-team.home { flex-direction: row; }
      .sb-team.away { flex-direction: row-reverse; }

      .sb-badge {
        width: 34px; height: 34px; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 900; color: #fff;
        letter-spacing: 0.5px; flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
      }

      .sb-name {
        font-size: 13px; font-weight: 700; color: #fff;
        letter-spacing: 0.5px; text-transform: uppercase;
        white-space: nowrap;
      }

      .sb-center {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 6px 18px;
        border-left: 1px solid rgba(255,255,255,0.08);
        border-right: 1px solid rgba(255,255,255,0.08);
        min-width: 110px;
      }

      #score {
        font-size: 30px; font-weight: 900; color: #fff;
        letter-spacing: 6px; line-height: 1;
      }

      #half-timer {
        font-size: 12px; color: #aaa; letter-spacing: 2px;
        margin-top: 2px;
      }

      #half-badge {
        font-size: 10px; color: #f59e0b; font-weight: 900;
        letter-spacing: 1px; text-transform: uppercase;
      }

      /* Orange accent line */
      #scoreboard::after {
        content: '';
        position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, #f59e0b 30%, #f59e0b 70%, transparent);
      }

      /* ── PLAYER INDICATOR ── */
      #player-indicator {
        position: absolute;
        color: #38bdf8; font-size: 11px; font-weight: 900;
        text-shadow: 0 0 8px #38bdf8;
        pointer-events: none;
        text-align: center; letter-spacing: 1px;
        animation: bounce-arrow 0.9s ease-in-out infinite;
        transform: translateX(-50%);
      }
      @keyframes bounce-arrow {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50%       { transform: translateX(-50%) translateY(-7px); }
      }

      /* ── STAMINA ── */
      #stamina-bar-wrap {
        position: absolute; bottom: 22px; left: 20px;
        display: flex; flex-direction: column; gap: 3px;
      }
      #stamina-label {
        font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,0.5);
        font-weight: 700;
      }
      #stamina-bar-bg {
        width: 88px; height: 6px;
        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 4px; overflow: hidden;
      }
      #stamina-bar-fill {
        height: 100%; width: 100%; border-radius: 4px;
        transition: width 0.1s, background 0.3s;
        background: #22c55e;
      }

      /* ── POWER METER ── */
      #power-meter-wrap {
        position: absolute;
        bottom: 160px; right: 22px;
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        opacity: 0; transition: opacity 0.15s;
        pointer-events: none;
      }
      #power-meter-wrap.visible { opacity: 1; }
      #power-label {
        font-size: 9px; letter-spacing: 1px; color: #f59e0b; font-weight: 900;
      }
      #power-bar-bg {
        width: 8px; height: 80px;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 4px; overflow: hidden;
        display: flex; flex-direction: column-reverse;
      }
      #power-bar-fill {
        width: 100%; height: 0%;
        background: linear-gradient(to top, #22c55e, #f59e0b 60%, #ef4444);
        border-radius: 4px;
        transition: height 0.05s linear;
      }

      /* ── DEAD BALL MESSAGE ── */
      #dead-ball-msg {
        position: fixed; top: 38%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px; font-weight: 900; color: #fff;
        background: rgba(0,0,0,0.7);
        border: 2px solid rgba(255,255,255,0.35);
        border-radius: 8px; padding: 10px 32px;
        letter-spacing: 5px; z-index: 90;
        pointer-events: none; display: none;
      }
      #dead-ball-msg.show {
        display: block;
        animation: dead-ball-pop 1.4s ease-out forwards;
      }
      @keyframes dead-ball-pop {
        0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.7); }
        15%  { opacity: 1; transform: translate(-50%,-50%) scale(1.05); }
        70%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(1); }
      }

      /* ── GOAL CELEBRATION ── */
      #goal-celebration {
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 88px; font-weight: 900; color: #fff;
        text-shadow: 0 0 40px #f59e0b, 0 0 80px #ef4444;
        z-index: 100; pointer-events: none; letter-spacing: 8px;
      }
      #goal-celebration.show { animation: goal-flash 2.5s ease-out forwards; }
      @keyframes goal-flash {
        0%   { transform: translate(-50%,-50%) scale(0); opacity: 1; }
        20%  { transform: translate(-50%,-50%) scale(2.2); opacity: 1; }
        50%  { transform: translate(-50%,-50%) scale(1.5); opacity: 1; }
        100% { transform: translate(-50%,-50%) scale(1.4); opacity: 0; }
      }

      #goal-team-name {
        position: fixed; top: calc(50% + 72px); left: 50%;
        transform: translate(-50%, 0) scale(0);
        font-size: 20px; font-weight: 700; color: #f59e0b;
        text-shadow: 0 0 20px #ef4444;
        z-index: 100; pointer-events: none; letter-spacing: 4px; opacity: 0;
      }
      #goal-team-name.show { animation: team-name-flash 2.5s ease-out forwards; }
      @keyframes team-name-flash {
        0%   { transform: translate(-50%,0) scale(0); opacity: 0; }
        30%  { transform: translate(-50%,0) scale(1.1); opacity: 1; }
        70%  { transform: translate(-50%,0) scale(1.0); opacity: 1; }
        100% { transform: translate(-50%,0) scale(1.0); opacity: 0; }
      }

      /* ── CARD POPUP ── */
      #card-popup {
        position: fixed; top: 18%; right: 22px;
        display: flex; align-items: center; gap: 10px;
        background: rgba(0,0,0,0.8); border-radius: 10px;
        padding: 10px 16px; z-index: 110;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s;
      }
      #card-popup.show { opacity: 1; }
      #card-icon {
        width: 28px; height: 38px; border-radius: 4px;
        background: #facc15;
      }
      #card-icon.red { background: #ef4444; }
      #card-text { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 1px; }

      /* ── POWER SHOT FLASH ── */
      #power-flash {
        position: fixed; inset: 0;
        background: radial-gradient(ellipse at center, rgba(245,158,11,0.18) 0%, transparent 70%);
        pointer-events: none; z-index: 5;
        opacity: 0;
      }
      #power-flash.burst { animation: power-burst 0.5s ease-out forwards; }
      @keyframes power-burst {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }

      /* ── THROUGH BALL FLASH ── */
      #through-flash {
        position: fixed; bottom: 200px; left: 50%;
        transform: translateX(-50%);
        font-size: 14px; font-weight: 900; color: #a78bfa;
        letter-spacing: 3px; opacity: 0; pointer-events: none; z-index: 90;
      }
      #through-flash.show { animation: through-anim 0.9s ease-out forwards; }
      @keyframes through-anim {
        0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
      }

      /* ── MINI MAP ── */
      #mini-map {
        position: absolute; bottom: 22px; right: 22px;
        width: 110px; height: 72px;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 6px; overflow: hidden;
      }
      #mini-map canvas { width: 100%; height: 100%; }

      /* ── HALF TIME OVERLAY ── */
      #halftime-overlay {
        position: fixed; inset: 0; z-index: 400;
        background: rgba(0,0,0,0.88);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px;
        display: none;
      }
      #halftime-overlay h2 {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 48px; font-weight: 900; color: #f59e0b;
        letter-spacing: 6px;
      }
      #halftime-score {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 72px; font-weight: 900; color: #fff; letter-spacing: 8px;
      }

      /* ── GAME OVER ── */
      #gameover-overlay {
        position: fixed; inset: 0; z-index: 400;
        background: rgba(0,0,0,0.92);
        display: none; flex-direction: column;
        align-items: center; justify-content: center; gap: 18px;
      }
      #gameover-overlay.visible { display: flex; }

      #gameover-overlay h2 {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 44px; font-weight: 900; color: #fff;
        letter-spacing: 6px; text-shadow: 0 0 30px rgba(255,255,255,0.3);
      }
      #final-score {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 80px; font-weight: 900; color: #fff; letter-spacing: 10px;
      }
      #result-text {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 28px; font-weight: 700; letter-spacing: 5px;
      }
      .win  { color: #22c55e; text-shadow: 0 0 20px #22c55e; }
      .lose { color: #ef4444; text-shadow: 0 0 20px #ef4444; }
      .draw { color: #f59e0b; text-shadow: 0 0 20px #f59e0b; }

      #match-stats {
        font-family: 'Roboto Condensed', sans-serif; font-size: 13px;
        color: rgba(255,255,255,0.7); letter-spacing: 1px;
        text-align: center; line-height: 2;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px; padding: 16px 32px;
      }

      .go-btn {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 16px; font-weight: 700; color: #000;
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        border: none; border-radius: 50px;
        padding: 14px 52px; cursor: pointer;
        letter-spacing: 3px; text-transform: uppercase;
        box-shadow: 0 0 28px rgba(245,158,11,0.4);
        transition: all 0.2s; pointer-events: all;
      }
      .go-btn:hover { transform: scale(1.05); box-shadow: 0 0 42px rgba(245,158,11,0.65); }

      /* ── MENU OVERLAY ── */
      #menu-overlay {
        position: fixed; inset: 0; z-index: 500;
        background: #040a10;
        overflow-y: auto; -webkit-overflow-scrolling: touch;
        display: flex; flex-direction: column; align-items: center;
        padding: 24px 16px 48px;
        gap: 20px;
      }

      .menu-logo {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 11px; font-weight: 700; color: #f59e0b;
        letter-spacing: 5px; text-transform: uppercase;
      }
      .menu-title {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: clamp(36px, 8vw, 72px); font-weight: 900;
        color: #fff; letter-spacing: -1px; line-height: 0.9;
        text-align: center;
      }
      .menu-title span { color: #f59e0b; }

      /* Mode tabs */
      .mode-tabs {
        display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
        pointer-events: all;
      }
      .mode-tab {
        padding: 8px 20px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.65); font-size: 12px; font-weight: 700;
        letter-spacing: 1px; cursor: pointer;
        transition: all 0.2s;
      }
      .mode-tab.active {
        background: #f59e0b; color: #000;
        border-color: #f59e0b;
      }

      /* Team grid */
      .team-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 10px; width: 100%; max-width: 900px;
        pointer-events: all;
      }
      .team-card {
        border-radius: 14px; padding: 14px 12px;
        background: rgba(255,255,255,0.05);
        border: 2px solid rgba(255,255,255,0.08);
        cursor: pointer; transition: all 0.18s;
        display: flex; flex-direction: column; gap: 6px;
      }
      .team-card:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.22);
        transform: translateY(-2px);
      }
      .team-card.selected {
        border-color: #f59e0b;
        box-shadow: 0 0 0 3px rgba(245,158,11,0.2);
      }
      .tc-badge {
        width: 44px; height: 44px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 900; color: #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
      .tc-name {
        font-size: 13px; font-weight: 700; color: #fff;
        line-height: 1.2;
      }
      .tc-rating {
        font-size: 11px; color: #f59e0b; font-weight: 700; letter-spacing: 1px;
      }
      .tc-stars {
        font-size: 10px; color: #f59e0b; letter-spacing: 1px;
      }

      /* Settings row */
      .settings-row {
        display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
        width: 100%; max-width: 600px;
        pointer-events: all;
      }
      .setting-group { display: flex; flex-direction: column; gap: 6px; align-items: center; }
      .setting-label { font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 2px; font-weight: 700; }
      .chip-row { display: flex; gap: 5px; }
      .chip-btn {
        padding: 7px 12px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 700;
        cursor: pointer; transition: all 0.15s;
      }
      .chip-btn.active { background: rgba(245,158,11,0.2); border-color: #f59e0b; color: #f59e0b; }

      /* Opponent selector */
      .opp-section {
        width: 100%; max-width: 900px;
        pointer-events: all;
      }
      .opp-label {
        font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 2px;
        margin-bottom: 8px; display: block;
      }
      .opp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 8px; max-height: 200px; overflow-y: auto;
      }
      .opp-card {
        border-radius: 10px; padding: 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; transition: all 0.15s;
        display: flex; flex-direction: column; gap: 4px;
        align-items: center; text-align: center;
      }
      .opp-card:hover { background: rgba(255,255,255,0.08); }
      .opp-card.selected { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.2); }
      .opp-badge {
        width: 32px; height: 32px; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 900; color: #fff;
      }
      .opp-name { font-size: 10px; color: #ccc; font-weight: 600; }

      /* Start button */
      #start-btn {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #000; border: none; border-radius: 50px;
        padding: 16px 56px; font-family: 'Roboto Condensed', sans-serif;
        font-size: 18px; font-weight: 900; letter-spacing: 4px;
        cursor: pointer; box-shadow: 0 0 32px rgba(245,158,11,0.35);
        transition: all 0.2s; pointer-events: all;
      }
      #start-btn:hover { transform: scale(1.04); box-shadow: 0 0 52px rgba(245,158,11,0.55); }

      /* Controls hint card */
      .controls-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; padding: 16px 24px;
        max-width: 620px; width: 100%;
      }
      .controls-card h3 {
        font-size: 11px; color: #f59e0b; letter-spacing: 3px;
        margin-bottom: 10px; text-transform: uppercase;
      }
      .ctrl-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.5;
      }
      .ctrl-key { color: #38bdf8; font-weight: 700; }

      /* ── TOUCH CONTROLS ── */
      #touch-overlay {
        position: fixed; inset: 0; z-index: 50; pointer-events: none;
      }
      #touch-joystick-zone {
        position: absolute; left: 0; bottom: 0; width: 50%; height: 55%;
        pointer-events: all;
      }
      #joystick-base {
        position: absolute;
        width: 130px; height: 130px; border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 2px solid rgba(255,255,255,0.2);
        display: none; transform: translate(-50%, -50%);
        pointer-events: none;
      }
      #joystick-thumb {
        position: absolute; width: 56px; height: 56px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.5));
        border: 2px solid rgba(255,255,255,0.7);
        box-shadow: 0 0 14px rgba(255,255,255,0.25);
        transform: translate(-50%, -50%);
        pointer-events: none; top: 50%; left: 50%;
      }

      /* FC Mobile style button diamond */
      #btn-area {
        position: absolute; right: 18px; bottom: 36px;
        width: 220px; height: 220px;
        pointer-events: none;
      }
      .fc-btn {
        position: absolute;
        width: 72px; height: 72px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 11px; font-weight: 900; color: #fff; letter-spacing: 1px;
        border: 2.5px solid rgba(255,255,255,0.5);
        cursor: pointer; user-select: none; -webkit-user-select: none;
        transition: transform 0.08s, filter 0.08s;
        pointer-events: all;
        box-shadow: 0 6px 20px rgba(0,0,0,0.45);
        text-align: center; line-height: 1.2;
      }
      .fc-btn:active { transform: scale(0.88); filter: brightness(1.3); }

      /* Diamond positions */
      #btn-through { top: 0;    left: 50%; transform: translateX(-50%); background: radial-gradient(circle at 35% 35%, #7c3aed, #4c1d95); }
      #btn-pass    { left: 0;   top: 50%; transform: translateY(-50%);  background: radial-gradient(circle at 35% 35%, #2563eb, #1e3a8a); }
      #btn-shoot   { right: 0;  top: 50%; transform: translateY(-50%);  background: radial-gradient(circle at 35% 35%, #dc2626, #7f1d1d); width: 82px; height: 82px; font-size: 13px; }
      #btn-sprint  { bottom: 0; left: 50%; transform: translateX(-50%); background: radial-gradient(circle at 35% 35%, #16a34a, #14532d); font-size: 10px; }

      /* Extra buttons row */
      #btn-row2 {
        position: absolute; right: 22px; bottom: 274px;
        display: flex; gap: 8px;
        pointer-events: all;
      }
      .sm-btn {
        width: 54px; height: 38px; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 9px; font-weight: 900; color: #fff; letter-spacing: 1px;
        border: 1.5px solid rgba(255,255,255,0.4);
        background: rgba(0,0,0,0.55); cursor: pointer;
        user-select: none; -webkit-user-select: none;
        pointer-events: all;
        transition: transform 0.08s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
      .sm-btn:active { transform: scale(0.9); }
      #btn-tackle  { background: rgba(234,88,12,0.7); border-color: #fb923c; }
      #btn-switch  { background: rgba(14,165,233,0.55); border-color: #38bdf8; }
      #btn-sprint-toggle { display: none; }

      .hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  HTML
  // ─────────────────────────────────────────────────────────────────────────────
  _buildHTML() {
    this.container.innerHTML = `
      <div id="hud">
        <div id="scoreboard">
          <div class="sb-team home">
            <div class="sb-badge" id="home-badge">HME</div>
            <span class="sb-name" id="home-name">HOME</span>
          </div>
          <div class="sb-center">
            <div id="half-badge">1H</div>
            <div id="score">0 - 0</div>
            <div id="half-timer">45:00</div>
          </div>
          <div class="sb-team away">
            <div class="sb-badge" id="away-badge">CPU</div>
            <span class="sb-name" id="away-name">CPU</span>
          </div>
        </div>

        <div id="player-indicator">&#9660; YOU</div>

        <div id="stamina-bar-wrap">
          <div id="stamina-label">STAMINA</div>
          <div id="stamina-bar-bg"><div id="stamina-bar-fill"></div></div>
        </div>

        <div id="power-meter-wrap">
          <div id="power-label">POWER</div>
          <div id="power-bar-bg"><div id="power-bar-fill"></div></div>
        </div>

        <div id="mini-map"><canvas id="mini-map-canvas" width="110" height="72"></canvas></div>
      </div>

      <div id="goal-celebration">GOAL!</div>
      <div id="goal-team-name"></div>
      <div id="dead-ball-msg"></div>
      <div id="card-popup"><div id="card-icon"></div><div id="card-text">YELLOW CARD</div></div>
      <div id="power-flash"></div>
      <div id="through-flash">THROUGH BALL</div>

      <div id="halftime-overlay">
        <div style="font-size:11px;color:#f59e0b;letter-spacing:5px;font-weight:700;">EA SPORTS FC 26</div>
        <h2>HALF TIME</h2>
        <div id="halftime-score">0 - 0</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:2px;">2nd Half begins shortly...</div>
      </div>

      <div id="gameover-overlay">
        <div style="font-size:11px;color:#f59e0b;letter-spacing:5px;font-weight:700;">EA SPORTS FC 26</div>
        <h2>FULL TIME</h2>
        <div id="final-score">0 - 0</div>
        <div id="result-text" class="draw">DRAW</div>
        <div id="match-stats"></div>
        <button class="go-btn" id="restart-btn">PLAY AGAIN</button>
        <button class="go-btn" id="menu-btn-go" style="background:rgba(255,255,255,0.12);color:#fff;box-shadow:none;margin-top:-4px;">MAIN MENU</button>
      </div>

      <div id="menu-overlay"></div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  CACHE
  // ─────────────────────────────────────────────────────────────────────────────
  _cacheElements() {
    this.scoreEl         = document.getElementById('score');
    this.halfTimerEl     = document.getElementById('half-timer');
    this.halfBadgeEl     = document.getElementById('half-badge');
    this.homeBadgeEl     = document.getElementById('home-badge');
    this.awayBadgeEl     = document.getElementById('away-badge');
    this.homeNameEl      = document.getElementById('home-name');
    this.awayNameEl      = document.getElementById('away-name');
    this.goalCelebEl     = document.getElementById('goal-celebration');
    this.goalTeamNameEl  = document.getElementById('goal-team-name');
    this.menuOverlay     = document.getElementById('menu-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScoreEl    = document.getElementById('final-score');
    this.resultTextEl    = document.getElementById('result-text');
    this.playerIndicator = document.getElementById('player-indicator');
    this.miniMapCanvas   = document.getElementById('mini-map-canvas');
    this.miniMapCtx      = this.miniMapCanvas?.getContext('2d');
    this.deadBallMsgEl   = document.getElementById('dead-ball-msg');
    this.staminaFill     = document.getElementById('stamina-bar-fill');
    this.powerBarFill    = document.getElementById('power-bar-fill');
    this.powerWrap       = document.getElementById('power-meter-wrap');
    this.halftimeOverlay = document.getElementById('halftime-overlay');
    this.halftimeScore   = document.getElementById('halftime-score');
    this.cardPopup       = document.getElementById('card-popup');
    this.cardIcon        = document.getElementById('card-icon');
    this.cardText        = document.getElementById('card-text');
    this.powerFlash      = document.getElementById('power-flash');
    this.throughFlash    = document.getElementById('through-flash');
    this.matchStatsEl    = document.getElementById('match-stats');

    this._celebTimeout   = null;
    this._cardTimeout    = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  MENU
  // ─────────────────────────────────────────────────────────────────────────────
  showMenu(clubTeams, nationalTeams, onStart) {
    this._startCallback = onStart;
    this._clubTeams     = clubTeams;
    this._nationalTeams = nationalTeams;
    this._mode          = 'clubs';
    this._selectedHome  = clubTeams[0];
    this._selectedAway  = clubTeams[1];
    this._difficulty    = 'medium';
    this._halfLen       = 90;

    this._renderMenu();
    this.menuOverlay.style.display = 'flex';
  }

  _renderMenu() {
    const teams = this._mode === 'clubs' ? this._clubTeams : this._nationalTeams;

    this.menuOverlay.innerHTML = `
      <div class="menu-logo">EA SPORTS</div>
      <div class="menu-title">FC <span>26</span></div>

      <div class="mode-tabs" id="mode-tabs">
        <button class="mode-tab ${this._mode === 'clubs' ? 'active' : ''}"     data-mode="clubs">CLUBS</button>
        <button class="mode-tab ${this._mode === 'national' ? 'active' : ''}"  data-mode="national">NATIONAL</button>
      </div>

      <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:2px;align-self:flex-start;max-width:900px;width:100%;">
        SELECT YOUR TEAM
      </div>
      <div class="team-grid" id="home-team-grid">
        ${teams.map(t => this._teamCardHTML(t, this._selectedHome?.id === t.id)).join('')}
      </div>

      <div class="opp-section">
        <span class="opp-label">OPPONENT</span>
        <div class="opp-grid" id="opp-grid">
          ${teams.map(t => this._oppCardHTML(t, this._selectedAway?.id === t.id)).join('')}
        </div>
      </div>

      <div class="settings-row">
        <div class="setting-group">
          <span class="setting-label">DIFFICULTY</span>
          <div class="chip-row">
            <button class="chip-btn ${this._difficulty === 'easy' ? 'active' : ''}"   data-diff="easy">EASY</button>
            <button class="chip-btn ${this._difficulty === 'medium' ? 'active' : ''}" data-diff="medium">NORMAL</button>
            <button class="chip-btn ${this._difficulty === 'hard' ? 'active' : ''}"   data-diff="hard">HARD</button>
          </div>
        </div>
        <div class="setting-group">
          <span class="setting-label">HALF LENGTH</span>
          <div class="chip-row">
            <button class="chip-btn ${this._halfLen === 60 ? 'active' : ''}"  data-half="60">1 MIN</button>
            <button class="chip-btn ${this._halfLen === 90 ? 'active' : ''}"  data-half="90">1.5 MIN</button>
            <button class="chip-btn ${this._halfLen === 150 ? 'active' : ''}" data-half="150">2.5 MIN</button>
          </div>
        </div>
      </div>

      <button id="start-btn">KICK OFF</button>

      <div class="controls-card">
        <h3>Controls</h3>
        <div class="ctrl-grid">
          <div><span class="ctrl-key">WASD / Arrows</span> — Move</div>
          <div><span class="ctrl-key">SPACE (hold)</span> — Power Shot</div>
          <div><span class="ctrl-key">E</span> — Pass</div>
          <div><span class="ctrl-key">R</span> — Through Ball</div>
          <div><span class="ctrl-key">SHIFT</span> — Sprint</div>
          <div><span class="ctrl-key">Q</span> — Sliding Tackle</div>
          <div><span class="ctrl-key">TAB</span> — Switch Player</div>
          <div><span class="ctrl-key">ESC</span> — Pause</div>
          <div style="grid-column:span 2;color:rgba(255,255,255,0.35);font-size:11px;margin-top:4px;">
            📱 Touch: Joystick (left) + SHOOT/PASS/THROUGH/SPRINT buttons (right)
          </div>
        </div>
      </div>
    `;

    // Wire events
    document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
      this._mode = btn.dataset.mode;
      const newTeams = this._mode === 'clubs' ? this._clubTeams : this._nationalTeams;
      this._selectedHome = newTeams[0];
      this._selectedAway = newTeams[1];
      this._renderMenu();
    }));

    document.querySelectorAll('[data-diff]').forEach(btn => btn.addEventListener('click', () => {
      this._difficulty = btn.dataset.diff;
      document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('active', b.dataset.diff === this._difficulty));
    }));

    document.querySelectorAll('[data-half]').forEach(btn => btn.addEventListener('click', () => {
      this._halfLen = Number(btn.dataset.half);
      document.querySelectorAll('[data-half]').forEach(b => b.classList.toggle('active', Number(b.dataset.half) === this._halfLen));
    }));

    document.querySelectorAll('#home-team-grid .team-card').forEach(card => {
      card.addEventListener('click', () => {
        const teams = this._mode === 'clubs' ? this._clubTeams : this._nationalTeams;
        this._selectedHome = teams.find(t => t.id === card.dataset.id);
        document.querySelectorAll('#home-team-grid .team-card').forEach(c => c.classList.toggle('selected', c.dataset.id === card.dataset.id));
      });
    });

    document.querySelectorAll('#opp-grid .opp-card').forEach(card => {
      card.addEventListener('click', () => {
        const teams = this._mode === 'clubs' ? this._clubTeams : this._nationalTeams;
        this._selectedAway = teams.find(t => t.id === card.dataset.id);
        document.querySelectorAll('#opp-grid .opp-card').forEach(c => c.classList.toggle('selected', c.dataset.id === card.dataset.id));
      });
    });

    document.getElementById('start-btn').addEventListener('click', () => {
      if (this._startCallback) {
        this._startCallback(this._selectedHome, this._selectedAway, this._difficulty, this._halfLen);
      }
    });
  }

  _hexToCSS(hex) {
    const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
    return `rgb(${r},${g},${b})`;
  }

  _teamCardHTML(team, selected) {
    const stars = Math.round(team.rating / 20);
    return `
      <div class="team-card ${selected ? 'selected' : ''}" data-id="${team.id}">
        <div class="tc-badge" style="background:${this._hexToCSS(team.primaryColor)};">${team.short}</div>
        <div class="tc-name">${team.name}</div>
        <div class="tc-rating">OVR ${team.rating}</div>
        <div class="tc-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
      </div>`;
  }

  _oppCardHTML(team, selected) {
    return `
      <div class="opp-card ${selected ? 'selected' : ''}" data-id="${team.id}">
        <div class="opp-badge" style="background:${this._hexToCSS(team.primaryColor)};">${team.short}</div>
        <div class="opp-name">${team.name}</div>
      </div>`;
  }

  hideMenu() { this.menuOverlay.style.display = 'none'; }

  // ─────────────────────────────────────────────────────────────────────────────
  //  MATCH START / SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  startMatch(homeTeam, awayTeam, halfDuration) {
    this._halfDuration = halfDuration;
    this._homeTeam     = homeTeam;
    this._awayTeam     = awayTeam;

    if (this.homeNameEl)  this.homeNameEl.textContent  = homeTeam.short;
    if (this.awayNameEl)  this.awayNameEl.textContent  = awayTeam.short;
    if (this.homeBadgeEl) {
      this.homeBadgeEl.textContent = homeTeam.short;
      this.homeBadgeEl.style.background = this._hexToCSS(homeTeam.primaryColor);
    }
    if (this.awayBadgeEl) {
      this.awayBadgeEl.textContent = awayTeam.short;
      this.awayBadgeEl.style.background = this._hexToCSS(awayTeam.primaryColor);
    }
    // Also update Field crowd colors
    this._buildTouchUI();
  }

  updateScore(home, away) {
    if (this.scoreEl) this.scoreEl.textContent = `${home} - ${away}`;
  }

  updateHalf(half) {
    if (this.halfBadgeEl) this.halfBadgeEl.textContent = half === 1 ? '1H' : '2H';
  }

  updateTimer(remaining, half, halfDuration, offset = 0) {
    const elapsed  = halfDuration - remaining;
    const display  = Math.min(halfDuration, Math.max(0, elapsed + offset));
    const m = Math.floor(display / 60).toString().padStart(2, '0');
    const s = (Math.floor(display) % 60).toString().padStart(2, '0');
    // Show injury time with '+'
    if (remaining <= 0 && half === 2) {
      const extra = Math.abs(Math.floor(remaining));
      if (this.halfTimerEl) this.halfTimerEl.textContent = `90:00+${extra}`;
    } else if (this.halfTimerEl) {
      this.halfTimerEl.textContent = `${m}:${s}`;
    }
  }

  updatePowerMeter(pct) {
    if (!this.powerWrap) return;
    if (pct > 0) {
      this.powerWrap.classList.add('visible');
      if (this.powerBarFill) this.powerBarFill.style.height = Math.round(pct * 100) + '%';
    } else {
      this.powerWrap.classList.remove('visible');
      if (this.powerBarFill) this.powerBarFill.style.height = '0%';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  EVENTS
  // ─────────────────────────────────────────────────────────────────────────────
  showDeadBallMessage(text) {
    if (!this.deadBallMsgEl) return;
    this.deadBallMsgEl.textContent = text;
    this.deadBallMsgEl.classList.remove('show');
    void this.deadBallMsgEl.offsetWidth;
    this.deadBallMsgEl.classList.add('show');
    setTimeout(() => this.deadBallMsgEl.classList.remove('show'), 1400);
  }

  showGoalCelebration(teamName) {
    if (!this.goalCelebEl) return;
    this.goalCelebEl.classList.remove('show');
    this.goalTeamNameEl.classList.remove('show');
    void this.goalCelebEl.offsetWidth;
    this.goalCelebEl.classList.add('show');
    if (this.goalTeamNameEl) {
      const t = teamName === 'HOME' ? (this._homeTeam?.name || 'HOME') : (this._awayTeam?.name || 'CPU');
      this.goalTeamNameEl.textContent = t.toUpperCase() + ' SCORES!';
      this.goalTeamNameEl.classList.add('show');
    }
    if (this._celebTimeout) clearTimeout(this._celebTimeout);
    this._celebTimeout = setTimeout(() => {
      this.goalCelebEl.classList.remove('show');
      this.goalTeamNameEl.classList.remove('show');
    }, 2600);
  }

  showCard(type, team) {
    if (!this.cardPopup) return;
    const isYellow = type === 'yellow';
    this.cardIcon.className = isYellow ? '' : 'red';
    this.cardText.textContent = `${team} — ${isYellow ? 'YELLOW CARD' : 'RED CARD'}`;
    this.cardPopup.classList.add('show');
    if (this._cardTimeout) clearTimeout(this._cardTimeout);
    this._cardTimeout = setTimeout(() => this.cardPopup.classList.remove('show'), 2800);
  }

  flashPowerShot(pct) {
    if (!this.powerFlash) return;
    this.powerFlash.classList.remove('burst');
    void this.powerFlash.offsetWidth;
    this.powerFlash.style.opacity = pct * 0.6;
    this.powerFlash.classList.add('burst');
  }

  showThroughBallFlash() {
    if (!this.throughFlash) return;
    this.throughFlash.classList.remove('show');
    void this.throughFlash.offsetWidth;
    this.throughFlash.classList.add('show');
  }

  showHalfTime(home, away) {
    if (this.halftimeOverlay) {
      this.halftimeOverlay.style.display = 'flex';
      if (this.halftimeScore) this.halftimeScore.textContent = `${home} - ${away}`;
    }
  }

  hideHalfTime() {
    if (this.halftimeOverlay) this.halftimeOverlay.style.display = 'none';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  GAME OVER
  // ─────────────────────────────────────────────────────────────────────────────
  showGameOver(homeScore, awayScore, stats, cards) {
    if (!this.gameoverOverlay) return;
    this.gameoverOverlay.classList.add('visible');
    if (this.finalScoreEl) this.finalScoreEl.textContent = `${homeScore} - ${awayScore}`;

    if (this.resultTextEl) {
      if (homeScore > awayScore) {
        this.resultTextEl.textContent = 'YOU WIN!';
        this.resultTextEl.className   = 'win';
      } else if (homeScore < awayScore) {
        this.resultTextEl.textContent = 'YOU LOSE';
        this.resultTextEl.className   = 'lose';
      } else {
        this.resultTextEl.textContent = 'DRAW';
        this.resultTextEl.className   = 'draw';
      }
    }

    if (this.matchStatsEl && stats) {
      const homePoss = stats.totalFrames > 0 ? Math.round((stats.playerFrames / stats.totalFrames) * 100) : 50;
      const cpuPoss  = 100 - homePoss;
      const hc = cards || {};
      this.matchStatsEl.innerHTML = `
        <span style="color:#38bdf8">${this._homeTeam?.short || 'HOME'}</span>
        &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
        <span style="color:rgba(255,255,255,0.4)">STAT</span>
        &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
        <span style="color:#f87171">${this._awayTeam?.short || 'CPU'}</span><br>
        ${stats.playerShots} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; SHOTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${stats.opponentShots}<br>
        ${homePoss}% &nbsp;&nbsp; POSSESSION &nbsp;&nbsp; ${cpuPoss}%<br>
        <span style="color:#facc15">🟨 ${hc.homeYellow || 0}</span>
        &nbsp; <span style="color:#ef4444">🟥 ${hc.homeRed || 0}</span>
        &nbsp;&nbsp; CARDS &nbsp;&nbsp;
        <span style="color:#facc15">🟨 ${hc.awayYellow || 0}</span>
        &nbsp; <span style="color:#ef4444">🟥 ${hc.awayRed || 0}</span>
      `;
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
      window._game?.restart();
    });
    document.getElementById('menu-btn-go').addEventListener('click', () => {
      this.hideGameOver();
      this.showMenu(this._clubTeams, this._nationalTeams, this._startCallback);
    });
  }

  hideGameOver() {
    if (this.gameoverOverlay) this.gameoverOverlay.classList.remove('visible');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  HUD UPDATES
  // ─────────────────────────────────────────────────────────────────────────────
  updateStaminaBar(energy) {
    if (!this.staminaFill) return;
    const pct = Math.round(energy * 100);
    this.staminaFill.style.width = pct + '%';
    this.staminaFill.style.background =
      energy > 0.6 ? '#22c55e' :
      energy > 0.35 ? '#f59e0b' : '#ef4444';
  }

  updatePlayerIndicator(screenX, screenY) {
    if (!this.playerIndicator) return;
    this.playerIndicator.style.left = screenX + 'px';
    this.playerIndicator.style.top  = (screenY - 42) + 'px';
  }

  updateMiniMap(playerTeam, opponentTeam, ball) {
    if (!this.miniMapCtx) return;
    const ctx = this.miniMapCtx;
    const w = 110, h = 72, fw = 105, fh = 68;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a4d24';
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();

    const toMini = (x, z) => ({
      x: ((x + fw/2) / fw) * w,
      y: ((z + fh/2) / fh) * h,
    });

    const dot = (p, color, r) => {
      const mp = toMini(p.x, p.z);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mp.x, mp.y, r, 0, Math.PI*2); ctx.fill();
    };

    if (opponentTeam) opponentTeam.players.forEach(p => { if (!p.redCard) dot(p.position, '#f87171', 2.5); });
    if (playerTeam)   playerTeam.players.forEach(p => {
      if (!p.redCard) dot(p.position, p.isControlled ? '#ffffff' : '#38bdf8', p.isControlled ? 3.5 : 2.5);
    });
    if (ball) dot(ball.position, '#facc15', 2.2);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  TOUCH UI (FC Mobile style)
  // ─────────────────────────────────────────────────────────────────────────────
  _buildTouchUI() {
    // Only build once
    if (document.getElementById('touch-overlay')) return;
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const overlay = document.createElement('div');
    overlay.id = 'touch-overlay';
    overlay.innerHTML = `
      <div id="touch-joystick-zone">
        <div id="joystick-base"><div id="joystick-thumb"></div></div>
      </div>
      <div id="btn-area">
        <div id="btn-through" class="fc-btn">THRU<br>BALL</div>
        <div id="btn-pass"    class="fc-btn">PASS</div>
        <div id="btn-shoot"   class="fc-btn">SHOOT</div>
        <div id="btn-sprint"  class="fc-btn">RUN</div>
      </div>
      <div id="btn-row2">
        <div id="btn-switch" class="sm-btn">SWITCH</div>
        <div id="btn-tackle" class="sm-btn">TACKLE</div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Import InputController will wire these automatically
    // Signal to InputController that UI is ready
    window._touchUIReady = true;
    window.dispatchEvent(new CustomEvent('touchUIReady'));
  }

  getSelectedDifficulty() { return this._difficulty || 'medium'; }
}
