import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.radius = CONFIG.BALL.RADIUS;
    this.position = new THREE.Vector3(0, this.radius, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = true;
    this.trailPositions = [];
    this.maxTrail = 8;
    this.spinAxis = new THREE.Vector3(0, 0, 1);
    this.spinSpeed = 0;
    this.lastTouchTeam = -1; // 0=player, 1=opponent
    this.outEvent = null;    // set when ball leaves field
    this.frozen = false;     // true during dead-ball

    this._createMesh(scene);
    this._createTrail(scene);
    this._createShadow(scene);
  }

  createFootballTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw pentagon/hexagon football pattern
    const pentagons = [
      { cx: size / 2, cy: size / 2 },
      { cx: size / 2, cy: 0 },
      { cx: size / 2, cy: size },
      { cx: 0, cy: size / 2 },
      { cx: size, cy: size / 2 },
      { cx: 0, cy: 0 },
      { cx: size, cy: 0 },
      { cx: 0, cy: size },
      { cx: size, cy: size },
      { cx: size / 4, cy: size / 4 },
      { cx: (3 * size) / 4, cy: size / 4 },
      { cx: size / 4, cy: (3 * size) / 4 },
      { cx: (3 * size) / 4, cy: (3 * size) / 4 },
    ];

    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;

    const drawPentagon = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    const r = size * 0.085;
    pentagons.forEach((p) => drawPentagon(p.cx, p.cy, r));

    // Draw connecting lines between pentagons
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.13, 0, Math.PI * 2);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  _createMesh(scene) {
    const geo = new THREE.SphereGeometry(this.radius, 24, 16);
    const texture = this.createFootballTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  _createTrail(scene) {
    this.trailMeshes = [];
    for (let i = 0; i < this.maxTrail; i++) {
      const r = this.radius * (1 - i / this.maxTrail) * 0.7;
      const geo = new THREE.SphereGeometry(Math.max(r, 0.03), 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.trailMeshes.push(mesh);
    }
  }

  _createShadow(scene) {
    const geo = new THREE.CircleGeometry(this.radius * 1.2, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(geo, mat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.01;
    scene.add(this.shadowMesh);
  }

  setLastTouch(teamIndex) {
    this.lastTouchTeam = teamIndex;
  }

  update(dt) {
    if (this.frozen) {
      this.mesh.position.copy(this.position);
      return;
    }
    const halfW = CONFIG.FIELD.WIDTH / 2;
    const halfH = CONFIG.FIELD.HEIGHT / 2;

    // Apply gravity
    if (!this.onGround || this.velocity.y > 0) {
      this.velocity.y -= CONFIG.BALL.GRAVITY * dt;
    }

    // Air friction
    this.velocity.x *= Math.pow(CONFIG.BALL.AIR_FRICTION, dt * 60);
    this.velocity.z *= Math.pow(CONFIG.BALL.AIR_FRICTION, dt * 60);

    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Ground collision
    if (this.position.y <= this.radius) {
      this.position.y = this.radius;
      if (Math.abs(this.velocity.y) > 0.5) {
        this.velocity.y = -this.velocity.y * CONFIG.BALL.BOUNCE;
      } else {
        this.velocity.y = 0;
        this.onGround = true;
      }
      // Ground friction
      if (this.onGround) {
        const friction = Math.pow(CONFIG.BALL.GROUND_FRICTION, dt * 60);
        this.velocity.x *= friction;
        this.velocity.z *= friction;
      }
    } else {
      this.onGround = false;
    }

    // --- Out of bounds detection ---
    const goalHalfW = CONFIG.GOAL.WIDTH / 2;
    const goalH     = CONFIG.GOAL.HEIGHT;
    const goalDepth = CONFIG.GOAL.DEPTH;
    const isInGoalMouth = Math.abs(this.position.z) < goalHalfW + this.radius
      && this.position.y < goalH + this.radius;

    // Touchlines (Z sides) — emit outEvent
    if (!this.outEvent && this.position.z < -halfH - 0.3) {
      this.outEvent = { type: 'touchline', zSide: -1, ballX: this.position.x };
    }
    if (!this.outEvent && this.position.z > halfH + 0.3) {
      this.outEvent = { type: 'touchline', zSide: 1, ballX: this.position.x };
    }
    // End lines (X) — emit outEvent only outside goal mouth
    if (!this.outEvent && this.position.x < -halfW - 0.3 && !isInGoalMouth) {
      this.outEvent = { type: 'endline', side: 'left', ballZ: this.position.z };
    }
    if (!this.outEvent && this.position.x > halfW + 0.3 && !isInGoalMouth) {
      this.outEvent = { type: 'endline', side: 'right', ballZ: this.position.z };
    }

    // Back of goal net — hard stop
    if (this.position.x < -(halfW + goalDepth) + this.radius) {
      this.position.x = -(halfW + goalDepth) + this.radius;
      this.velocity.x = Math.abs(this.velocity.x) * 0.25;
    }
    if (this.position.x > (halfW + goalDepth) - this.radius) {
      this.position.x = (halfW + goalDepth) - this.radius;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.25;
    }

    // Spin based on velocity
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    this.spinSpeed = speed * 2;
    if (speed > 0.1) {
      this.spinAxis.set(-this.velocity.z, 0, this.velocity.x).normalize();
    }

    // Update mesh
    this.mesh.position.copy(this.position);
    if (this.spinSpeed > 0.01) {
      this.mesh.rotateOnWorldAxis(this.spinAxis, this.spinSpeed * dt);
    }

    // Update shadow
    this.shadowMesh.position.x = this.position.x;
    this.shadowMesh.position.z = this.position.z;
    const heightAboveGround = this.position.y - this.radius;
    const shadowScale = Math.max(0.2, 1 - heightAboveGround * 0.06);
    this.shadowMesh.scale.setScalar(shadowScale);
    this.shadowMesh.material.opacity = Math.max(0.05, 0.35 * shadowScale);

    // Update trail
    this.trailPositions.unshift(this.position.clone());
    if (this.trailPositions.length > this.maxTrail) {
      this.trailPositions.pop();
    }

    const trailSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y +
      this.velocity.z * this.velocity.z
    );

    for (let i = 0; i < this.maxTrail; i++) {
      const tm = this.trailMeshes[i];
      if (i < this.trailPositions.length && trailSpeed > 5) {
        tm.visible = true;
        tm.position.copy(this.trailPositions[i]);
        const alpha = ((this.maxTrail - i) / this.maxTrail) * 0.4 * Math.min(1, (trailSpeed - 5) / 10);
        tm.material.opacity = alpha;
      } else {
        tm.visible = false;
      }
    }
  }

  kick(origin, direction, power, loft = 0) {
    const dir = direction.clone().normalize();
    this.velocity.x = dir.x * power;
    this.velocity.z = dir.z * power;
    this.velocity.y = loft * power * 0.4 + 2;
    this.onGround = false;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.mesh.position.copy(this.position);
    this.trailPositions = [];
    for (const tm of this.trailMeshes) tm.visible = false;
  }

  getSpeed() {
    return this.velocity.length();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.map && this.mesh.material.map.dispose();
    this.mesh.material.dispose();
    this.scene.remove(this.mesh);
    this.scene.remove(this.shadowMesh);
    this.shadowMesh.geometry.dispose();
    this.shadowMesh.material.dispose();
    for (const tm of this.trailMeshes) {
      tm.geometry.dispose();
      tm.material.dispose();
      this.scene.remove(tm);
    }
  }
}
