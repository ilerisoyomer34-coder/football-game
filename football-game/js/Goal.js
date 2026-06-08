import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Goal {
  constructor(scene, side) {
    this.scene = scene;
    this.side = side; // 'left' or 'right'
    this.scored = false;
    this.netFlashTimer = 0;

    const gw = CONFIG.GOAL.WIDTH;
    const gh = CONFIG.GOAL.HEIGHT;
    const gd = CONFIG.GOAL.DEPTH;

    this.goalX = side === 'left' ? -CONFIG.FIELD.WIDTH / 2 : CONFIG.FIELD.WIDTH / 2;
    this.goalZ = 0;
    this.goalHalfW = gw / 2;
    this.goalH = gh;
    this.goalD = gd;

    this.group = new THREE.Group();
    scene.add(this.group);

    this._createPosts();
    this._createNet();
  }

  _createPosts() {
    const gw = CONFIG.GOAL.WIDTH;
    const gh = CONFIG.GOAL.HEIGHT;
    const gd = CONFIG.GOAL.DEPTH;
    const r = 0.08;

    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.2,
    });

    const sign = this.side === 'left' ? 1 : -1; // net goes inward

    // Left post
    const lpGeo = new THREE.CylinderGeometry(r, r, gh, 12);
    const lp = new THREE.Mesh(lpGeo, postMat);
    lp.position.set(this.goalX, gh / 2, -gw / 2);
    lp.castShadow = true;
    lp.receiveShadow = true;
    this.scene.add(lp);

    // Right post
    const rpGeo = new THREE.CylinderGeometry(r, r, gh, 12);
    const rp = new THREE.Mesh(rpGeo, postMat);
    rp.position.set(this.goalX, gh / 2, gw / 2);
    rp.castShadow = true;
    rp.receiveShadow = true;
    this.scene.add(rp);

    // Crossbar
    const cbGeo = new THREE.CylinderGeometry(r, r, gw + r * 2, 12);
    cbGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const cb = new THREE.Mesh(cbGeo, postMat);
    cb.position.set(this.goalX, gh, 0);
    cb.castShadow = true;
    this.scene.add(cb);

    // Back post (top)
    const bpTopGeo = new THREE.CylinderGeometry(r, r, gd, 8);
    bpTopGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    const bpTop = new THREE.Mesh(bpTopGeo, postMat);
    bpTop.position.set(this.goalX + sign * gd / 2, gh, 0);
    this.scene.add(bpTop);

    // Back posts (sides)
    const bpSideGeo = new THREE.CylinderGeometry(r, r, gh, 8);
    const bpLeft = new THREE.Mesh(bpSideGeo, postMat);
    bpLeft.position.set(this.goalX + sign * gd, gh / 2, -gw / 2);
    this.scene.add(bpLeft);

    const bpRight = new THREE.Mesh(bpSideGeo, postMat);
    bpRight.position.set(this.goalX + sign * gd, gh / 2, gw / 2);
    this.scene.add(bpRight);

    this.posts = [lp, rp, cb];
  }

  _createNet() {
    const gw = CONFIG.GOAL.WIDTH;
    const gh = CONFIG.GOAL.HEIGHT;
    const gd = CONFIG.GOAL.DEPTH;
    const sign = this.side === 'left' ? 1 : -1;

    this.netMaterial = new THREE.LineBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.6,
    });

    const points = [];
    const spacing = 0.3;

    // Back net (vertical lines)
    const backX = this.goalX + sign * gd;
    const cols = Math.ceil(gw / spacing);
    const rows = Math.ceil(gh / spacing);

    for (let i = 0; i <= cols; i++) {
      const z = -gw / 2 + (i / cols) * gw;
      points.push(backX, 0, z);
      points.push(backX, gh, z);
    }
    for (let j = 0; j <= rows; j++) {
      const y = (j / rows) * gh;
      points.push(backX, y, -gw / 2);
      points.push(backX, y, gw / 2);
    }

    // Top net
    const sideCols = Math.ceil(gd / spacing);
    for (let i = 0; i <= cols; i++) {
      const z = -gw / 2 + (i / cols) * gw;
      points.push(this.goalX, gh, z);
      points.push(this.goalX + sign * gd, gh, z);
    }
    for (let i = 0; i <= sideCols; i++) {
      const x = this.goalX + sign * (i / sideCols) * gd;
      points.push(x, gh, -gw / 2);
      points.push(x, gh, gw / 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.netLines = new THREE.LineSegments(geo, this.netMaterial);
    this.scene.add(this.netLines);
    this.netLines.renderOrder = 1;
  }

  checkBallInGoal(ballPosition, ballRadius) {
    const gw = CONFIG.GOAL.WIDTH;
    const gh = CONFIG.GOAL.HEIGHT;
    const bx = ballPosition.x;
    const by = ballPosition.y;
    const bz = ballPosition.z;

    // Ball must cross the goal line (fully past the line)
    const crossedLine = this.side === 'left'
      ? bx <= this.goalX
      : bx >= this.goalX;

    return (
      crossedLine &&
      by >= 0 &&
      by <= gh + ballRadius &&
      Math.abs(bz) <= gw / 2 + ballRadius
    );
  }

  celebrateGoal() {
    this.netFlashTimer = 1.5;
  }

  update(dt) {
    if (this.netFlashTimer > 0) {
      this.netFlashTimer -= dt;
      const flash = Math.sin(this.netFlashTimer * 20) * 0.5 + 0.5;
      this.netMaterial.color.setRGB(flash, 1, flash * 0.5);
      this.netMaterial.opacity = 0.6 + flash * 0.4;
    } else {
      this.netMaterial.color.set(0xdddddd);
      this.netMaterial.opacity = 0.6;
    }
  }
}
