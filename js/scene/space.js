/* =====================================================================
 *  MRV SCENE — DEEP SPACE
 *  Nebula sky dome (fullscreen ray shader), sky-locked star field,
 *  near-field cosmic dust (infinite wrapped box) and a ringed planet.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  class Space {
    constructor(ctx) {
      this.ctx = ctx;
      const { glw, Q } = ctx;
      const gl = glw.gl;
      const rnd = M.rng(42);

      // ---- stars on a sphere around the camera ----
      const n = Q.stars;
      const pos = new Float32Array(n * 3), dat = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        // bias a band of extra stars (milky way) around a tilted great circle
        let x = r * Math.cos(t), y = r * Math.sin(t), zz = z;
        if (rnd() < 0.35) { y *= 0.18; const l = Math.hypot(x, y, zz); x /= l; y /= l; zz /= l; }
        pos[i * 3] = x * 1500; pos[i * 3 + 1] = y * 1500; pos[i * 3 + 2] = zz * 1500;
        const big = rnd();
        dat[i * 4] = 0.8 + Math.pow(big, 6) * 3.2;       // size px
        dat[i * 4 + 1] = rnd();                            // twinkle / reveal seed
        dat[i * 4 + 2] = rnd();                            // color temperature
        dat[i * 4 + 3] = 0.35 + Math.pow(rnd(), 2) * 1.3;  // brightness
      }
      this.stars = glw.vao([{ loc: 0, data: pos, size: 3 }, { loc: 1, data: dat, size: 4 }]);
      this.starCount = n;

      // ---- near-field dust ----
      const dn = Q.dust, box = 160;
      const dp = new Float32Array(dn * 3), dd = new Float32Array(dn * 4);
      for (let i = 0; i < dn; i++) {
        dp[i * 3] = (rnd() - 0.5) * box; dp[i * 3 + 1] = (rnd() - 0.5) * box; dp[i * 3 + 2] = (rnd() - 0.5) * box;
        dd[i * 4] = 0.6 + rnd() * 1.6; dd[i * 4 + 1] = rnd() - 0.5; dd[i * 4 + 2] = rnd(); dd[i * 4 + 3] = 0.2 + rnd() * 0.8;
      }
      this.dust = glw.vao([{ loc: 0, data: dp, size: 3 }, { loc: 1, data: dd, size: 4 }]);
      this.dustCount = dn;
      this.dustBox = box;

      this.planetModel = M.mat4();
      this.ringModel = M.mat4();
      this.planetPos = [-170, -45, 300];
      this.planetR = 42;
      M.euler(this.planetModel, 0.3, 0.2, 0.25, this.planetPos, this.planetR);
      M.euler(this.ringModel, 0.38, 0.2, 0.32, this.planetPos, this.planetR);
      this.gl = gl;
    }

    drawSky(f, s) {
      const { glw, P, meshes, colors } = this.ctx;
      glw.noDepth();
      glw.use(P.sky, {
        uInvVP: f.invVP, uCamPos: f.camPos, uTime: f.time, uReveal: s.reveal, uNebula: s.nebula,
        uSunDir: s.sunDir, uSunGlow: s.sunGlow, uNebA: colors.nebA, uNebB: colors.nebB, uNebC: colors.nebC
      });
      glw.draw(meshes.fsTri);
    }

    drawStars(f, s) {
      const { glw, P } = this.ctx;
      const gl = this.gl;
      glw.additive(false);
      glw.use(P.stars, { uVP: f.vp, uCamPos: f.camPos, uTime: f.time, uReveal: s.starReveal, uPx: f.px });
      gl.bindVertexArray(this.stars.vao);
      gl.drawArrays(gl.POINTS, 0, this.starCount);
    }

    drawDust(f, s) {
      if (s.dust <= 0) return;
      const { glw, P } = this.ctx;
      const gl = this.gl;
      glw.additive(true);
      glw.use(P.dust, { uVP: f.vp, uCamPos: f.camPos, uBox: this.dustBox, uPx: f.px, uAlpha: s.dust, uTime: f.time });
      gl.bindVertexArray(this.dust.vao);
      gl.drawArrays(gl.POINTS, 0, this.dustCount);
    }

    drawPlanet(f, s) {
      const { glw, P, meshes } = this.ctx;
      glw.opaque();
      glw.use(P.planet, { uVP: f.vp, uModel: this.planetModel, uCamPos: f.camPos, uLightPos: s.sunPos, uReveal: s.reveal, uTime: f.time });
      glw.draw(meshes.sphereLo);
    }

    drawPlanetRing(f, s) {
      const { glw, P, meshes } = this.ctx;
      glw.additive(true);
      glw.gl.disable(glw.gl.CULL_FACE);
      glw.use(P.planetRing, { uVP: f.vp, uModel: this.ringModel, uReveal: s.reveal });
      glw.draw(meshes.planetRing);
    }
  }

  MRV.Space = Space;
})(window.MRV = window.MRV || {});
