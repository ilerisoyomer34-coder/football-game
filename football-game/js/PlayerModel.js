import * as THREE from 'three';

// Shared material cache for performance (22 players)
const _matCache = new Map();
function mat(color, rough = 0.8, metal = 0, emissive = 0) {
  const key = `${color}_${rough}_${metal}_${emissive}`;
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  if (emissive) m.emissive = new THREE.Color(emissive);
  _matCache.set(key, m);
  return m;
}

function createJerseyTexture(jerseyColor, isGoalkeeper, number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = (jerseyColor >> 16) & 0xff;
  const g = (jerseyColor >> 8) & 0xff;
  const b = jerseyColor & 0xff;
  const hex = `rgb(${r},${g},${b})`;
  const darker = `rgb(${Math.max(0,r-50)},${Math.max(0,g-50)},${Math.max(0,b-50)})`;
  const lighter = `rgb(${Math.min(255,r+50)},${Math.min(255,g+50)},${Math.min(255,b+50)})`;

  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);

  if (isGoalkeeper) {
    // GK: bold diagonal pattern
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = -256; i < 512; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i+26, 0);
      ctx.lineTo(i+26+256, 256); ctx.lineTo(i+256, 256);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = lighter;
    ctx.fillRect(0, 105, 256, 46);
  } else {
    // Side panels
    ctx.fillStyle = darker;
    ctx.fillRect(0, 0, 48, 256);
    ctx.fillRect(208, 0, 48, 256);
    // Shoulder stripe
    ctx.fillStyle = lighter;
    ctx.fillRect(48, 0, 160, 24);
  }
  // Number
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 128, 148);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 4;
  ctx.strokeText(String(number), 128, 148);
  return new THREE.CanvasTexture(canvas);
}

const SKIN_TONES  = [0xffcc99, 0xf5b580, 0xd49268, 0xffdbac, 0xe8a87c, 0xc8855a, 0x8d5524, 0xffd5b0];
const HAIR_COLORS = [0x1a0a00, 0x2c1810, 0x5c3a1e, 0x888070, 0xf0c040, 0x111111, 0x663300, 0xdddddd];
const BOOT_COLORS = [0xcc0000, 0x0044cc, 0x00aa44, 0xffaa00, 0x111111, 0xffffff, 0x9900cc, 0x00cccc];

export function createPlayerModel(options = {}) {
  const { teamColor = 0x1565c0, isGoalkeeper = false, number = 1 } = options;
  const group = new THREE.Group();

  const skinColor  = SKIN_TONES[number % SKIN_TONES.length];
  const hairColor  = HAIR_COLORS[number % HAIR_COLORS.length];
  const bootColor  = BOOT_COLORS[number % BOOT_COLORS.length];
  const jerseyCol  = isGoalkeeper ? 0xf57f17 : teamColor;
  const shortsCol  = isGoalkeeper ? 0x1a237e : 0x080814;
  const sockCol    = 0xf5f5f5;
  const gloveCol   = isGoalkeeper ? 0xfbc02d : skinColor;

  const skinMat   = mat(skinColor, 0.82);
  const hairMat   = mat(hairColor, 1.0);
  const shortsMat = mat(shortsCol, 0.85);
  const sockMat   = mat(sockCol, 0.9);
  const bootMat   = mat(bootColor, 0.28, 0.18);
  const gloveMat  = mat(gloveCol, 0.85);

  function mk(geo, material) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    return m;
  }

  // ── HEAD ──────────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.82, 0);
  group.add(head);

  // Face — slightly squared, FC-mobile style
  const faceGeo = new THREE.BoxGeometry(0.38, 0.38, 0.32);
  faceGeo.translate(0, -0.02, 0);
  const face = mk(new THREE.SphereGeometry(0.265, 18, 14), skinMat);
  head.add(face);
  // Slightly squared jaw
  const jaw = mk(new THREE.BoxGeometry(0.34, 0.14, 0.28), skinMat);
  jaw.position.set(0, -0.145, 0);
  head.add(jaw);

  // Hair — full coverage with slight widow's peak
  const hairDome = mk(new THREE.SphereGeometry(0.272, 16, 8, 0, Math.PI*2, 0, Math.PI*0.58), hairMat);
  hairDome.position.y = 0.025;
  head.add(hairDome);
  // Sideburns
  const sbL = mk(new THREE.BoxGeometry(0.06, 0.12, 0.04), hairMat);
  sbL.position.set(-0.265, -0.08, 0.1); head.add(sbL);
  const sbR = mk(new THREE.BoxGeometry(0.06, 0.12, 0.04), hairMat);
  sbR.position.set(0.265, -0.08, 0.1); head.add(sbR);

  // Eyes
  const eyeWhiteMat = mat(0xfafafa, 1.0);
  for (const [sx, name] of [[-1, 'L'], [1, 'R']]) {
    const ew = mk(new THREE.SphereGeometry(0.048, 8, 6), eyeWhiteMat);
    ew.position.set(sx * 0.093, 0.05, 0.24); head.add(ew);
    const ep = mk(new THREE.SphereGeometry(0.034, 7, 5), mat(0x111111));
    ep.position.set(sx * 0.093, 0.05, 0.266); head.add(ep);
    // Eyebrow — bold FC Mobile style
    const brow = mk(new THREE.BoxGeometry(0.088, 0.025, 0.024), hairMat);
    brow.position.set(sx * 0.09, 0.122, 0.248);
    brow.rotation.z = sx * -0.14;
    head.add(brow);
  }
  // Nose — more prominent
  const nose = mk(new THREE.SphereGeometry(0.038, 7, 5), skinMat);
  nose.position.set(0, -0.015, 0.275);
  nose.scale.set(0.9, 0.8, 0.7);
  head.add(nose);
  // Ears
  for (const sx of [-1, 1]) {
    const ear = mk(new THREE.SphereGeometry(0.068, 7, 5), skinMat);
    ear.position.set(sx * 0.272, 0.01, 0.02);
    ear.scale.set(0.52, 0.76, 0.42);
    head.add(ear);
  }

  // ── NECK ──────────────────────────────────────────────────────────────────
  const neck = mk(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 8), skinMat);
  neck.position.set(0, 1.575, 0);
  group.add(neck);

  // ── TORSO — FC Mobile: broad V-shape ─────────────────────────────────────
  const jerseyTex  = createJerseyTexture(jerseyCol, isGoalkeeper, number);
  const jerseyMat  = new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.75 });
  const jerseyFlatMat = mat(jerseyCol, 0.75);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 1.13, 0);
  group.add(torso);
  // Broad shoulders section
  const shoulders = mk(new THREE.BoxGeometry(0.62, 0.22, 0.3), jerseyFlatMat);
  shoulders.position.y = 0.2;
  torso.add(shoulders);
  // Main body (tapered to waist)
  const body = mk(new THREE.BoxGeometry(0.52, 0.42, 0.29), jerseyFlatMat);
  body.position.y = -0.01;
  torso.add(body);
  // Front with number
  const front = mk(new THREE.PlaneGeometry(0.44, 0.48), jerseyMat);
  front.position.set(0, -0.01, 0.148);
  torso.add(front);
  // Collar (V-neck)
  const collar = mk(new THREE.TorusGeometry(0.09, 0.025, 7, 14, Math.PI), mat(0xffffff, 0.6));
  collar.position.set(0, 0.295, 0.068);
  collar.rotation.x = -0.22;
  torso.add(collar);
  // Sleeve cuffs
  for (const sx of [-1, 1]) {
    const cuff = mk(new THREE.CylinderGeometry(0.086, 0.082, 0.06, 7), mat(0xffffff, 0.7));
    cuff.position.set(sx * 0.34, 0.17, 0);
    torso.add(cuff);
  }

  // ── UPPER ARMS — pivot at shoulder ───────────────────────────────────────
  for (const [sx, nameSide] of [[-1, 'left'], [1, 'right']]) {
    const ua = new THREE.Group();
    ua.name = `${nameSide}UpperArm`;
    ua.position.set(sx * 0.355, 1.42, 0);
    group.add(ua);

    // Muscular upper arm - slightly wider in middle
    const uaMesh = mk(new THREE.CapsuleGeometry(0.072, 0.22, 4, 8), jerseyFlatMat);
    uaMesh.position.y = -0.19;
    ua.add(uaMesh);

    // Lower arm group — pivot at elbow
    const la = new THREE.Group();
    la.name = `${nameSide}LowerArm`;
    la.position.set(0, -0.37, 0);
    ua.add(la);

    const laMesh = mk(new THREE.CapsuleGeometry(0.058, 0.2, 4, 8), skinMat);
    laMesh.position.y = -0.13;
    la.add(laMesh);

    // Hand/glove
    const hand = mk(new THREE.SphereGeometry(0.065, 8, 6), gloveMat);
    hand.position.y = -0.3;
    if (isGoalkeeper) hand.scale.set(1.3, 1.0, 1.45); // flat goalkeeper gloves
    la.add(hand);
  }

  // ── HIPS ──────────────────────────────────────────────────────────────────
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.79, 0);
  group.add(hips);
  const hipsMesh = mk(new THREE.BoxGeometry(0.5, 0.2, 0.28), shortsMat);
  hips.add(hipsMesh);

  // Shorts stripes
  for (const sx of [-1, 1]) {
    const stripe = mk(new THREE.BoxGeometry(0.02, 0.18, 0.005), mat(0xffffff, 0.9));
    stripe.position.set(sx * 0.27, 0, 0.142);
    hips.add(stripe);
  }

  // ── UPPER LEGS — pivot at hip ─────────────────────────────────────────────
  for (const [sx, nameSide] of [[-1, 'left'], [1, 'right']]) {
    const ul = new THREE.Group();
    ul.name = `${nameSide}UpperLeg`;
    ul.position.set(sx * 0.135, 0.79, 0);
    group.add(ul);

    // Muscular thigh — CapsuleGeometry
    const ulMesh = mk(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), shortsMat);
    ulMesh.position.y = -0.22;
    ul.add(ulMesh);

    // Lower leg — pivot at knee
    const ll = new THREE.Group();
    ll.name = `${nameSide}LowerLeg`;
    ll.position.set(0, -0.44, 0);
    ul.add(ll);

    // Sock cylinder
    const sock = mk(new THREE.CylinderGeometry(0.09, 0.082, 0.42, 8), sockMat);
    sock.position.y = -0.21;
    ll.add(sock);

    // Sock fold band (team color)
    const foldBand = mk(new THREE.CylinderGeometry(0.096, 0.094, 0.04, 8), jerseyFlatMat);
    foldBand.position.y = -0.01;
    ll.add(foldBand);

    // Shin guard — visible gloss panel
    const shin = mk(new THREE.BoxGeometry(0.108, 0.22, 0.036), mat(0xe8e8e8, 0.3, 0.15));
    shin.position.set(0, -0.105, 0.098);
    ll.add(shin);
    // Shin guard straps
    for (const sy of [-0.06, -0.17]) {
      const strap = mk(new THREE.BoxGeometry(0.14, 0.018, 0.005), mat(0xffffff, 0.8));
      strap.position.set(0, sy, 0.118);
      ll.add(strap);
    }

    // Boot group — pivot at ankle
    const boot = new THREE.Group();
    boot.position.set(0, -0.42, 0);
    ll.add(boot);

    // Main boot body
    const bootBody = mk(new THREE.BoxGeometry(0.19, 0.11, 0.3), bootMat);
    bootBody.position.set(0, -0.03, 0.045);
    boot.add(bootBody);
    // Rounded toe
    const toe = mk(new THREE.SphereGeometry(0.096, 8, 6), bootMat);
    toe.position.set(0, -0.038, 0.196);
    toe.scale.set(0.98, 0.6, 0.7);
    boot.add(toe);
    // Ankle back
    const ankle = mk(new THREE.BoxGeometry(0.17, 0.16, 0.08), bootMat);
    ankle.position.set(0, -0.01, -0.115);
    boot.add(ankle);
    // Rubber sole (slightly wider)
    const sole = mk(new THREE.BoxGeometry(0.215, 0.022, 0.385), mat(0x1a1a1a, 0.2));
    sole.position.set(0, -0.09, 0.028);
    boot.add(sole);
    // Boot laces
    const laces = mk(new THREE.BoxGeometry(0.052, 0.01, 0.18), mat(0xffffff, 0.95));
    laces.position.set(0, 0.027, 0.038);
    boot.add(laces);
    // Colored swoosh / brand mark
    const swoosh = mk(new THREE.BoxGeometry(0.055, 0.04, 0.14), mat(0xffffff, 0.4, 0.1));
    swoosh.position.set(sx * -0.098, -0.01, 0.04);
    swoosh.rotation.z = sx * -0.3;
    boot.add(swoosh);
  }

  // ── SHADOW BLOB ───────────────────────────────────────────────────────────
  const shadowBlob = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.01;
  group.add(shadowBlob);

  // ── BONE MAP (must match Player.js animation keys) ────────────────────────
  group.bones = {
    head,
    torso,
    leftUpperLeg:  group.getObjectByName('leftUpperLeg'),
    rightUpperLeg: group.getObjectByName('rightUpperLeg'),
    leftLowerLeg:  group.getObjectByName('leftLowerLeg'),
    rightLowerLeg: group.getObjectByName('rightLowerLeg'),
    leftUpperArm:  group.getObjectByName('leftUpperArm'),
    rightUpperArm: group.getObjectByName('rightUpperArm'),
    leftLowerArm:  group.getObjectByName('leftLowerArm'),
    rightLowerArm: group.getObjectByName('rightLowerArm'),
    hips,
  };

  group.shadowBlob = shadowBlob;
  return group;
}
