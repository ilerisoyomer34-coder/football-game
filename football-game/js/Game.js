import * as THREE from 'three';
import { CONFIG, CLUB_TEAMS, NATIONAL_TEAMS } from './config.js';
import { Field } from './Field.js';
import { Ball } from './Ball.js';
import { Team } from './Team.js';
import { GameCamera } from './GameCamera.js';
import { UI } from './UI.js';
import { InputController } from './InputController.js';
import { AudioManager } from './AudioManager.js';
import { ParticleSystem } from './ParticleSystem.js';

export class Game {
  constructor(container, uiContainer) {
    this.container   = container;
    this.uiContainer = uiContainer;
    this.state       = 'menu';
    this.score       = [0, 0];
    this.half        = 1;          // 1 or 2
    this.halfTime    = 0;          // elapsed in current half
    this.halfDuration = CONFIG.GAME.HALF_DURATION;
    this.injuryTime  = 0;          // extra time added at end of half
    this.goalCooldown = 0;
    this.animFrameId = null;
    this.cards       = { homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 };

    this.stats = { playerShots: 0, opponentShots: 0, playerFrames: 0, totalFrames: 0 };

    this._setupRenderer();
    this._setupScene();

    this.gameCamera = new GameCamera(this.renderer);
    this.ui         = new UI(uiContainer);
    this.input      = new InputController();
    this.audio      = new AudioManager();
    window.audioManager = this.audio;

    // Global callbacks for power shot / through ball UI effects
    window._onPowerShot  = (pct) => this.ui.flashPowerShot(pct);
    window._onThroughBall = ()   => this.ui.showThroughBallFlash();

    this._setupEventListeners();
    this._setupField();
    this._setupTeams();
    this._setupBall();
    this.particles = new ParticleSystem(this.scene);

    this._startLoop();
    this.ui.showMenu(CLUB_TEAMS, NATIONAL_TEAMS, (homeTeam, awayTeam, difficulty, halfLen) => {
      this.halfDuration = halfLen;
      this._selectedHomeTeam = homeTeam;
      this._selectedAwayTeam = awayTeam;
      this._selectedDifficulty = difficulty;
      this.start();
    });
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);
    this.clock = new THREE.Clock();
  }

  _setupField()  { this.field = new Field(this.scene); }

  _setupTeams() {
    this.playerTeam = new Team(this.scene, {
      color: CONFIG.TEAMS.PLAYER_COLOR,
      isPlayerTeam: true,
      side: 'left',
    });
    this.opponentTeam = new Team(this.scene, {
      color: CONFIG.TEAMS.OPPONENT_COLOR,
      isPlayerTeam: false,
      side: 'right',
    });
  }

  _setupBall() {
    this.ball = new Ball(this.scene);
    this.ball.setPosition(0, CONFIG.BALL.RADIUS, 0);
    const diff = 'medium';
    this.playerTeam.initAI(this.opponentTeam,   this.ball, diff);
    this.opponentTeam.initAI(this.playerTeam,   this.ball, diff);
  }

  _setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    const homeTeam = this._selectedHomeTeam || CLUB_TEAMS[0];
    const awayTeam = this._selectedAwayTeam || CLUB_TEAMS[1];
    const diff     = this._selectedDifficulty || 'medium';

    // Rebuild teams with selected data
    this.playerTeam.dispose();
    this.opponentTeam.dispose();
    this.playerTeam = new Team(this.scene, {
      color: homeTeam.primaryColor,
      isPlayerTeam: true,
      side: 'left',
      teamData: homeTeam,
    });
    this.opponentTeam = new Team(this.scene, {
      color: awayTeam.primaryColor,
      isPlayerTeam: false,
      side: 'right',
      teamData: awayTeam,
    });

    this.ball.setPosition(0, CONFIG.BALL.RADIUS, 0);
    this.playerTeam.initAI(this.opponentTeam,   this.ball, diff);
    this.opponentTeam.initAI(this.playerTeam,   this.ball, diff);

    this.ui.hideMenu();
    this.audio.playWhistle();
    this.startMatch(homeTeam, awayTeam);
  }

  startMatch(homeTeam, awayTeam) {
    this.state        = 'playing';
    this.score        = [0, 0];
    this.half         = 1;
    this.halfTime     = 0;
    this.injuryTime   = Math.floor(Math.random() * 3) + 1; // 1-3 min injury time
    this.goalCooldown = 0;
    this.foulCooldown = 0;
    this.cards        = { homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 };
    this.stats        = { playerShots: 0, opponentShots: 0, playerFrames: 0, totalFrames: 0 };

    const ht = homeTeam || CLUB_TEAMS[0];
    const at = awayTeam || CLUB_TEAMS[1];
    this.ui.startMatch(ht, at, this.halfDuration);
    this.ui.updateScore(0, 0);
    this.ui.updateHalf(1);
    this.resetPositions();
  }

  restart() {
    const homeTeam = this._selectedHomeTeam || CLUB_TEAMS[0];
    const awayTeam = this._selectedAwayTeam || CLUB_TEAMS[1];
    const diff     = this._selectedDifficulty || 'medium';
    this.playerTeam.setDifficulty(diff);
    this.opponentTeam.setDifficulty(diff);
    this.ui.hideGameOver();
    this.audio.playWhistle();
    this.foulCooldown = 0;
    this.startMatch(homeTeam, awayTeam);
  }

  _startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.update();
    };
    loop();
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'playing' || this.state === 'goal' || this.state === 'dead_ball') {
      if (this.state === 'playing') {
        this.halfTime += dt;
        if (this.goalCooldown > 0) this.goalCooldown -= dt;
        if (this.foulCooldown > 0) this.foulCooldown -= dt;

        const elapsed   = this.halfTime;
        const total     = this.halfDuration + (this.half === 2 ? this.injuryTime : 0);
        const remaining = Math.max(0, total - elapsed);

        // Display time: in 2nd half show time as 45+ or continuing from 45
        const displayOffset = this.half === 2 ? this.halfDuration : 0;
        this.ui.updateTimer(remaining, this.half, this.halfDuration, displayOffset);

        // Track power shot charge for UI
        const controlled = this.playerTeam.getControlledPlayer();
        if (controlled) {
          this.ui.updatePowerMeter(controlled.shootCharging ? controlled.shootChargeT / 1.5 : 0);
        }

        this.checkHalfTime();
      }

      const userInput = this.input.getInput();

      if (this.state !== 'dead_ball') {
        this.playerTeam.update(dt, this.ball, this.opponentTeam, userInput);
        this.opponentTeam.update(dt, this.ball, this.playerTeam, null);
      }

      this.ball.update(dt);

      if (this.state === 'playing' && this.stats) {
        this.stats.totalFrames++;
        if (this.ball.lastTouchTeam === 0) this.stats.playerFrames++;
      }

      if (this.goalCooldown <= 0 && this.state === 'playing') {
        this.checkGoals();
        this.checkOutOfBounds();
        this.checkFouls();
      }

      this.field.update(dt);
      this.particles.update(dt);

      const controlled2 = this.playerTeam.getControlledPlayer();
      this.gameCamera.update(
        dt,
        this.ball.position,
        controlled2 ? controlled2.position : null,
        { width: CONFIG.FIELD.WIDTH, height: CONFIG.FIELD.HEIGHT }
      );

      if (controlled2) {
        const screenPos = this.gameCamera.getWorldToScreen(
          controlled2.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
          window.innerWidth, window.innerHeight
        );
        this.ui.updatePlayerIndicator(screenPos.x, screenPos.y);
        this.ui.updateStaminaBar(controlled2.energy);
      }

      this.ui.updateMiniMap(this.playerTeam, this.opponentTeam, this.ball);
    }

    this.renderer.render(this.scene, this.gameCamera.camera);
  }

  checkHalfTime() {
    const total = this.halfDuration + (this.half === 2 ? this.injuryTime : 0);
    if (this.halfTime < total) return;

    if (this.half === 1) {
      // Half time
      this.half     = 2;
      this.halfTime = 0;
      this.injuryTime = Math.floor(Math.random() * 3) + 1;
      this.state    = 'dead_ball';
      this.ball.frozen = true;
      this.ball.velocity.set(0, 0, 0);
      this.audio.playWhistle();
      this.ui.showHalfTime(this.score[0], this.score[1]);
      setTimeout(() => {
        this.ui.hideHalfTime();
        this.ui.updateHalf(2);
        this.ball.frozen = false;
        this.state       = 'playing';
        this.resetPositions();
        this.audio.playWhistle();
        this.ui.showDeadBallMessage('2. DEVRE');
      }, 5000);
    } else {
      // Full time
      this.state = 'gameover';
      this.audio.playWhistle();
      setTimeout(() => {
        this.ui.showGameOver(this.score[0], this.score[1], this.stats, this.cards);
      }, 800);
    }
  }

  checkGoals() {
    const [leftGoal, rightGoal] = this.field.goals;
    const ballPos = this.ball.position;
    const ballR   = this.ball.radius;

    if (leftGoal.checkBallInGoal(ballPos, ballR)) {
      this.onGoalScored(1);
      leftGoal.celebrateGoal();
      return;
    }
    if (rightGoal.checkBallInGoal(ballPos, ballR)) {
      this.onGoalScored(0);
      rightGoal.celebrateGoal();
      return;
    }
  }

  onGoalScored(teamIndex) {
    this.score[teamIndex]++;
    if (this.stats) {
      if (teamIndex === 0) this.stats.playerShots++;
      else this.stats.opponentShots++;
    }
    this.state        = 'goal';
    this.goalCooldown = 3.5;

    const teamName = teamIndex === 0 ? 'HOME' : 'CPU';
    this.ui.updateScore(this.score[0], this.score[1]);
    this.ui.showGoalCelebration(teamName);

    this.audio.playGoal();
    this.gameCamera.shake(0.8, 1.5);

    const goalX = teamIndex === 0 ? CONFIG.FIELD.WIDTH / 2 : -CONFIG.FIELD.WIDTH / 2;
    this.particles.spawnGoalEffect(new THREE.Vector3(goalX, 1, 0));
    this.field.crowdCelebrate();
    this.playerTeam.celebrate();
    this.opponentTeam.celebrate();

    setTimeout(() => {
      if (this.state !== 'gameover') {
        this.state        = 'playing';
        this.goalCooldown = 0;
        this.resetPositions();
        this.audio.playWhistle();
      }
    }, 3200);
  }

  resetPositions() {
    this.ball.setPosition(0, CONFIG.BALL.RADIUS, 0);
    this.playerTeam.resetPositions();
    this.opponentTeam.resetPositions();
  }

  checkOutOfBounds() {
    const ev = this.ball.outEvent;
    if (!ev) return;
    this.ball.outEvent = null;

    const lastTeam = this.ball.lastTouchTeam;

    if (ev.type === 'touchline') {
      const throwTeam = lastTeam === 0 ? 1 : 0;
      this._startDeadBall('THROW-IN', () => {
        const clampedX = THREE.MathUtils.clamp(ev.ballX, -CONFIG.FIELD.WIDTH / 2 + 2, CONFIG.FIELD.WIDTH / 2 - 2);
        const lineZ    = ev.zSide * (CONFIG.FIELD.HEIGHT / 2);
        this.ball.setPosition(clampedX, CONFIG.BALL.RADIUS, lineZ);
        const team  = throwTeam === 0 ? this.playerTeam : this.opponentTeam;
        const taker = this._getNearestPlayerToPoint(team, new THREE.Vector3(clampedX, 0, lineZ));
        if (taker) { taker.position.set(clampedX, 0, lineZ + ev.zSide * 1.5); taker.kickCooldown = 0; }
      });
    } else if (ev.type === 'endline') {
      const defTeam = ev.side === 'left' ? 0 : 1;
      const atkTeam = 1 - defTeam;
      if (lastTeam === defTeam) this._startCorner(ev.side, atkTeam, ev.ballZ);
      else                      this._startGoalKick(ev.side, defTeam);
    }
  }

  _startDeadBall(message, resumeFn) {
    this.state       = 'dead_ball';
    this.ball.frozen = true;
    this.ball.velocity.set(0, 0, 0);
    this.ui.showDeadBallMessage(message);
    setTimeout(() => {
      resumeFn();
      this.ball.frozen = false;
      this.state       = 'playing';
    }, 1400);
  }

  _startCorner(side, teamIndex, ballZ) {
    const cornerX = side === 'left' ? -CONFIG.FIELD.WIDTH / 2 + 0.3 : CONFIG.FIELD.WIDTH / 2 - 0.3;
    const cornerZ = (ballZ >= 0 ? 1 : -1) * (CONFIG.FIELD.HEIGHT / 2 - 0.3);
    this._startDeadBall('CORNER!', () => {
      this.ball.setPosition(cornerX, CONFIG.BALL.RADIUS, cornerZ);
      const team  = teamIndex === 0 ? this.playerTeam : this.opponentTeam;
      const taker = this._getNearestPlayerToPoint(team, new THREE.Vector3(cornerX, 0, cornerZ));
      if (taker) { taker.position.set(cornerX + (side === 'left' ? 1.5 : -1.5), 0, cornerZ); taker.kickCooldown = 0; }
    });
  }

  _startGoalKick(side, teamIndex) {
    const kickX = side === 'left' ? -CONFIG.FIELD.WIDTH / 2 + 7 : CONFIG.FIELD.WIDTH / 2 - 7;
    this._startDeadBall('GOAL KICK', () => {
      this.ball.setPosition(kickX, CONFIG.BALL.RADIUS, 0);
      const team = teamIndex === 0 ? this.playerTeam : this.opponentTeam;
      const gk   = team.players[0];
      if (gk) { gk.position.set(kickX + (side === 'left' ? 1.5 : -1.5), 0, 0); gk.kickCooldown = 0; }
    });
  }

  _getNearestPlayerToPoint(team, point) {
    let nearest = null, minD = Infinity;
    for (const p of team.players) {
      if (p.redCard) continue;
      const d = p.position.distanceTo(point);
      if (d < minD) { minD = d; nearest = p; }
    }
    return nearest;
  }

  checkFouls() {
    if (this.foulCooldown > 0) return;
    const check = (sliderTeam, victimTeam) => {
      for (const slider of sliderTeam.players) {
        if (slider.state !== 'sliding' || slider.redCard) continue;
        for (const victim of victimTeam.players) {
          if (victim.redCard) continue;
          if (slider.position.distanceTo(victim.position) < 0.7) {
            const freeKickTeam = sliderTeam === this.playerTeam ? 1 : 0;
            this._onFoul(victim.position.clone(), freeKickTeam, slider);
            return true;
          }
        }
      }
      return false;
    };
    check(this.playerTeam, this.opponentTeam) || check(this.opponentTeam, this.playerTeam);
  }

  _onFoul(foulPos, freeKickTeamIndex, fouler) {
    this.foulCooldown = 4.0;

    // Card logic
    const roll = Math.random();
    const isHomeFouler = fouler && fouler.team === 'player';
    if (roll > 0.88) {
      // Red card
      if (fouler) {
        fouler.redCard = true;
        if (isHomeFouler) { this.cards.homeRed++; }
        else              { this.cards.awayRed++; }
        this.ui.showCard('red', isHomeFouler ? 'HOME' : 'CPU');
      }
    } else if (roll > 0.55) {
      // Yellow card
      if (fouler) {
        fouler.yellowCards = (fouler.yellowCards || 0) + 1;
        if (isHomeFouler) { this.cards.homeYellow++; }
        else              { this.cards.awayYellow++; }
        this.ui.showCard('yellow', isHomeFouler ? 'HOME' : 'CPU');
        if (fouler.yellowCards >= 2) {
          fouler.redCard = true;
          this.ui.showCard('red', isHomeFouler ? 'HOME' : 'CPU');
        }
      }
    }

    this._startDeadBall('FAUL!', () => {
      this.ball.setPosition(foulPos.x, CONFIG.BALL.RADIUS, foulPos.z);
      const fkTeam = freeKickTeamIndex === 0 ? this.playerTeam : this.opponentTeam;
      const taker  = this._getNearestPlayerToPoint(fkTeam, foulPos);
      if (taker) {
        const standoffDir = new THREE.Vector3(
          freeKickTeamIndex === 0 ? -1.5 : 1.5, 0, (Math.random() - 0.5) * 2
        );
        taker.position.copy(foulPos).add(standoffDir);
        taker.kickCooldown = 0;
      }
    });
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.gameCamera.onResize(w, h);
  }
}
