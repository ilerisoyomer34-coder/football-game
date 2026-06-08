import * as THREE from 'three';
import { createPlayerModel } from './PlayerModel.js';
import { CONFIG } from './config.js';

export class Player {
  constructor(scene, options = {}) {
    const {
      teamColor        = 0x1565c0,
      isGoalkeeper     = false,
      isUserControlled = false,
      startPosition    = new THREE.Vector3(0, 0, 0),
      formationIndex   = 0,
      team             = 'player',
      number           = 1,
      speedMult        = 1,
      shootingMult     = 1,
      passingMult      = 1,
    } = options;

    this.scene           = scene;
    this.teamColor       = teamColor;
    this.isGoalkeeper    = isGoalkeeper;
    this.isUserControlled = isUserControlled;
    this.team            = team;
    this.formationIndex  = formationIndex;
    this.number          = number;

    // Team bonuses
    this.speedMult    = speedMult;
    this.shootingMult = shootingMult;
    this.passingMult  = passingMult;

    this.position      = startPosition.clone();
    this.position.y    = 0;
    this.startPosition = startPosition.clone();
    this.velocity      = new THREE.Vector3();
    this.facing        = 0;
    this.state         = 'idle';
    this.hasBall       = false;
    this.kickCooldown  = 0;
    this.energy        = 1.0;
    this.animTime      = 0;
    this.stateTimer    = 0;
    this.command       = { move: new THREE.Vector3(), kick: false, kickTarget: null, kickPower: 1, through: false };
    this.isControlled  = false;
    this.slidingTimer  = 0;
    this.celebrationTimer = 0;

    // Cards
    this.yellowCards   = 0;
    this.redCard       = false;

    // Power shot state (player-team only)
    this.shootCharging  = false;
    this.shootChargeT   = 0;

    this.model = createPlayerModel({ teamColor, isGoalkeeper, number });
    this.model.position.copy(this.position);
    scene.add(this.model);
  }

  update(dt, ball, input) {
    if (this.redCard) {
      // Sent off — invisible, frozen
      this.model.visible = false;
      return;
    }
    this.model.visible = true;

    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.stateTimer   = Math.max(0, this.stateTimer - dt);

    if (this.state === 'celebrating') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) this.state = 'idle';
      this.animateModel(dt, ball);
      this._updateModelTransform();
      return;
    }

    if (this.state === 'sliding') {
      this.slidingTimer -= dt;
      if (this.slidingTimer <= 0) {
        this.state = 'idle';
        this.velocity.set(0, 0, 0);
      }
    }

    let moveDir   = new THREE.Vector3(0, 0, 0);
    let wantKick  = false;
    let wantPass  = false;
    let wantThrough = false;
    let wantTackle  = false;
    let sprint    = false;

    if (this.isUserControlled && this.isControlled && input) {
      moveDir.x   = input.move.x;
      moveDir.z   = input.move.z;
      wantKick    = input.kick;
      wantPass    = input.pass;
      wantThrough = input.through || false;
      sprint      = input.sprint;
      wantTackle  = input.tackle || false;

      // Power shot charging
      if (wantKick) {
        if (!this.shootCharging) {
          this.shootCharging = true;
          this.shootChargeT  = 0;
        }
        this.shootChargeT = Math.min(this.shootChargeT + dt, 1.5);
      } else if (this.shootCharging) {
        // Released — commit the kick with charged power
        this.shootCharging   = false;
        wantKick             = false; // handled via _doChargedShoot
        this._pendingShoot   = true;
        this._pendingCharge  = this.shootChargeT;
        this.shootChargeT    = 0;
      }
    } else {
      moveDir.copy(this.command.move);
      wantKick    = this.command.kick;
      wantPass    = this.command.pass;
      wantThrough = this.command.through || false;
      sprint      = this.command.sprint || false;
    }

    const baseSpeed = (sprint ? CONFIG.PLAYER.SPRINT_SPEED : CONFIG.PLAYER.SPEED) * this.speedMult;
    const speed = baseSpeed * (0.65 + this.energy * 0.35);

    if (moveDir.length() > 0.01) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
      this.facing = Math.atan2(moveDir.x, moveDir.z);
      if (this.state !== 'kicking' && this.state !== 'sliding') this.state = 'running';
    } else {
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.z) < 0.1) {
        this.velocity.set(0, 0, 0);
        if (this.state === 'running') this.state = 'idle';
      }
    }

    // Stamina
    if (sprint && moveDir.length() > 0.01) {
      this.energy = Math.max(0.35, this.energy - dt * 0.14);
    } else {
      this.energy = Math.min(1.0,  this.energy + dt * 0.07);
    }

    // Move
    if (this.state !== 'sliding') {
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
    } else {
      this.position.x += this.velocity.x * dt * 0.7;
      this.position.z += this.velocity.z * dt * 0.7;
    }

    // Clamp to field
    const hw = CONFIG.FIELD.WIDTH  / 2 - 0.5;
    const hh = CONFIG.FIELD.HEIGHT / 2 - 0.5;
    this.position.x = Math.max(-hw, Math.min(hw, this.position.x));
    this.position.z = Math.max(-hh, Math.min(hh, this.position.z));
    this.position.y = 0;

    const distToBall = this.position.distanceTo(ball.position);
    const kickRange  = this.isGoalkeeper ? CONFIG.PLAYER.KICK_RANGE * 2.2 : CONFIG.PLAYER.KICK_RANGE;
    const inKickRange = distToBall < kickRange;
    this.hasBall      = distToBall < CONFIG.PLAYER.KICK_RANGE * 0.6;

    // Auto-convert shoot press to tackle if not in range
    if (this.isUserControlled && this.isControlled && !this.isGoalkeeper && wantKick && !inKickRange && this.kickCooldown <= 0) {
      wantTackle = true;
      wantKick   = false;
    }

    // Charged power shoot (on release)
    if (this._pendingShoot) {
      this._pendingShoot = false;
      if (inKickRange && this.kickCooldown <= 0) {
        this._doChargedShoot(ball, this._pendingCharge);
      }
      this._pendingCharge = 0;
    }

    // Normal pass/kick
    if ((wantPass || (wantKick && !this.shootCharging)) && inKickRange && this.kickCooldown <= 0) {
      this._doBallKick(ball, wantPass);
    }

    // Through ball
    if (wantThrough && inKickRange && this.kickCooldown <= 0) {
      this._doThroughBall(ball);
    }

    // Sliding tackle
    if (wantTackle && this.state !== 'sliding' && this.state !== 'kicking' && this.kickCooldown <= 0) {
      this.state        = 'sliding';
      this.slidingTimer = 0.7;
      const tackleDir   = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
      this.velocity.copy(tackleDir.clone().multiplyScalar(CONFIG.PLAYER.SPRINT_SPEED * 1.45));
      if (distToBall < CONFIG.PLAYER.KICK_RANGE * 2.2) {
        ball.kick(this.position, tackleDir, 14, 0.1);
        ball.setLastTouch(this.team === 'player' ? 0 : 1);
      }
      this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN * 2;
      if (window.audioManager) window.audioManager.playKick();
    }

    this.animTime += dt;
    this.animateModel(dt, ball);
    this._updateModelTransform();
  }

  _doChargedShoot(ball, chargeTime) {
    // chargeTime: 0 = tap, 1.5 = max charge
    const chargePct    = Math.min(chargeTime / 1.5, 1.0);
    const dir          = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    const toBall       = new THREE.Vector3().subVectors(ball.position, this.position).normalize();
    dir.add(toBall.multiplyScalar(0.25)).normalize();

    const basePower    = 18 * this.shootingMult;
    const bonusPower   = 16 * chargePct * this.shootingMult;
    const power        = basePower + bonusPower;
    const loft         = 0.18 + chargePct * 0.28;

    ball.kick(this.position, dir, power, loft);
    ball.setLastTouch(this.team === 'player' ? 0 : 1);
    this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN;
    this.state        = 'kicking';
    this.stateTimer   = 0.45;
    if (window.audioManager) window.audioManager.playKick();
    // Trigger power shot sound/effect via UI
    if (window._onPowerShot) window._onPowerShot(chargePct);
  }

  _doBallKick(ball, isPass) {
    const toBall  = new THREE.Vector3().subVectors(ball.position, this.position).normalize();
    let direction;

    if (this.isGoalkeeper) {
      const clearX = this.team === 'player' ? 1 : -1;
      const clearZ = ball.position.z > 0 ? -0.55 : 0.55;
      direction    = new THREE.Vector3(clearX, 0.2, clearZ).normalize();
      const power  = 22 * this.passingMult;
      ball.kick(this.position, direction, power, 0.35);
      ball.setLastTouch(this.team === 'player' ? 0 : 1);
      this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN;
      this.state    = 'saving';
      this.stateTimer = 0.55;
      if (window.audioManager) window.audioManager.playKick();
      return;
    }

    if (this.command.kickTarget && !this.isControlled) {
      direction = new THREE.Vector3().subVectors(this.command.kickTarget, this.position).normalize();
    } else {
      direction = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
      direction.add(toBall.multiplyScalar(0.3)).normalize();
    }

    const passP  = (this.command.kickPower || 0.6) * 18 * this.passingMult;
    const shootP = (this.command.kickPower || 1.0) * 26 * this.shootingMult;
    const power  = isPass ? passP : shootP;
    const loft   = isPass ? 0.08 : 0.25;

    ball.kick(this.position, direction, power, loft);
    ball.setLastTouch(this.team === 'player' ? 0 : 1);
    this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN;
    this.state    = this.isGoalkeeper ? 'saving' : 'kicking';
    this.stateTimer = 0.45;
    if (window.audioManager) window.audioManager.playKick();
  }

  _doThroughBall(ball) {
    // Lofted pass into space behind the defense
    const attackDir = this.team === 'player' ? 1 : -1;
    const dir = new THREE.Vector3(attackDir, 0, Math.cos(this.facing) * 0.4).normalize();
    const power = 24 * this.passingMult;
    ball.kick(this.position, dir, power, 0.55);
    ball.setLastTouch(this.team === 'player' ? 0 : 1);
    this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN;
    this.state    = 'kicking';
    this.stateTimer = 0.45;
    if (window.audioManager) window.audioManager.playKick();
    if (window._onThroughBall) window._onThroughBall();
  }

  animateModel(dt, ball) {
    const bones = this.model.bones;
    if (!bones) return;

    if (this.state === 'running') {
      const freq = 8.5;
      const amp  = 0.65;
      const t    = this.animTime * freq;
      bones.leftUpperLeg.rotation.x   = Math.sin(t) * amp;
      bones.rightUpperLeg.rotation.x  = Math.sin(t + Math.PI) * amp;
      bones.leftLowerLeg.rotation.x   = Math.max(0, Math.sin(t + 0.5) * amp * 0.85);
      bones.rightLowerLeg.rotation.x  = Math.max(0, Math.sin(t + Math.PI + 0.5) * amp * 0.85);
      bones.leftUpperArm.rotation.x   = Math.sin(t + Math.PI) * amp * 0.55;
      bones.rightUpperArm.rotation.x  = Math.sin(t) * amp * 0.55;
      bones.leftUpperArm.rotation.z   = 0.18;
      bones.rightUpperArm.rotation.z  = -0.18;
      bones.torso.rotation.y          = Math.sin(t * 0.5) * 0.09;
      bones.head.rotation.y           = 0;

    } else if (this.state === 'kicking') {
      const kickP = 1 - this.stateTimer / 0.45;
      const kAng  = Math.sin(kickP * Math.PI) * 1.6;
      bones.rightUpperLeg.rotation.x  = -kAng;
      bones.rightLowerLeg.rotation.x  = Math.max(0, kAng * 0.65);
      bones.leftUpperLeg.rotation.x   = 0.22;
      bones.leftLowerLeg.rotation.x   = 0;
      bones.leftUpperArm.rotation.x   = -0.45;
      bones.rightUpperArm.rotation.x  = 0.45;
      bones.torso.rotation.y          = -0.22;

    } else if (this.state === 'celebrating') {
      const t    = this.animTime * 6;
      const jumpH = Math.abs(Math.sin(t)) * 0.45;
      this.model.position.y          = jumpH;
      bones.leftUpperArm.rotation.x  = -1.9;
      bones.rightUpperArm.rotation.x = -1.9;
      bones.leftUpperArm.rotation.z  = 0.55;
      bones.rightUpperArm.rotation.z = -0.55;
      bones.leftUpperLeg.rotation.x  = Math.sin(t * 0.5) * 0.32;
      bones.rightUpperLeg.rotation.x = Math.sin(t * 0.5 + Math.PI) * 0.32;
      bones.head.rotation.x          = -0.32;

    } else if (this.state === 'saving') {
      const t     = 1 - Math.max(0, this.stateTimer) / 0.55;
      const reach = Math.sin(t * Math.PI) * 1.7;
      bones.leftUpperArm.rotation.x  = -reach;
      bones.rightUpperArm.rotation.x = -reach;
      bones.leftUpperArm.rotation.z  =  1.0 + reach * 0.3;
      bones.rightUpperArm.rotation.z = -1.0 - reach * 0.3;
      bones.torso.rotation.x         = -0.32;
      this.model.position.y          = Math.sin(t * Math.PI) * 0.55;

    } else if (this.state === 'sliding') {
      bones.leftUpperLeg.rotation.x  = 0.55;
      bones.rightUpperLeg.rotation.x = -1.25;
      bones.leftUpperArm.rotation.x  = -0.55;
      bones.rightUpperArm.rotation.x = -0.55;

    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 1.6) * 0.022;
      bones.torso.rotation.x = breath;
      const r = (v) => v * 0.84;
      bones.leftUpperLeg.rotation.x  = r(bones.leftUpperLeg.rotation.x);
      bones.rightUpperLeg.rotation.x = r(bones.rightUpperLeg.rotation.x);
      bones.leftLowerLeg.rotation.x  = r(bones.leftLowerLeg.rotation.x);
      bones.rightLowerLeg.rotation.x = r(bones.rightLowerLeg.rotation.x);
      bones.leftUpperArm.rotation.x  = r(bones.leftUpperArm.rotation.x);
      bones.rightUpperArm.rotation.x = r(bones.rightUpperArm.rotation.x);
      bones.leftUpperArm.rotation.z  = 0.09;
      bones.rightUpperArm.rotation.z = -0.09;
      if (this.model.position.y > 0.01) this.model.position.y *= 0.8;
      else this.model.position.y = 0;
    }

    if (this.stateTimer <= 0 && this.state === 'kicking') this.state = 'idle';
  }

  _updateModelTransform() {
    this.model.position.x = this.position.x;
    this.model.position.z = this.position.z;
    if (this.state !== 'celebrating') this.model.position.y = this.position.y;
    this.model.rotation.y = this.facing;
  }

  kick(ball, power, direction) {
    const dist = this.position.distanceTo(ball.position);
    if (dist < CONFIG.PLAYER.KICK_RANGE && this.kickCooldown <= 0) {
      ball.kick(this.position, direction, power * this.shootingMult, 0.2);
      this.kickCooldown = CONFIG.PLAYER.KICK_COOLDOWN;
      this.state    = 'kicking';
      this.stateTimer = 0.35;
    }
  }

  celebrate() {
    this.state             = 'celebrating';
    this.celebrationTimer  = 2.5;
    this.animTime          = 0;
  }

  getCommand()    { return this.command; }
  setCommand(cmd) { this.command = { ...this.command, ...cmd }; }

  resetToStart() {
    this.position.copy(this.startPosition);
    this.position.y = 0;
    this.velocity.set(0, 0, 0);
    this.state       = 'idle';
    this.kickCooldown = 0;
    this.hasBall     = false;
    this.shootCharging = false;
    this.shootChargeT  = 0;
    this._pendingShoot = false;
    this._updateModelTransform();
    this.model.position.y = 0;
    if (this.model.bones) {
      Object.values(this.model.bones).forEach(b => {
        if (b && b.rotation) { b.rotation.x = 0; b.rotation.y = 0; b.rotation.z = 0; }
      });
    }
  }

  dispose() {
    this.scene.remove(this.model);
  }
}
