/* ============================================================
   NHS FIGHTER — heads-up display
   ============================================================ */
(function (N) {
  const T = N.text;

  function frame(ctx, x, y, w, h) {
    ctx.fillStyle = '#07080f';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#1b2036';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#080a12';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  function healthBar(ctx, x, y, w, h, pct, ghost, flip, color) {
    frame(ctx, x, y, w, h);
    const iw = w - 2;
    const ih = h - 2;
    const px = x + 1;
    const py = y + 1;

    if (flip) {
      const gw = Math.round(iw * ghost);
      ctx.fillStyle = '#f2f6ff';
      ctx.fillRect(px + iw - gw, py, gw, ih);

      const fw = Math.round(iw * pct);
      ctx.fillStyle = color;
      ctx.fillRect(px + iw - fw, py, fw, ih);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px + iw - fw, py, fw, 1);
    } else {
      const gw = Math.round(iw * ghost);
      ctx.fillStyle = '#f2f6ff';
      ctx.fillRect(px, py, gw, ih);

      const fw = Math.round(iw * pct);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, fw, ih);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px, py, fw, 1);
    }
  }

  function meterBar(ctx, x, y, w, h, pct, flip, full) {
    ctx.fillStyle = '#07080f';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#0e1424';
    ctx.fillRect(x, y, w, h);

    const iw = w - 2;
    const fw = Math.round(iw * Math.min(1, pct));

    ctx.fillStyle = full ? (Math.floor(performance.now() / 90) % 2 ? '#fff27a' : '#ffb03a') : '#4f8fd6';
    if (flip) ctx.fillRect(x + 1 + iw - fw, y + 1, fw, h - 2);
    else ctx.fillRect(x + 1, y + 1, fw, h - 2);

    // segment ticks
    ctx.fillStyle = '#07080f';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + Math.round((w * i) / 4), y, 1, h);
    }
  }

  /* --- ability icons (8x8 pixel art) --- */
  const ICONS = {
    free: [
      '....##..',
      '...##...',
      '..##....',
      '.######.',
      '....##..',
      '...##...',
      '..##....',
      '........'
    ],
    guard: [
      '.######.',
      '########',
      '##....##',
      '##....##',
      '.######.',
      '..####..',
      '...##...',
      '........'
    ],
    dodge: [
      '..##....',
      '....##..',
      '......##',
      '....##..',
      '..##....',
      '........',
      '........',
      '........'
    ]
  };

  N.Icon = {
    draw(ctx, kind, x, y, color) {
      const pat = ICONS[kind];
      if (!pat) return;
      ctx.fillStyle = color;
      const px = Math.round(x), py = Math.round(y);
      for (let r = 0; r < pat.length; r++) {
        for (let c = 0; c < pat[r].length; c++) {
          if (pat[r][c] === '#') ctx.fillRect(px + c, py + r, 1, 1);
        }
      }
    }
  };

  function gaugeBar(ctx, edgeX, y, f, flip) {
    const g = f.def.gauge;
    if (!g) return;

    const IW = 8, GAP = 3, W = 82, H = 3;
    const ix = flip ? edgeX - IW : edgeX;
    const bx = flip ? ix - GAP - W : edgeX + IW + GAP;

    const flash = f.gaugeReady && Math.floor(performance.now() / 130) % 2 === 0;
    const col = flash ? '#fff27a' : g.color;

    N.Icon.draw(ctx, g.kind, ix, y - 3, col);

    ctx.fillStyle = '#07080f';
    ctx.fillRect(bx - 1, y - 1, W + 2, H + 2);
    ctx.fillStyle = '#0e1424';
    ctx.fillRect(bx, y, W, H);

    const iw = W - 2;
    const fw = Math.round(iw * Math.min(1, f.gauge / 100));
    ctx.fillStyle = col;
    if (flip) ctx.fillRect(bx + 1 + iw - fw, y + 1, fw, H - 2);
    else ctx.fillRect(bx + 1, y + 1, fw, H - 2);

    if (f.gaugeReady) {
      T(ctx, g.name, flip ? bx - 7 : bx + W + 7, y - 2, {
        color: col, shadow: '#000', align: flip ? 'right' : 'left'
      });
    }
  }

  const HUD = {
    draw(ctx, G) {
      const p1 = G.p1, p2 = G.p2;
      if (!p1 || !p2) return;

      const BW = 142, BH = 9, BY = 19;

      // names
      T(ctx, p1.def.name, 11, 2, { color: '#dfe9ff', shadow: '#000' });
      T(ctx, p2.def.name, 373, 2, { color: '#dfe9ff', shadow: '#000', align: 'right' });

      // tags
      T(ctx, p1.def.tag, 11, 10, { color: '#5b6b8c', scale: 1, shadow: '#000' });
      T(ctx, p2.def.tag, 373, 10, { color: '#5b6b8c', scale: 1, shadow: '#000', align: 'right' });

      // health
      healthBar(ctx, 10, BY, BW, BH, p1.health / p1.maxHealth, G.ghost[0] / p1.maxHealth, false, p1.def.pal.body);
      healthBar(ctx, N.W - 10 - BW, BY, BW, BH, p2.health / p2.maxHealth, G.ghost[1] / p2.maxHealth, true, p2.def.pal.body);

      // meters
      meterBar(ctx, 10, BY + BH + 4, 96, 4, p1.meter / 100, false, p1.meter >= 100);
      meterBar(ctx, N.W - 10 - 96, BY + BH + 4, 96, 4, p2.meter / 100, true, p2.meter >= 100);

      // character gauges
      gaugeBar(ctx, 10, BY + BH + 12, p1, false);
      gaugeBar(ctx, N.W - 10, BY + BH + 12, p2, true);

      // round pips, flanking the timer
      for (let i = 0; i < N.ROUNDS_TO_WIN; i++) {
        ctx.fillStyle = i < G.wins[0] ? '#fff27a' : '#2b3350';
        ctx.fillRect(162 - i * 7, 15, 5, 5);
        ctx.fillStyle = i < G.wins[1] ? '#fff27a' : '#2b3350';
        ctx.fillRect(217 + i * 7, 15, 5, 5);
      }

      // timer
      const secs = Math.max(0, Math.ceil(G.timerFrames / 60));
      const label = String(secs).padStart(2, '0');
      ctx.fillStyle = '#07080f';
      ctx.fillRect(N.W / 2 - 15, 8, 30, 20);
      ctx.strokeStyle = '#2b3350';
      ctx.lineWidth = 1;
      ctx.strokeRect(N.W / 2 - 15.5, 7.5, 31, 21);

      const urgent = secs <= 10 && G.phase === 'fight';
      const col = urgent && (Math.floor(performance.now() / 200) % 2) ? '#ff4f6d' : '#fff6c8';
      T(ctx, label, N.W / 2, 12, { scale: 2, color: col, align: 'center' });

      // FINAL badge
      if (p1.finalReady) {
        const blink = Math.floor(performance.now() / 150) % 2 === 0;
        T(ctx, 'FINAL', 152, 8, { color: blink ? '#fff27a' : '#ff4fd8', shadow: '#000', align: 'right' });
      }
      if (p2.finalReady) {
        const blink = Math.floor(performance.now() / 150) % 2 === 0;
        T(ctx, 'FINAL', N.W - 152, 8, { color: blink ? '#fff27a' : '#ff4fd8', shadow: '#000' });
      }

      // combo
      if (p1.combo > 1 && p1.comboTimer > 0) combo(ctx, p1.combo, 44, 62, false);
      if (p2.combo > 1 && p2.comboTimer > 0) combo(ctx, p2.combo, N.W - 44, 62, true);
    }
  };

  function combo(ctx, n, x, y, right) {
    const a = 0.75 + 0.25 * Math.sin(performance.now() / 60);
    ctx.globalAlpha = a;
    T(ctx, n + ' HIT', x, y, { scale: 1, color: '#fff27a', shadow: '#3a2408', align: right ? 'right' : 'left' });
    T(ctx, 'COMBO', x, y + 9, { scale: 1, color: '#ffb03a', shadow: '#3a2408', align: right ? 'right' : 'left' });
    ctx.globalAlpha = 1;
  }

  N.HUD = HUD;
})(window.NHS);
