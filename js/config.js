/* ============================================================
   NHS FIGHTER — config
   All tunable numbers live here. Nothing else should hardcode
   gameplay values.
   ============================================================ */
window.NHS = window.NHS || {};

(function (N) {
  /* --- canvas / world -------------------------------------- */
  N.W = 384;              // internal pixel width
  N.H = 216;              // internal pixel height
  N.GROUND = 182;         // y of the floor line
  N.GRAVITY = 0.46;
  N.WALL_L = 26;
  N.WALL_R = N.W - 26;
  N.PUSH_DIST = 21;       // fighters can't overlap closer than this
  N.ROUNDS_TO_WIN = 2;    // best of 3
  N.ROUND_FRAMES = 60 * 60;
  N.FPS = 60;

  /* --- deterministic rand ---------------------------------- */
  N.rng = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  /* ------------------------------------------------------------
     MOVES
     Frames at 60fps.
     box = hitbox in local space; +x is "forward" (facing dir).
     ------------------------------------------------------------ */
  N.MOVES = {
    jab: {
      id: 'jab', label: 'JAB', art: 'punch',
      startup: 3, active: 2, recovery: 6,
      damage: 3, hitstun: 13, blockstun: 7, kb: 1.3, kbUp: 0,
      box: { x: 4, y: -45, w: 22, h: 9 },
      sfx: 'punch', cost: 0
    },
    kick: {
      id: 'kick', label: 'KICK', art: 'kick',
      startup: 7, active: 4, recovery: 13,
      damage: 7, hitstun: 18, blockstun: 11, kb: 2.6, kbUp: 0,
      box: { x: 4, y: -36, w: 27, h: 12 },
      sfx: 'kick', cost: 0
    },
    sweep: {
      id: 'sweep', label: 'SWEEP', art: 'sweep',
      startup: 7, active: 3, recovery: 17,
      damage: 8, hitstun: 0, blockstun: 12, kb: 2.4, kbUp: -2.4,
      knockdown: true, low: true,
      box: { x: 2, y: -14, w: 29, h: 12 },
      sfx: 'kick', cost: 0
    },
    airkick: {
      id: 'airkick', label: 'DIVE KICK', art: 'jumpAttack',
      startup: 4, active: 99, recovery: 0,
      damage: 8, hitstun: 17, blockstun: 10, kb: 2.0, kbUp: -1.2,
      box: { x: 2, y: -32, w: 25, h: 16 },
      sfx: 'kick', cost: 0, air: true, overhead: true
    },

    /* --- tilts: directional variants of the basic buttons --- */
    launcher: {
      id: 'launcher', label: 'LAUNCHER', art: 'uppercut',
      startup: 6, active: 4, recovery: 16,
      damage: 9, hitstun: 24, blockstun: 12, kb: 1.4, kbUp: -5.8,
      box: { x: 0, y: -58, w: 19, h: 28 },
      sfx: 'uppercut', cost: 0
    },
    lowJab: {
      id: 'lowJab', label: 'LOW JAB', art: 'crouchPunch',
      startup: 4, active: 2, recovery: 7,
      damage: 2, hitstun: 10, blockstun: 6, kb: 1.0,
      box: { x: 2, y: -20, w: 19, h: 10 },
      low: true, sfx: 'punch', cost: 0
    },
    divePunch: {
      id: 'divePunch', label: 'DIVE PUNCH', art: 'divePunch',
      startup: 3, active: 99, recovery: 0,
      damage: 6, hitstun: 14, blockstun: 8, kb: 1.6, kbUp: -0.8,
      box: { x: 2, y: -38, w: 20, h: 16 },
      air: true, overhead: true, sfx: 'punch', cost: 0
    },

    /* --- specials (meter gated) --- */
    fireball: {
      id: 'fireball', label: 'WAVE', art: 'cast',
      startup: 10, active: 2, recovery: 21,
      special: true, cost: 40, sfx: 'special', spawn: 'proj'
    },
    uppercut: {
      id: 'uppercut', label: 'RISE', art: 'uppercut',
      startup: 5, active: 6, recovery: 23,
      damage: 13, hitstun: 28, blockstun: 12, kb: 2.0, kbUp: -5.4,
      box: { x: 0, y: -60, w: 20, h: 28 },
      special: true, cost: 40, invuln: 9, sfx: 'uppercut',
      rise: -7.4
    },
    rush: {
      id: 'rush', label: 'RUSH', art: 'rush',
      startup: 9, active: 12, recovery: 20,
      damage: 11, hitstun: 22, blockstun: 14, kb: 4.2, kbUp: -1.0,
      box: { x: 0, y: -46, w: 25, h: 17 },
      special: true, cost: 40, dash: 2.7, invuln: 4, sfx: 'rush'
    },

    /* --- FINAL: the desperation super -----------------------------
       Only reachable when the fighter is on their last round and the
       meter is completely full. Multi-hit flurry, full bar for a full
       bar. -------------------------------------------------------- */
    final: {
      id: 'final', label: 'FINAL', art: 'final',
      startup: 12, active: 26, recovery: 26,
      damage: 6, hitstun: 16, blockstun: 12, kb: 0.7, kbUp: 0,
      box: { x: 0, y: -54, w: 36, h: 52 },
      special: true, cost: 100, invuln: 12,
      dash: 1.5, hits: 5, hitEvery: 5, knockdownOnLast: true,
      sfx: 'final'
    }
  };

  /* --- how the FINAL unlocks ---------------------------------- */
  N.FINAL = {
    roundThreat: true,    // one more loss ends the whole match
    lowHealth: false,     // or: health under lowHealthPct (off by default)
    lowHealthPct: 0.25,
    meter: 100
  };

  /* ------------------------------------------------------------
     CHARACTERS
     ------------------------------------------------------------ */
  N.CHARS = [
    {
      id: 'adamya', name: 'ADAMYA', tag: 'AGILE',
      health: 96, speed: 1.95, jump: 7.8, weight: 0.88, power: 0.92,
      hurtH: 47,
      special: 'fireball',
      proj: { speed: 4.6, damage: 6, color: '#9cc3e6', edge: '#eaf4ff', size: 5, life: 78, count: 2 },
      pal: { body: '#9cc3e6', shade: '#76a0c9', accent: '#f1e6cf', dark: '#12121a', glow: '#cfe6f5' },
      look: {
        skin: '#e3a06a', skinDark: '#c8834f',
        hair: '#241d1b',
        shirt: '#f2e7d0', shirtDark: '#dbcaad',
        jeans: '#9cc3e6', jeansDark: '#78a4ca',
        shoe: '#43342c',
        eye: '#241d1b',
        glasses: '#3a2c22', lens: '#8fd0f0', lensDark: '#4a8fc4',
        glassesOn: true
      },
      body: { lift: -4, hairTop: 4, hairSide: 2, hairSweep: 0 },
      gauge: { name: 'FLOW', kind: 'free', rate: 0.1, color: '#9cc3e6' },
      stats: { POW: 2, SPD: 5, RNG: 4 },
      blurb: 'QUICK HANDS.'
    },
    {
      id: 'aarnav', name: 'AARNAV', tag: 'REACH',
      health: 104, speed: 1.66, jump: 7.1, weight: 1.02, power: 1.04,
      hurtH: 55,
      special: 'uppercut',
      pal: { body: '#d4665c', shade: '#9a3a33', accent: '#e6edf5', dark: '#14181d', glow: '#cfd9e4' },
      look: {
        skin: '#cc8a52', skinDark: '#b07242',
        hair: '#1b1b20',
        shirt: '#b23a32', shirtDark: '#8c2a24',
        jeans: '#39485a', jeansDark: '#2b3846',
        shoe: '#2a2a31',
        eye: '#1b1b20',
        glassesOn: false,
        hood: true, longSleeve: true,
        scribble: '#f2f2f2', string: '#e8e8ea'
      },
      body: { lift: 4, torsoH: 20, headH: 16, hairTop: 4, hairSide: 2, hairSweep: 3 },
      gauge: { name: 'IRON', kind: 'guard', rate: 0.105, color: '#d4665c' },
      stats: { POW: 3, SPD: 3, RNG: 5 },
      blurb: 'LONG ARMS.'
    },
    {
      id: 'rohan', name: 'ROHAN', tag: 'BALANCED',
      health: 100, speed: 1.78, jump: 7.4, weight: 0.95, power: 0.98,
      hurtH: 50,
      special: 'rush',
      pal: { body: '#8ea3c4', shade: '#60718e', accent: '#eef1f6', dark: '#161a22', glow: '#b8c6dd' },
      look: {
        skin: '#c07b4d', skinDark: '#a4643c',
        hair: '#191518',
        shirt: '#2f3b52', shirtDark: '#253044',
        jeans: '#3a3f4a', jeansDark: '#2c3038',
        shoe: '#232830',
        eye: '#191518',
        glassesOn: false,
        longSleeve: true,
        placket: '#eef1f6'
      },
      body: { lift: 0, torsoH: 17, headH: 17, hairTop: 5, hairSide: 3, hairSweep: -2 },
      gauge: { name: 'DODGE', kind: 'dodge', rate: 0.12, color: '#8ea3c4' },
      stats: { POW: 3, SPD: 4, RNG: 4 },
      blurb: 'SLIPS THROUGH.'
    }
  ];

  /* ------------------------------------------------------------
     STAGES (drawn procedurally in stages.js)
     ------------------------------------------------------------ */
  N.STAGES = [
    { id: 'rooftop', name: 'NEON ROOFTOP', sub: '23:40 / 14F' },
    { id: 'temple', name: 'TEMPLE OF STATIC', sub: 'DAWN / HUMID' },
    { id: 'dojo', name: 'OLD DOJO', sub: 'DUSK / STILL' }
  ];

  N.DIFFICULTY = ['EASY', 'NORMAL', 'HARD'];
})(window.NHS);
