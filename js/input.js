/* ============================================================
   NHS FIGHTER — keyboard input
   Fixed 60Hz tick. Edge detection + a small history buffer so
   special-move motions (down, then forward + attack) work.
   ============================================================ */
(function (N) {
  const P1 = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyQ', kick: 'KeyE' };
  const P2 = { left: 'KeyJ', right: 'KeyL', up: 'KeyI', down: 'KeyK', punch: 'KeyU', kick: 'KeyO' };

  const I = {
    keys: Object.create(null),   // live, written by events
    cur: Object.create(null),    // snapshot at this tick
    prev: Object.create(null),   // snapshot at previous tick
    buffer: new Set(),           // codes pressed since the last tick
    edge: new Set(),             // codes to treat as "pressed" this tick
    maps: [P1, P2],
    hist: [[], []],
    firstKey: false,

    init() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) {
          e.preventDefault();
        }
        if (e.repeat) return;
        this.keys[e.code] = true;
        this.buffer.add(e.code);
        if (!this.firstKey) { this.firstKey = true; N.Audio.resume(); }
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
      window.addEventListener('blur', () => {
        this.keys = Object.create(null);
        this.cur = Object.create(null);
        this.buffer.clear();
      });
    },

    /* call once at the start of every 60Hz tick */
    tick() {
      this.prev = this.cur;
      this.cur = Object.assign(Object.create(null), this.keys);
      this.edge = this.buffer;
      this.buffer = new Set();
    },

    down(code) { return !!this.cur[code]; },
    press(code) {
      return this.edge.has(code) || (!!this.cur[code] && !this.prev[code]);
    },

    /* raw state for one player, plus history push */
    raw(i) {
      const m = this.maps[i];
      const left = this.down(m.left);
      const right = this.down(m.right);
      const inp = {
        left, right,
        up: this.press(m.up),
        down: this.down(m.down),
        upHeld: this.down(m.up),
        punch: this.press(m.punch),
        kick: this.press(m.kick),
        punchHeld: this.down(m.punch),
        kickHeld: this.down(m.kick),
        special: false
      };

      const h = this.hist[i];
      h.push({ left, right, down: inp.down, attack: inp.punch || inp.kick });
      if (h.length > 30) h.shift();

      return inp;
    },

    /* down -> forward -> attack, within ~20 frames */
    motionSpecial(i, facing) {
      const h = this.hist[i];
      if (h.length < 3) return false;
      const last = h[h.length - 1];
      if (!last.attack) return false;

      const fwd = facing > 0 ? 'right' : 'left';
      let sawFwd = false;

      for (let k = h.length - 2; k >= Math.max(0, h.length - 20); k--) {
        const e = h[k];
        if (e[fwd]) sawFwd = true;
        if (e.down && sawFwd) return true;
      }
      return false;
    },

    /* swallow whatever is held, so a scene change can't eat the
       same keypress twice */
    eat() {
      this.prev = Object.assign(Object.create(null), this.cur);
      this.edge = new Set();
    },

    clearHistory() {
      this.hist = [[], []];
    }
  };

  N.Input = I;
})(window.NHS);
