// render.js — dependency-free perspective renderer for the pitch, stadium, players, ball
window.PITCH = { L: 105, W: 68, HALFL: 52.5, HALFW: 34, GOAL_W: 7.32, GOAL_H: 2.44 };

const View = {
  W: 0, H: 0, dpr: 1,
  eye: { x: 0, y: 34, z: -64 },
  target: { x: 0, y: 2, z: 6 },
  fov: 42,
  focal: 1, fwd: null, right: null, up: null,
};

function vsub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function vdot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function vcross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function vlen(a) { return Math.hypot(a.x, a.y, a.z); }
function vnorm(a) { const l = vlen(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; }

function updateCameraBasis() {
  View.fwd = vnorm(vsub(View.target, View.eye));
  View.right = vnorm(vcross(View.fwd, { x: 0, y: 1, z: 0 }));
  View.up = vcross(View.right, View.fwd);
  View.focal = (View.H / 2) / Math.tan((View.fov / 2) * Math.PI / 180);
}

// project a world point -> {x,y,scale,cz,vis}
function project(wx, wy, wz) {
  const rel = { x: wx - View.eye.x, y: wy - View.eye.y, z: wz - View.eye.z };
  const cz = vdot(rel, View.fwd);
  if (cz <= 0.15) return { vis: false, cz: cz };
  const cx = vdot(rel, View.right), cy = vdot(rel, View.up);
  return {
    x: View.W / 2 + (cx / cz) * View.focal,
    y: View.H / 2 - (cy / cz) * View.focal,
    scale: View.focal / cz, cz: cz, vis: true,
  };
}

// ---- stadium crowd (precomputed once) ----
let CROWD = null;
function buildCrowd() {
  CROWD = [];
  const pal = ['#ff5a5f', '#ffd23f', '#3fa7ff', '#ffffff', '#4cd964', '#ff8c42', '#b07dff', '#ff9ecb'];
  const add = (xr, zr, n) => {
    for (let i = 0; i < n; i++) {
      const x = xr[0] + Math.random() * (xr[1] - xr[0]);
      const z = zr[0] + Math.random() * (zr[1] - zr[0]);
      const y = 1 + Math.random() * 12;
      CROWD.push({ x, y, z, c: pal[(Math.random() * pal.length) | 0] });
    }
  };
  add([-78, 78], [38, 54], 1100);   // far side
  add([60, 76], [-40, 40], 600);    // right end
  add([-76, -60], [-40, 40], 600);  // left end
}

function fillQuad(ctx, pts, style) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath(); ctx.fillStyle = style; ctx.fill();
}

function drawStadium(ctx) {
  if (!CROWD) buildCrowd();
  // far stand base wall
  const wall = (x0, z0, x1, z1, h, col) => {
    const a = project(x0, 0, z0), b = project(x1, 0, z1), c = project(x1, h, z1), d = project(x0, h, z0);
    if (a.vis && b.vis && c.vis && d.vis) fillQuad(ctx, [a, b, c, d], col);
  };
  wall(-80, 56, 80, 56, 15, '#39414f');   // far
  wall(78, -42, 78, 42, 15, '#333b48');    // right
  wall(-78, -42, -78, 42, 15, '#333b48');  // left
  // crowd dots
  for (let i = 0; i < CROWD.length; i++) {
    const p = project(CROWD[i].x, CROWD[i].y, CROWD[i].z);
    if (!p.vis) continue;
    const s = Math.max(1, p.scale * 0.18);
    ctx.fillStyle = CROWD[i].c;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
}
window.drawStadium = drawStadium;
window.project = project;
window.updateCameraBasis = updateCameraBasis;
window.View = View;

// ---- pitch ----
function gPath(ctx, pts, close) {
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const p = project(pts[i][0], 0, pts[i][1]);
    if (!p.vis) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  }
  if (close && started) ctx.closePath();
}
function circlePts(cx, cz, r, n, a0, a1) {
  a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1;
  const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return out;
}
function rectPts(x0, z0, w, h) { return [[x0, z0], [x0 + w, z0], [x0 + w, z0 + h], [x0, z0 + h]]; }

function drawField(ctx) {
  const L = 52.5, W = 34;
  // outer grass
  ctx.beginPath(); gPath(ctx, rectPts(-78, -56, 156, 112), true); ctx.fillStyle = '#2f8a36'; ctx.fill();
  // mowing stripes
  const n = 18, step = 105 / n;
  for (let i = 0; i < n; i++) {
    const x0 = -L + i * step;
    ctx.beginPath(); gPath(ctx, rectPts(x0, -W, step, W * 2), true);
    ctx.fillStyle = i % 2 ? '#57c247' : '#4cb23c'; ctx.fill();
  }
  // lines
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  const seg = (a) => { ctx.beginPath(); gPath(ctx, a, false); ctx.lineWidth = Math.max(1.2, project(a[0][0], 0, a[0][1]).scale * 0.12); ctx.stroke(); };
  const poly = (a, cl) => { ctx.beginPath(); gPath(ctx, a, cl); ctx.lineWidth = Math.max(1.2, project(a[0][0], 0, a[0][1]).scale * 0.12); ctx.stroke(); };
  poly(rectPts(-L, -W, 105, 68), true);
  seg([[0, -W], [0, W]]);
  poly(circlePts(0, 0, 9.15, 40), true);
  poly(rectPts(-L, -20.16, 16.5, 40.32), true);
  poly(rectPts(L - 16.5, -20.16, 16.5, 40.32), true);
  poly(rectPts(-L, -9.16, 5.5, 18.32), true);
  poly(rectPts(L - 5.5, -9.16, 5.5, 18.32), true);
  poly(circlePts(-41.5, 0, 9.15, 18, -0.92, 0.92), false);
  poly(circlePts(41.5, 0, 9.15, 18, Math.PI - 0.92, Math.PI + 0.92), false);
  // spots
  [[-41.5, 0], [41.5, 0], [0, 0]].forEach(s => { const p = project(s[0], 0, s[1]); if (p.vis) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.scale * 0.18), 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); } });
}
window.drawField = drawField;

// ---- goals ----
function drawGoal(ctx, xSign) {
  const x = xSign * 52.5, hw = PITCH.GOAL_W / 2, h = PITCH.GOAL_H, depth = xSign * 2.2;
  const post = (z) => { const b = project(x, 0, z), t = project(x, h, z); if (b.vis && t.vis) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.lineWidth = Math.max(2, t.scale * 0.13); ctx.strokeStyle = '#fff'; ctx.stroke(); } };
  // net (back + side panels) — faint
  const net = (pts) => { ctx.beginPath(); let st = false; pts.forEach(p => { const pr = project(p[0], p[1], p[2]); if (!pr.vis) { st = false; return; } if (!st) { ctx.moveTo(pr.x, pr.y); st = true; } else ctx.lineTo(pr.x, pr.y); }); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke(); };
  net([[x, 0, -hw], [x + depth, 0, -hw], [x + depth, h, -hw], [x, h, -hw]]);
  net([[x, 0, hw], [x + depth, 0, hw], [x + depth, h, hw], [x, h, hw]]);
  net([[x + depth, 0, -hw], [x + depth, 0, hw], [x + depth, h, hw], [x + depth, h, -hw]]);
  post(-hw); post(hw);
  const tl = project(x, h, -hw), tr = project(x, h, hw);
  if (tl.vis && tr.vis) { ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineWidth = Math.max(2, tl.scale * 0.13); ctx.strokeStyle = '#fff'; ctx.stroke(); }
}
window.drawGoal = drawGoal;

// ---- player billboard (reads as 3D: ground shadow + shaded upright figure) ----
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, r * f) | 0; g = Math.min(255, g * f) | 0; b = Math.min(255, b * f) | 0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function drawPlayer(ctx, p, active) {
  const foot = project(p.pos.x, 0, p.pos.z);
  if (!foot.vis) return;
  const U = foot.scale;              // pixels per metre at this depth
  const x = foot.x, y = foot.y;
  // ground shadow
  ctx.save(); ctx.globalAlpha = 0.26; ctx.fillStyle = '#06210d';
  ctx.beginPath(); ctx.ellipse(x, y, 0.55 * U, 0.2 * U, 0, 0, 7); ctx.fill(); ctx.restore();
  // active player ring
  if (active) { ctx.save(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = Math.max(2, 0.07 * U); ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.ellipse(x, y, 0.62 * U, 0.24 * U, 0, 0, 7); ctx.stroke(); ctx.restore(); }

  const shirt = p.kit.shirt, shorts = p.kit.shorts, socks = p.kit.socks, skin = p.kit.skin;
  const sw = Math.sin(p.anim) * (p.speedN || 0);   // run swing
  const dir = (p.vel && p.vel.x > 0.2) ? -1 : 1;   // face movement direction on screen
  const lineW = Math.max(0.8, 0.025 * U);
  const stroked = (col) => { ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lineW; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.stroke(); };
  const Y = (m) => y - m * U;        // metres up from feet
  const X = (m) => x + m * U * dir;

  // ---- sliding pose ----
  if (p.slideT > 0) {
    const sd = (p.slideDir && p.slideDir.x > 0) ? -1 : 1;
    const XX = (m) => x + m * U * sd;
    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#e3ecdd';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(XX(-0.2 - i * 0.16), y - 0.02 * U, (0.1 + i * 0.04) * U, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(XX(-0.35), Y(0.42)); ctx.lineTo(XX(-0.15), Y(0.42)); ctx.lineTo(XX(-0.05), Y(0.05)); ctx.lineTo(XX(-0.22), Y(0.05)); ctx.closePath(); stroked(shade(socks, 0.85));
    ctx.beginPath(); roundRectP(ctx, XX(-0.3), Y(0.6), 0.42 * U, 0.26 * U, 0.05 * U); stroked(shorts);
    ctx.beginPath(); ctx.moveTo(XX(0.05), Y(0.62)); ctx.lineTo(XX(0.05), Y(0.4)); ctx.lineTo(XX(1.05), Y(0.12)); ctx.lineTo(XX(1.0), Y(0.32)); ctx.closePath(); stroked(socks);
    ctx.beginPath(); ctx.ellipse(XX(1.08), Y(0.16), 0.12 * U, 0.07 * U, 0, 0, 7); ctx.fillStyle = '#161616'; ctx.fill();
    ctx.save(); ctx.translate(XX(-0.34), Y(0.78)); ctx.rotate(sd * 0.5);
    ctx.beginPath(); roundRectP(ctx, -0.22 * U, -0.5 * U, 0.44 * U, 0.52 * U, 0.12 * U); stroked(shirt); ctx.restore();
    ctx.beginPath(); ctx.moveTo(XX(-0.5), Y(1.0)); ctx.lineTo(XX(-0.4), Y(1.05)); ctx.lineTo(XX(-0.7), Y(1.35)); ctx.lineTo(XX(-0.8), Y(1.28)); ctx.closePath(); stroked(skin);
    ctx.beginPath(); ctx.arc(XX(-0.62), Y(1.15), 0.16 * U, 0, 7); stroked(skin);
    ctx.beginPath(); ctx.arc(XX(-0.66), Y(1.2), 0.165 * U, Math.PI * 1.3, Math.PI * 2.3); ctx.fillStyle = p.hair || '#2a1d12'; ctx.fill();
    return;
  }
  // helper: capsule limb with a long-axis gradient for a rounded 3D feel
  const limb = (x0, y0, x1, y1, w, c1, c2) => {
    const g = ctx.createLinearGradient(x0 - w, y0, x0 + w, y0);
    g.addColorStop(0, shade(c1, 0.82)); g.addColorStop(0.45, c1); g.addColorStop(1, shade(c2 || c1, 1.12));
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = g; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = w + lineW * 1.4; ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.globalCompositeOperation = 'destination-over';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  };

  // ---- legs: thigh (skin) + sock + boot ----
  [[-0.1, sw], [0.1, -sw]].forEach(([ox, s]) => {
    const kneeX = X(ox + s * 0.06), footX = X(ox + s * 0.16);
    limb(X(ox), Y(0.92), kneeX, Y(0.5), 0.15 * U, skin);            // thigh
    limb(kneeX, Y(0.5), footX, Y(0.1), 0.135 * U, socks);          // shin (sock)
    // boot
    ctx.save();
    const bg = ctx.createLinearGradient(footX, Y(0.14), footX, Y(0));
    bg.addColorStop(0, '#2b2b2b'); bg.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = bg; ctx.beginPath();
    ctx.ellipse(footX + 0.05 * U * dir, Y(0.05), 0.14 * U, 0.07 * U, 0, 0, 7); ctx.fill();
    ctx.restore();
  });

  // ---- back arm (drawn before torso so shoulder is covered) ----
  const drawArm = (ox, s, w) => {
    const hx = X(ox), hy = Y(1.5), hndX = X(ox + s * 0.1 + 0.05 * dir), hndY = Y(0.98);
    limb(hx, hy, hndX, hndY, w, skin);
  };
  drawArm(-0.26, -sw, 0.1 * U); // far-side arm

  // ---- shorts ----
  ctx.save();
  const sg = ctx.createLinearGradient(X(-0.21), 0, X(0.21), 0);
  sg.addColorStop(0, shade(shorts, 0.82)); sg.addColorStop(0.5, shorts); sg.addColorStop(1, shade(shorts, 1.1));
  ctx.beginPath(); roundRectP(ctx, X(-0.2), Y(1.16), 0.4 * U, 0.34 * U, 0.08 * U);
  ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = lineW; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
  ctx.restore();

  // ---- torso: tapered jersey (wider shoulders) with gradient ----
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(X(-0.26), Y(1.66));                 // left shoulder
  ctx.quadraticCurveTo(X(-0.3), Y(1.5), X(-0.21), Y(1.18)); // left side in to waist
  ctx.lineTo(X(0.21), Y(1.18));                  // waist
  ctx.quadraticCurveTo(X(0.3), Y(1.5), X(0.26), Y(1.66));   // right side up to shoulder
  ctx.quadraticCurveTo(X(0), Y(1.72), X(-0.26), Y(1.66));   // shoulder line w/ slight crown
  ctx.closePath();
  const tg = ctx.createLinearGradient(X(-0.28), 0, X(0.28), 0);
  tg.addColorStop(0, shade(shirt, 0.78)); tg.addColorStop(0.45, shade(shirt, 1.05)); tg.addColorStop(1, shade(shirt, 1.2));
  ctx.fillStyle = tg; ctx.fill();
  ctx.lineWidth = lineW; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.stroke();
  // collar
  ctx.beginPath(); ctx.moveTo(X(-0.07), Y(1.66)); ctx.quadraticCurveTo(X(0), Y(1.6), X(0.07), Y(1.66));
  ctx.lineWidth = lineW * 1.5; ctx.strokeStyle = shade(shirt, 0.6); ctx.stroke();
  ctx.restore();

  // ---- number, clipped inside the jersey so it can never spill out ----
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(X(-0.24), Y(1.64)); ctx.lineTo(X(0.24), Y(1.64));
  ctx.lineTo(X(0.2), Y(1.2)); ctx.lineTo(X(-0.2), Y(1.2)); ctx.closePath();
  ctx.clip();
  const light = (shirt === '#ffffff' || shirt === '#fff');
  ctx.fillStyle = light ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.95)';
  const twoDigit = String(p.number).length > 1;
  ctx.font = '800 ' + ((twoDigit ? 0.2 : 0.26) * U) + "px 'Saira Condensed', Arial, sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(p.number, X(0), Y(1.4));
  ctx.restore();

  // ---- front (near-side) arm, over the torso ----
  const frontArm = (ox, s) => {
    const hx = X(ox), hy = Y(1.5), hndX = X(ox + s * 0.1 + 0.06 * dir), hndY = Y(0.98);
    limb(hx, hy, hndX, hndY, 0.11 * U, skin);
    // sleeve cap in shirt colour
    ctx.save(); ctx.fillStyle = shade(shirt, 0.92);
    ctx.beginPath(); ctx.ellipse(hx, hy, 0.1 * U, 0.08 * U, 0, 0, 7); ctx.fill(); ctx.restore();
  };
  frontArm(0.26 * dir, sw);

  // ---- neck + head ----
  ctx.save();
  ctx.fillStyle = shade(skin, 0.85);
  ctx.beginPath(); roundRectP(ctx, X(-0.05), Y(1.78), 0.1 * U, 0.1 * U, 0.03 * U); ctx.fill();
  ctx.restore();
  // head with soft radial shading
  const hr = 0.16 * U, hx = X(0.02 * dir), hy = Y(1.92);
  const hg = ctx.createRadialGradient(hx - hr * 0.4, hy - hr * 0.4, hr * 0.2, hx, hy, hr * 1.2);
  hg.addColorStop(0, shade(skin, 1.12)); hg.addColorStop(1, shade(skin, 0.82));
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fillStyle = hg; ctx.fill();
  ctx.lineWidth = lineW; ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.stroke();
  // hair cap
  ctx.beginPath(); ctx.arc(hx, hy + hr * 0.15, hr * 1.02, Math.PI * 1.04, Math.PI * 2.06); ctx.closePath();
  ctx.fillStyle = p.hair || '#2a1d12'; ctx.fill();
}
function roundRectP(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
window.drawPlayer = drawPlayer;

function drawBall(ctx, bp) {
  const sh = project(bp.x, 0, bp.z);
  if (sh.vis) { ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#06210d'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.22 * sh.scale, 0.1 * sh.scale, 0, 0, 7); ctx.fill(); ctx.restore(); }
  const p = project(bp.x, bp.y, bp.z);
  if (!p.vis) return;
  const r = 0.13 * p.scale;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.12); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
  // pentagon hint
  ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(p.x - r * 0.15, p.y - r * 0.15, r * 0.32, 0, 7); ctx.fill();
}
window.drawBall = drawBall;

// ---- atmosphere: sky with sun, and a cinematic light/vignette overlay ----
function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, View.H);
  g.addColorStop(0, '#3f9fe8'); g.addColorStop(0.45, '#7fc7ff'); g.addColorStop(0.7, '#bfe6ff'); g.addColorStop(1, '#dff2ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, View.W, View.H);
  // sun glow upper-left
  const sx = View.W * 0.2, sy = View.H * 0.16, sr = View.H * 0.5;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
  sg.addColorStop(0, 'rgba(255,250,225,0.85)'); sg.addColorStop(0.25, 'rgba(255,247,210,0.35)'); sg.addColorStop(1, 'rgba(255,247,210,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, View.W, View.H);
}
function drawOverlay(ctx) {
  // warm sunlight wash from upper-left
  const lg = ctx.createLinearGradient(0, 0, View.W * 0.7, View.H);
  lg.addColorStop(0, 'rgba(255,244,214,0.12)'); lg.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, View.W, View.H);
  // vignette
  const vg = ctx.createRadialGradient(View.W / 2, View.H * 0.52, View.H * 0.3, View.W / 2, View.H * 0.52, View.H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,20,30,0.34)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, View.W, View.H);
}
window.drawSky = drawSky;
window.drawOverlay = drawOverlay;
