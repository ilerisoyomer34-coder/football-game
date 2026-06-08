import * as THREE from 'three';
import { CONFIG } from './config.js';

export const ROLES = {
  GOALKEEPER: 'goalkeeper',
  DEFENDER: 'defender',
  MIDFIELDER: 'midfielder',
  ATTACKER: 'attacker',
};

const FORMATION_ZONES = [
  { xRatio: 0.91, zBase:   0, zSpread:  2 },
  { xRatio: 0.61, zBase: -22, zSpread:  4 },
  { xRatio: 0.61, zBase:  -7, zSpread:  5 },
  { xRatio: 0.61, zBase:   7, zSpread:  5 },
  { xRatio: 0.61, zBase:  22, zSpread:  4 },
  { xRatio: 0.29, zBase: -24, zSpread:  6 },
  { xRatio: 0.29, zBase:  -8, zSpread:  7 },
  { xRatio: 0.29, zBase:   8, zSpread:  7 },
  { xRatio: 0.29, zBase:  24, zSpread:  6 },
  { xRatio: 0.07, zBase:  -8, zSpread:  6 },
  { xRatio: 0.07, zBase:   8, zSpread:  6 },
];

const DIFFICULTY = {
  easy:   { thinkInterval: 0.45, reactionDelay: 0.45, shootChance: 0.20, pressRange: 15, shootRange: 18, kickPowerMult: 0.7 },
  medium: { thinkInterval: 0.15, reactionDelay: 0.15, shootChance: 0.55, pressRange: 25, shootRange: 25, kickPowerMult: 0.9 },
  hard:   { thinkInterval: 0.05, reactionDelay: 0.05, shootChance: 0.85, pressRange: 40, shootRange: 35, kickPowerMult: 1.0 },
};

export class AIController {
  constructor(player, role, team, opposingTeam, ball, config, difficulty = 'medium') {
    this.player = player;
    this.role = role;
    this.team = team;
    this.opposingTeam = opposingTeam;
    this.ball = ball;
    this.config = config || CONFIG;

    this.setDifficulty(difficulty);

    this.reactionTimer = 0;
    this.cachedCommand = { move: new THREE.Vector3(), kick: false, kickTarget: null, kickPower: 1.0, pass: false, through: false, sprint: false };
    this.thinkTimer = Math.random() * this.thinkInterval;

    this.wander = new THREE.Vector3();
    this.wanderTimer = 0;

    this.isPlayerTeam = team.isPlayerTeam;
    this.attackDir = this.isPlayerTeam ? 1 : -1;
    this.defenseGoalX = this.isPlayerTeam ? -CONFIG.FIELD.WIDTH / 2 : CONFIG.FIELD.WIDTH / 2;
    this.attackGoalX  = this.isPlayerTeam ?  CONFIG.FIELD.WIDTH / 2 : -CONFIG.FIELD.WIDTH / 2;
  }

  setDifficulty(level) {
    const d = DIFFICULTY[level] || DIFFICULTY.medium;
    this.thinkInterval  = d.thinkInterval + Math.random() * 0.05;
    this.reactionDelay  = d.reactionDelay;
    this.shootChance    = d.shootChance;
    this.pressRange     = d.pressRange;
    this.shootRange     = d.shootRange;
    this.kickPowerMult  = d.kickPowerMult;
  }

  update(dt) {
    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think();
    }
    return this.cachedCommand;
  }

  _think() {
    const ball    = this.ball;
    const player  = this.player;
    const pos     = player.position;
    const ballPos = ball.position;

    const distToBall   = pos.distanceTo(ballPos);
    const teamHasBall  = this.isTeamInPossession();
    const oppHasBall   = this.isOpponentInPossession();
    const formPos      = this.getFormationPosition();

    this.wanderTimer -= this.thinkInterval;
    if (this.wanderTimer <= 0) {
      const zone = FORMATION_ZONES[this.player.formationIndex] || FORMATION_ZONES[0];
      this.wander.set(
        (Math.random() - 0.5) * 6,
        0,
        (Math.random() - 0.5) * zone.zSpread
      );
      this.wanderTimer = 2.0 + Math.random() * 2.0;
    }

    let moveTarget = formPos.clone();
    let wantKick   = false;
    let kickTarget = null;
    let kickPower  = 1.0;
    let wantPass   = false;
    let sprint     = false;

    switch (this.role) {
      case ROLES.GOALKEEPER:
        ({ moveTarget, wantKick, kickTarget, kickPower } =
          this._goalKeeperLogic(pos, ballPos, distToBall, teamHasBall));
        break;
      case ROLES.DEFENDER:
        ({ moveTarget, wantKick, kickTarget, kickPower } =
          this._defenderLogic(pos, ballPos, distToBall, teamHasBall, formPos));
        break;
      case ROLES.MIDFIELDER:
        ({ moveTarget, wantKick, kickTarget, kickPower } =
          this._midfielderLogic(pos, ballPos, distToBall, teamHasBall, formPos));
        break;
      case ROLES.ATTACKER:
        ({ moveTarget, wantKick, kickTarget, kickPower } =
          this._attackerLogic(pos, ballPos, distToBall, teamHasBall, formPos));
        break;
    }

    if (distToBall < CONFIG.PLAYER.KICK_RANGE && player.kickCooldown <= 0) {
      const distToGoal = pos.distanceTo(new THREE.Vector3(this.attackGoalX, 0, 0));

      if (this._shouldShoot(pos, distToGoal)) {
        wantKick   = true;
        kickTarget = this._getShootTarget();
        kickPower  = this.kickPowerMult;
      } else if (!wantKick) {
        const teammate = this._findBestPassTarget();
        if (teammate && Math.random() > 0.5) {
          wantPass   = true;
          kickTarget = teammate.position.clone().add(teammate.velocity.clone().multiplyScalar(0.4));
          kickPower  = 0.55 * this.kickPowerMult;
        } else {
          const advDir = new THREE.Vector3(this.attackDir * 15, 0, (Math.random() - 0.5) * 8);
          kickTarget = pos.clone().add(advDir);
          kickPower  = 0.45 * this.kickPowerMult;
          wantKick   = true;
        }
      }
    }

    sprint = distToBall < 14 || (oppHasBall && this.role !== ROLES.ATTACKER);

    const moveDir = new THREE.Vector3().subVectors(moveTarget, pos);
    moveDir.y = 0;
    if (moveDir.length() > 0.5) moveDir.normalize();
    else moveDir.set(0, 0, 0);

    this.cachedCommand = { move: moveDir, kick: wantKick, pass: wantPass, kickTarget, kickPower, sprint };
  }

  _goalKeeperLogic(pos, ballPos, distToBall, teamHasBall) {
    const gkX   = this.defenseGoalX + (this.isPlayerTeam ? 3 : -3);
    const trackZ = THREE.MathUtils.clamp(ballPos.z, -CONFIG.GOAL.WIDTH / 2 + 0.5, CONFIG.GOAL.WIDTH / 2 - 0.5);
    const ballNearGoal = Math.abs(ballPos.x - this.defenseGoalX) < 22;

    let moveTarget;
    let wantKick  = false;
    let kickTarget = null;
    let kickPower  = 0;

    if (ballNearGoal && distToBall < 14) {
      moveTarget = this.predictBallPosition(0.3);
    } else {
      moveTarget = new THREE.Vector3(gkX, 0, trackZ);
    }

    if (distToBall < CONFIG.PLAYER.KICK_RANGE && this.player.kickCooldown <= 0) {
      wantKick   = true;
      kickTarget = new THREE.Vector3(this.attackDir * 35, 0, (Math.random() - 0.5) * 20);
      kickPower  = 1.0 * this.kickPowerMult;
    }

    return { moveTarget, wantKick, kickTarget, kickPower };
  }

  _defenderLogic(pos, ballPos, distToBall, teamHasBall, formPos) {
    let moveTarget = formPos.clone().add(this.wander);
    let wantKick = false, kickTarget = null, kickPower = 0;

    if (!teamHasBall) {
      const nearestOpp = this._getNearestOpponentToBall();
      if (nearestOpp && nearestOpp.position.distanceTo(pos) < this.pressRange * 0.7) {
        const mark = nearestOpp.position.clone();
        mark.x += this.isPlayerTeam ? -3 : 3;
        moveTarget = mark;
      } else if (distToBall < this.pressRange * 0.9) {
        moveTarget = this.predictBallPosition(0.5);
      }
    } else {
      const pushX = formPos.x + this.attackDir * 6;
      moveTarget = new THREE.Vector3(
        THREE.MathUtils.clamp(pushX, -CONFIG.FIELD.WIDTH / 2 + 5, CONFIG.FIELD.WIDTH / 2 - 5),
        0,
        formPos.z
      ).add(this.wander);
    }

    return { moveTarget, wantKick, kickTarget, kickPower };
  }

  _midfielderLogic(pos, ballPos, distToBall, teamHasBall, formPos) {
    let moveTarget = formPos.clone().add(this.wander);
    let wantKick = false, kickTarget = null, kickPower = 0;

    if (!teamHasBall) {
      if (distToBall < this.pressRange) {
        moveTarget = this.predictBallPosition(0.4);
      }
    } else {
      const runX = formPos.x + this.attackDir * 12;
      const runZ = formPos.z + this.wander.z;
      moveTarget = new THREE.Vector3(
        THREE.MathUtils.clamp(runX, -CONFIG.FIELD.WIDTH / 2 + 5, CONFIG.FIELD.WIDTH / 2 - 5),
        0,
        THREE.MathUtils.clamp(runZ, -CONFIG.FIELD.HEIGHT / 2 + 3, CONFIG.FIELD.HEIGHT / 2 - 3)
      );
    }

    return { moveTarget, wantKick, kickTarget, kickPower };
  }

  _attackerLogic(pos, ballPos, distToBall, teamHasBall, formPos) {
    let moveTarget = formPos.clone().add(this.wander);
    let wantKick = false, kickTarget = null, kickPower = 0;

    if (!teamHasBall) {
      if (distToBall < this.pressRange) {
        moveTarget = this.predictBallPosition(0.35);
      }
    } else {
      const runX = this.attackGoalX - this.attackDir * 8;
      const runZ = this.wander.z * 2.5;
      moveTarget = new THREE.Vector3(
        THREE.MathUtils.clamp(runX, -CONFIG.FIELD.WIDTH / 2 + 5, CONFIG.FIELD.WIDTH / 2 - 5),
        0,
        THREE.MathUtils.clamp(runZ, -CONFIG.FIELD.HEIGHT / 2 + 3, CONFIG.FIELD.HEIGHT / 2 - 3)
      );
    }

    return { moveTarget, wantKick, kickTarget, kickPower };
  }

  getFormationPosition() {
    const idx  = this.player.formationIndex || 0;
    const zone = FORMATION_ZONES[idx] || FORMATION_ZONES[0];
    const defSign = this.isPlayerTeam ? -1 : 1;
    const x = defSign * zone.xRatio * (CONFIG.FIELD.WIDTH / 2);
    const z = zone.zBase;
    return new THREE.Vector3(x, 0, z);
  }

  isTeamInPossession() {
    for (const p of this.team.players) if (p.hasBall) return true;
    return false;
  }

  isOpponentInPossession() {
    for (const p of this.opposingTeam.players) if (p.hasBall) return true;
    return false;
  }

  _shouldShoot(pos, distToGoal) {
    if (distToGoal > this.shootRange) return false;
    const angleOk = Math.abs(pos.z) < CONFIG.GOAL.WIDTH * 2.5;
    return angleOk && Math.random() < this.shootChance;
  }

  _getShootTarget() {
    const side = Math.random() > 0.5 ? 1 : -1;
    return new THREE.Vector3(
      this.attackGoalX,
      THREE.MathUtils.lerp(0.3, CONFIG.GOAL.HEIGHT - 0.3, Math.random()),
      side * (CONFIG.GOAL.WIDTH / 2 - 0.8)
    );
  }

  _getNearestOpponentToBall() {
    let nearest = null;
    let minD = Infinity;
    for (const p of this.opposingTeam.players) {
      const d = p.position.distanceTo(this.ball.position);
      if (d < minD) { minD = d; nearest = p; }
    }
    return nearest;
  }

  _findBestPassTarget() {
    let best = null;
    let bestScore = -Infinity;
    for (const p of this.team.players) {
      if (p === this.player) continue;
      const adv = this.attackDir * (p.position.x - this.player.position.x);
      const dist = p.position.distanceTo(this.player.position);
      const score = adv - dist * 0.15;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  predictBallPosition(t) {
    return new THREE.Vector3(
      this.ball.position.x + this.ball.velocity.x * t,
      0,
      this.ball.position.z + this.ball.velocity.z * t
    );
  }
}
