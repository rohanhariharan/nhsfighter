/* ============================================================
   NHS FIGHTER — stages, drawn from primitives.
   Fixed camera, so backgrounds are hand-placed layers with a
   little life in them.
   ============================================================ */
(function (N) {
  const G = N.GROUND;
  const W = N.W, H = N.H;

  const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  /* --- shared: floor plate -------------------------------- */
  function floorPlate(ctx, top, base, line, lineDark) {
    rect(ctx, 0, top, W, H - top, base);
    rect(ctx, 0, top, W, 2, line);
    rect(ctx, 0, top + 2, W, 1, lineDark);
    // perspective-ish tile seams
    ctx.fillStyle = lineDark;
    for (let i = -1; i < 10; i++) {
      const x = i * 44 + 10;
      ctx.fillRect(x, top + 6, 1, 6);
      ctx.fillRect(x + 22, top + 14, 1, 8);
      ctx.fillRect(x - 8, top + 24, 1, 10);
    }
  }

  /* ============================================================
     STAGE 1 — NEON ROOFTOP
     ============================================================ */
  const roofStars = [];
  (function () {
    const r = N.rng(7);
    for (let i = 0; i < 46; i++) {
      roofStars.push({ x: Math.floor(r() * W), y: Math.floor(r() * 96), b: r() });
    }
  })();

  const roofCity = [];
  (function () {
    const r = N.rng(21);
    let x = -6;
    while (x < W + 20) {
      const w = 14 + Math.floor(r() * 24);
      const h = 24 + Math.floor(r() * 58);
      const win = [];
      for (let wy = 0; wy < h - 8; wy += 7) {
        for (let wx = 0; wx < w - 6; wx += 8) {
          if (r() > 0.45) win.push([wx + 3, wy + 4]);
        }
      }
      roofCity.push({ x, w, h, win, tone: r() > 0.5 });
      x += w + 2 + Math.floor(r() * 6);
    }
  })();

  const rooftop = {
    name: 'NEON ROOFTOP',
    draw(ctx, t) {
      // sky bands
      rect(ctx, 0, 0, W, 40, '#07091c');
      rect(ctx, 0, 40, W, 34, '#0d1230');
      rect(ctx, 0, 74, W, 30, '#151c46');
      rect(ctx, 0, 104, W, 30, '#1e2757');

      // stars
      for (const s of roofStars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.02 + s.b * 9));
        ctx.globalAlpha = tw * 0.9;
        rect(ctx, s.x, s.y, 1, 1, '#cfe1ff');
      }
      ctx.globalAlpha = 1;

      // moon
      ctx.fillStyle = 'rgba(180,205,255,0.10)';
      ctx.beginPath(); ctx.arc(296, 42, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath(); ctx.arc(296, 42, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b9c8ea';
      ctx.beginPath(); ctx.arc(292, 39, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.arc(300, 46, 2, 0, Math.PI * 2); ctx.fill();

      // distant hills of city
      for (const b of roofCity) {
        const top = 134 - b.h;
        rect(ctx, b.x, top, b.w, b.h, b.tone ? '#101733' : '#0b1027');
        for (const wpos of b.win) {
          rect(ctx, b.x + wpos[0], top + wpos[1], 2, 3, b.tone ? '#f5c66a' : '#4fd6ff');
        }
      }

      // antenna
      const ax = 62;
      rect(ctx, ax, 46, 1, 40, '#2b3560');
      rect(ctx, ax - 4, 58, 9, 1, '#2b3560');
      const blink = (Math.sin(t * 0.06) > 0.4) ? '#ff4f6d' : '#5a1e2c';
      rect(ctx, ax - 1, 43, 3, 3, blink);

      // roof
      rect(ctx, 0, 128, W, 54, '#101731');
      rect(ctx, 0, G - 22, W, 6, '#161e38');
      rect(ctx, 0, G - 22, W, 1, '#2b3860');
      for (let i = 0; i < 5; i++) {
        rect(ctx, 18 + i * 90, G - 21, 1, 5, '#0e1326');
      }
      floorPlate(ctx, G, '#1a2140', '#4a5a8c', '#0d1224');

      // neon sign glow
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.05);
      ctx.globalAlpha = 0.10 * pulse;
      rect(ctx, 250, 116, 70, 26, '#ff4fd8');
      ctx.globalAlpha = 1;
      rect(ctx, 256, 122, 3, 14, '#ff4fd8');
      rect(ctx, 264, 122, 3, 14, '#59d7ff');
      rect(ctx, 272, 122, 3, 14, '#ff4fd8');
      ctx.globalAlpha = 0.7 * pulse;
      rect(ctx, 282, 124, 26, 3, '#ff4fd8');
      rect(ctx, 282, 131, 18, 3, '#59d7ff');
      ctx.globalAlpha = 1;
    },
    fg(ctx, t) {
      ctx.globalAlpha = 0.16;
      rect(ctx, 0, 150, W, 1, '#7ea8ff');
      ctx.globalAlpha = 1;
    }
  };

  /* ============================================================
     STAGE 2 — TEMPLE OF STATIC
     ============================================================ */
  const temple = {
    name: 'TEMPLE OF STATIC',
    draw(ctx, t) {
      rect(ctx, 0, 0, W, 46, '#082b2b');
      rect(ctx, 0, 46, W, 40, '#0d3d3a');
      rect(ctx, 0, 86, W, 34, '#12514a');
      rect(ctx, 0, 120, W, 62, '#186158');

      // sun
      ctx.fillStyle = 'rgba(255,214,120,0.12)';
      ctx.beginPath(); ctx.arc(96, 74, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd678';
      ctx.beginPath(); ctx.arc(96, 74, 17, 0, Math.PI * 2); ctx.fill();

      // mountains
      ctx.fillStyle = '#0b3a37';
      ctx.beginPath();
      ctx.moveTo(-10, 150);
      ctx.lineTo(60, 92);
      ctx.lineTo(120, 150);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(90, 150);
      ctx.lineTo(180, 80);
      ctx.lineTo(270, 150);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0e4642';
      ctx.beginPath();
      ctx.moveTo(220, 150);
      ctx.lineTo(320, 96);
      ctx.lineTo(400, 150);
      ctx.closePath();
      ctx.fill();

      // stone pillars
      const pillar = (x, w) => {
        rect(ctx, x, 40, w, 142, '#1b4b45');
        rect(ctx, x, 40, 2, 142, '#2b6a61');
        rect(ctx, x + w - 2, 40, 2, 142, '#0d302c');
        rect(ctx, x - 4, 36, w + 8, 6, '#245a53');
        rect(ctx, x - 4, G - 4, w + 8, 6, '#245a53');
        // vine
        ctx.strokeStyle = '#2f7d52';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 44; y < G - 6; y += 4) {
          const xx = x + 4 + Math.sin(y * 0.12 + x) * 3;
          if (y === 44) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
        }
        ctx.stroke();
      };
      pillar(6, 16);
      pillar(362, 16);

      // torches
      const torch = (x, phase) => {
        rect(ctx, x - 1, 118, 3, 56, '#3a2a1c');
        const f = Math.sin(t * 0.24 + phase) * 1.6;
        ctx.fillStyle = 'rgba(255,150,60,0.20)';
        ctx.beginPath(); ctx.arc(x, 112 + f, 12, 0, Math.PI * 2); ctx.fill();
        rect(ctx, x - 3, 108 + f, 6, 8, '#ff9d3c');
        rect(ctx, x - 2, 104 + f * 1.4, 4, 7, '#ffd066');
        rect(ctx, x - 1, 101 + f * 1.8, 2, 6, '#fff2b0');
      };
      torch(46, 0);
      torch(338, 2.1);

      // statue head in the middle back
      rect(ctx, 168, 118, 48, 64, '#144640');
      rect(ctx, 174, 108, 36, 14, '#1a534c');
      rect(ctx, 180, 112, 2, 4, '#0c2f2b');
      rect(ctx, 202, 112, 2, 4, '#0c2f2b');
      rect(ctx, 186, 122, 14, 3, '#0c2f2b');

      rect(ctx, 0, 146, W, 36, '#0b332f');
      floorPlate(ctx, G, '#1b4a42', '#2b7a63', '#0b2b27');

      // fallen leaves
      for (let i = 0; i < 8; i++) {
        const yy = (t * 0.4 + i * 37) % 216;
        const xx = (i * 53 + Math.sin(t * 0.02 + i) * 12) % W;
        ctx.globalAlpha = 0.5;
        rect(ctx, xx, yy, 2, 2, '#8fd18a');
        ctx.globalAlpha = 1;
      }
    },
    fg() {}
  };

  /* ============================================================
     STAGE 3 — OLD DOJO
     ============================================================ */
  const dojo = {
    name: 'OLD DOJO',
    draw(ctx, t) {
      rect(ctx, 0, 0, W, 50, '#20160f');
      rect(ctx, 0, 50, W, 42, '#2c1e14');
      rect(ctx, 0, 92, W, 40, '#3a2718');
      rect(ctx, 0, 132, W, 50, '#4a3220');

      // open doorway glow behind the shoji wall
      ctx.fillStyle = 'rgba(255,190,120,0.06)';
      ctx.fillRect(150, 34, 84, 96);

      rect(ctx, 40, 30, 304, 104, '#1a120c');

      // shoji grid
      const cell = (x, y, w, h) => {
        rect(ctx, x, y, w, h, '#c8b489');
        ctx.globalAlpha = 0.26;
        rect(ctx, x, y, w, h, '#2a1a0e');
        ctx.globalAlpha = 1;
      };
      for (let i = 0; i < 4; i++) {
        const x = 44 + i * 76;
        cell(x, 34, 68, 46);
        cell(x, 84, 68, 46);
        rect(ctx, x, 34, 1, 96, '#2b1c11');
        rect(ctx, x + 67, 34, 1, 96, '#2b1c11');
        rect(ctx, x, 80, 68, 2, '#2b1c11');
        rect(ctx, x, 130, 68, 2, '#2b1c11');
      }
      rect(ctx, 40, 30, 304, 3, '#120c08');
      rect(ctx, 40, 131, 304, 3, '#120c08');

      rect(ctx, 0, 134, W, 48, '#241710');

      // lanterns
      const lantern = (x, y, phase) => {
        const sway = Math.sin(t * 0.03 + phase) * 1.5;
        rect(ctx, x, y - 20, 1, 18, '#241812');
        ctx.fillStyle = 'rgba(255,170,90,0.16)';
        ctx.beginPath(); ctx.arc(x + sway, y + 6, 13, 0, Math.PI * 2); ctx.fill();
        rect(ctx, x - 5 + sway, y, 11, 12, '#c9552e');
        rect(ctx, x - 6 + sway, y + 2, 13, 2, '#f0a06a');
        rect(ctx, x - 3 + sway, y + 4, 7, 6, '#ffd9a8');
        rect(ctx, x - 5 + sway, y + 12, 11, 2, '#7a2f1a');
      };
      lantern(96, 40, 0);
      lantern(288, 40, 1.7);

      floorPlate(ctx, G, '#3a2415', '#6b4526', '#1e120a');

      // straw mat lines
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 6; i++) {
        rect(ctx, i * 70 - 10, G + 4, 1, H - G - 4, '#241408');
      }
      ctx.globalAlpha = 1;
    },
    fg(ctx, t) {
      // drifting dust
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 10; i++) {
        const x = (i * 41 + t * 0.22) % W;
        const y = 60 + ((i * 29) % 110) + Math.sin(t * 0.02 + i) * 4;
        rect(ctx, x, y, 1, 1, '#ffe6c0');
      }
      ctx.globalAlpha = 1;
    }
  };

  const list = [rooftop, temple, dojo];

  N.StageArt = {
    get(i) { return list[i % list.length]; },
    draw(ctx, idx, t) {
      const s = list[idx] || list[0];
      s.draw(ctx, t);
    },
    fg(ctx, idx, t) {
      const s = list[idx] || list[0];
      if (s.fg) s.fg(ctx, t);
    },
    count: list.length
  };
})(window.NHS);
