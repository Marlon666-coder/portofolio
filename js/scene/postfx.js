/* =====================================================================
 *  MRV SCENE — POST PROCESSING
 *  HDR scene target → bright pass → two-level gaussian bloom +
 *  anamorphic light streak → composite (radial motion blur, heat
 *  distortion, chromatic aberration, flash, ACES tonemap, vignette, grain).
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class PostFX {
    constructor(ctx) {
      this.ctx = ctx;
      this.t = {};
      this.w = 0; this.h = 0;
    }

    resize(w, h) {
      const { glw } = this.ctx;
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h;
      for (const k in this.t) glw.freeTarget(this.t[k]);
      const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
      this.t.scene = glw.target(w, h, { depth: true, float: true });
      this.t.hA = glw.target(hw, hh, { float: true });
      this.t.hB = glw.target(hw, hh, { float: true });
      this.t.qA = glw.target(qw, qh, { float: true });
      this.t.qB = glw.target(qw, qh, { float: true });
      this.t.sA = glw.target(qw, qh, { float: true });
      this.t.sB = glw.target(qw, qh, { float: true });
      this.hdr = this.t.scene.float;
    }

    begin() {
      const { glw } = this.ctx;
      const gl = glw.gl;
      glw.bindTarget(this.t.scene);
      gl.depthMask(true); // glClear respects the depth mask
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    pass(prog, target, uniforms, tex) {
      const { glw, meshes } = this.ctx;
      glw.bindTarget(target);
      glw.bindTex(0, tex);
      glw.use(prog, Object.assign({ uTex: 0 }, uniforms));
      glw.draw(meshes.fsTri);
    }

    /* p = { exposure, flash, flashColor, radial, radialCenter, aberr, heat, heatCenter, heatRadius, fade, bloom, streak } */
    end(p, time) {
      const { glw, P, meshes, Q } = this.ctx;
      const gl = glw.gl;
      const t = this.t;
      glw.noDepth();
      const thr = this.hdr ? 1.0 : 0.72;
      this.pass(P.bright, t.hA, { uTexel: [1 / t.scene.w, 1 / t.scene.h], uThreshold: thr }, t.scene.tex);
      this.pass(P.blur, t.hB, { uDir: [1.4 / t.hA.w, 0] }, t.hA.tex);
      this.pass(P.blur, t.hA, { uDir: [0, 1.4 / t.hA.h] }, t.hB.tex);
      this.pass(P.bright, t.qA, { uTexel: [1 / t.hA.w, 1 / t.hA.h], uThreshold: 0 }, t.hA.tex);
      this.pass(P.blur, t.qB, { uDir: [2.2 / t.qA.w, 0] }, t.qA.tex);
      this.pass(P.blur, t.qA, { uDir: [0, 2.2 / t.qA.h] }, t.qB.tex);
      this.pass(P.blur, t.qB, { uDir: [4.0 / t.qA.w, 0] }, t.qA.tex);
      this.pass(P.blur, t.qA, { uDir: [0, 4.0 / t.qA.h] }, t.qB.tex);
      const doStreak = Q.streak && p.streak > 0.01;
      if (doStreak) {
        this.pass(P.streak, t.sA, { uDir: [3.0 / t.qA.w, 0] }, t.hA.tex);
        this.pass(P.streak, t.sB, { uDir: [9.0 / t.qA.w, 0] }, t.sA.tex);
      }

      glw.bindTarget(null);
      glw.bindTex(0, t.scene.tex);
      glw.bindTex(1, t.hA.tex);
      glw.bindTex(2, t.qA.tex);
      glw.bindTex(3, doStreak ? t.sB.tex : t.qA.tex);
      glw.use(P.composite, {
        uScene: 0, uBloomA: 1, uBloomB: 2, uStreak: 3,
        uRes: [gl.drawingBufferWidth, gl.drawingBufferHeight], uTime: time,
        uExposure: p.exposure, uFlash: p.flash, uFlashColor: p.flashColor || [1, 0.95, 0.9],
        uRadial: p.radial, uRadialCenter: p.radialCenter || [0.5, 0.5], uAberr: p.aberr,
        uGrain: p.grain, uVignette: p.vignette, uHeat: p.heat, uHeatCenter: p.heatCenter || [0.5, 0.5],
        uHeatRadius: p.heatRadius || 0.2, uFade: p.fade, uBloom: p.bloom, uStreakAmt: doStreak ? p.streak : 0
      });
      glw.draw(meshes.fsTri);
    }
  }

  MRV.PostFX = PostFX;
})(window.MRV = window.MRV || {});
