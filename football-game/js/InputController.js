export class InputController {
  constructor() {
    this.keys = {};

    this.touchActive   = false;
    this.joystick      = { x: 0, z: 0, magnitude: 0 };
    this.touchKick     = false;
    this.touchPass     = false;
    this.touchThrough  = false;
    this.touchSprint   = false;
    this.touchTackle   = false;

    this._kickConsumed  = false;
    this._tackleFired   = false;
    this._switchFired   = false;

    this._joystickTouchId  = null;
    this._joystickOrigin   = { x: 0, y: 0 };
    this._joystickRadius   = 65;

    this._joystickBase  = null;
    this._joystickThumb = null;

    this._setupKeyboard();
    this._initTouch();
  }

  _setupKeyboard() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'Tab')   { e.preventDefault(); this._switchFired = true; }
      if (e.code === 'KeyQ')  this._tackleFired = true;
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  _initTouch() {
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!this.isTouch) return;
    this.touchActive = true;

    // Wire buttons when DOM is ready
    const wire = () => this._wireTouchButtons();
    if (document.getElementById('touch-overlay')) {
      wire();
    } else {
      window.addEventListener('touchUIReady', wire, { once: true });
      // Fallback: try again after a short delay
      setTimeout(wire, 1000);
    }
  }

  _wireTouchButtons() {
    // Joystick zone
    const zone = document.getElementById('touch-joystick-zone');
    this._joystickBase  = document.getElementById('joystick-base');
    this._joystickThumb = document.getElementById('joystick-thumb');

    if (!zone) return;

    zone.addEventListener('touchstart',  (e) => this._onJoystickStart(e), { passive: false });
    zone.addEventListener('touchmove',   (e) => this._onJoystickMove(e),  { passive: false });
    zone.addEventListener('touchend',    (e) => this._onJoystickEnd(e),   { passive: false });
    zone.addEventListener('touchcancel', (e) => this._onJoystickEnd(e),   { passive: false });

    // Action buttons — hold shoot to charge
    const btnShoot = document.getElementById('btn-shoot');
    if (btnShoot) {
      btnShoot.addEventListener('touchstart',  (e) => { e.preventDefault(); this.touchKick = true; },  { passive: false });
      btnShoot.addEventListener('touchend',    (e) => { e.preventDefault(); this.touchKick = false; }, { passive: false });
      btnShoot.addEventListener('touchcancel', (e) => { e.preventDefault(); this.touchKick = false; }, { passive: false });
    }

    const btnPass = document.getElementById('btn-pass');
    if (btnPass) {
      btnPass.addEventListener('touchstart',  (e) => { e.preventDefault(); this.touchPass = true; },  { passive: false });
      btnPass.addEventListener('touchend',    (e) => { e.preventDefault(); this.touchPass = false; }, { passive: false });
      btnPass.addEventListener('touchcancel', (e) => { e.preventDefault(); this.touchPass = false; }, { passive: false });
    }

    const btnThrough = document.getElementById('btn-through');
    if (btnThrough) {
      btnThrough.addEventListener('touchstart',  (e) => { e.preventDefault(); this.touchThrough = true; },  { passive: false });
      btnThrough.addEventListener('touchend',    (e) => { e.preventDefault(); this.touchThrough = false; }, { passive: false });
      btnThrough.addEventListener('touchcancel', (e) => { e.preventDefault(); this.touchThrough = false; }, { passive: false });
    }

    const btnSprint = document.getElementById('btn-sprint');
    if (btnSprint) {
      btnSprint.addEventListener('touchstart',  (e) => { e.preventDefault(); this.touchSprint = true; },  { passive: false });
      btnSprint.addEventListener('touchend',    (e) => { e.preventDefault(); this.touchSprint = false; }, { passive: false });
      btnSprint.addEventListener('touchcancel', (e) => { e.preventDefault(); this.touchSprint = false; }, { passive: false });
    }

    const btnTackle = document.getElementById('btn-tackle');
    if (btnTackle) {
      btnTackle.addEventListener('touchstart', (e) => { e.preventDefault(); this._tackleFired = true; }, { passive: false });
    }

    const btnSwitch = document.getElementById('btn-switch');
    if (btnSwitch) {
      btnSwitch.addEventListener('touchstart', (e) => { e.preventDefault(); this._switchFired = true; }, { passive: false });
    }
  }

  _onJoystickStart(e) {
    e.preventDefault();
    if (this._joystickTouchId !== null) return;
    const t = e.changedTouches[0];
    this._joystickTouchId = t.identifier;
    this._joystickOrigin  = { x: t.clientX, y: t.clientY };

    if (this._joystickBase) {
      const zone = document.getElementById('touch-joystick-zone');
      const rect = zone.getBoundingClientRect();
      this._joystickBase.style.left    = (t.clientX - rect.left) + 'px';
      this._joystickBase.style.top     = (t.clientY - rect.top)  + 'px';
      this._joystickBase.style.display = 'block';
      if (this._joystickThumb) {
        this._joystickThumb.style.left = '50%';
        this._joystickThumb.style.top  = '50%';
      }
    }
  }

  _onJoystickMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== this._joystickTouchId) continue;
      const dx   = t.clientX - this._joystickOrigin.x;
      const dy   = t.clientY - this._joystickOrigin.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const clamp = Math.min(dist, this._joystickRadius);
      const nx   = (dx / (dist || 1)) * clamp;
      const ny   = (dy / (dist || 1)) * clamp;

      if (this._joystickThumb) {
        this._joystickThumb.style.left = (50 + (nx / this._joystickRadius) * 50) + '%';
        this._joystickThumb.style.top  = (50 + (ny / this._joystickRadius) * 50) + '%';
      }

      this.joystick.x         =  nx / this._joystickRadius;
      this.joystick.z         =  ny / this._joystickRadius;
      this.joystick.magnitude = clamp / this._joystickRadius;
    }
  }

  _onJoystickEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== this._joystickTouchId) continue;
      this._joystickTouchId   = null;
      this.joystick.x         = 0;
      this.joystick.z         = 0;
      this.joystick.magnitude = 0;
      if (this._joystickBase) this._joystickBase.style.display = 'none';
    }
  }

  getInput() {
    // Keyboard movement
    const kbMove = { x: 0, z: 0 };
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    kbMove.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  kbMove.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  kbMove.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kbMove.x += 1;
    const kbLen = Math.sqrt(kbMove.x**2 + kbMove.z**2);
    if (kbLen > 0) { kbMove.x /= kbLen; kbMove.z /= kbLen; }

    const kbKick    = !!(this.keys['Space']);
    const kbPass    = !!(this.keys['KeyE']);
    const kbThrough = !!(this.keys['KeyR']);
    const kbSprint  = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

    // Touch
    const useTouch = this.touchActive && this.joystick.magnitude > 0.04;
    const move     = useTouch ? { x: this.joystick.x, z: this.joystick.z } : kbMove;

    // Auto-sprint on full joystick push
    const autoSprint = this.joystick.magnitude > 0.82;
    const sprint     = kbSprint || this.touchSprint || autoSprint;
    const kick       = kbKick   || this.touchKick;
    const pass       = kbPass   || this.touchPass;
    const through    = kbThrough || this.touchThrough;

    const tackle      = this._tackleFired;
    const switchPlayer = this._switchFired;
    this._tackleFired  = false;
    this._switchFired  = false;

    return { move, sprint, kick, pass, through, tackle, switchPlayer };
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
