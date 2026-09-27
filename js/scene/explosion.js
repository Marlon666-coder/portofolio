/* =====================================================================
 *  MRV SCENE — SUPERNOVA EXPLOSION
 *  Layers (back → front, all additive):
 *   1 bright core   2 expanding plasma shells   3 fire particles
 *   4 shockwaves (sphere + two planar rings)    5 debris / fragments
 *   6 light burst (sprite + post flash)         7 fading embers
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  class Explosion {
    constructor(ctx, sun) {
      this.ctx = ctx;
      this.center = sun.center;
      this.R = sun.radius;
      this.m = M.mat4();
    }

    draw(f, s) {
      const te = s.te;
      if (te <= 0 || te > 16) return;
      const { glw, P, meshes, fx, Q } = this.ctx;
      const gl = glw.gl;
      const C = this.center, R = this.R;
      const TY = MRV.FxParticles.TYPE;
      glw.additive(true);
      gl.disable(gl.CULL_FACE);

      // 1. bright core + light burst
      const coreI = Math.exp(-te * 1.3);
      this.glow(f, C, R * (1.3 + te * 0.9), [1.0, 0.9, 0.75], 1.8 * coreI + 0.12 * Math.exp(-te * 0.25), 7, 0.7 * coreI);
      this.glow(f, C, R * (6 + te * 2), [1.0, 0.45, 0.15], 0.45 * coreI + 0.06 * Math.exp(-te * 0.3), 3, 0);

      // 2. expanding plasma shells
      const shell = (radius, dissolve, intensity, a, b, disp) => {
        glw.use(P.shell, {
          uVP: f.vp, uCenter: C, uRadius: radius, uTime: f.time + te, uDisp: disp, uCamPos: f.camPos,
          uColorA: a, uColorB: b, uIntensity: intensity, uDissolve: dissolve, uMode: 0
        });
        glw.draw(meshes.sphere);
      };
      shell(R * (0.9 + 1.5 * M.easeOut(M.clamp(te / 5, 0, 1))), 0.15 + te * 0.11, 0.55 * (1 - M.range(te, 0.3, 6.5)), [1.0, 0.3, 0.05], [1.6, 1.0, 0.45], 0.22);
      shell(R * (0.6 + 2.1 * M.easeOut(M.clamp(te / 4, 0, 1))), 0.25 + te * 0.16, 0.4 * (1 - M.range(te, 0.1, 4.5)), [1.3, 0.55, 0.15], [0.5, 0.75, 1.6], 0.3);

      // 4a. spherical shock
      const shockR = R * (1.05 + te * 7);
      glw.use(P.shell, {
        uVP: f.vp, uCenter: C, uRadius: shockR, uTime: f.time, uDisp: 0.03, uCamPos: f.camPos,
        uColorA: [0.6, 0.85, 1.4], uColorB: [1, 1, 1], uIntensity: 0.8 * Math.exp(-te * 1.1), uDissolve: 0, uMode: 1
      });
      glw.draw(meshes.sphereLo);

      // 4b. planar shock rings (equatorial + tilted)
      const ring = (rx, rz, radius, intensity, width) => {
        M.euler(this.m, rx, 0.4, rz, C, radius);
        glw.use(P.shockRing, { uVP: f.vp, uModel: this.m, uIntensity: intensity, uWidth: width, uTime: f.time, uColorA: [1.4, 1.2, 1.0], uColorB: [1.0, 0.35, 0.1] });
        glw.draw(meshes.plane);
      };
      ring(0.22, 0.12, R * (1.2 + te * 10), 1.3 * Math.exp(-te * 0.55), 0.04);
      ring(-0.9, 0.5, R * (1.1 + te * 5.5), 0.7 * Math.exp(-te * 0.7), 0.06);

      // 3. fire, 5. debris, 7. embers
      fx.draw(f, { type: TY.FIRE, n: Q.fire, time: te, origin: C, scale: R, intensity: 1.0 });
      fx.draw(f, { type: TY.DEBRIS, n: Q.debris, time: te, origin: C, scale: R, intensity: 1.0 });
      fx.draw(f, { type: TY.EMBER, n: Q.embers, time: te, origin: C, scale: R, intensity: 0.8 });
    }

    glow(f, pos, size, color, intensity, core, rays) {
      const { glw, P, meshes } = this.ctx;
      glw.use(P.glow, { uVP: f.vp, uPos: pos, uRight: f.right, uUp: f.up, uSize: size, uColor: color, uIntensity: intensity, uCore: core, uRays: rays });
      glw.draw(meshes.quad);
    }
  }

  MRV.Explosion = Explosion;
})(window.MRV = window.MRV || {});
