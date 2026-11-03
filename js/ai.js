/* ============================================================
   NHS FIGHTER — CPU opponent
   Produces the same input object a human would. Plans are short
   lived intents, re-rolled every few frames.
   ============================================================ */
(function (N) {
  const LEVELS = [
    { react: 26, block: 0.22, aggro: 0.34, special: 0.20 }, // easy
    { react: 15, block: 0.48, aggro: 0.56, special: 0.34 }, // normal
    { react: 8, block: 0.72, aggro: 0.76, special: 0.46 }   // hard
  ];

  N.CPU = class CPU {
    constructor(fighter, level) {
      this.f = fighter;
      this.level = level || 1;
      this.cfg = LEVELS[this.level];
      this.plan = { kind: 'advance', t: 20 };
      this.timer = 0;
      this.fired = false;
      this.think = 0;
    }

    set(kind, t, extra) {
      this.plan = Object.assign({ kind, t: t || 18 }, extra || {});
      this.timer = this.plan.t;
      this.fired = false;
    }

    update(opp) {
      const f = this.f;
      const inp = { left: false, right: false, up: false, down: false, punch: false, kick: false, special: false };
      if (!f || f.ko || !opp) return inp;
      if (f.state === 'ko' || f.state === 'victory') return inp;
      if (f.hitstop > 0 || !f.canAct()) return inp;

      const dx = opp.x - f.x;
      const adx = Math.abs(dx);
      const toward = dx >= 0 ? 'right' : 'left';
      const away = dx >= 0 ? 'left' : 'right';

      this.timer--;
      if (this.timer <= 0) this.decide(opp, adx);

      const p = this.plan;

      switch (p.kind) {
        case 'advance':
          inp[toward] = true;
          if (adx < 34) this.set('attack', 14);
          break;

        case 'retreat':
          inp[away] = true;
          break;

        case 'guard':
          inp[away] = true;
          if (Math.random() < 0.04) inp.down = true;
          break;

        case 'crouch':
          inp.down = true;
          inp[away] = true;
          break;

        case 'jumpin':
          if (f.grounded() && !this.fired) {
            inp.up = true;
            inp[toward] = true;
            this.fired = true;
          } else if (!f.grounded() && adx < 52) {
            inp.kick = true;
          }
          break;

        case 'special':
          inp[toward] = true;
          if (!this.fired && f.meter >= 40) {
            inp.special = true;
            this.fired = true;
          }
          break;

        case 'attack':
          if (!this.fired) {
            if (adx < 30) {
              if (Math.random() < 0.6) inp.punch = true;
              else inp.kick = true;
            } else if (adx < 52) {
              if (Math.random() < 0.55) inp.kick = true;
              else inp.punch = true;
            } else {
              inp[toward] = true;
            }
            this.fired = true;
          }
          break;

        default:
          break;
      }

      return inp;
    }

    decide(opp, adx) {
      const c = this.cfg;
      const f = this.f;
      const r = Math.random();

      const oppAttacking = opp.state === 'attack' && opp.move &&
        opp.moveFrame <= opp.move.startup + opp.move.active + 2;

      // defensive reaction
      if (oppAttacking && adx < 78 && Math.random() < c.block) {
        this.set('guard', 12 + Math.random() * 14);
        return;
      }

      // far away
      if (adx > 128) {
        if (f.def.proj && f.meter >= 40 && Math.random() < c.special) {
          this.set('special', 26);
        } else if (Math.random() < 0.55 + c.aggro * 0.3) {
          this.set('advance', 24 + Math.random() * 26);
        } else {
          this.set('jumpin', 30);
        }
        return;
      }

      // mid range
      if (adx > 58) {
        if (opp.state === 'knockdown' || opp.state === 'getup') {
          this.set('advance', 26);
          return;
        }
        if (r < 0.5) this.set('advance', 16 + Math.random() * 16);
        else if (r < 0.68) this.set('jumpin', 26);
        else if (r < 0.86 && f.meter >= 40 && f.def.proj) this.set('special', 24);
        else this.set('guard', 14 + Math.random() * 10);
        return;
      }

      // close
      if (r < 0.34 + c.aggro * 0.2) this.set('attack', 16 + Math.random() * 8);
      else if (r < 0.52) this.set('advance', 12);
      else if (r < 0.64) this.set('crouch', 16 + Math.random() * 10);
      else if (r < 0.76) this.set('retreat', 14 + Math.random() * 10);
      else if (r < 0.86 && f.meter >= 40) this.set('special', 22);
      else this.set('guard', 16);
    }
  };
})(window.NHS);
