/* =====================================================================
 *  MRV UI — FUTURISTIC CURSOR + GLOBAL POINTER STATE
 *  Glowing dot (instant) + holographic ring (smoothed). Ring grows over
 *  interactive elements. Disabled on touch / coarse pointers.
 *  Also exposes smoothed mouse values used by WebGL and CSS (--mx, --my).
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Cursor {
    constructor() {
      this.dot = document.getElementById('cursor-dot');
      this.ring = document.getElementById('cursor-ring');
      this.enabled = window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches;
      this.x = innerWidth / 2; this.y = innerHeight / 2;
      this.rx = this.x; this.ry = this.y;
      this.nx = 0; this.ny = 0;      // normalised -1..1 (raw)
      this.sx = 0; this.sy = 0;      // smoothed for CSS
      this.seen = false;
      if (this.enabled) document.documentElement.classList.add('has-cursor');
      window.addEventListener('pointermove', (e) => {
        this.x = e.clientX; this.y = e.clientY;
        this.nx = (e.clientX / innerWidth) * 2 - 1;
        this.ny = (e.clientY / innerHeight) * 2 - 1;
        if (!this.seen) { this.seen = true; this.rx = this.x; this.ry = this.y; document.documentElement.classList.add('cursor-seen'); }
      }, { passive: true });
      document.addEventListener('pointerover', (e) => {
        const hit = e.target.closest && e.target.closest('a, button, [data-hover], .skill-card, .mission-card');
        document.documentElement.classList.toggle('cursor-hover', !!hit);
      });
      document.addEventListener('pointerdown', () => document.documentElement.classList.add('cursor-down'));
      document.addEventListener('pointerup', () => document.documentElement.classList.remove('cursor-down'));
      document.addEventListener('pointerleave', () => document.documentElement.classList.remove('cursor-seen'));
    }

    update(dt) {
      const k = 1 - Math.exp(-dt * 14);
      this.rx += (this.x - this.rx) * k;
      this.ry += (this.y - this.ry) * k;
      const k2 = 1 - Math.exp(-dt * 4);
      this.sx += (this.nx - this.sx) * k2;
      this.sy += (this.ny - this.sy) * k2;
      const root = document.documentElement.style;
      root.setProperty('--mx', this.sx.toFixed(4));
      root.setProperty('--my', this.sy.toFixed(4));
      if (!this.enabled) return;
      this.dot.style.transform = 'translate3d(' + this.x + 'px,' + this.y + 'px,0)';
      this.ring.style.transform = 'translate3d(' + this.rx.toFixed(1) + 'px,' + this.ry.toFixed(1) + 'px,0)';
    }
  }

  MRV.Cursor = Cursor;
})(window.MRV = window.MRV || {});
