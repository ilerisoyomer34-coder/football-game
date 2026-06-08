import * as THREE from 'three';
import { Player } from './Player.js';
import { AIController, ROLES } from './AIController.js';
import { CONFIG } from './config.js';

const FORMATION_POSITIONS_LEFT = [
  new THREE.Vector3(-48, 0,   0),  // 0: GK
  new THREE.Vector3(-32, 0, -22),  // 1: LB
  new THREE.Vector3(-32, 0,  -7),  // 2: CB1
  new THREE.Vector3(-32, 0,   7),  // 3: CB2
  new THREE.Vector3(-32, 0,  22),  // 4: RB
  new THREE.Vector3(-15, 0, -24),  // 5: LM
  new THREE.Vector3(-15, 0,  -8),  // 6: CM1
  new THREE.Vector3(-15, 0,   8),  // 7: CM2
  new THREE.Vector3(-15, 0,  24),  // 8: RM
  new THREE.Vector3( -3, 0,  -8),  // 9: ST1
  new THREE.Vector3( -3, 0,   8),  // 10: ST2
];

const FORMATION_POSITIONS_RIGHT = [
  new THREE.Vector3( 48, 0,   0),  // 0: GK
  new THREE.Vector3( 32, 0, -22),  // 1: RB
  new THREE.Vector3( 32, 0,  -7),  // 2: CB1
  new THREE.Vector3( 32, 0,   7),  // 3: CB2
  new THREE.Vector3( 32, 0,  22),  // 4: LB
  new THREE.Vector3( 15, 0, -24),  // 5: RM
  new THREE.Vector3( 15, 0,  -8),  // 6: CM1
  new THREE.Vector3( 15, 0,   8),  // 7: CM2
  new THREE.Vector3( 15, 0,  24),  // 8: LM
  new THREE.Vector3(  3, 0,  -8),  // 9: ST1
  new THREE.Vector3(  3, 0,   8),  // 10: ST2
];

const ROLES_ORDER = [
  ROLES.GOALKEEPER,
  ROLES.DEFENDER,
  ROLES.DEFENDER,
  ROLES.DEFENDER,
  ROLES.DEFENDER,
  ROLES.MIDFIELDER,
  ROLES.MIDFIELDER,
  ROLES.MIDFIELDER,
  ROLES.MIDFIELDER,
  ROLES.ATTACKER,
  ROLES.ATTACKER,
];

export class Team {
  constructor(scene, options = {}) {
    const {
      color        = 0x1565c0,
      isPlayerTeam = false,
      side         = 'left',
      teamData     = null,   // full team object from config (optional)
    } = options;

    this.scene       = scene;
    this.color       = color;
    this.isPlayerTeam = isPlayerTeam;
    this.side        = side;
    this.teamData    = teamData;
    this.score       = 0;
    this.players     = [];
    this.aiControllers   = [];
    this.controlledPlayerIndex = isPlayerTeam ? 9 : -1;
    this._switchCooldown = 0;

    // Card tracking
    this.yellowCards = 0;
    this.redCards    = 0;

    const formationPositions = side === 'left' ? FORMATION_POSITIONS_LEFT : FORMATION_POSITIONS_RIGHT;
    const jerseyNumbers = [1, 3, 5, 4, 2, 11, 8, 6, 7, 9, 10];

    // Team stat multipliers (from teamData or defaults)
    const speedMult    = teamData?.speed    || 1;
    const shootingMult = teamData?.shooting || 1;
    const passingMult  = teamData?.passing  || 1;

    for (let i = 0; i < CONFIG.GAME.PLAYERS_PER_TEAM; i++) {
      const isGK = i === 0;
      const player = new Player(scene, {
        teamColor:        color,
        isGoalkeeper:     isGK,
        isUserControlled: isPlayerTeam,
        startPosition:    formationPositions[i].clone(),
        formationIndex:   i,
        team:             isPlayerTeam ? 'player' : 'opponent',
        number:           jerseyNumbers[i],
        speedMult,
        shootingMult,
        passingMult,
      });
      this.players.push(player);
    }

    if (isPlayerTeam) {
      this.players[this.controlledPlayerIndex].isControlled = true;
    }
  }

  initAI(opposingTeam, ball, difficulty = 'medium') {
    this.aiControllers = [];
    for (let i = 0; i < this.players.length; i++) {
      const role = ROLES_ORDER[i];
      const ai = new AIController(
        this.players[i], role, this, opposingTeam, ball, CONFIG, difficulty,
        this.teamData
      );
      this.aiControllers.push(ai);
    }
  }

  setDifficulty(difficulty) {
    for (const ai of this.aiControllers) ai.setDifficulty(difficulty);
  }

  update(dt, ball, opposingTeam, userInput) {
    if (this.isPlayerTeam && userInput && userInput.switchPlayer) {
      this._manualSwitch();
      this._switchCooldown = 2.0;
    }

    if (this.isPlayerTeam) {
      this._switchCooldown = Math.max(0, this._switchCooldown - dt);
      if (this._switchCooldown <= 0) this.switchControlToNearestToBall(ball);
    }

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.redCard) continue; // sent off

      if (this.isPlayerTeam && player.isControlled) {
        player.update(dt, ball, userInput);
      } else {
        const ai = this.aiControllers[i];
        if (ai) {
          const cmd = ai.update(dt);
          player.setCommand(cmd);
        }
        player.update(dt, ball, null);
      }
    }
  }

  _manualSwitch() {
    let nextIdx = (this.controlledPlayerIndex + 1) % this.players.length;
    // Skip red-carded players
    let tries = 0;
    while (this.players[nextIdx].redCard && tries < this.players.length) {
      nextIdx = (nextIdx + 1) % this.players.length;
      tries++;
    }
    if (this.controlledPlayerIndex >= 0) this.players[this.controlledPlayerIndex].isControlled = false;
    this.controlledPlayerIndex = nextIdx;
    this.players[nextIdx].isControlled = true;
  }

  switchControlToNearestToBall(ball) {
    let minDist = Infinity;
    let nearestIdx = this.controlledPlayerIndex >= 0 ? this.controlledPlayerIndex : 0;

    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].redCard) continue;
      const d = this.players[i].position.distanceTo(ball.position);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }

    if (nearestIdx !== this.controlledPlayerIndex) {
      if (this.controlledPlayerIndex >= 0 && this.players[this.controlledPlayerIndex]) {
        this.players[this.controlledPlayerIndex].isControlled = false;
      }
      this.controlledPlayerIndex = nearestIdx;
      this.players[nearestIdx].isControlled = true;
    }
  }

  getControlledPlayer() {
    if (this.controlledPlayerIndex >= 0 && this.controlledPlayerIndex < this.players.length) {
      return this.players[this.controlledPlayerIndex];
    }
    return this.players[0];
  }

  celebrate()        { for (const p of this.players) p.celebrate(); }
  resetPositions()   { for (const p of this.players) p.resetToStart(); }
  dispose()          { for (const p of this.players) p.dispose(); }

  getActivePlayerCount() {
    return this.players.filter(p => !p.redCard).length;
  }
}
