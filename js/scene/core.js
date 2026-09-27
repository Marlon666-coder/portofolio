/* =====================================================================
 *  MRV SCENE — PORTFOLIO ENVIRONMENT
 *  Holographic energy core (flame mesh + rings + particles + label),
 *  holographic floor grid and ambient floating particles.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  class HoloCore {
    constructor(ctx) {
      this.ctx = ctx;
      const c = MRV.config.colors;
      this.cyan = hex(c.cyan); this.purple = hex(c.purple); this.orange = hex(c.orange); this.blue = hex(c.blue);
      this.model = M.mat4();
      this.ringM = M.mat4();
      this.gridM = M.mat4();
      this.labelTex = this.makeLabel('</>');
    }

    makeLabel(text) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g = cv.getContext('2d');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '700 84px "Orbitron", "Segoe UI", Arial, sans-serif';
      // G channel: blurred glow, R channel: crisp glyphs
      g.shadowColor = 'rgb(0,255,0)';
      g.shadowBlur = 26;
      g.fillStyle = 'rgb(0,255,0)';
      g.fillText(text, 128, 132);
      g.shadowBlur = 0;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgb(255,0,0)';
      g.fillText(text, 128, 132);
      return this.ctx.glw.textureFromCanvas(cv);
    }

    /* s.core = { pos, scale, intensity, rotX, rotY } */
    drawCore(f, s) {
      const c = s.core;
      if (!c || c.intensity <= 0.01) return;
      const { glw, P, meshes, fx, Q } = this.ctx;
      const gl = glw.gl;
      const sc = c.scale;
      glw.additive(false);
      gl.disable(gl.CULL_FACE);

      // inner glow
      this.glow(f, c.pos, sc * 3.2, this.blue, 0.35 * c.intensity, 4);
      this.glow(f, c.pos, sc * 1.2, this.cyan, 0.45 * c.intensity, 14);

      // flame layers
      const layer = (k, seed, inten) => {
        M.euler(this.model, c.rotX, f.time * 0.35 * (seed ? -1 : 1) + c.rotY, 0, c.pos, sc * k);
        glw.use(P.flame, {
          uVP: f.vp, uModel: this.model, uTime: f.time, uSeed: seed, uCamPos: f.camPos,
          uCyan: this.cyan, uPurple: this.purple, uOrange: this.orange, uIntensity: inten * c.intensity
        });
        glw.draw(meshes.sphereLo);
      };
      layer(0.62, 1, 0.55);
      layer(0.4, 2, 0.6);

      // holographic rings
      const rings = [[1.05, 0.9, 0.0, 1.0, 10, 0.6], [1.35, -0.5, 0.7, -0.7, 16, -0.4], [1.7, 0.25, -0.4, 0.45, 24, 0.25]];
      rings.forEach((r, i) => {
        M.euler(this.ringM, r[1] + c.rotX, f.time * r[3] + c.rotY, r[2], c.pos, sc * r[0]);
        glw.use(P.holoRing, {
          uVP: f.vp, uModel: this.ringM, uColor: i === 1 ? this.purple : this.cyan, uIntensity: 0.9 * c.intensity,
          uTime: f.time, uDashes: r[4], uSpeed: r[5]
        });
        glw.draw(i === 2 ? meshes.holoRingThin : meshes.holoRing);
      });

      // emitted particles
      fx.draw(f, { type: MRV.FxParticles.TYPE.CORE, n: Q.coreParticles, time: f.time, origin: c.pos, scale: sc, intensity: c.intensity });

      // center label
      glw.use(P.label, {
        uVP: f.vp, uPos: M.add(c.pos, M.scale(f.fwd, -sc * 0.9)), uRight: f.right, uUp: f.up, uSize: sc * 0.5,
        uColor: [0.75, 0.97, 1.0], uIntensity: c.intensity, uTime: f.time, uTex: 0
      });
      glw.bindTex(0, this.labelTex);
      glw.draw(meshes.quad);
    }

    drawGrid(f, s) {
      if (s.grid <= 0.01) return;
      const { glw, P, meshes } = this.ctx;
      glw.additive(true);
      glw.gl.disable(glw.gl.CULL_FACE);
      M.euler(this.gridM, 0, 0, 0, [f.camPos[0], -14, f.camPos[2] - 150], 180);
      glw.use(P.grid, { uVP: f.vp, uModel: this.gridM, uCamPos: f.camPos, uColor: [0.2, 0.65, 1.0], uTime: f.time, uIntensity: s.grid, uScroll: s.scroll * 0.004 });
      glw.draw(meshes.plane);
    }

    drawAmbient(f, s) {
      if (s.ambient <= 0.01) return;
      const { fx, Q } = this.ctx;
      this.ctx.glw.additive(true);
      fx.draw(f, {
        type: MRV.FxParticles.TYPE.AMBIENT, n: Q.ambient, time: f.time, origin: [f.camPos[0] * 0.5, 0, -10],
        scale: 1, intensity: s.ambient, param: [90, 60, 60, 0]
      });
    }

    glow(f, pos, size, color, intensity, core) {
      const { glw, P, meshes } = this.ctx;
      glw.use(P.glow, { uVP: f.vp, uPos: pos, uRight: f.right, uUp: f.up, uSize: size, uColor: color, uIntensity: intensity, uCore: core, uRays: 0 });
      glw.draw(meshes.quad);
    }
  }

  MRV.HoloCore = HoloCore;
})(window.MRV = window.MRV || {});
