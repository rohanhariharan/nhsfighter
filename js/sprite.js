/* ============================================================
   NHS FIGHTER — block character renderer
   No outlines, no pixel buffer, no cache. Just flat rectangles
   like the reference sheet. One palette + one pose table, so a
   new fighter is a copy-paste and a colour swap.
   ============================================================ */
(function (N) {
  /* ------------------------------------------------------------
     LOOK — the entire character. Change these to make someone new.
     ------------------------------------------------------------ */
  const DEFAULT_LOOK = {
    skin: '#e3a06a',
    skinDark: '#c8834f',
    hair: '#241d1b',
    shirt: '#f2e7d0',
    shirtDark: '#dbcaad',
    jeans: '#9cc3e6',
    jeansDark: '#78a4ca',
    shoe: '#43342c',
    eye: '#241d1b',
    glasses: '#3a2c22',
    lens: '#8fd0f0',
    lensDark: '#4a8fc4',
    glassesOn: true,
    hood: false,
    longSleeve: false,
    scribble: null,
    string: '#e8e8ea'
  };

  /* body geometry, in pixels, feet at y = 0 and +x is "forward" */
  const DEFAULT_BODY = {
    headW: 22, headH: 17,
    neckW: 6,
    torsoW: 14, torsoH: 16,
    armW: 5,
    legW: 6,
    shoeW: 7, shoeH: 4,
    shoulderX: 7.5,
    shoulderDrop: 14,     // shoulder is this far below the pelvis
    hipX: 4,
    lift: 0,              // >0 = taller (longer legs), <0 = shorter
    hairTop: 6,           // rows of hair on the crown
    hairSide: 3,          // rows of sideburn below the crown
    hairSweep: 0          // extra fringe on the leading side
  };

  /* ------------------------------------------------------------
     poses: hand and foot positions in local pixels
     ------------------------------------------------------------ */
  function P(o) {
    return Object.assign({
      hipY: -16,
      lean: 0,
      headDY: 0,
      handN: [7.5, -19], handF: [-7.5, -19],
      footN: [5, 0], footF: [-5, 0]
    }, o || {});
  }

  const S = {};

  S.idle = { rate: 16, frames: [
    P({}),
    P({ hipY: -17 })
  ] };

  S.walkF = { rate: 7, frames: [
    P({ footN: [8, -1], footF: [-7, 0], handN: [7, -21], handF: [-10, -18], lean: 1 }),
    P({ footN: [0, 0], footF: [-1, -1], handN: [9, -19], handF: [-9, -20], lean: 1 })
  ] };

  S.walkB = { rate: 8, frames: [
    P({ footN: [3, 0], footF: [-8, -1], handN: [7, -20], handF: [-9, -19], lean: 0 }),
    P({ footN: [1, 0], footF: [-2, -1], handN: [9, -19], handF: [-9, -20], lean: 0 })
  ] };

  S.crouch = { frames: [P({
    hipY: -11, footN: [7, 0], footF: [-7, 0],
    handN: [9, -13], handF: [-9, -13]
  })] };

  S.prejump = { frames: [P({
    hipY: -14, handN: [8.5, -17], handF: [-8.5, -17]
  })] };

  S.block = { frames: [P({
    handN: [10, -34], handF: [-2, -33]
  })] };

  S.blockLow = { frames: [P({
    hipY: -11, handN: [10, -25], handF: [-2, -24],
    footN: [7, 0], footF: [-7, 0]
  })] };

  S.jumpUp = { frames: [P({
    hipY: -18, footN: [6, -6], footF: [-6, -4],
    handN: [9, -25], handF: [-9, -25]
  })] };

  S.jumpDown = { frames: [P({
    hipY: -18, footN: [7, -2], footF: [-7, -3],
    handN: [10, -21], handF: [-10, -21]
  })] };

  S.land = { frames: [P({
    hipY: -13, footN: [6, 0], footF: [-6, 0],
    handN: [10, -16], handF: [-10, -16]
  })] };

  S.windup = { frames: [P({
    handN: [4, -22], handF: [-8, -20]
  })] };

  S.punch = { frames: [P({
    lean: 2, handN: [20, -31], handF: [-9, -20]
  })] };

  S.kick = { frames: [P({
    lean: -2, footN: [16, -12], footF: [-4, 0],
    handN: [7, -28], handF: [-11, -21]
  })] };

  S.sweep = { frames: [P({
    hipY: -10, lean: -2, footN: [18, -1], footF: [-6, 0],
    handN: [6, -16], handF: [-11, -12]
  })] };

  S.jumpAttack = { frames: [P({
    hipY: -20, footN: [15, -10], footF: [-6, -4],
    handN: [8, -30], handF: [-11, -26]
  })] };

  S.divePunch = { frames: [P({
    hipY: -20, handN: [16, -16],
    footN: [6, -4], footF: [-7, -6], handF: [-10, -24]
  })] };

  S.crouchPunch = { frames: [P({
    hipY: -11, handN: [19, -16], footN: [6, 0], footF: [-6, 0],
    handF: [-9, -12]
  })] };

  S.cast = { frames: [P({
    lean: 2, handN: [18, -28], handF: [13, -26]
  })] };

  S.uppercut = { frames: [P({
    hipY: -18, handN: [11, -46], handF: [-9, -22],
    footN: [5, 0], footF: [-5, 0]
  })] };

  S.rush = { frames: [P({
    lean: 3, handN: [2, -24], handF: [-10, -20],
    footN: [8, 0], footF: [-9, 0]
  })] };

  S.hurt = { frames: [P({
    lean: -3, handN: [11, -36], handF: [-12, -30]
  })] };

  S.hurtCrouch = { frames: [P({
    hipY: -11, lean: -2, handN: [10, -22], handF: [-10, -20],
    footN: [6, 0], footF: [-7, 0]
  })] };

  S.airHurt = { frames: [P({
    hipY: -18, lean: -3, handN: [11, -30], handF: [-12, -26],
    footN: [6, -4], footF: [-7, -5]
  })] };

  S.getup = { frames: [P({
    hipY: -11, handN: [9, -14], handF: [-9, -13],
    footN: [6, 0], footF: [-6, 0]
  })] };

  S.victory = { rate: 18, frames: [
    P({ hipY: -17, handN: [10, -46], handF: [-10, -46] }),
    P({ hipY: -18, handN: [11, -49], handF: [-11, -49] })
  ] };

  S['final'] = { rate: 3, frames: [
    P({ lean: 2, handN: [20, -33], handF: [12, -27] }),
    P({ lean: 2, handN: [12, -27], handF: [20, -33] })
  ] };

  /* knockdown and ko are drawn lying down */
  S.knockdown = { frames: [P({})], lying: true };
  S.ko = { frames: [P({})], lying: true };

  /* ------------------------------------------------------------
     drawing helpers
     ------------------------------------------------------------ */
  function box(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** a limb: axis-aligned block when possible, stepped squares otherwise */
  function limb(ctx, x0, y0, x1, y1, w, c) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = x1 - x0, dy = y1 - y0;
    const h = w >> 1;
    ctx.fillStyle = c;

    if (Math.abs(dx) <= Math.abs(dy) * 0.6) {
      ctx.fillRect(Math.min(x0, x1) - h, Math.min(y0, y1) - h, w, Math.abs(dy) + h);
    } else if (Math.abs(dy) <= Math.abs(dx) * 0.6) {
      ctx.fillRect(Math.min(x0, x1) - h, Math.min(y0, y1) - h, Math.abs(dx) + h, w);
    } else {
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      const sx = dx / steps, sy = dy / steps;
      for (let i = 0; i <= steps; i++) {
        ctx.fillRect(Math.round(x0 + sx * i) - h, Math.round(y0 + sy * i) - h, w, w);
      }
    }
  }

  function artKey(f) {
    switch (f.state) {
      case 'idle': return 'idle';
      case 'walkF': return 'walkF';
      case 'walkB': return 'walkB';
      case 'crouch': return 'crouch';
      case 'prejump': return 'prejump';
      case 'block': case 'blockStun': return f.crouchHit ? 'blockLow' : 'block';
      case 'blockLow': return 'blockLow';
      case 'jump': return f.vy < 0 ? 'jumpUp' : 'jumpDown';
      case 'attack': return f.move ? f.move.art : 'punch';
      case 'hit': return f.crouchHit ? 'hurtCrouch' : 'hurt';
      case 'hitAir': return 'airHurt';
      case 'knockdown': return 'knockdown';
      case 'getup': return 'getup';
      case 'ko': return 'ko';
      case 'victory': return 'victory';
      case 'land': return 'land';
      default: return 'idle';
    }
  }

  function current(f) {
    const key = artKey(f);
    const entry = S[key] || S.idle;

    if (f.state === 'attack' && f.move && f.move.startup && f.moveFrame < f.move.startup) {
      return { pose: S.windup.frames[0], lying: false };
    }
    const i = entry.rate ? Math.floor(f.animTime / entry.rate) % entry.frames.length : 0;
    return { pose: entry.frames[i] || entry.frames[0], lying: !!entry.lying };
  }

  /* ------------------------------------------------------------
     the character
     ------------------------------------------------------------ */
  function drawBody(ctx, f, X, Y, dir, p) {
    const C = Object.assign({}, DEFAULT_LOOK, f.def.look || {});
    const B = Object.assign({}, DEFAULT_BODY, f.def.body || {});
    const c = f.flash > 0
      ? (v) => '#ffffff'
      : (v) => v;

    const L = (v) => X + dir * v;          // local x -> screen
    const T = (v) => Y + v;                // local y -> screen
    const RX = (v, w) => (dir > 0 ? L(v) : L(v) - w);  // mirrored rect origin

    const lean = p.lean;
    const lift = B.lift || 0;
    const hipY = p.hipY - lift;
    const shY = hipY - B.shoulderDrop;
    const torsoTop = hipY - B.torsoH;
    const headTop = torsoTop - B.headH + 1 + p.headDY;

    /* --- legs + shoes (behind the torso) --- */
    limb(ctx, L(lean) + dir * B.hipX, T(hipY), L(p.footN[0]), T(p.footN[1]), B.legW, c(C.jeans));
    limb(ctx, L(lean) - dir * B.hipX, T(hipY), L(p.footF[0]), T(p.footF[1]), B.legW, c(C.jeans));

    // shoes
    const shoe = (fx, fy) => {
      box(ctx, RX(fx - B.shoeW / 2, B.shoeW), T(fy) - B.shoeH, B.shoeW, B.shoeH, c(C.shoe));
    };
    shoe(p.footN[0], p.footN[1]);
    shoe(p.footF[0], p.footF[1]);

    /* --- torso --- */
    box(ctx, RX(-B.torsoW / 2 + lean, B.torsoW), T(torsoTop), B.torsoW, B.torsoH, c(C.shirt));

    /* --- hoodie details --- */
    if (C.hood) {
      box(ctx, RX(-8 + lean, 16), T(torsoTop - 1), 16, 4, c(C.shirtDark));   // hood bunched at the collar
      box(ctx, RX(-2 + lean, 4), T(torsoTop + 1), 4, 2, c(C.shirtDark));     // dip under the chin
      box(ctx, RX(-3 + lean, 1), T(torsoTop + 3), 1, 5, c(C.string));        // drawstrings
      box(ctx, RX(2 + lean, 1), T(torsoTop + 3), 1, 5, c(C.string));
      box(ctx, RX(-5 + lean, 10), T(hipY - 5), 10, 1, c(C.shirtDark));       // kangaroo pocket
    }

    if (C.scribble) {
      const pat = ['.##.##.##.', '#..#..#..#', '.##.##.##.', '#..#..#..#'];
      const sx0 = -5 + lean;
      const sy0 = torsoTop + Math.round(B.torsoH * 0.42);
      for (let r = 0; r < pat.length; r++) {
        for (let i = 0; i < pat[r].length; i++) {
          if (pat[r][i] === '#') box(ctx, RX(sx0 + i, 1), T(sy0 + r), 1, 1, c(C.scribble));
        }
      }
    }

    /* --- arms --- */
    const arm = (hx, hy, near) => {
      const sx = L(lean) + dir * (near ? B.shoulderX : -B.shoulderX);
      const sy = T(shY);
      const ex = L(hx), ey = T(hy);

      if (C.longSleeve) {
        limb(ctx, sx, sy, ex, ey, B.armW, c(C.shirt));
      } else {
        const mx = sx + (ex - sx) * 0.38;
        const my = sy + (ey - sy) * 0.38;
        limb(ctx, sx, sy, mx, my, B.armW + 1, c(C.shirtDark));
        limb(ctx, mx, my, ex, ey, B.armW, c(C.skin));
      }

      // hand
      box(ctx, ex - (B.armW >> 1), ey - (B.armW >> 1), B.armW, B.armW, c(C.skin));
    };
    arm(p.handF[0], p.handF[1] - lift, false);
    arm(p.handN[0], p.handN[1] - lift, true);

    /* --- neck + head --- */
    box(ctx, RX(-B.neckW / 2 + lean, B.neckW), T(headTop + B.headH - 2), B.neckW, 4, c(C.skinDark));
    box(ctx, RX(-B.headW / 2 + lean, B.headW), T(headTop), B.headW, B.headH, c(C.skin));

    /* --- hair --- */
    const hairC = c(C.hair);
    const capH = B.hairTop;
    const sideH = B.hairSide;

    box(ctx, RX(-B.headW / 2 + lean, B.headW), T(headTop), B.headW, capH, hairC);   // crown
    box(ctx, RX(-B.headW / 2 + lean, 3), T(headTop + capH - 1), 3, sideH + 2, hairC);
    box(ctx, RX(B.headW / 2 - 3 + lean, 3), T(headTop + capH - 1), 3, sideH + 2, hairC);
    box(ctx, RX(-6 + lean, 4), T(headTop + capH - 1), 4, 2, hairC);                 // fringe
    box(ctx, RX(2 + lean, 4), T(headTop + capH - 1), 4, 2, hairC);
    if (B.hairSweep) {
      box(ctx, RX(B.headW / 2 - 7 + lean, 5), T(headTop + capH - 1), 5, B.hairSweep, hairC);
    }

    /* --- eyes (+ glasses) --- */
    const eyeY = headTop + Math.round(B.headH * 0.52);

    if (C.glassesOn) {
      const g = c(C.glasses);
      const lens = c(C.lens);
      const pupil = c(C.lensDark);

      // one lens per eye: dark frame, blue glass, small pupil
      const lenses = [[-8, 7], [1, 7]];
      for (const [lx, lw] of lenses) {
        box(ctx, RX(lx + lean, lw), T(eyeY - 2), lw, 7, g);
        box(ctx, RX(lx + 1 + lean, lw - 2), T(eyeY - 1), lw - 2, 5, lens);
        box(ctx, RX(lx + 3 + lean, 2), T(eyeY), 2, 3, pupil);
      }
      // bridge + temples
      box(ctx, RX(-1 + lean, 2), T(eyeY - 1), 2, 1, g);
      box(ctx, RX(-9 + lean, 1), T(eyeY - 1), 1, 2, g);
      box(ctx, RX(8 + lean, 1), T(eyeY - 1), 1, 2, g);
    } else {
      box(ctx, RX(-6 + lean, 4), T(eyeY), 4, 4, c(C.eye));
      box(ctx, RX(2 + lean, 4), T(eyeY), 4, 4, c(C.eye));
    }
  }

  function drawLying(ctx, f, X, Y, dir) {
    const C = Object.assign({}, DEFAULT_LOOK, f.def.look || {});
    const c = f.flash > 0 ? () => '#ffffff' : (v) => v;
    const RX = (v, w) => (dir > 0 ? X + v : X - v - w);
    const hairC = c(C.hair);

    // head
    box(ctx, RX(-30, 16), Y - 17, 16, 15, c(C.skin));
    box(ctx, RX(-30, 16), Y - 17, 16, 6, hairC);
    box(ctx, RX(-26, 4), Y - 11, 4, 3, c(C.eye));

    // torso
    box(ctx, RX(-14, 20), Y - 16, 20, 13, c(C.shirt));
    box(ctx, RX(-14, 6), Y - 16, 6, 5, c(C.shirtDark));

    // arm draped over
    box(ctx, RX(0, 12), Y - 6, 12, 5, c(C.skin));

    // legs
    box(ctx, RX(6, 18), Y - 13, 18, 9, c(C.jeansDark));
    box(ctx, RX(20, 9), Y - 12, 9, 6, c(C.shoe));
  }

  N.Sprite = {
    LOOK: DEFAULT_LOOK,
    BODY: DEFAULT_BODY,
    poses: S,

    draw(ctx, f) {
      const X = Math.round(f.x);
      const Y = Math.round(f.y);
      const dir = f.facing < 0 ? -1 : 1;
      const cur = current(f);

      if (cur.lying) drawLying(ctx, f, X, Y, dir);
      else drawBody(ctx, f, X, Y, dir, cur.pose);
    },

    portrait(ctx, def, cx, baseY, scale, frame) {
      const fake = {
        def, x: 0, y: 0, facing: 1, state: 'idle',
        stateTime: frame, animTime: frame, move: null, vy: 0,
        flash: 0, crouchHit: false
      };
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);
      this.draw(ctx, fake);
      ctx.restore();
    },

    buildAll() { /* nothing to build: blocks are drawn directly */ }
  };
})(window.NHS);
