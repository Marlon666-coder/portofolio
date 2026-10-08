/* =====================================================================
 *  MRV CINEMATIC — PORTFOLIO SCENE CONTROLLER
 *  Camera + holographic core state for the portfolio background.
 *  The 3D core is locked to a DOM anchor (#core-anchor) so the layout
 *  is decided by CSS while WebGL follows it, including scrolling.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  class PortfolioScene {
    constructor(renderer, opts) {
      this.r = renderer;
      this.reduced = !!opts.reducedMotion;
      this.m = { x: 0, y: 0 };
      this.scroll = 0;
    }

    /* input: { mouse:{x,y} in -1..1, scrollY, anchor: DOMRect|null } */
    apply(s, time, dt, input, pf) {
      const k = this.reduced ? 0.3 : 1;
      this.m.x = M.damp(this.m.x, input.mouse.x * k, 3.5, dt);
      this.m.y = M.damp(this.m.y, input.mouse.y * k, 3.5, dt);
      this.scroll = M.damp(this.scroll, input.scrollY, 8, dt);
      const mx = this.m.x, my = this.m.y;
      const sc = this.scroll * 0.0035 * k;
      const pos = [mx * 2.4, 1.2 - my * 1.5 - sc, 30];
      const target = [mx * 0.5, -1.2 - my * 0.3 - sc * 1.25, 0];
      s.cam = { pos, target, up: [0, 1, 0], fov: 50 };
      s.world = false;
      s.grid = 0.9 * pf;
      s.ambient = pf;
      s.scroll = this.scroll;

      // core locked to the DOM anchor
      s.core = null;
      const a = input.anchor;
      if (a && a.width > 0 && a.bottom > -a.height && a.top < this.r.cssH + a.height) {
        this.r.camera(s.cam, time);
        const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
        const ndcX = (cx / this.r.cssW) * 2 - 1, ndcY = 1 - (cy / this.r.cssH) * 2;
        const p = M.unprojectToZ(this.r.invVP, ndcX, ndcY, 0);
        const d = M.dist(pos, p);
        const worldPerPx = (2 * d * Math.tan((50 * Math.PI / 180) / 2)) / this.r.cssH;
        s.core = {
          pos: p,
          scale: Math.min(a.width, a.height) * 0.5 * worldPerPx * 0.64,   // sized so the rings orbit around the holographic profile
          intensity: pf,
          rotX: -my * 0.35,
          rotY: mx * 0.7
        };
      }
    }

    post() {
      return { exposure: 1, flash: 0, radial: 0, aberr: 0.0025, grain: 0.03, vignette: 0.9, heat: 0, fade: 0, bloom: 0.9, streak: 0.4 };
    }
  }

  MRV.PortfolioScene = PortfolioScene;
})(window.MRV = window.MRV || {});
