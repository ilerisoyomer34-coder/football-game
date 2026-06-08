import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.systems = [];
  }

  spawnConfetti(position) {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    const confettiColors = [
      [1, 0.1, 0.1],
      [0.1, 0.5, 1],
      [1, 0.9, 0],
      [0.1, 0.9, 0.2],
      [1, 0.3, 0.8],
      [1, 1, 1],
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = position.y + Math.random() * 2;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 4;

      const c = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];

      velocities.push(
        (Math.random() - 0.5) * 12,
        Math.random() * 15 + 5,
        (Math.random() - 0.5) * 12
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      count,
      age: 0,
      maxAge: 3.0,
      positions: geo.attributes.position.array,
    });
  }

  spawnGoalEffect(position) {
    this.spawnConfetti(position);

    // Flash ring
    const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffee00,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.position.y = 1;
    this.scene.add(ring);

    this.systems.push({
      ring,
      age: 0,
      maxAge: 0.8,
      type: 'ring',
    });
  }

  update(dt) {
    const toRemove = [];

    for (const sys of this.systems) {
      sys.age += dt;
      const progress = sys.age / sys.maxAge;

      if (progress >= 1) {
        toRemove.push(sys);
        continue;
      }

      if (sys.type === 'ring') {
        const scale = 1 + progress * 8;
        sys.ring.scale.setScalar(scale);
        sys.ring.material.opacity = (1 - progress) * 0.9;
        continue;
      }

      // Particle physics
      const pos = sys.positions;
      for (let i = 0; i < sys.count; i++) {
        pos[i * 3] += sys.velocities[i * 3] * dt;
        pos[i * 3 + 1] += sys.velocities[i * 3 + 1] * dt;
        pos[i * 3 + 2] += sys.velocities[i * 3 + 2] * dt;

        // Gravity
        sys.velocities[i * 3 + 1] -= 12 * dt;

        // Air resistance
        sys.velocities[i * 3] *= 0.99;
        sys.velocities[i * 3 + 2] *= 0.99;
      }

      sys.points.geometry.attributes.position.needsUpdate = true;
      sys.points.material.opacity = Math.max(0, 1 - progress * 0.7);
    }

    // Cleanup
    for (const sys of toRemove) {
      if (sys.points) {
        sys.points.geometry.dispose();
        sys.points.material.dispose();
        this.scene.remove(sys.points);
      }
      if (sys.ring) {
        sys.ring.geometry.dispose();
        sys.ring.material.dispose();
        this.scene.remove(sys.ring);
      }
      const idx = this.systems.indexOf(sys);
      if (idx >= 0) this.systems.splice(idx, 1);
    }
  }
}
