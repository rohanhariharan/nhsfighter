/* ============================================================
   NHS FIGHTER — game shell: scenes, rounds, main loop
   ============================================================ */
(function (N) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const T = N.text;
  const W = N.W, H = N.H;

  /* ------------------------------------------------------------
     global state
     ------------------------------------------------------------ */
  const G = {
    scene: 'title',
    t: 0,
    mode: 'cpu',
    diff: 1,
    menu: 0,
    sel: { p1: 0, p2: 1, lock1: false, lock2: false },
    stageIdx: 0,
    stageCursor: 0,
    p1: null,
    p2: null,
    cpu: null,
    world: null,
    wins: [0, 0],
    round: 1,
    timerFrames: N.ROUND_FRAMES,
    phase: 'intro',
    phaseT: 0,
    ghost: [100, 100],
    endReason: 'ko',
    roundWinner: -1,
    matchOver: false,
    paused: false,
    pauseIdx: 0,
    pausedFrom: 'fight',
    titleBlink: 0
  };
  N.G = G;

  /* ------------------------------------------------------------
     helpers
     ------------------------------------------------------------ */
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function confirmPressed() {
    return N.Input.press('Enter') || N.Input.press('Space') || N.Input.press('KeyQ') ||
      N.Input.press('KeyU') || N.Input.press('NumpadEnter');
  }

  /* ------------------------------------------------------------
     match setup
     ------------------------------------------------------------ */
  function startMatch() {
    const c1 = N.CHARS[G.sel.p1];
    const c2 = N.CHARS[G.sel.p2];

    G.p1 = new N.Fighter(c1, 122, 1, 0);
    G.p2 = new N.Fighter(c2, 262, -1, 1);
    G.cpu = G.mode === 'cpu' ? new N.CPU(G.p2, G.diff) : null;

    G.stage = G.stageIdx;
    G.wins = [0, 0];
    G.round = 1;
    G.matchOver = false;

    G.world = { projectiles: [], sparks: [], shake: 0, freeze: 0, superFlash: 0, superName: '' };

    resetRound();
    G.scene = 'fight';
    N.Input.eat();
  }

  function resetRound() {
    G.p1.reset(122, 1);
    G.p2.reset(262, -1);
    G.ghost = [G.p1.maxHealth, G.p2.maxHealth];
    G.timerFrames = N.ROUND_FRAMES;
    G.phase = 'intro';
    G.phaseT = 0;
    G.roundWinner = -1;
    G.endReason = 'ko';
    G.p1.locked = true;
    G.p2.locked = true;
    G.world.projectiles.length = 0;
    G.world.sparks.length = 0;
    G.world.freeze = 0;
    G.world.superFlash = 0;
    N.Input.clearHistory();
  }

  function endRound(reason) {
    if (G.phase === 'ko' || G.phase === 'matchend') return;

    G.phase = 'ko';
    G.phaseT = 0;
    G.endReason = reason || 'ko';
    G.p1.locked = true;
    G.p2.locked = true;

    const p1 = G.p1, p2 = G.p2;

    if (reason === 'time') {
      if (p1.health === p2.health) G.roundWinner = -1;
      else G.roundWinner = p1.health > p2.health ? 0 : 1;
      N.Audio.sfx('ko');
    } else if (p1.ko && p2.ko) {
      G.roundWinner = -1;
    } else if (p2.ko) {
      G.roundWinner = 0;
    } else if (p1.ko) {
      G.roundWinner = 1;
    } else {
      G.roundWinner = p1.health >= p2.health ? 0 : 1;
    }

    if (G.roundWinner >= 0) G.wins[G.roundWinner]++;
    G.matchOver = G.wins[0] >= N.ROUNDS_TO_WIN || G.wins[1] >= N.ROUNDS_TO_WIN;
  }

  /* ------------------------------------------------------------
     combat resolution
     ------------------------------------------------------------ */
  function resolveCombat() {
    const p1 = G.p1, p2 = G.p2, w = G.world;

    const pairs = [[p1, p2], [p2, p1]];
    for (const [atk, def] of pairs) {
      if (atk.hitstop > 0) continue;
      const hb = atk.hitbox();
      if (!hb || atk.hitDone) continue;

      if (overlap(hb, def.hurtbox())) {
        atk.hitDone = true;
        const m = atk.move;
        atk.hitCount = (atk.hitCount || 0) + 1;

        let mv = m;
        if (m.knockdownOnLast && m.hits && atk.hitCount >= m.hits) {
          mv = Object.assign({}, m, { knockdown: true, kbUp: -3.4, damage: m.damage * 2 });
        }

        const dmg = Math.max(1, Math.round((mv.damage || 0) * atk.def.power * (atk.atkMul || 1)));
        def.receive(atk, mv, dmg, w);
      }
    }

    // projectiles
    for (const p of w.projectiles) {
      if (p.dead) continue;
      const def = p.owner === p1 ? p2 : p1;
      if (overlap(p.box(), def.hurtbox())) {
        p.dead = true;
        const m = {
          damage: p.damage, hitstun: 18, blockstun: 10,
          kb: 2.6, kbUp: 0, special: true
        };
        def.receive(p.owner, m, Math.round(p.damage * p.owner.def.power), w);
        w.sparks.push({ x: p.x, y: p.y, kind: 'hit', t: 0, life: 14 });
      }
    }

    // projectile vs projectile
    for (let i = 0; i < w.projectiles.length; i++) {
      for (let j = i + 1; j < w.projectiles.length; j++) {
        const a = w.projectiles[i], b = w.projectiles[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (overlap(a.box(), b.box())) {
          a.dead = true;
          b.dead = true;
          w.sparks.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, kind: 'block', t: 0, life: 12 });
          N.Audio.sfx('block');
        }
      }
    }
  }

  /* ------------------------------------------------------------
     input for a fighter
     ------------------------------------------------------------ */
  function readHuman(i, fighter) {
    const raw = N.Input.raw(i);
    const both = raw.punch && raw.kick;
    raw.special = both || N.Input.motionSpecial(i, fighter.facing);
    return raw;
  }

  /* ------------------------------------------------------------
     scenes
     ------------------------------------------------------------ */
  function updateTitle() {
    G.titleBlink++;

    if (N.Input.press('KeyW') || N.Input.press('ArrowUp')) {
      G.menu = (G.menu + 2) % 3;
      N.Audio.sfx('move');
    }
    if (N.Input.press('KeyS') || N.Input.press('ArrowDown')) {
      G.menu = (G.menu + 1) % 3;
      N.Audio.sfx('move');
    }
    if (G.menu === 0) {
      if (N.Input.press('KeyA') || N.Input.press('ArrowLeft')) {
        G.diff = (G.diff + 2) % 3;
        N.Audio.sfx('move');
      }
      if (N.Input.press('KeyD') || N.Input.press('ArrowRight')) {
        G.diff = (G.diff + 1) % 3;
        N.Audio.sfx('move');
      }
    }

    if (confirmPressed()) {
      N.Audio.sfx('select');
      if (G.menu === 0) { G.mode = 'cpu'; openSelect(); }
      else if (G.menu === 1) { G.mode = '2p'; openSelect(); }
      else { G.scene = 'controls'; N.Input.eat(); }
    }
  }

  function openSelect() {
    G.sel.p1 = 0;
    G.sel.p2 = G.mode === '2p' ? 1 : Math.floor(Math.random() * N.CHARS.length);
    G.sel.lock1 = false;
    G.sel.lock2 = false;
    G.sel.cpuTimer = -1;
    G.scene = 'select';
    N.Input.eat();
  }

  function updateSelect() {
    const I = N.Input;

    if (!G.sel.lock1) {
      if (I.press('KeyA') || I.press('ArrowLeft')) { G.sel.p1 = (G.sel.p1 + N.CHARS.length - 1) % N.CHARS.length; N.Audio.sfx('move'); }
      if (I.press('KeyD') || I.press('ArrowRight')) { G.sel.p1 = (G.sel.p1 + 1) % N.CHARS.length; N.Audio.sfx('move'); }
      if (I.press('KeyQ') || I.press('Enter') || I.press('Space')) {
        G.sel.lock1 = true;
        N.Audio.sfx('lock');
        if (G.mode === 'cpu') G.sel.cpuTimer = 26;
      }
    }

    if (G.mode === '2p' && !G.sel.lock2) {
      if (I.press('KeyJ')) { G.sel.p2 = (G.sel.p2 + N.CHARS.length - 1) % N.CHARS.length; N.Audio.sfx('move'); }
      if (I.press('KeyL')) { G.sel.p2 = (G.sel.p2 + 1) % N.CHARS.length; N.Audio.sfx('move'); }
      if (I.press('KeyU')) { G.sel.lock2 = true; N.Audio.sfx('lock'); }
    }

    if (G.sel.cpuTimer > 0) {
      G.sel.cpuTimer--;
      if (G.sel.cpuTimer === 0) {
        G.sel.p2 = Math.floor(Math.random() * N.CHARS.length);
        G.sel.lock2 = true;
        N.Audio.sfx('lock');
      }
    }

    if (G.sel.lock1 && G.sel.lock2) {
      G.stageCursor = G.stageIdx;
      G.scene = 'stage';
      N.Input.eat();
      N.Audio.sfx('select');
    }

    if (I.press('Escape')) {
      G.scene = 'title';
      G.sel.lock1 = false;
      G.sel.lock2 = false;
      N.Input.eat();
    }
  }

  function updateStage() {
    const I = N.Input;
    if (I.press('KeyA') || I.press('ArrowLeft')) { G.stageCursor = (G.stageCursor + 2) % 3; N.Audio.sfx('move'); }
    if (I.press('KeyD') || I.press('ArrowRight')) { G.stageCursor = (G.stageCursor + 1) % 3; N.Audio.sfx('move'); }
    if (I.press('KeyQ') || I.press('Enter') || I.press('Space')) {
      G.stageIdx = G.stageCursor;
      N.Audio.sfx('start');
      startMatch();
    }
    if (I.press('Escape')) {
      G.scene = 'select';
      G.sel.lock1 = false;
      G.sel.lock2 = false;
      N.Input.eat();
    }
  }

  function updateFight() {
    const I = N.Input;

    if (I.press('Escape')) {
      G.paused = true;
      G.pauseIdx = 0;
      N.Audio.sfx('select');
      return;
    }

    G.phaseT++;

    if (G.phase === 'intro') {
      G.p1.locked = true;
      G.p2.locked = true;
      if (G.phaseT === 66) N.Audio.sfx('start');
      if (G.phaseT > 98) {
        G.phase = 'fight';
        G.p1.locked = false;
        G.p2.locked = false;
        I.clearHistory();
      }
    } else if (G.phase === 'fight') {
      if (G.timerFrames > 0) {
        G.timerFrames--;
        if (G.timerFrames % 60 === 0 && G.timerFrames <= 600 && G.timerFrames > 0) N.Audio.sfx('tick');
        if (G.timerFrames === 0) endRound('time');
      }
    } else if (G.phase === 'ko') {
      if (G.phaseT > 108) {
        if (G.matchOver) {
          G.phase = 'matchend';
          G.phaseT = 0;
          const winner = G.wins[0] >= N.ROUNDS_TO_WIN ? G.p1 : G.p2;
          if (winner && !winner.ko) winner.toVictory();
          N.Audio.sfx('win');
        } else {
          G.phase = 'roundend';
          G.phaseT = 0;
        }
      }
    } else if (G.phase === 'roundend') {
      if (G.phaseT > 58) {
        G.round++;
        resetRound();
      }
    } else if (G.phase === 'matchend') {
      if (I.press('Enter') || I.press('Space')) {
        G.scene = 'title';
        G.menu = 0;
        N.Input.eat();
        N.Audio.sfx('select');
        return;
      }
      if (I.press('KeyQ') && G.mode === '2p') {
        startMatch();
        return;
      }
      if (I.press('KeyR')) {
        startMatch();
        return;
      }
    }

    // FINAL unlock state (last round + full meter)
    const threat1 = G.wins[1] >= N.ROUNDS_TO_WIN - 1;
    const threat2 = G.wins[0] >= N.ROUNDS_TO_WIN - 1;
    const full = N.FINAL.meter - 0.5;

    G.p1.finalReady = G.phase === 'fight' &&
      ((N.FINAL.roundThreat && threat1) ||
        (N.FINAL.lowHealth && G.p1.health <= G.p1.maxHealth * N.FINAL.lowHealthPct)) &&
      G.p1.meter >= full && !G.p1.ko;

    G.p2.finalReady = G.phase === 'fight' &&
      ((N.FINAL.roundThreat && threat2) ||
        (N.FINAL.lowHealth && G.p2.health <= G.p2.maxHealth * N.FINAL.lowHealthPct)) &&
      G.p2.meter >= full && !G.p2.ko;

    updateWorld();

    // super freeze: the world stops, the flash plays
    if (G.world.freeze > 0) {
      G.world.freeze--;
      return;
    }

    // inputs
    const in1 = readHuman(0, G.p1);
    let in2;
    if (G.mode === 'cpu') in2 = G.cpu.update(G.p1);
    else in2 = readHuman(1, G.p2);

    G.p1.update(in1, G.p2, G.world);
    G.p2.update(in2, G.p1, G.world);

    // push apart
    const minDist = N.PUSH_DIST;
    const dx = G.p2.x - G.p1.x;
    if (Math.abs(dx) < minDist && G.p1.grounded() && G.p2.grounded()) {
      const push = (minDist - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      G.p1.x -= push * s;
      G.p2.x += push * s;
      G.p1.x = Math.max(N.WALL_L, Math.min(N.WALL_R, G.p1.x));
      G.p2.x = Math.max(N.WALL_L, Math.min(N.WALL_R, G.p2.x));
    }

    if (G.phase === 'fight') {
      resolveCombat();
      if (G.p1.ko || G.p2.ko) endRound('ko');
      if (G.timerFrames <= 0 && G.phase === 'fight') endRound('time');
    }

    // ghost bars
    G.ghost[0] += (G.p1.health - G.ghost[0]) * 0.05;
    G.ghost[1] += (G.p2.health - G.ghost[1]) * 0.05;
    if (G.ghost[0] < G.p1.health) G.ghost[0] = G.p1.health;
    if (G.ghost[1] < G.p2.health) G.ghost[1] = G.p2.health;
  }

  function updateWorld() {
    const w = G.world;
    if (!w) return;
    if (w.shake > 0.05) w.shake *= 0.87;
    else w.shake = 0;

    if (w.superFlash > 0) w.superFlash--;

    for (const p of w.projectiles) p.update();
    for (const s of w.sparks) s.t++;

    w.projectiles = w.projectiles.filter((p) => !p.dead);
    w.sparks = w.sparks.filter((s) => s.t < s.life);
  }

  /* ------------------------------------------------------------
     pause
     ------------------------------------------------------------ */
  function updatePause() {
    const I = N.Input;
    if (I.press('Escape')) {
      G.paused = false;
      N.Audio.sfx('select');
      return;
    }
    if (I.press('KeyW') || I.press('ArrowUp')) { G.pauseIdx = (G.pauseIdx + 1) % 2; N.Audio.sfx('move'); }
    if (I.press('KeyS') || I.press('ArrowDown')) { G.pauseIdx = (G.pauseIdx + 1) % 2; N.Audio.sfx('move'); }

    if (confirmPressed()) {
      N.Audio.sfx('select');
      if (G.pauseIdx === 0) G.paused = false;
      else {
        G.paused = false;
        G.scene = 'title';
        G.menu = 0;
        N.Input.eat();
      }
    }
  }

  /* ------------------------------------------------------------
     step
     ------------------------------------------------------------ */
  function step() {
    N.Input.tick();
    G.t++;

    if (G.paused) { updatePause(); return; }

    switch (G.scene) {
      case 'title': updateTitle(); break;
      case 'controls':
        if (confirmPressed() || N.Input.press('Escape')) G.scene = 'title';
        break;
      case 'select': updateSelect(); break;
      case 'stage': updateStage(); break;
      case 'fight': updateFight(); break;
    }
  }

  /* ------------------------------------------------------------
     render — title
     ------------------------------------------------------------ */
  function drawTitle() {
    N.StageArt.draw(ctx, 0, G.t);
    rect(0, 0, W, H, 'rgba(6,9,20,0.62)');

    // background sparring silhouettes
    ctx.globalAlpha = 0.16;
    const a = { def: N.CHARS[0], x: 74, y: N.GROUND, facing: 1, state: 'idle', stateTime: G.t, animTime: G.t, move: null, vy: 0, flash: 0 };
    const b = { def: N.CHARS[0], x: 310, y: N.GROUND, facing: -1, state: 'idle', stateTime: G.t + 20, animTime: G.t + 20, move: null, vy: 0, flash: 0 };
    N.Art.drawStick(ctx, a);
    N.Art.drawStick(ctx, b);
    ctx.globalAlpha = 1;

    // logo
    const y0 = 34;
    T(ctx, 'NHS', W / 2, y0, { scale: 6, color: '#59d7ff', shadow: '#0a2f45', align: 'center' });
    T(ctx, 'NHS', W / 2 - 1, y0 - 1, { scale: 6, color: '#eaf9ff', align: 'center', alpha: 0.22 });

    T(ctx, 'FIGHTER', W / 2, y0 + 48, { scale: 3, color: '#fff27a', shadow: '#3a2408', align: 'center' });

    // menu
    const items = ['1P VS CPU', '2P VERSUS', 'CONTROLS'];
    const my = 138;
    for (let i = 0; i < items.length; i++) {
      const yy = my + i * 16;
      const on = G.menu === i;
      if (on) {
        const blink = Math.floor(G.titleBlink / 18) % 2 === 0;
        if (blink) T(ctx, '>', W / 2 - 54, yy, { color: '#fff27a', shadow: '#000' });
        T(ctx, items[i], W / 2 - 42, yy, { color: '#ffffff', shadow: '#000' });
      } else {
        T(ctx, items[i], W / 2 - 42, yy, { color: '#7c88a5', shadow: '#000' });
      }
    }

    // difficulty line
    if (G.menu === 0) {
      const yy = 190;
      T(ctx, 'DIFFICULTY', W / 2 - 62, yy, { color: '#5b6b8c', shadow: '#000' });
      T(ctx, '<', W / 2 + 6, yy, { color: '#3d4a63' });
      T(ctx, N.DIFFICULTY[G.diff], W / 2 + 16, yy, {
        color: G.diff === 0 ? '#7ee081' : G.diff === 1 ? '#fff27a' : '#ff7a3d',
        shadow: '#000'
      });
      T(ctx, '>', W / 2 + 62, yy, { color: '#3d4a63' });
    }

    const blink2 = Math.floor(G.titleBlink / 30) % 2 === 0;
    if (blink2) {
      T(ctx, 'PRESS ENTER', W / 2, 202, { color: '#5b6b8c', align: 'center' });
    }

    T(ctx, '1 CREDIT 0', 10, 206, { color: '#333d57' });
    T(ctx, '1987 NHS SOFT', W - 10, 206, { color: '#333d57', align: 'right' });
  }

  /* ------------------------------------------------------------
     render — controls
     ------------------------------------------------------------ */
  function drawControls() {
    rect(0, 0, W, H, '#070a14');
    rect(0, 0, W, 24, '#0d1230');
    T(ctx, 'HOW TO PLAY', W / 2, 8, { scale: 1, color: '#fff27a', align: 'center', shadow: '#000' });

    const col = (x, title, rows, color) => {
      T(ctx, title, x, 32, { color, shadow: '#000' });
      let y = 44;
      for (const r of rows) {
        T(ctx, r[0], x, y, { color: '#8fa0c4' });
        T(ctx, r[1], x + 72, y, { color: '#ffffff' });
        y += 10;
      }
    };

    col(14, 'PLAYER 1', [
      ['MOVE', 'A / D'],
      ['JUMP', 'W'],
      ['CROUCH', 'S'],
      ['PUNCH', 'Q'],
      ['KICK', 'E'],
      ['BLOCK', 'HOLD BACK']
    ], '#59d7ff');

    col(206, 'PLAYER 2', [
      ['MOVE', 'J / L'],
      ['JUMP', 'I'],
      ['CROUCH', 'K'],
      ['PUNCH', 'U'],
      ['KICK', 'O'],
      ['BLOCK', 'HOLD BACK']
    ], '#c77dff');

    rect(12, 106, 360, 1, '#1b2036');

    T(ctx, 'TILTS', 14, 113, { color: '#fff27a', shadow: '#000' });
    const tilt = [
      ['UP + PUNCH', 'LAUNCHER'],
      ['DOWN + PUNCH', 'LOW JAB'],
      ['DOWN + KICK', 'SWEEP'],
      ['JUMP + PUNCH', 'DIVE PUNCH'],
      ['JUMP + KICK', 'DIVE KICK']
    ];
    let y = 124;
    for (const t of tilt) {
      T(ctx, t[0], 14, y, { color: '#8fa0c4' });
      T(ctx, t[1], 96, y, { color: '#ffffff' });
      y += 9;
    }

    T(ctx, 'SPECIALS', 206, 113, { color: '#fff27a', shadow: '#000' });
    T(ctx, 'DOWN, FWD + ATTACK', 206, 124, { color: '#ffffff' });
    T(ctx, 'OR PUNCH + KICK', 206, 133, { color: '#5b6b8c' });
    T(ctx, 'COSTS 40 METER', 206, 142, { color: '#5b6b8c' });
    T(ctx, 'FINAL', 206, 154, { color: '#ff4fd8', shadow: '#000' });
    T(ctx, 'FULL BAR + LAST ROUND', 206, 163, { color: '#ffffff' });
    T(ctx, 'SAME INPUT, WHOLE BAR', 206, 172, { color: '#5b6b8c' });

    T(ctx, 'FIRST TO 2 ROUNDS WINS', 14, 176, { color: '#3d4a63' });

    const blink = Math.floor(G.t / 24) % 2 === 0;
    if (blink) T(ctx, 'PRESS ENTER', W / 2, 198, { color: '#5b6b8c', align: 'center' });
  }

  /* ------------------------------------------------------------
     render — character select
     ------------------------------------------------------------ */
  function drawSelect() {
    rect(0, 0, W, H, '#080b16');
    // grid
    ctx.globalAlpha = 0.16;
    for (let x = 0; x < W; x += 16) rect(x, 0, 1, H, '#1d2746');
    for (let y = 0; y < H; y += 16) rect(0, y, W, 1, '#1d2746');
    ctx.globalAlpha = 1;

    T(ctx, 'CHOOSE YOUR FIGHTER', W / 2, 12, { color: '#fff27a', align: 'center', shadow: '#000' });

    const count = N.CHARS.length;
    const cw = count === 1 ? 132 : 84;
    const gap = 4;
    const startX = Math.round((W - (count * cw + (count - 1) * gap)) / 2);
    const cy = 26, ch = 112;

    for (let i = 0; i < N.CHARS.length; i++) {
      const c = N.CHARS[i];
      const x = startX + i * (cw + gap);
      const hover1 = G.sel.p1 === i;
      const hover2 = G.mode === '2p' && G.sel.p2 === i;

      rect(x, cy, cw, ch, hover1 || hover2 ? '#111a30' : '#0b0f1e');
      ctx.strokeStyle = hover1 ? c.pal.body : hover2 ? '#c77dff' : '#1b2036';
      ctx.lineWidth = hover1 || hover2 ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, cy + 0.5, cw - 1, ch - 1);

      // portrait
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 1, cy + 1, cw - 2, ch - 2);
      ctx.clip();
      N.Art.portrait(ctx, c, x + cw / 2, cy + ch - 10, count === 1 ? 1.6 : 1.15, G.t + i * 13);
      ctx.restore();

      T(ctx, c.name, x + cw / 2, cy + 6, {
        color: hover1 || hover2 ? c.pal.accent : '#8fa0c4',
        align: 'center',
        shadow: '#000'
      });

      if (G.sel.lock1 && G.sel.p1 === i) {
        rect(x, cy, 5, 5, c.pal.accent);
        rect(x + cw - 5, cy, 5, 5, c.pal.accent);
        rect(x, cy + ch - 5, 5, 5, c.pal.accent);
        rect(x + cw - 5, cy + ch - 5, 5, 5, c.pal.accent);
      }
      if (G.sel.lock2 && G.sel.p2 === i && G.mode === '2p') {
        rect(x + 5, cy, 5, 5, '#c77dff');
        rect(x + cw - 10, cy, 5, 5, '#c77dff');
      }

      // cursors
      if (hover1 && !G.sel.lock1) {
        const by = cy - 6 + Math.round(Math.sin(G.t * 0.15) * 1.5);
        T(ctx, 'P1', x + 4, by, { color: '#59d7ff', shadow: '#000' });
      }
      if (hover2 && !G.sel.lock2) {
        T(ctx, 'P2', x + cw - 16, cy - 6, { color: '#c77dff', shadow: '#000' });
      }
    }

    // stat panels
    const p1c = N.CHARS[G.sel.p1];
    drawStats(14, 142, 176, p1c, 'P1', '#59d7ff', G.sel.lock1);
    if (G.mode === '2p') {
      drawStats(198, 142, 176, N.CHARS[G.sel.p2], 'P2', '#c77dff', G.sel.lock2);
    } else {
      const c2 = N.CHARS[G.sel.p2];
      drawStats(198, 142, 176, c2, 'CPU', '#c77dff', true, false);
    }

    T(ctx, 'ENTER / Q / U  CONFIRM', W / 2, 206, {
      color: '#3d4a63', align: 'center'
    });
  }

  const ABILITY_TEXT = {
    free: 'ATK+DEF UP + DOUBLE JUMP',
    guard: 'SPECIAL BUFFS BY GAUGE',
    dodge: '4 DODGES, FAST WHEN FULL'
  };

  function drawStats(x, y, w, ch, label, color, locked, hide) {
    rect(x, y, w, 60, '#0b0f1e');
    ctx.strokeStyle = '#1b2036';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 59);

    T(ctx, label, x + 5, y + 4, { color, shadow: '#000' });
    T(ctx, hide ? '???' : ch.name, x + w - 5, y + 4, { color: '#dfe9ff', align: 'right', shadow: '#000' });

    if (hide) return;

    const rows = ['POW', 'SPD', 'RNG'];
    const keys = ['POW', 'SPD', 'RNG'];
    for (let i = 0; i < 3; i++) {
      const yy = y + 14 + i * 9;
      T(ctx, rows[i], x + 5, yy, { color: '#5b6b8c' });
      const v = ch.stats[keys[i]] || 1;
      for (let p = 0; p < 5; p++) {
        rect(x + 34 + p * 9, yy, 7, 5, p < v ? color : '#1b2036');
      }
    }

    T(ctx, ch.tag, x + 96, y + 9, { color: '#8fa0c4' });
    T(ctx, ch.blurb, x + 96, y + 18, { color: '#4a5878' });

    const g = ch.gauge;
    if (g) {
      N.Icon.draw(ctx, g.kind, x + 5, y + 40, g.color);
      T(ctx, g.name, x + 17, y + 41, { color: g.color, shadow: '#000' });
      T(ctx, ABILITY_TEXT[g.kind] || '', x + 5, y + 51, { color: '#8fa0c4' });
    }
  }

  /* ------------------------------------------------------------
     render — stage select
     ------------------------------------------------------------ */
  function drawStageSelect() {
    rect(0, 0, W, H, '#080b16');
    ctx.globalAlpha = 0.14;
    for (let x = 0; x < W; x += 16) rect(x, 0, 1, H, '#1d2746');
    ctx.globalAlpha = 1;

    T(ctx, 'SELECT STAGE', W / 2, 14, { color: '#fff27a', align: 'center', shadow: '#000' });

    const cw = 108, ch = 68, gap = 12;
    const total = 3 * cw + 2 * gap;
    const sx = (W - total) / 2;

    for (let i = 0; i < 3; i++) {
      const x = sx + i * (cw + gap);
      const y = 44;
      const on = G.stageCursor === i;

      rect(x - 2, y - 2, cw + 4, ch + 4, on ? '#fff27a' : '#1b2036');
      rect(x, y, cw, ch, '#000');

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cw, ch);
      ctx.clip();
      const s = ch / 216;
      ctx.translate(x, y);
      ctx.scale(s, s);
      N.StageArt.draw(ctx, i, G.t);
      ctx.restore();

      T(ctx, N.STAGES[i].name, x + cw / 2, y + ch + 8, {
        color: on ? '#ffffff' : '#5b6b8c', align: 'center', shadow: '#000'
      });
    }

    const st = N.STAGES[G.stageCursor];
    T(ctx, st.sub, W / 2, 150, { color: '#3d4a63', align: 'center' });

    // matchup preview
    const p1 = N.CHARS[G.sel.p1], p2 = N.CHARS[G.sel.p2];
    T(ctx, p1.name, W / 2 - 26, 166, { color: p1.pal.body, align: 'right', shadow: '#000' });
    T(ctx, 'VS', W / 2, 166, { color: '#fff27a', align: 'center', shadow: '#000' });
    T(ctx, p2.name, W / 2 + 26, 166, { color: p2.pal.body, shadow: '#000' });

    if (G.mode === 'cpu') {
      T(ctx, 'CPU: ' + N.DIFFICULTY[G.diff], W / 2, 182, { color: '#5b6b8c', align: 'center' });
    }

    const blink = Math.floor(G.t / 24) % 2 === 0;
    if (blink) T(ctx, 'ENTER / Q TO FIGHT', W / 2, 198, { color: '#5b6b8c', align: 'center' });
  }

  /* ------------------------------------------------------------
     render — fight
     ------------------------------------------------------------ */
  function drawFight() {
    const w = G.world;

    ctx.save();
    if (w && w.shake > 0.3) {
      ctx.translate(
        (Math.random() - 0.5) * w.shake * 2,
        (Math.random() - 0.5) * w.shake * 2
      );
    }

    N.StageArt.draw(ctx, G.stage, G.t);

    if (G.p1 && G.p2) {
      N.Art.drawShadow(ctx, G.p2);
      N.Art.drawShadow(ctx, G.p1);
      N.Art.drawStick(ctx, G.p2);
      N.Art.drawStick(ctx, G.p1);
    }

    if (w) {
      for (const p of w.projectiles) N.Art.projectile(ctx, p);
      for (const s of w.sparks) N.Art.spark(ctx, s.x, s.y, s.kind, s.t / s.life);
    }

    N.StageArt.fg(ctx, G.stage, G.t);
    ctx.restore();

    // HUD
    if (G.p1 && G.p2) N.HUD.draw(ctx, G);

    drawFightOverlay();
  }

  function drawFightOverlay() {
    const cx = W / 2;

    // ---- FINAL super flash ----
    const w = G.world;
    if (w && w.superFlash > 0) {
      const n = w.superFlash;
      if (n > 40) {
        ctx.globalAlpha = Math.min(1, (n - 40) / 4) * 0.9;
        rect(0, 0, W, H, '#ffffff');
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = Math.min(0.6, n / 44);
      rect(0, 0, W, H, '#05070f');
      ctx.globalAlpha = 1;

      if (n > 8) {
        ctx.fillStyle = '#fff27a';
        ctx.fillRect(cx - 96, 78, 192, 1);
        ctx.fillRect(cx - 96, 122, 192, 1);
        for (let i = 0; i < 8; i++) {
          const y = 60 + i * 13;
          ctx.globalAlpha = 0.12;
          ctx.fillRect(0, y, W, 2);
          ctx.globalAlpha = 1;
        }

        T(ctx, 'FINAL', cx, 84, {
          scale: 5, color: '#fff27a', shadow: '#7a2f0a', align: 'center'
        });
        T(ctx, w.superName || '', cx, 128, {
          scale: 1, color: '#ffffff', shadow: '#000', align: 'center'
        });
      }
    }

    if (G.phase === 'intro') {
      if (G.phaseT < 64) {
        const k = Math.min(1, G.phaseT / 8);
        T(ctx, 'ROUND ' + G.round, cx, 86, {
          scale: 3, color: '#ffffff', shadow: '#0a0f1e', align: 'center'
        });
        ctx.globalAlpha = 0.35;
        rect(cx - 70, 104, 140, 1, '#fff27a');
        ctx.globalAlpha = 1;
        if (k < 1) rect(0, 0, 0, 0, '#000');
      } else {
        const t = (G.phaseT - 64) / 34;
        const sc = 4 + Math.min(1, t * 3) * 1;
        T(ctx, 'FIGHT!', cx, 78, {
          scale: Math.round(sc), color: '#fff27a', shadow: '#7a2f0a', align: 'center'
        });
      }
    }

    if (G.phase === 'ko') {
      const flash = G.phaseT < 12 && Math.floor(G.phaseT / 3) % 2 === 0;
      if (G.endReason === 'time' && G.phaseT < 70) {
        T(ctx, 'TIME UP', cx, 74, { scale: 3, color: '#ffffff', shadow: '#3a1020', align: 'center' });
      }
      if (!flash) {
        T(ctx, 'K.O.', cx, 70, { scale: 6, color: '#ff4f6d', shadow: '#3a0a14', align: 'center' });
      } else {
        T(ctx, 'K.O.', cx, 70, { scale: 6, color: '#ffffff', shadow: '#ff4f6d', align: 'center' });
      }
    }

    if (G.phase === 'matchend') {
      const winner = G.wins[0] >= N.ROUNDS_TO_WIN ? G.p1 : G.p2;
      let label = '';
      if (winner === G.p1) label = G.mode === '2p' ? 'PLAYER 1 WINS' : 'YOU WIN';
      else label = G.mode === '2p' ? 'PLAYER 2 WINS' : 'CPU WINS';

      rect(0, 112, W, 62, 'rgba(5,7,14,0.82)');
      T(ctx, label, cx, 120, { scale: 2, color: '#fff27a', shadow: '#3a2408', align: 'center' });
      T(ctx, winner.def.name + ' - ' + winner.def.tag, cx, 140, {
        color: winner.def.pal.body, shadow: '#000', align: 'center'
      });
      const blink = Math.floor(G.t / 25) % 2 === 0;
      if (blink) T(ctx, 'ENTER: TITLE    R: REMATCH', cx, 156, { color: '#8fa0c4', align: 'center' });
    }

    if (G.phase === 'roundend') {
      T(ctx, 'ROUND ' + G.round, cx, 92, { color: '#8fa0c4', align: 'center' });
    }

    if (G.paused) drawPause();
  }

  function drawPause() {
    rect(0, 0, W, H, 'rgba(4,6,12,0.78)');
    T(ctx, 'PAUSED', W / 2, 74, { scale: 3, color: '#ffffff', shadow: '#000', align: 'center' });

    const items = ['RESUME', 'QUIT TO TITLE'];
    for (let i = 0; i < 2; i++) {
      const y = 122 + i * 18;
      if (G.pauseIdx === i) {
        T(ctx, '>', W / 2 - 52, y, { color: '#fff27a' });
        T(ctx, items[i], W / 2 - 40, y, { color: '#ffffff' });
      } else {
        T(ctx, items[i], W / 2 - 40, y, { color: '#6c7896' });
      }
    }
  }

  /* ------------------------------------------------------------
     render dispatch
     ------------------------------------------------------------ */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    switch (G.scene) {
      case 'title': drawTitle(); break;
      case 'controls': drawControls(); break;
      case 'select': drawSelect(); break;
      case 'stage': drawStageSelect(); break;
      case 'fight': drawFight(); break;
      default: drawTitle(); break;
    }
  }

  /* ------------------------------------------------------------
     loop
     ------------------------------------------------------------ */
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;

  function loop(now) {
    const dt = Math.min(120, now - last);
    last = now;
    acc += dt;

    let guard = 0;
    while (acc >= STEP && guard < 6) {
      acc -= STEP;
      step();
      guard++;
    }

    render();
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */
  function resize() {
    const hint = 34;                 // room for the key hint bar
    const pad = 8;
    const availW = Math.max(200, window.innerWidth - pad * 2);
    const availH = Math.max(140, window.innerHeight - hint);

    // fill the window, but prefer a whole-number scale when it's close
    let s = Math.min(availW / W, availH / H);
    const whole = Math.floor(s);
    if (whole >= 1 && s - whole < 0.12) s = whole;

    canvas.style.width = Math.round(W * s) + 'px';
    canvas.style.height = Math.round(H * s) + 'px';

    // keep the CRT scanlines in step with the pixel grid
    const wrap = document.getElementById('wrap');
    if (wrap) wrap.style.setProperty('--scan', Math.max(2, Math.round(s * 2)) + 'px');
  }

  N.Input.init();
  if (N.Sprite && N.Sprite.buildAll) N.Sprite.buildAll();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') N.Audio.toggle();
  });

  requestAnimationFrame(loop);
})(window.NHS);
