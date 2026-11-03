/* ============================================================
   NHS FIGHTER — chiptune-ish SFX, synthesized. No audio files.
   ============================================================ */
(function (N) {
  const A = {
    ctx: null,
    master: null,
    muted: false,
    started: false,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    },

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
      return this.muted;
    },

    tone(freq, dur, type, vol, slideTo, delay) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol === undefined ? 0.18 : vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    noise(dur, vol, delay) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol === undefined ? 0.16 : vol;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.7;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    },

    sfx(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case 'punch':
          this.tone(180, 0.07, 'square', 0.2, 70);
          this.noise(0.05, 0.12);
          break;
        case 'kick':
          this.tone(120, 0.11, 'square', 0.22, 48);
          this.noise(0.08, 0.16);
          break;
        case 'block':
          this.tone(880, 0.05, 'square', 0.12, 620);
          this.noise(0.04, 0.08);
          break;
        case 'guard':
          this.tone(420, 0.26, 'sawtooth', 0.2, 80);
          this.noise(0.12, 0.14);
          break;
        case 'whiff':
          this.noise(0.06, 0.05);
          break;
        case 'jump':
          this.tone(240, 0.09, 'triangle', 0.14, 520);
          break;
        case 'land':
          this.tone(90, 0.06, 'square', 0.12, 60);
          break;
        case 'special':
          this.tone(320, 0.16, 'sawtooth', 0.15, 720);
          break;
        case 'uppercut':
          this.tone(200, 0.2, 'sawtooth', 0.18, 900);
          this.noise(0.1, 0.1);
          break;
        case 'rush':
          this.tone(140, 0.18, 'sawtooth', 0.16, 420);
          break;
        case 'fireball':
          this.tone(520, 0.18, 'square', 0.12, 260);
          break;
        case 'hit':
          this.tone(150, 0.09, 'square', 0.2, 60);
          this.noise(0.07, 0.14);
          break;
        case 'ko':
          this.tone(300, 0.5, 'sawtooth', 0.2, 40);
          this.noise(0.3, 0.14);
          break;
        case 'select':
          this.tone(660, 0.05, 'square', 0.12);
          this.tone(990, 0.07, 'square', 0.1, null, 0.05);
          break;
        case 'move':
          this.tone(440, 0.035, 'square', 0.08);
          break;
        case 'lock':
          this.tone(520, 0.06, 'square', 0.12);
          this.tone(780, 0.09, 'square', 0.12, null, 0.06);
          break;
        case 'deny':
          this.tone(150, 0.08, 'square', 0.1, 110);
          break;
        case 'start':
          this.tone(330, 0.08, 'square', 0.14);
          this.tone(440, 0.08, 'square', 0.14, null, 0.09);
          this.tone(660, 0.16, 'square', 0.15, null, 0.18);
          break;
        case 'win':
          this.tone(523, 0.1, 'square', 0.15);
          this.tone(659, 0.1, 'square', 0.15, null, 0.11);
          this.tone(784, 0.1, 'square', 0.15, null, 0.22);
          this.tone(1046, 0.25, 'square', 0.16, null, 0.33);
          break;
        case 'tick':
          this.tone(1200, 0.03, 'square', 0.06);
          break;
        default:
          break;
      }
    }
  };

  N.Audio = A;
})(window.NHS);
