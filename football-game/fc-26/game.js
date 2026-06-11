// game.js — match state, input, AI, ball physics, broadcast camera, HUD (no external deps)
(function () {
  const L = PITCH.HALFL, W = PITCH.HALFW;
  const HOME = { name: 'ATLAS', code: 'ATL', shirt: '#e8233a', shorts: '#ffffff', socks: '#e8233a', skin: '#f1c39a' };
  const AWAY = { name: 'NOVA', code: 'NOV', shirt: '#2255ee', shorts: '#12245e', socks: '#2255ee', skin: '#e3b48c' };
  const GK = { shirt: '#18c060', shorts: '#0e7a3a', socks: '#18c060', skin: '#f1c39a' };
  const HOME_NAMES = ['MARTINS', 'SILVA', 'KOÇ', 'REYES', 'OKAFOR', 'DUMAS', 'VEGA', 'ARNE', 'PETIT', 'YILMAZ', 'SANTOS'];
  const AWAY_NAMES = ['BRUNO', 'KANE', 'NORD', 'DIALLO', 'WERNER', 'COSTA', 'LARS', 'OZ', 'RUIZ', 'FALK', 'MORI'];
  const NUMS = [1, 4, 5, 6, 3, 8, 6, 7, 9, 10, 11];
  const FORM = [
    [-48, 0],
    [-34, -22], [-34, -8], [-34, 8], [-34, 22],
    [-14, -16], [-14, 0], [-14, 16],
    [8, -22], [10, 0], [8, 22],
  ];

  let canvas, ctx, raf, last = 0;
  const players = [];
  let ballPos = { x: 0, y: 0.12, z: 0 };
  let ballVel = { x: 0, y: 0, z: 0 };
  let possessor = null, possTeam = 'home', activeHome = null;
  let scoreH = 0, scoreA = 0, matchSec = 0;
  let charging = false, power = 0, lastTouch = 0, goalFlashT = 0, slideCooldown = 0;
  let facing = { x: 1, z: 0 };
  const input = { x: 0, z: 0, sprint: false, passReq: false, throughReq: false, slideReq: false, shootHeld: false };
  const keys = {};

  function spawn() {
    FORM.forEach((f, i) => {
      const num = i === 0 ? 1 : NUMS[i];
      players.push(mk('home', i === 0, [f[0], f[1]], num, HOME_NAMES[i]));
      players.push(mk('away', i === 0, [-f[0], f[1]], num, AWAY_NAMES[i]));
    });
  }
  function mk(team, isGK, home, number, name) {
    const base = team === 'home' ? HOME : AWAY;
    const kit = isGK ? GK : { shirt: base.shirt, shorts: base.shorts, socks: base.socks, skin: base.skin };
    return { team, isGK, home, number: isGK ? 1 : number, name, kit,
      pos: { x: home[0], y: 0, z: home[1] }, vel: { x: 0, z: 0 }, anim: Math.random() * 6, speedN: 0,
      hair: team === 'home' ? '#2a1d12' : '#3a2a18' };
  }
  function resetKickoff(toTeam) {
    ballPos = { x: 0, y: 0.12, z: 0 }; ballVel = { x: 0, y: 0, z: 0 };
    possessor = null; possTeam = toTeam;
    players.forEach(p => { p.pos = { x: p.home[0], y: 0, z: p.home[1] }; p.vel = { x: 0, z: 0 }; });
  }

  // ---------- input ----------
  let joyActive = false, sprintBtn = false;
  function bindInput() {
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase(); keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (k === 'j') input.passReq = true;
      if (k === 'l') input.throughReq = true;
      if (k === 'c') input.slideReq = true;
      if (k === ' ' || k === 'k') input.shootHeld = true;
    });
    addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ' || k === 'k') input.shootHeld = false; });
    setupJoystick(); setupButtons();
  }
  function readKeyboard() {
    let x = 0, z = 0;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) z += 1;
    if (keys['s'] || keys['arrowdown']) z -= 1;
    if (x || z) { input.x = x; input.z = z; }
    else if (!joyActive) { input.x = 0; input.z = 0; }
    input.sprint = !!keys['shift'] || sprintBtn;
  }
  function setupJoystick() {
    const base = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    let id = null, cx = 0, cy = 0; const R = 52;
    const start = e => { const t = e.changedTouches ? e.changedTouches[0] : e; id = e.changedTouches ? t.identifier : 'm'; const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joyActive = true; move(e); };
    const move = e => {
      if (!joyActive) return;
      const t = e.changedTouches ? ([...e.changedTouches].find(x => x.identifier === id) || e.changedTouches[0]) : e;
      let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy) || 1; const cl = Math.min(d, R);
      dx = dx / d * cl; dy = dy / d * cl; knob.style.transform = `translate(${dx}px,${dy}px)`;
      input.x = dx / R; input.z = -dy / R;
    };
    const end = () => { joyActive = false; knob.style.transform = 'translate(0,0)'; input.x = 0; input.z = 0; };
    base.addEventListener('touchstart', e => { e.preventDefault(); start(e); }, { passive: false });
    base.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive: false });
    base.addEventListener('touchend', end); base.addEventListener('touchcancel', end);
    base.addEventListener('mousedown', start); addEventListener('mousemove', e => joyActive && move(e)); addEventListener('mouseup', () => joyActive && end());
  }
  function setupButtons() {
    const press = (el, on, off) => {
      const a = e => { e.preventDefault(); on(); }, b = e => { e.preventDefault(); off && off(); };
      el.addEventListener('touchstart', a, { passive: false }); el.addEventListener('touchend', b); el.addEventListener('touchcancel', b);
      el.addEventListener('mousedown', a); el.addEventListener('mouseup', b); el.addEventListener('mouseleave', b);
    };
    press(document.getElementById('btnPass'), () => { input.passReq = true; });
    press(document.getElementById('btnThrough'), () => { input.throughReq = true; });
    press(document.getElementById('btnSlide'), () => { input.slideReq = true; });
    press(document.getElementById('btnShoot'), () => { input.shootHeld = true; }, () => { input.shootHeld = false; });
    press(document.getElementById('btnSprint'), () => { sprintBtn = true; }, () => { sprintBtn = false; });
  }

  // ---------- helpers ----------
  function d2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
  function dist(a, b) { return Math.sqrt(d2(a, b)); }
  function nearestToBall(team) { let best = null, bd = 1e9; players.forEach(p => { if (team && p.team !== team) return; const d = d2(p.pos, ballPos); if (d < bd) { bd = d; best = p; } }); return { p: best, d: Math.sqrt(bd) }; }
  function vmag(v) { return Math.hypot(v.x, v.z); }
  // convert stick input (screen-relative) into a world-space ground direction using the camera basis
  function camDir(ix, iz) {
    const R = View.right, F = View.fwd;
    const rl = Math.hypot(R.x, R.z) || 1, fl = Math.hypot(F.x, F.z) || 1;
    const x = ix * R.x / rl + iz * F.x / fl;
    const z = ix * R.z / rl + iz * F.z / fl;
    const l = Math.hypot(x, z) || 1;
    return { x: x / l, z: z / l };
  }

  // ---------- update ----------
  function update(dt) {
    matchSec += dt * 4; if (matchSec > 5400) matchSec = 5400;
    readKeyboard();
    activeHome = nearestToBall('home').p;

    if (lastTouch <= 0) {
      const near = nearestToBall(null);
      if (near.p && near.d < 1.05 && vmag(ballVel) < 14) { possessor = near.p; possTeam = near.p.team; }
    } else lastTouch -= dt;
    if (possessor && dist(possessor.pos, ballPos) > 2.2) possessor = null;

    players.forEach(p => {
      if (p.team === 'home' && p === activeHome) {
        if (p.slideT > 0) {
          p.slideT -= dt; p.vel.x *= 0.9; p.vel.z *= 0.9; move(p, dt); trySlideWin(p);
          if (p.slideT <= 0) p.sliding = false; return;
        }
        if (input.slideReq && slideCooldown <= 0) {
          input.slideReq = false;
          let d;
          if (Math.hypot(input.x, input.z) < 0.2) { const m = Math.hypot(facing.x, facing.z) || 1; d = { x: facing.x / m, z: facing.z / m }; }
          else d = camDir(input.x, input.z);
          p.slideDir = d;
          p.slideT = 0.55; p.sliding = true; slideCooldown = 1.1;
          p.vel.x = d.x * 12; p.vel.z = d.z * 12;
          move(p, dt); trySlideWin(p); return;
        }
        const sp = input.sprint ? 8.4 : 5.6;
        const ml = Math.min(1, Math.hypot(input.x, input.z));
        let tvx = 0, tvz = 0;
        if (ml > 0.05) { const d = camDir(input.x, input.z); tvx = d.x * sp * ml; tvz = d.z * sp * ml; }
        const k = Math.min(1, dt * 9);
        p.vel.x += (tvx - p.vel.x) * k; p.vel.z += (tvz - p.vel.z) * k;
        move(p, dt); return;
      }
      if (p.isGK) { aiKeeper(p, dt); return; }
      const att = (p.team === possTeam);
      const goalX = p.team === 'home' ? L : -L;
      let tx, tz, ms = 4.6;
      if (p === possessor) {
        const dx = goalX - p.pos.x, dz = ballPos.z * 0.2 - p.pos.z, d = Math.hypot(dx, dz) || 1;
        tx = p.pos.x + dx / d * 4; tz = p.pos.z + dz / d * 4; ms = 6.2;
      } else if (!possessor && nearestToBall(p.team).p === p) {
        tx = ballPos.x; tz = ballPos.z; ms = 7.6;
      } else if (!att && nearestToBall(p.team).p === p) {
        tx = ballPos.x; tz = ballPos.z; ms = 7;
      } else {
        const shift = (possTeam === p.team ? 9 : -5) * (p.team === 'home' ? 1 : -1);
        tx = p.home[0] + shift + Math.sin(matchSec * 0.3 + p.number) * 2;
        tz = p.home[1] + Math.cos(matchSec * 0.25 + p.number) * 2.5;
      }
      steer(p, tx, tz, ms, dt);
    });

    if (possessor && possessor.team === 'away') aiAttack(possessor);

    // ball physics
    if (possessor) {
      let f = vmag(possessor.vel) > 0.5 ? { x: possessor.vel.x, z: possessor.vel.z } : { x: facing.x, z: facing.z };
      const fl = Math.hypot(f.x, f.z) || 1;
      ballPos.x = possessor.pos.x + f.x / fl * 0.55;
      ballPos.z = possessor.pos.z + f.z / fl * 0.55;
      ballPos.y = 0.12; ballVel.x = possessor.vel.x; ballVel.z = possessor.vel.z; ballVel.y = 0;
    } else {
      ballVel.y -= 22 * dt;
      ballPos.x += ballVel.x * dt; ballPos.y += ballVel.y * dt; ballPos.z += ballVel.z * dt;
      if (ballPos.y < 0.12) { ballPos.y = 0.12; ballVel.y = -ballVel.y * 0.45; if (Math.abs(ballVel.y) < 1) ballVel.y = 0; ballVel.x *= 0.86; ballVel.z *= 0.86; }
      ballVel.x *= (1 - dt * 0.5); ballVel.z *= (1 - dt * 0.5);
      bounceWalls();
    }

    handleShoot(dt);
    if (input.passReq) { doPass(); input.passReq = false; }
    if (input.throughReq) { doThrough(); input.throughReq = false; }
    input.slideReq = false;
    if (slideCooldown > 0) slideCooldown -= dt;
    checkGoal();
    if (activeHome && vmag(activeHome.vel) > 0.6) { const m = vmag(activeHome.vel); facing = { x: activeHome.vel.x / m, z: activeHome.vel.z / m }; }

    // animation state
    players.forEach(p => { const sp = vmag(p.vel); p.speedN = Math.min(sp / 6, 1); p.anim += dt * (6 + p.speedN * 12); });
    if (goalFlashT > 0) goalFlashT -= dt;
    updateCamera(dt);
  }

  function move(p, dt) {
    p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
    p.pos.x = Math.max(-L - 1.5, Math.min(L + 1.5, p.pos.x));
    p.pos.z = Math.max(-W - 1.5, Math.min(W + 1.5, p.pos.z));
  }
  function steer(p, tx, tz, ms, dt) {
    const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * 6);
    p.vel.x += (dx / d * ms - p.vel.x) * k; p.vel.z += (dz / d * ms - p.vel.z) * k;
    if (d < 0.5) { p.vel.x *= 0.6; p.vel.z *= 0.6; }
    move(p, dt);
  }
  function aiKeeper(p, dt) {
    const goalX = p.team === 'home' ? -L : L;
    const tx = goalX + (p.team === 'home' ? 2.2 : -2.2);
    const tz = Math.max(-4, Math.min(4, ballPos.z * 0.5));
    steer(p, tx, tz, Math.abs(ballPos.x - goalX) < 22 ? 6 : 3, dt);
  }
  function aiAttack(p) {
    const goalX = -L, d = Math.abs(p.pos.x - goalX);
    if (d < 26 && Math.random() < 0.012) shootBall({ x: goalX, z: (Math.random() - 0.5) * 5 }, 0.8);
    else if (Math.random() < 0.006) doPassFrom(p);
  }
  function handleShoot(dt) {
    const can = possessor && possessor.team === 'home' && possessor === activeHome;
    if (input.shootHeld && can) { charging = true; power = Math.min(1, power + dt * 1.25); }
    else if (charging) {
      if (possessor && possessor.team === 'home') {
        const aimZ = Math.max(-3.4, Math.min(3.4, ballPos.z * 0.4 + input.x * 4));
        shootBall({ x: L, z: aimZ }, 0.35 + power * 0.65);
      }
      charging = false; power = 0;
    }
  }
  function shootBall(target, pw) {
    const dx = target.x - ballPos.x, dz = target.z - ballPos.z, d = Math.hypot(dx, dz) || 1;
    const speed = 14 + pw * 22;
    ballVel = { x: dx / d * speed, y: 4 + pw * 6, z: dz / d * speed };
    possessor = null; lastTouch = 0.45;
  }
  function doPass() { if (possessor && possessor.team === 'home') doPassFrom(possessor); }
  function trySlideWin(p) {
    if (dist(p.pos, ballPos) < 1.5) {
      const d = p.slideDir || facing; const m = Math.hypot(d.x, d.z) || 1;
      ballVel = { x: d.x / m * 9, y: 1.4, z: d.z / m * 9 };
      possessor = null; possTeam = 'home'; lastTouch = 0.28;
    }
  }
  function doThrough() {
    if (!possessor || possessor.team !== 'home') return;
    const p = possessor; let best = null, bs = -1e9;
    players.forEach(q => {
      if (q === p || q.team !== 'home' || q.isGK) return;
      const ahead = q.pos.x - p.pos.x, dd = dist(q.pos, p.pos);
      if (dd < 5 || dd > 48) return;
      const sc = ahead * 3 - Math.abs(q.pos.z - p.pos.z) * 0.5 - dd * 0.15;
      if (sc > bs) { bs = sc; best = q; }
    });
    if (!best) return;
    const tx = Math.min(L - 2, best.pos.x + 8), tz = best.pos.z; // lead into space
    const dx = tx - ballPos.x, dz = tz - ballPos.z, d = Math.hypot(dx, dz) || 1;
    ballVel = { x: dx / d * 17, y: 1.1, z: dz / d * 17 };
    possessor = null; lastTouch = 0.32;
  }
  function doPassFrom(p) {
    const fwd = p.team === 'home' ? 1 : -1; let best = null, bs = -1e9;
    players.forEach(q => {
      if (q === p || q.team !== p.team || q.isGK) return;
      const ahead = (q.pos.x - p.pos.x) * fwd, dd = dist(q.pos, p.pos);
      if (dd < 4 || dd > 40) return;
      const sc = ahead * 2 - dd * 0.4; if (sc > bs) { bs = sc; best = q; }
    });
    if (!best) return;
    const dx = best.pos.x - ballPos.x, dz = best.pos.z - ballPos.z, d = Math.hypot(dx, dz) || 1;
    ballVel = { x: dx / d * (10 + d * 0.5), y: 1.5, z: dz / d * (10 + d * 0.5) };
    possessor = null; lastTouch = 0.3;
  }
  function bounceWalls() {
    if (ballPos.z > W) { ballPos.z = W; ballVel.z = -ballVel.z * 0.6; }
    if (ballPos.z < -W) { ballPos.z = -W; ballVel.z = -ballVel.z * 0.6; }
    const inMouth = Math.abs(ballPos.z) < PITCH.GOAL_W / 2 && ballPos.y < PITCH.GOAL_H;
    if (ballPos.x > L && !inMouth) { ballPos.x = L; ballVel.x = -ballVel.x * 0.6; }
    if (ballPos.x < -L && !inMouth) { ballPos.x = -L; ballVel.x = -ballVel.x * 0.6; }
  }
  function checkGoal() {
    const inMouth = Math.abs(ballPos.z) < PITCH.GOAL_W / 2 && ballPos.y < PITCH.GOAL_H;
    if (ballPos.x > L + 0.3 && inMouth) { scoreH++; goal('home'); }
    else if (ballPos.x < -L - 0.3 && inMouth) { scoreA++; goal('away'); }
  }
  function goal(team) {
    goalFlashT = 2.2;
    const fl = document.getElementById('goalFlash');
    fl.classList.add('show'); setTimeout(() => fl.classList.remove('show'), 1700);
    resetKickoff(team === 'home' ? 'away' : 'home');
  }

  // ---------- camera ----------
  let camX = 0;
  function updateCamera(dt) {
    const tx = Math.max(-26, Math.min(26, ballPos.x * 0.72));
    camX += (tx - camX) * Math.min(1, dt * 2.2);
    View.eye.x = camX; View.eye.y = 25; View.eye.z = -52;
    View.target.x = camX * 1.04; View.target.y = 1.5; View.target.z = 4;
    View.fov = 40;
    updateCameraBasis();
  }

  // ---------- render ----------
  function render() {
    ctx.clearRect(0, 0, View.W, View.H);
    drawSky(ctx);
    drawStadium(ctx);
    drawField(ctx);
    drawGoal(ctx, -1); drawGoal(ctx, 1);
    // entities sorted far->near by camera depth
    const ents = players.map(p => ({ p, cz: project(p.pos.x, 0, p.pos.z).cz })).filter(e => e.cz > 0);
    ents.push({ ball: true, cz: project(ballPos.x, 0, ballPos.z).cz });
    ents.sort((a, b) => b.cz - a.cz);
    ents.forEach(e => { if (e.ball) drawBall(ctx, ballPos); else drawPlayer(ctx, e.p, e.p === activeHome); });
    drawOverlay(ctx);
  }

  // ---------- HUD ----------
  let rctx; const radar = () => document.getElementById('radar');
  function drawRadar() {
    const r = radar(); if (!rctx) rctx = r.getContext('2d');
    const w = r.width, h = r.height, pad = 8;
    rctx.clearRect(0, 0, w, h);
    rctx.fillStyle = 'rgba(20,90,40,0.85)'; rr(rctx, 2, 2, w - 4, h - 4, 8); rctx.fill();
    rctx.strokeStyle = 'rgba(255,255,255,0.5)'; rctx.lineWidth = 1; rctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    rctx.beginPath(); rctx.moveTo(w / 2, pad); rctx.lineTo(w / 2, h - pad); rctx.stroke();
    rctx.beginPath(); rctx.arc(w / 2, h / 2, 9, 0, 7); rctx.stroke();
    const mx = x => pad + (x + L) / (2 * L) * (w - pad * 2), mz = z => pad + (z + W) / (2 * W) * (h - pad * 2);
    players.forEach(p => { rctx.beginPath(); rctx.fillStyle = p.team === 'home' ? '#ff4757' : '#3a7bff'; rctx.arc(mx(p.pos.x), mz(p.pos.z), p === activeHome ? 3.4 : 2.4, 0, 7); rctx.fill(); if (p === activeHome) { rctx.strokeStyle = '#fff'; rctx.lineWidth = 1.4; rctx.stroke(); } });
    rctx.beginPath(); rctx.fillStyle = '#fff'; rctx.arc(mx(ballPos.x), mz(ballPos.z), 2, 0, 7); rctx.fill();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function updateHUD() {
    const mm = Math.floor(matchSec / 60), ss = Math.floor(matchSec % 60);
    document.getElementById('clock').textContent = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    document.getElementById('scH').textContent = scoreH; document.getElementById('scA').textContent = scoreA;
    drawRadar();
    const pw = document.getElementById('powerWrap');
    if (charging) { pw.classList.add('show'); document.getElementById('powerFill').style.width = (power * 100).toFixed(0) + '%'; } else pw.classList.remove('show');
    const tag = document.getElementById('nameTag');
    if (activeHome) {
      const p = project(activeHome.pos.x, 2.15, activeHome.pos.z);
      if (p.vis) { tag.style.display = 'flex'; tag.style.left = (p.x / View.dpr) + 'px'; tag.style.top = (p.y / View.dpr) + 'px'; tag.querySelector('.num').textContent = activeHome.number; tag.querySelector('.nm').textContent = activeHome.name; }
      else tag.style.display = 'none';
    }
  }

  // ---------- boot ----------
  function resize() {
    View.dpr = Math.min(devicePixelRatio || 1, 2);
    View.W = innerWidth * View.dpr; View.H = innerHeight * View.dpr;
    canvas.width = View.W; canvas.height = View.H;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  }
  let lastFrame = 0;
  function step(now) {
    now = now || performance.now();
    const dt = Math.min((now - last) / 1000 || 0, 0.05); last = now;
    try { update(dt); render(); updateHUD(); }
    catch (e) { if (!window.__loopErr) { window.__loopErr = (e && e.stack) || String(e); console.error('loop error:', e); } }
    lastFrame = performance.now();
  }
  function rafLoop(t) { raf = requestAnimationFrame(rafLoop); step(t); }
  function init() {
    canvas = document.getElementById('c'); ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    resize(); addEventListener('resize', resize);
    spawn(); resetKickoff('home'); bindInput();
    updateCamera(0.016);
    const ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
    last = performance.now(); lastFrame = last;
    raf = requestAnimationFrame(rafLoop);
    // fallback driver if rAF is throttled/not firing (e.g. non-painting iframe)
    setInterval(function () { if (performance.now() - lastFrame > 120) step(); }, 33);
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init); else init();
})();
