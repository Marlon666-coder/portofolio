/* =====================================================================
 *  MRV FALLBACK — Canvas 2D universe
 *  Used when WebGL2 is unavailable, fails, or the device is too weak.
 *  Draws a warp star field + nova burst and a CSS title sequence, then
 *  keeps a light star/particle background behind the portfolio.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Fallback {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.g = canvas.getContext('2d');
      this.reduced = !!opts.reducedMotion;
      this.title = document.getElementById('fallback-title');
      const n = opts.mobile ? 260 : 520;
      this.stars = [];
      for (let i = 0; i < n; i++) this.stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), s: Math.random() });
      this.burst = [];
      for (let i = 0; i < (opts.mobile ? 160 : 320); i++) {
        const a = Math.random() * Math.PI * 2;
        this.burst.push({ a, v: 0.2 + Math.random(), s: Math.random() });
      }
      this.resize();
      canvas.hidden = false;
      document.documentElement.classList.add('is-fallback');
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = innerWidth; this.h = innerHeight;
      this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setTitle(text, cls) {
      this.title.className = 'fallback-title on ' + (cls || '');
      this.title.textContent = text;
    }

    /* t = intro time or -1 in portfolio mode; mouse in -1..1 */
    draw(t, dt, mouse, scrollY) {
      const g = this.g, w = this.w, h = this.h;
      g.fillStyle = '#02030a';
      g.fillRect(0, 0, w, h);
      // soft nebula
      const neb = g.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h) * 0.7);
      neb.addColorStop(0, 'rgba(90,50,160,0.22)'); neb.addColorStop(0.5, 'rgba(20,60,140,0.1)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);

      const intro = t >= 0;
      const warp = intro ? Math.min(1, Math.max(0, (t - 2.5) / 2)) * (t < 6 ? 1 : Math.max(0, 1 - (t - 6))) : 0;
      const speed = this.reduced ? 0.02 : 0.05 + warp * 0.9;
      const cx = w / 2 + mouse.x * 20, cy = h / 2 + mouse.y * 14 - (intro ? 0 : scrollY * 0.02 % h);
      for (const s of this.stars) {
        s.z -= dt * speed;
        if (s.z <= 0.02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; }
        const k = 0.6 / s.z;
        const x = cx + s.x * w * 0.5 * k, y = cy + s.y * h * 0.5 * k;
        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
        const a = Math.min(1, (1 - s.z) * 1.4) * (intro ? Math.min(1, t / 2) : 0.8);
        g.strokeStyle = 'rgba(190,225,255,' + a.toFixed(3) + ')';
        g.lineWidth = 0.6 + (1 - s.z) * 1.6;
        const len = 1 + warp * 26 * (1 - s.z);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (x - cx) * 0.02 * len, y + (y - cy) * 0.02 * len);
        g.stroke();
      }
      // nova burst
      if (intro && t > 6 && t < 11) {
        const e = t - 6;
        const r = Math.min(w, h) * (0.05 + e * 0.35);
        const flash = Math.max(0, 1 - e * 0.8);
        const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 1.4);
        grad.addColorStop(0, 'rgba(255,240,220,' + (0.9 * flash) + ')');
        grad.addColorStop(0.3, 'rgba(255,140,60,' + (0.5 * flash) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
        for (const b of this.burst) {
          const d = r * b.v * 1.3;
          const hue = b.s > 0.7 ? '120,220,255' : '255,160,80';
          g.fillStyle = 'rgba(' + hue + ',' + Math.max(0, 1 - e / 5).toFixed(3) + ')';
          g.fillRect(w / 2 + Math.cos(b.a) * d, h / 2 + Math.sin(b.a) * d, 2, 2);
        }
      }
    }
  }

  /* Cue list for the fallback intro (same HUD, shorter sequence). */
  Fallback.cues = [
    [0.4, 'init'], [2.2, 'clear'], [2.6, 'welcome'], [5.6, 'clear'],
    [6.2, 'title', 'MRV'], [8.4, 'title-name'], [9.6, 'role'], [10.4, 'online'], [12.0, 'portfolio']
  ];
  Fallback.END = 12.8;

  MRV.Fallback = Fallback;
})(window.MRV = window.MRV || {});
