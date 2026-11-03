/* ============================================================
   NHS FIGHTER — fighters + per-fighter state machine
   Every state below owns: enter(), update(), exit().
   Art for a state lives in art.js keyed off the state name.
   ============================================================ */
(function (N) {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const G = () => N.GROUND;

  /* ------------------------------------------------------------
     projectile
     ------------------------------------------------------------ */
  N.Projectile = class Projectile {
    constructor(owner, cfg, offsetY) {
      this.owner = owner;
      this.cfg = cfg;
      this.x = owner.x + owner.facing * 16;
      this.y = owner.y - 37 + (offsetY || 0);
      this.vx = owner.facing * cfg.speed;
      this.size = cfg.size;
      this.damage = cfg.damage;
      this.life = cfg.life;
      this.color = cfg.color;
      this.edge = cfg.edge;
      this.dead = false;
      this.t = 0;
    }
    update() {
      this.x += this.vx;
      this.t++;
      this.life--;
      if (this.life <= 0 || this.x < -20 || this.x > N.W + 20) this.dead = true;
    }
    box() {
      return { x: this.x - this.size, y: this.y - this.size, w: this.size * 2, h: this.size * 2 };
    }
  };

  /* ------------------------------------------------------------
     fighter
     ------------------------------------------------------------ */
  N.Fighter = class Fighter {
    constructor(def, x, facing, index) {
      this.def = def;
      this.index = index;
      this.maxHealth = def.health;
      this.reset(x, facing);
    }

    reset(x, facing) {
      this.x = x;
      this.y = N.GROUND;
      this.vx = 0;
      this.vy = 0;
      this.facing = facing;
      this.health = this.maxHealth;
      this.meter = 40;
      this.gauge = 0;
      this.gaugeReady = false;
      this.dodgeT = 0;
      this.buffs = [];
      this.atkMul = 1;
      this.defMul = 1;
      this.speedMul = 1;
      this.didDoubleJump = false;
      this.state = 'idle';
      this.stateTime = 0;
      this.animTime = (this.index || 0) * 41;
      this.move = null;
      this.moveFrame = 0;
      this.hitDone = false;
      this.hitstop = 0;
      this.flash = 0;
      this.invuln = 0;
      this.crouchHit = false;
      this.blocking = false;
      this.locked = false;
      this.finalReady = false;
      this.combo = 0;
      this.comboTimer = 0;
      this.hitTimer = 0;
      this.groundFrames = 0;
      this.lockedInput = null;
      this.ko = false;
    }

    grounded() { return this.y >= G() - 0.5; }

    /* --- state plumbing ------------------------------------ */
    setState(name) {
      if (this.state === name) return;
      const prev = STATES[this.state];
      if (prev && prev.exit) prev.exit(this);
      this.state = name;
      this.stateTime = 0;
      const next = STATES[name];
      if (next && next.enter) next.enter(this);
    }

    toNeutral() {
      if (!this.grounded()) this.setState('jump');
      else this.setState('idle');
    }

    canAct() {
      return !this.locked && !this.ko && this.hitstop <= 0;
    }

    /* --- actions ------------------------------------------- */
    startAttack(id) {
      const m = N.MOVES[id];
      if (!m) return false;
      this.move = m;
      this.moveFrame = 0;
      this.hitDone = false;
      this.setState('attack');
      if (m.invuln) this.invuln = Math.max(this.invuln, m.invuln);
      if (m.sfx === 'kick') N.Audio.sfx('whiff');
      return true;
    }

    trySpecial() {
      // FINAL replaces the normal special when it's unlocked
      if (this.finalReady) {
        this.meter = 0;
        this.startAttack('final');
        this.finalReady = false;
        N.Audio.sfx('special');
        return true;
      }

      const id = this.def.special;
      const m = N.MOVES[id];
      if (!m) return false;

      // ADAMYA — the gauge covers the meter cost
      const free = this.def.gauge && this.def.gauge.kind === 'free' && this.gaugeReady;
      if (free) {
        this.gauge = 0;
        this.gaugeReady = false;
      } else {
        if (this.meter < m.cost) {
          this.meterFlash = 16;
          N.Audio.sfx('deny');
          return true;
        }
        this.meter -= m.cost;
      }
      this.startAttack(id);

      // AARNAV — his own special grants ATK+DEF
      if (id === this.def.special && this.def.specialBuff) {
        const sb = this.def.specialBuff;
        if (sb.atk) this.addBuff('atkUp', sb.frames);
        if (sb.def) this.addBuff('defUp', sb.frames);
      }
      return true;
    }

    jump(dir) {
      if (!this.grounded()) return;
      this.vy = -this.def.jump;
      if (dir) this.vx = dir * this.def.speed * (this.speedMul || 1) * 1.15;
      this.setState('jump');
      N.Audio.sfx('jump');
    }

    spawnProjectile(world) {
      const cfg = this.def.proj;
      if (!cfg) return;
      const count = cfg.count || 1;
      for (let i = 0; i < count; i++) {
        const p = new N.Projectile(this, cfg, count > 1 ? (i === 0 ? -3 : 3) : 0);
        p.x += this.facing * i * 6;
        world.projectiles.push(p);
      }
      N.Audio.sfx('fireball');
    }

    /* --- hitboxes ------------------------------------------ */
    hurtbox() {
      const st = this.state;
      const airborne = this.y < G() - 1;
      const hh = this.def.hurtH || 51;

      if (st === 'knockdown' || st === 'ko') {
        return { x: this.x - 17, y: this.y - 13, w: 34, h: 13 };
      }
      const low = st === 'crouch' || st === 'blockLow' ||
        (st === 'attack' && this.move && this.move.id === 'sweep') ||
        (st === 'hit' && this.crouchHit);

      if (low) {
        const h = Math.round(hh * 0.62);
        return { x: this.x - 9, y: this.y - h, w: 18, h };
      }
      if (airborne) {
        const h = Math.round(hh * 0.94);
        return { x: this.x - 8, y: this.y - h, w: 16, h };
      }
      return { x: this.x - 9, y: this.y - hh, w: 18, h: hh };
    }

    hitbox() {
      const m = this.move;
      if (this.state !== 'attack' || !m || !m.box) return null;
      if (this.moveFrame < m.startup || this.moveFrame >= m.startup + m.active) return null;
      const b = m.box;
      const x = this.facing > 0 ? this.x + b.x : this.x - b.x - b.w;
      return { x, y: this.y + b.y, w: b.w, h: b.h };
    }

    isBlocking() {
      return this.state === 'block' || this.state === 'blockLow' || this.state === 'blockStun';
    }

    threatens(target) {
      if (this.state !== 'attack' || !this.move) return false;
      const m = this.move;
      if (this.moveFrame > m.startup + m.active + 2) return false;
      return Math.abs(target.x - this.x) < 88;
    }

    /* --- damage -------------------------------------------- */
    receive(attacker, move, damage, world) {
      if (this.invuln > 0 || this.state === 'ko' || this.ko) return 'miss';
      if (this.state === 'knockdown' || this.state === 'getup') return 'miss';

      const gk = this.def.gauge && this.def.gauge.kind;

      // ROHAN — auto-dodge: slips the hit entirely, burns one of four charges
      if (gk === 'dodge' && this.gaugeReady && !this.isBlocking()) {
        this.gauge = Math.max(0, (Math.floor(this.gauge / 25) - 1) * 25);
        this.gaugeReady = this.gauge >= 25;
        this.invuln = Math.max(this.invuln, 26);
        this.dodgeT = 22;
        this.vx = -this.facing * 1.7;
        this.hitstop = 4;
        attacker.hitstop = 4;
        if (this.gauge <= 0) this.addBuff('spdDown', 300);
        world.sparks.push({ x: this.x, y: this.y - 30, kind: 'block', t: 0, life: 16 });
        N.Audio.sfx('jump');
        return 'dodge';
      }

      // AARNAV — auto-guard: eats the hit with no damage
      if (gk === 'guard' && this.gaugeReady && !this.isBlocking()) {
        this.gauge = 0;
        this.gaugeReady = false;
        this.setState('blockStun');
        this.hitTimer = 12;
        this.vx = -this.facing * 1.1;
        this.hitstop = 3;
        attacker.hitstop = 3;
        world.sparks.push({ x: this.x + this.facing * 10, y: this.y - 34, kind: 'block', t: 0, life: 14 });
        N.Audio.sfx('block');
        return 'guard';
      }

      const blocked = this.isBlocking();

      // defence buff
      if (this.defMul !== 1) damage = Math.max(1, Math.round(damage * this.defMul));
      world.shake = Math.max(world.shake, blocked ? 1.6 : 2.6 + Math.min(3, damage * 0.18));

      if (blocked) {
        const chip = move.special ? 1 : 0;
        this.health = Math.max(0, this.health - chip);
        this.setState('blockStun');
        this.hitTimer = move.blockstun || 9;
        this.vx = -this.facing * (move.kb || 1.4) * 0.8;
        this.hitstop = 2;
        attacker.hitstop = 2;
        this.meter = Math.min(100, this.meter + 2);
        attacker.meter = Math.min(100, attacker.meter + 2);
        world.sparks.push({
          x: this.x + this.facing * 10, y: this.y - 38,
          kind: 'block', t: 0, life: 12
        });
        N.Audio.sfx('block');
      } else {
        this.health = Math.max(0, this.health - damage);
        this.flash = 3;
        this.crouchHit = (this.state === 'crouch');

        this.vx = -this.facing * (move.kb || 1.5);
        if (move.kbUp) this.vy = move.kbUp;

        const airborne = this.y < G() - 1 || (move.kbUp && move.kbUp < -1);

        if (this.health <= 0) {
          this.ko = true;
          this.setState('ko');
          this.vy = Math.min(this.vy, -3.2);
          this.vx = -this.facing * 3.4;
          this.hitstop = 0;
          attacker.hitstop = 8;
          world.hitstop = 10;
          N.Audio.sfx('ko');
        } else if (move.knockdown) {
          this.setState('knockdown');
          this.vy = Math.min(this.vy, -2.6);
          this.hitstop = 3;
          attacker.hitstop = 3;
          N.Audio.sfx('kick');
        } else if (airborne) {
          this.setState('hitAir');
          this.hitTimer = (move.hitstun || 14) + 8;
          this.hitstop = 3;
          attacker.hitstop = 3;
          N.Audio.sfx('hit');
        } else {
          this.setState('hit');
          this.hitTimer = move.hitstun || 14;
          this.hitstop = 3;
          attacker.hitstop = 3;
          N.Audio.sfx('hit');
        }

        attacker.combo++;
        attacker.comboTimer = 70;
        attacker.meter = Math.min(100, attacker.meter + 7);
        this.meter = Math.min(100, this.meter + 4);

        world.sparks.push({
          x: this.x + this.facing * 8, y: this.y - 40 + (Math.random() * 8 - 4),
          kind: 'hit', t: 0, life: 14
        });
      }

      return blocked ? 'block' : 'hit';
    }

    addBuff(kind, frames) {
      const b = this.buffs.find((x) => x.kind === kind);
      if (b) b.t = Math.max(b.t, frames);
      else this.buffs.push({ kind, t: frames });
      this.refreshMuls();
    }

    refreshMuls() {
      this.atkMul = this.hasBuff('atkUp') ? 1.5 : 1;
      this.defMul = this.hasBuff('defUp') ? 0.5 : 1;
      this.speedMul = this.hasBuff('spdDown') ? 0.6 : (this.hasBuff('spdUp') ? 1.5 : 1);
    }

    hasBuff(kind) {
      return this.buffs.some((b) => b.kind === kind);
    }

    /* --- per-frame ----------------------------------------- */
    update(input, opp, world) {
      this.animTime++;
      this.stateTime++;

      if (this.flash > 0) this.flash--;
      if (this.invuln > 0) this.invuln--;
      if (this.comboTimer > 0) { if (--this.comboTimer === 0) this.combo = 0; }
      if (this.meterFlash > 0) this.meterFlash--;
      this.meter = Math.min(100, this.meter + 0.045);

      // character gauge: trickles up, triggers when full
      const gk = this.def.gauge && this.def.gauge.kind;
      if (this.def.gauge) {
        if (this.gauge < 100) this.gauge = Math.min(100, this.gauge + this.def.gauge.rate);
        this.gaugeReady = this.gauge >= (gk === 'dodge' ? 25 : 100);
      }
      if (this.dodgeT > 0) this.dodgeT--;

      // buff timers
      for (let i = this.buffs.length - 1; i >= 0; i--) {
        if (--this.buffs[i].t <= 0) this.buffs.splice(i, 1);
      }

      // Rohan is quick while his meter is stocked
      if (gk === 'dodge' && this.gauge >= 100) this.addBuff('spdUp', 6);

      this.refreshMuls();

      if (this.hitstop > 0) {
        this.hitstop--;
        return;
      }

      const inp = input || EMPTY_INPUT;

      // face the opponent while in neutral, grounded states
      if (this.grounded() && !this.ko && this.state !== 'attack' && this.state !== 'hit' &&
        this.state !== 'knockdown' && this.state !== 'getup' && opp) {
        this.facing = opp.x >= this.x ? 1 : -1;
      }

      const st = STATES[this.state];
      if (st && st.update) st.update(this, inp, opp, world);

      this.applyPhysics();
    }

    applyPhysics() {
      const airborne = this.y < G() - 0.5;

      this.x += this.vx;
      this.x = clamp(this.x, N.WALL_L, N.WALL_R);

      if (airborne || this.y < G()) this.vy += N.GRAVITY;
      this.y += this.vy;

      if (this.y >= G()) {
        this.y = G();
        this.vy = 0;
        this.groundFrames++;
        if (airborne) this.onLand();
      } else {
        this.groundFrames = 0;
      }

      // ground friction
      if (this.y >= G() - 0.5 && this.state !== 'attack') {
        this.vx *= 0.78;
        if (Math.abs(this.vx) < 0.02) this.vx = 0;
      }
    }

    onLand() {
      this.didDoubleJump = false;
      if (this.state === 'attack' && this.move && this.move.air) {
        this.move = null;
        this.setState('land');
        N.Audio.sfx('land');
        return;
      }
      if (this.state === 'hitAir') {
        this.setState('knockdown');
        this.vx *= 0.7;
        return;
      }
      if (this.state === 'knockdown') return;
      if (this.state === 'ko') { this.setState('ko'); return; }
      if (this.state === 'jump') {
        this.setState('land');
        N.Audio.sfx('land');
        return;
      }
      this.setState('land');
    }
  };

  const EMPTY_INPUT = {
    left: false, right: false, up: false, down: false,
    punch: false, kick: false, special: false
  };

  /* ============================================================
     STATES
     ============================================================ */
  const STATES = {};
  N.STATES = STATES;

  function backHeld(f, inp) {
    return f.facing > 0 ? inp.left : inp.right;
  }

  function wantsBlock(f, inp, opp) {
    return backHeld(f, inp) && opp && opp.threatens(f);
  }

  /* --- idle ------------------------------------------------ */
  STATES.idle = {
    update(f, inp, opp, world) {
      if (!f.canAct()) return;
      f.vx = 0;

      if (wantsBlock(f, inp, opp)) return f.setState(inp.down ? 'blockLow' : 'block');

      if (inp.special && f.trySpecial()) return;
      if (inp.punch) return f.startAttack('jab');
      if (inp.kick) return f.startAttack('kick');
      if (inp.up) return f.setState('prejump');
      if (inp.down) return f.setState('crouch');

      if (inp.left || inp.right) {
        const dir = inp.left ? -1 : 1;
        return f.setState(dir === f.facing ? 'walkF' : 'walkB');
      }
    }
  };

  /* --- walking --------------------------------------------- */
  function walkUpdate(f, inp, opp) {
    if (!f.canAct()) { f.vx *= 0.8; return; }
    if (wantsBlock(f, inp, opp)) return f.setState(inp.down ? 'blockLow' : 'block');

    if (inp.special && f.trySpecial()) return;
    if (inp.punch) return f.startAttack('jab');
    if (inp.kick) return f.startAttack('kick');
    if (inp.up) return f.setState('prejump');
    if (inp.down) return f.setState('crouch');

    const dir = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
    if (dir === 0) return f.setState('idle');

    f.vx = dir * f.def.speed * (f.speedMul || 1) * (dir === f.facing ? 1 : 0.82);
    if (dir === f.facing) f.setState('walkF');
    else f.setState('walkB');
  }

  STATES.walkF = { update: walkUpdate };
  STATES.walkB = { update: walkUpdate };

  /* --- crouch ---------------------------------------------- */
  STATES.crouch = {
    enter(f) { f.vx *= 0.4; },
    update(f, inp, opp) {
      if (!f.canAct()) return;
      f.vx = 0;

      if (inp.special && f.trySpecial()) return;
      if (inp.punch) return f.startAttack('lowJab');
      if (inp.kick) return f.startAttack('sweep');
      if (inp.up) return f.setState('prejump');
      if (inp.down) {
        if (wantsBlock(f, inp, opp)) return f.setState('blockLow');
        return;
      }
      f.setState('idle');
    }
  };

  /* --- block ----------------------------------------------- */
  function blockUpdate(f, inp, opp) {
    if (!f.canAct()) return;
    f.vx = 0;

    if (!backHeld(f, inp)) return f.setState('idle');
    if (!(opp && opp.threatens(f))) return f.setState('idle');

    if (inp.down) f.setState('blockLow');
    else f.setState('block');
  }

  STATES.block = {
    enter(f) { f.blocking = true; f.vx = 0; },
    exit(f) { f.blocking = false; },
    update: blockUpdate
  };

  STATES.blockLow = {
    enter(f) { f.blocking = true; f.vx = 0; },
    exit(f) { f.blocking = false; },
    update: blockUpdate
  };

  /* --- jump / air ------------------------------------------ */
  STATES.prejump = {
    enter(f) { f.vx *= 0.45; },
    update(f, inp) {
      if (!f.canAct()) return;
      const dir = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);

      // up + punch = launcher, up + kick = jump-in kick
      if (inp.punch) return f.startAttack('launcher');
      if (inp.kick) { f.jump(dir); return f.startAttack('airkick'); }

      if (f.stateTime >= 3) f.jump(dir);
    }
  };

  STATES.jump = {
    update(f, inp, opp, world) {
      if (!f.canAct()) return;

      const dir = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
      if (dir !== 0) {
        f.vx += dir * 0.09;
        f.vx = clamp(f.vx, -f.def.speed * 1.6, f.def.speed * 1.6);
      }

      if (inp.up && f.def.doubleJump && f.gaugeReady && !f.didDoubleJump) {
        f.vy = -f.def.jump * 0.85;
        f.didDoubleJump = true;
        N.Audio.sfx('jump');
        return;
      }

      if (inp.punch) return f.startAttack('divePunch');
      if (inp.kick) return f.startAttack('airkick');
    }
  };

  STATES.land = {
    enter(f) { f.vx *= 0.35; },
    update(f, inp) {
      if (f.stateTime > 5) f.setState('idle');
    }
  };

  /* --- attacks --------------------------------------------- */
  STATES.attack = {
    enter(f) { f.moveFrame = 0; f.hitDone = false; f.hitCount = 0; },
    update(f, inp, opp, world) {
      const m = f.move;
      if (!m) { f.toNeutral(); return; }
      f.moveFrame++;

      if (m.dash && f.moveFrame >= m.startup && f.moveFrame < m.startup + m.active) {
        f.vx = f.facing * m.dash;
      } else if (f.grounded()) {
        f.vx *= 0.72;
      }

      if (m.rise && f.moveFrame === m.startup) {
        f.vy = m.rise;
      }

      if (m.spawn === 'proj' && f.moveFrame === m.startup) {
        f.spawnProjectile(world);
      }

      // multi-hit flurry: re-arm the hitbox on a cadence
      if (m.hits && f.hitCount < m.hits &&
        f.moveFrame >= m.startup && f.moveFrame < m.startup + m.active) {
        const since = f.moveFrame - m.startup;
        if (since > 0 && since % (m.hitEvery || 4) === 0) f.hitDone = false;
      }

      // FINAL activation: freeze frame + screen flash
      if (m.id === 'final' && f.moveFrame === 1 && world) {
        world.freeze = 16;
        world.superFlash = 44;
        world.superName = f.def.name + ' // ' + f.def.tag;
        N.Audio.sfx('special');
      }

      if (!m.air) {
        const total = m.startup + m.active + m.recovery;
        if (f.moveFrame >= total) f.toNeutral();
      }
    },
    exit(f) {
      f.move = null;
      f.moveFrame = 0;
      f.hitDone = false;
      f.hitCount = 0;
    }
  };

  /* --- reactions ------------------------------------------- */
  STATES.hit = {
    enter(f) { f.vx *= 0.6; },
    update(f) {
      f.vx *= 0.86;
      if (--f.hitTimer <= 0) f.toNeutral();
    }
  };

  STATES.hitAir = {
    update(f) {
      if (--f.hitTimer <= 0 && f.grounded()) f.setState('knockdown');
    }
  };

  STATES.blockStun = {
    update(f) {
      f.vx *= 0.8;
      if (--f.hitTimer <= 0) f.toNeutral();
    }
  };

  STATES.knockdown = {
    enter(f) {
      f.invuln = Math.max(f.invuln, 999);
      f.vx *= 0.8;
    },
    update(f) {
      if (f.grounded()) {
        f.vx *= 0.86;
        if (f.groundFrames > 36) f.setState('getup');
      }
    }
  };

  STATES.getup = {
    enter(f) { f.invuln = 22; f.vx = 0; },
    update(f) {
      if (f.stateTime > 16) f.setState('idle');
    }
  };

  STATES.ko = {
    enter(f) { f.invuln = 0; },
    update(f) {
      f.vx *= 0.9;
    }
  };

  STATES.victory = {
    update(f) { f.vx = 0; }
  };

  /* --- utility for scenes ---------------------------------- */
  N.Fighter.prototype.toVictory = function () {
    this.move = null;
    this.setState('victory');
  };
})(window.NHS);
