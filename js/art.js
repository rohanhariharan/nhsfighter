/* ============================================================
   NHS FIGHTER — effects + sprite plumbing
   The character itself is drawn by js/sprite.js.
   ============================================================ */
(function (N) {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const Art = {
    get TRACKS() { return null; },

    drawStick(ctx, f) {
      N.Sprite.draw(ctx, f);
    },

    portrait(ctx, def, cx, baseY, scale, frame) {
      N.Sprite.portrait(ctx, def, cx, baseY, scale, frame);
    },

    /** soft ground shadow, shrinks with height */
    drawShadow(ctx, f) {
      const h = Math.max(0, N.GROUND - f.y);
      const k = clamp(1 - h / 120, 0.25, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.34 * k) + ')';
      ctx.beginPath();
      ctx.ellipse(Math.round(f.x), N.GROUND + 1, 11 * k + 3, 3 * k + 1, 0, 0, Math.PI * 2);
      ctx.fill();
    },

    /** impact spark */
    spark(ctx, x, y, kind, t) {
      const a = 1 - t;
      if (kind === 'block') {
        ctx.fillStyle = 'rgba(160,220,255,' + a + ')';
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 + 0.4;
          const r = 3 + t * 10;
          ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 2, 2);
        }
      } else {
        const r = 4 + t * 12;
        ctx.fillStyle = 'rgba(255,240,180,' + a + ')';
        ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 5, 5);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + 0.25;
          const d = r * (0.7 + 0.4 * ((i % 2) ? 1 : 0));
          ctx.fillRect(Math.round(x + Math.cos(ang) * d), Math.round(y + Math.sin(ang) * d), 2, 2);
        }
      }
    },

    /** projectile body */
    projectile(ctx, p) {
      const pal = p.color;
      const edge = p.edge;
      const r = p.size;
      const wob = Math.sin(p.life * 0.4) * 1.2;
      const cx = Math.round(p.x);
      const cy = Math.round(p.y + wob);

      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.28 / i;
        ctx.fillStyle = pal;
        ctx.fillRect(Math.round(cx - Math.sign(p.vx) * i * 5), cy - 2, 5, 5);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
    },

    /** small dash puff */
    dust(ctx, x, y, t) {
      const a = 0.45 * (1 - t);
      ctx.fillStyle = 'rgba(220,220,230,' + a + ')';
      ctx.fillRect(Math.round(x - 3 - t * 6), Math.round(y - 1), 3, 2);
      ctx.fillRect(Math.round(x + 2 + t * 5), Math.round(y - 2), 3, 2);
    }
  };

  N.Art = Art;
})(window.NHS);
