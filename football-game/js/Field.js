import * as THREE from 'three';
import { Goal } from './Goal.js';
import { CONFIG } from './config.js';

export class Field {
  constructor(scene) {
    this.scene = scene;
    this.goals = [];

    this._createGrass();
    this._createLineMarkings();
    this.goals = this._createGoals();
    this._createCornerFlags();
    this._createStadium();
    this._createLighting();
  }

  _createGrassTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const stripeW = size / 14;
    const colors = ['#2d6a1e', '#348a22'];

    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = colors[i % 2];
      ctx.fillRect(i * stripeW, 0, stripeW, size);
    }

    // Add subtle noise/texture
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = Math.random() * 0.08 - 0.04;
      ctx.fillStyle = `rgba(${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},0,${Math.abs(brightness)})`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  _createGrass() {
    const geo = new THREE.PlaneGeometry(CONFIG.FIELD.WIDTH, CONFIG.FIELD.HEIGHT, 1, 1);
    const texture = this._createGrassTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0,
    });
    this.grass = new THREE.Mesh(geo, mat);
    this.grass.rotation.x = -Math.PI / 2;
    this.grass.receiveShadow = true;
    this.scene.add(this.grass);
  }

  _createLineMarkings() {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const hw = CONFIG.FIELD.WIDTH / 2;
    const hh = CONFIG.FIELD.HEIGHT / 2;
    const lw = 0.12; // line width
    const yOff = 0.02;

    const addRect = (x, z, w, h, rotY = 0) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const m = new THREE.Mesh(geo, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rotY;
      m.position.set(x, yOff, z);
      this.scene.add(m);
    };

    // Outer boundary
    addRect(0, -hh, CONFIG.FIELD.WIDTH + lw, lw); // top
    addRect(0, hh, CONFIG.FIELD.WIDTH + lw, lw);  // bottom
    addRect(-hw, 0, lw, CONFIG.FIELD.HEIGHT);      // left
    addRect(hw, 0, lw, CONFIG.FIELD.HEIGHT);       // right

    // Center line
    addRect(0, 0, lw, CONFIG.FIELD.HEIGHT);

    // Center circle
    const circlePoints = [];
    const cr = 9.15;
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      circlePoints.push(Math.cos(a) * cr, 0, Math.sin(a) * cr);
    }
    const circleGeo = new THREE.BufferGeometry();
    circleGeo.setAttribute('position', new THREE.Float32BufferAttribute(circlePoints, 3));
    const circleLine = new THREE.Line(circleGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    circleLine.position.y = yOff;
    this.scene.add(circleLine);

    // Center spot
    const cspotGeo = new THREE.CircleGeometry(0.25, 16);
    const cspot = new THREE.Mesh(cspotGeo, lineMat);
    cspot.rotation.x = -Math.PI / 2;
    cspot.position.y = yOff;
    this.scene.add(cspot);

    // Penalty areas (both sides)
    const pBoxW = 40.32;
    const pBoxD = 16.5;
    const gBoxW = 18.32;
    const gBoxD = 5.5;

    const drawBox = (cx, facing) => {
      const sign = facing;
      const px = cx + sign * pBoxD / 2;
      // Long sides
      addRect(cx, -pBoxW / 2, lw, pBoxD); // near Z
      addRect(cx, pBoxW / 2, lw, pBoxD);  // far Z
      // End line
      addRect(cx + sign * pBoxD, 0, lw, pBoxW);
      // Goal area inner box
      addRect(cx, -gBoxW / 2, lw, gBoxD);
      addRect(cx, gBoxW / 2, lw, gBoxD);
      addRect(cx + sign * gBoxD, 0, lw, gBoxW);
    };

    drawBox(-hw, 1);
    drawBox(hw, -1);

    // Penalty spots
    const pSpotDist = 11;
    [[-hw + pSpotDist, 0], [hw - pSpotDist, 0]].forEach(([x, z]) => {
      const sg = new THREE.CircleGeometry(0.25, 12);
      const sm = new THREE.Mesh(sg, lineMat);
      sm.rotation.x = -Math.PI / 2;
      sm.position.set(x, yOff, z);
      this.scene.add(sm);
    });

    // Corner arcs
    const corners = [
      [-hw, -hh], [-hw, hh], [hw, -hh], [hw, hh],
    ];
    corners.forEach(([cx, cz]) => {
      const pts = [];
      const r = 1;
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 0.5;
        const sx = cx < 0 ? 1 : -1;
        const sz = cz < 0 ? 1 : -1;
        pts.push(cx + sx * r * Math.cos(a), 0, cz + sz * r * Math.sin(a));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff }));
      l.position.y = yOff;
      this.scene.add(l);
    });
  }

  _createGoals() {
    const left = new Goal(this.scene, 'left');
    const right = new Goal(this.scene, 'right');
    return [left, right];
  }

  _createCornerFlags() {
    const hw = CONFIG.FIELD.WIDTH / 2;
    const hh = CONFIG.FIELD.HEIGHT / 2;
    const corners = [[-hw, -hh], [-hw, hh], [hw, -hh], [hw, hh]];
    const flagColors = [0xffee00, 0xff4400];

    corners.forEach(([cx, cz], i) => {
      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(cx, 0.75, cz);
      this.scene.add(pole);

      // Flag
      const flagGeo = new THREE.PlaneGeometry(0.5, 0.3);
      const flagMat = new THREE.MeshBasicMaterial({
        color: flagColors[i % 2],
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(cx + 0.25, 1.4, cz);
      this.scene.add(flag);
    });
  }

  _createStadium() {
    const hw = CONFIG.FIELD.WIDTH / 2;
    const hh = CONFIG.FIELD.HEIGHT / 2;
    const standH = 14;
    const standD = 20;
    const standColor = 0x607d8b;
    const roofColor = 0x455a64;

    const standMat = new THREE.MeshStandardMaterial({
      color: standColor,
      roughness: 0.8,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.6,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    // 4 stands
    const stands = [
      { pos: [0, standH / 2, hh + standD / 2], size: [CONFIG.FIELD.WIDTH + standD * 2, standH, standD], rx: 0.2 },
      { pos: [0, standH / 2, -(hh + standD / 2)], size: [CONFIG.FIELD.WIDTH + standD * 2, standH, standD], rx: -0.2 },
      { pos: [hw + standD / 2, standH / 2, 0], size: [standD, standH, CONFIG.FIELD.HEIGHT], rz: 0.15 },
      { pos: [-(hw + standD / 2), standH / 2, 0], size: [standD, standH, CONFIG.FIELD.HEIGHT], rz: -0.15 },
    ];

    stands.forEach((s) => {
      const geo = new THREE.BoxGeometry(...s.size);
      const m = new THREE.Mesh(geo, standMat);
      m.position.set(...s.pos);
      if (s.rx) m.rotation.x = s.rx;
      if (s.rz) m.rotation.z = s.rz;
      m.receiveShadow = true;
      this.scene.add(m);
    });

    // Roof overhangs
    const roofThick = 1.2;
    const roofOverhang = standD * 0.6;
    const roofs = [
      { pos: [0, standH + 0.5, hh + standD / 2 - roofOverhang / 2], size: [CONFIG.FIELD.WIDTH + standD * 2 + 2, roofThick, roofOverhang] },
      { pos: [0, standH + 0.5, -(hh + standD / 2 - roofOverhang / 2)], size: [CONFIG.FIELD.WIDTH + standD * 2 + 2, roofThick, roofOverhang] },
      { pos: [hw + standD / 2 - roofOverhang / 2, standH + 0.5, 0], size: [roofOverhang, roofThick, CONFIG.FIELD.HEIGHT + 4] },
      { pos: [-(hw + standD / 2 - roofOverhang / 2), standH + 0.5, 0], size: [roofOverhang, roofThick, CONFIG.FIELD.HEIGHT + 4] },
    ];

    roofs.forEach((r) => {
      const geo = new THREE.BoxGeometry(...r.size);
      const m = new THREE.Mesh(geo, roofMat);
      m.position.set(...r.pos);
      m.castShadow = false;
      m.receiveShadow = false;
      this.scene.add(m);
    });

    // Crowd - instanced boxes
    this._createCrowd(hw, hh, standD, standH);
  }

  _createCrowd(hw, hh, standD, standH) {
    const ROWS = 12;
    const colSpacingLong  = 1.35;
    const colSpacingShort = 1.5;
    const rowSpacing = 1.5;
    const fanW = 0.7, fanH = 1.1, fanD = 0.45;
    const headR = 0.22;

    // Build all fan positions
    this._fanPositions = [];
    this._fanTeamSide = []; // 0 = home, 1 = away, 2 = neutral

    const addFan = (x, y, z, rotY, side) => {
      this._fanPositions.push({ x, y, z, rotY });
      this._fanTeamSide.push(side);
    };

    // North stand (z > 0): home fans left half, away fans right half
    for (let row = 0; row < ROWS; row++) {
      const z = hh + 4 + row * rowSpacing;
      const y = 0.8 + row * rowSpacing;
      const cols = Math.floor((hw * 2 + 10) / colSpacingLong);
      for (let c = 0; c < cols; c++) {
        const x = -hw - 5 + c * colSpacingLong;
        const side = x < 0 ? 0 : 1;
        addFan(x, y, z, Math.PI + (Math.random()-0.5)*0.3, side);
      }
    }

    // South stand (z < 0): away fans left half, home fans right half
    for (let row = 0; row < ROWS; row++) {
      const z = -(hh + 4 + row * rowSpacing);
      const y = 0.8 + row * rowSpacing;
      const cols = Math.floor((hw * 2 + 10) / colSpacingLong);
      for (let c = 0; c < cols; c++) {
        const x = -hw - 5 + c * colSpacingLong;
        const side = x < 0 ? 1 : 0;
        addFan(x, y, z, (Math.random()-0.5)*0.3, side);
      }
    }

    // East stand (x > 0)
    for (let row = 0; row < 8; row++) {
      const x = hw + 4 + row * rowSpacing;
      const y = 0.8 + row * rowSpacing;
      const cols = Math.floor((hh * 2 + 8) / colSpacingShort);
      for (let c = 0; c < cols; c++) {
        const z = -hh - 4 + c * colSpacingShort;
        addFan(x, y, z, -Math.PI/2 + (Math.random()-0.5)*0.3, 2);
      }
    }

    // West stand (x < 0)
    for (let row = 0; row < 8; row++) {
      const x = -(hw + 4 + row * rowSpacing);
      const y = 0.8 + row * rowSpacing;
      const cols = Math.floor((hh * 2 + 8) / colSpacingShort);
      for (let c = 0; c < cols; c++) {
        const z = -hh - 4 + c * colSpacingShort;
        addFan(x, y, z, Math.PI/2 + (Math.random()-0.5)*0.3, 2);
      }
    }

    const N = this._fanPositions.length;

    // Body InstancedMesh
    const bodyGeo = new THREE.BoxGeometry(fanW, fanH, fanD);
    this._bodyInstanced = new THREE.InstancedMesh(bodyGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), N);
    this._bodyInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Head InstancedMesh
    const headGeo = new THREE.SphereGeometry(headR, 7, 5);
    this._headInstanced = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), N);
    this._headInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const bodyColors = new Float32Array(N * 3);
    const headColors = new Float32Array(N * 3);

    const SKIN_TONES_CROWD = [0xffcc99, 0xf5b580, 0xd49268, 0xc8855a, 0x8d5524];

    // We'll store team colors as properties to use when updating
    this._homeColor = new THREE.Color(CONFIG.TEAMS.PLAYER_COLOR);
    this._awayColor = new THREE.Color(CONFIG.TEAMS.OPPONENT_COLOR);
    const neutralColors = [
      new THREE.Color(0x888888), new THREE.Color(0xaaaaaa),
      new THREE.Color(0x666666), new THREE.Color(0x999999),
    ];

    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const fp = this._fanPositions[i];
      dummy.position.set(fp.x, fp.y, fp.z);
      dummy.rotation.y = fp.rotY;
      dummy.updateMatrix();
      this._bodyInstanced.setMatrixAt(i, dummy.matrix);

      // Head position
      dummy.position.set(fp.x, fp.y + fanH/2 + headR * 0.8, fp.z);
      dummy.rotation.y = fp.rotY;
      dummy.updateMatrix();
      this._headInstanced.setMatrixAt(i, dummy.matrix);

      // Body color based on team side
      let bodyC;
      const side = this._fanTeamSide[i];
      if (side === 0) {
        bodyC = this._homeColor.clone();
        // slight variation
        bodyC.r = Math.min(1, bodyC.r + (Math.random()-0.5)*0.15);
        bodyC.g = Math.min(1, bodyC.g + (Math.random()-0.5)*0.15);
        bodyC.b = Math.min(1, bodyC.b + (Math.random()-0.5)*0.15);
      } else if (side === 1) {
        bodyC = this._awayColor.clone();
        bodyC.r = Math.min(1, bodyC.r + (Math.random()-0.5)*0.15);
        bodyC.g = Math.min(1, bodyC.g + (Math.random()-0.5)*0.15);
        bodyC.b = Math.min(1, bodyC.b + (Math.random()-0.5)*0.15);
      } else {
        bodyC = neutralColors[Math.floor(Math.random() * neutralColors.length)].clone();
      }
      bodyColors[i*3]   = bodyC.r;
      bodyColors[i*3+1] = bodyC.g;
      bodyColors[i*3+2] = bodyC.b;

      // Head skin color
      const skinHex = SKIN_TONES_CROWD[Math.floor(Math.random() * SKIN_TONES_CROWD.length)];
      const sc = new THREE.Color(skinHex);
      headColors[i*3]   = sc.r;
      headColors[i*3+1] = sc.g;
      headColors[i*3+2] = sc.b;
    }

    bodyGeo.setAttribute('color', new THREE.InstancedBufferAttribute(bodyColors, 3));
    headGeo.setAttribute('color', new THREE.InstancedBufferAttribute(headColors, 3));

    this._bodyInstanced.instanceMatrix.needsUpdate = true;
    this._headInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this._bodyInstanced);
    this.scene.add(this._headInstanced);

    this._crowdTime = 0;
    this._crowdCelebrating = 0; // countdown
    this._crowdDummy = new THREE.Object3D();
  }

  crowdCelebrate() {
    this._crowdCelebrating = 3.0;
  }

  _createLighting(scene) {
    const scn = scene || this.scene;

    // Hemisphere light (sky)
    const hemi = new THREE.HemisphereLight(0xadd8ff, 0x4d7c3a, 0.6);
    scn.add(hemi);

    // Sun directional light
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.001;
    scn.add(sun);

    // 4 floodlights
    const hw = CONFIG.FIELD.WIDTH / 2 + 15;
    const hh = CONFIG.FIELD.HEIGHT / 2 + 12;
    const poleH = 28;
    const floodPositions = [
      [-hw, poleH, -hh],
      [hw, poleH, -hh],
      [-hw, poleH, hh],
      [hw, poleH, hh],
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.3 });
    const lightHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 2 });

    floodPositions.forEach((fp) => {
      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.25, 0.35, poleH, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(fp[0], fp[1] / 2, fp[2]);
      pole.castShadow = true;
      scn.add(pole);

      // Light head
      const headGeo = new THREE.BoxGeometry(3, 0.8, 1.5);
      const head = new THREE.Mesh(headGeo, lightHeadMat);
      head.position.set(fp[0], fp[1], fp[2]);
      scn.add(head);

      // Spotlight
      const spot = new THREE.SpotLight(0xfff9e8, 1.5, 200, Math.PI * 0.35, 0.3, 1.5);
      spot.position.set(fp[0], fp[1], fp[2]);
      spot.target.position.set(0, 0, 0);
      spot.castShadow = false; // Performance
      scn.add(spot);
      scn.add(spot.target);
    });
  }

  update(dt) {
    this.goals.forEach((g) => g.update(dt));
    this._updateCrowd(dt);
  }

  _updateCrowd(dt) {
    if (!this._bodyInstanced) return;
    this._crowdTime += dt;
    if (this._crowdCelebrating > 0) this._crowdCelebrating -= dt;

    const N = this._fanPositions.length;
    const dummy = this._crowdDummy;
    const fanH = 1.1;
    const headR = 0.22;
    const isCelebrating = this._crowdCelebrating > 0;

    // Only update every 3rd frame for performance
    if (Math.round(this._crowdTime * 60) % 3 !== 0) return;

    for (let i = 0; i < N; i++) {
      const fp = this._fanPositions[i];
      const phase = i * 0.37 + this._crowdTime * (isCelebrating ? 6 : 1.2);
      const sway = Math.sin(phase) * (isCelebrating ? 0.22 : 0.06);
      const lift = isCelebrating ? Math.abs(Math.sin(phase * 0.7)) * 0.35 : 0;

      dummy.position.set(fp.x, fp.y + lift, fp.z);
      dummy.rotation.y = fp.rotY;
      dummy.rotation.z = sway;
      dummy.updateMatrix();
      this._bodyInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(fp.x, fp.y + fanH/2 + headR*0.8 + lift, fp.z);
      dummy.rotation.y = fp.rotY;
      dummy.rotation.z = sway;
      dummy.updateMatrix();
      this._headInstanced.setMatrixAt(i, dummy.matrix);
    }
    this._bodyInstanced.instanceMatrix.needsUpdate = true;
    this._headInstanced.instanceMatrix.needsUpdate = true;
  }
}
