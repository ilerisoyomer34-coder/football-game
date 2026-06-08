import * as THREE from 'three';
import { CONFIG } from './config.js';

export class GameCamera {
  constructor(renderer) {
    this.renderer = renderer;
    const aspect = window.innerWidth / window.innerHeight;
    // Broadcast camera: wide angle, lower angle for TV feel
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 1000);
    this.camera.position.set(0, 42, 48);
    this.camera.lookAt(0, 0, 0);

    this.targetPosition = new THREE.Vector3(0, 42, 48);
    this.targetLookAt   = new THREE.Vector3(0, 0, 0);
    this.currentLookAt  = new THREE.Vector3(0, 0, 0);

    this.shakeIntensity = 0;
    this.shakeDuration  = 0;
    this.shakeTimer     = 0;

    // Base offsets for broadcast view
    this.baseY = 42;
    this.baseZ = 48;
    this._dynamicFOV = 52;
  }

  update(dt, ballPosition, controlledPlayerPosition, fieldDimensions) {
    // Weighted target: more weight on ball for broadcast feel
    const target = new THREE.Vector3();
    if (controlledPlayerPosition) {
      target.lerpVectors(ballPosition, controlledPlayerPosition, 0.28);
    } else {
      target.copy(ballPosition);
    }

    // Dynamic zoom: pull back when action is wide, push in near goal
    const ballX = ballPosition.x;
    const halfW = CONFIG.FIELD.WIDTH / 2;
    const distFromGoal = Math.min(Math.abs(ballX + halfW), Math.abs(ballX - halfW));
    const zoomMult = distFromGoal < 22 ? 0.88 : 1.0; // push in near goal

    const desiredPos = new THREE.Vector3(
      target.x * 0.22,               // slight X follow (broadcast stays mostly side-on)
      this.baseY * zoomMult,
      target.z * 0.32 + this.baseZ * zoomMult
    );

    const hw = CONFIG.FIELD.WIDTH  / 2;
    const hh = CONFIG.FIELD.HEIGHT / 2;
    desiredPos.x = Math.max(-hw * 0.55, Math.min(hw * 0.55, desiredPos.x));
    desiredPos.z = Math.max(-hh * 0.4,  Math.min(hh * 1.15, desiredPos.z));

    // Smooth lerp (slower = more cinematic)
    this.targetPosition.lerp(desiredPos, 0.05);
    this.camera.position.copy(this.targetPosition);

    // Smooth look-at (ball height awareness)
    const lookTarget = target.clone();
    lookTarget.y = Math.max(0, ballPosition.y * 0.3);
    this.currentLookAt.lerp(lookTarget, 0.07);
    this.camera.lookAt(this.currentLookAt);

    // Camera shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const pct = this.shakeTimer / this.shakeDuration;
      const amt = pct * this.shakeIntensity;
      this.camera.position.x += (Math.random() - 0.5) * amt;
      this.camera.position.y += (Math.random() - 0.5) * amt * 0.4;
      this.camera.position.z += (Math.random() - 0.5) * amt * 0.6;
    }
  }

  shake(duration, intensity) {
    this.shakeDuration  = duration;
    this.shakeTimer     = duration;
    this.shakeIntensity = intensity;
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getWorldToScreen(worldPos, width, height) {
    const vec = worldPos.clone().project(this.camera);
    return {
      x: ((vec.x + 1) / 2) * width,
      y: ((-vec.y + 1) / 2) * height,
    };
  }
}
