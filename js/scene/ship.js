/* =====================================================================
 *  MRV SCENE — SPACECRAFT, ENERGY WEAPON & BEAM
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;
  const T = () => MRV.FxParticles.TYPE;

  class Ship {
    constructor(ctx) {
      this.ctx = ctx;
      const { glw, Q } = ctx;
      const geo = MRV.G.spaceship();
      this.hard = geo.hardpoints;
      this.mesh = glw.mesh(geo);
      this.model = M.mat4();
      this.ringModel = M.mat4();
      this.trail = new MRV.TrailPool(ctx, Q.trail);
      this.prevEngines = null;
      this.nose = [0, 0, 0];
      this.engines = [];
      this.fwd = [0, 0, -1];
    }

    update(dt, s) {
      const sh = s.ship;
      M.basis(this.model, sh.pos, sh.fwd, sh.up, 1);
      this.fwd = M.norm(sh.fwd);
      this.nose = M.transformPoint(this.model, this.hard.nose);
      this.engines = this.hard.engines.map((e) => M.transformPoint(this.model, e));

      // exhaust trail emission (interpolated along this frame's motion)
      if (sh.visible && sh.engine > 0.05 && dt > 0) {
        const back = M.scale(this.fwd, -1);
        this.engines.forEach((e, i) => {
          const prev = this.prevEngines ? this.prevEngines[i] : e;
          const d = M.dist(prev, e);
          const steps = Math.min(24, 1 + Math.floor(d / 0.18) + (sh.engine > 1 ? 1 : 0));
          for (let k = 0; k < steps; k++) {
            const p = M.mix(prev, e, (k + Math.random()) / steps);
            const j = 0.35;
            const v = M.add(M.scale(back, 3 + sh.engine * 4), [(Math.random() - 0.5) * j, (Math.random() - 0.5) * j, (Math.random() - 0.5) * j]);
            this.trail.emit(p, v, (0.35 + Math.random() * 0.5) * (i === 2 ? 1.2 : 0.9));
          }
        });
      }
      this.prevEngines = this.engines.map((e) => e.slice());
      this.trail.update(dt);
    }

    drawHull(f, s) {
      if (!s.ship.visible) return;
      const { glw, P } = this.ctx;
      const gl = glw.gl;
      glw.opaque();
      gl.disable(gl.CULL_FACE);
      const sh = s.ship;
      glw.use(P.ship, {
        uVP: f.vp, uModel: this.model, uCamPos: f.camPos, uSunPos: s.sunPos, uSunCol: s.sunLight,
        uFxPos: this.nose, uFxCol: [0.35, 0.85, 1.0], uFxInt: sh.fxLight, uEngine: sh.engine > 0.1 ? 0.6 + sh.engine * 0.4 : 0.4,
        uReveal: 1, uTime: f.time
      });
      glw.draw(this.mesh);
    }

    drawFx(f, s) {
      const sh = s.ship;
      const { glw, P, meshes, fx, Q } = this.ctx;
      glw.additive(true);
      if (sh.visible) {
        // engine glows
        const flick = 0.85 + 0.15 * Math.sin(f.time * 57.0) * Math.sin(f.time * 23.0);
        this.engines.forEach((e, i) => {
          const big = i === 2 ? 1.25 : 1;
          this.glow(f, e, 0.9 * big * (0.6 + sh.engine * 0.4), [0.45, 0.85, 1.0], 1.8 * sh.engine * flick, 30, 0.6);
          this.glow(f, e, 3.2 * big * (0.5 + sh.engine * 0.5), [0.2, 0.5, 1.0], 0.35 * sh.engine, 8, 0);
        });
        // wingtip beacons
        const blink = Math.sin(f.time * 6.0) > 0.6 ? 1 : 0.15;
        this.hard.tips.forEach((tp) => this.glow(f, M.transformPoint(this.model, tp), 0.35, [0.4, 0.9, 1], blink, 40, 0.3));
      }
      this.trail.draw(f);

      // ----- energy weapon charging -----
      if (sh.orb > 0.001) {
        const o = sh.orb;
        const fl = 0.9 + 0.1 * Math.sin(f.time * 43.0);
        this.glow(f, this.nose, 0.6 + o * 2.4, [0.55, 0.9, 1.0], (1.2 + o * 4.0) * fl, 20 + o * 20, o * 0.8);
        this.glow(f, this.nose, 3 + o * 9, [0.15, 0.5, 1.0], 0.25 + o * 0.5, 5, 0);
        // rotating rings around the emitter axis
        glw.gl.disable(glw.gl.CULL_FACE);
        for (let i = 0; i < 3; i++) {
          const spin = f.time * (1.6 + i * 0.9) * (i % 2 ? -1 : 1);
          const up = M.rotateAxis([0, 1, 0], this.fwd, spin);
          const axis = M.rotateAxis(this.fwd, M.norm(M.cross(this.fwd, up)), 0.35 * i);
          const pos = M.add(this.nose, M.scale(this.fwd, 0.4 + i * 0.35));
          // ring plane is local XZ → its normal (local Y) must be the ship axis
          M.basis(this.ringModel, pos, up, axis, (0.5 + i * 0.35) * (0.4 + o * 0.9));
          glw.use(P.holoRing, {
            uVP: f.vp, uModel: this.ringModel, uColor: [0.35, 0.85, 1.0], uIntensity: o * (1.8 - i * 0.3),
            uTime: f.time, uDashes: 6 + i * 4, uSpeed: 1.5 - i
          });
          glw.draw(meshes.holoRing);
        }
        fx.draw(f, { type: T().CHARGE, n: Q.charge, time: f.time, origin: this.nose, scale: 1.0, intensity: Math.min(1, o * 1.6) });
      }

      // ----- muzzle shockwave -----
      if (sh.muzzle > 0 && sh.muzzle < 1) {
        const m = sh.muzzle;
        this.ringGlow(f, this.nose, 1 + m * 16, (1 - m) * 2.5);
      }

      // ----- beam -----
      const b = s.beam;
      if (b.intensity > 0.001) {
        const A = this.nose, B = b.target;
        const fl = 0.85 + 0.15 * Math.sin(f.time * 70.0);
        glw.use(P.beam, { uVP: f.vp, uA: A, uB: B, uCamPos: f.camPos, uWidth: 2.6 * b.width, uHead: b.head, uTime: f.time, uIntensity: b.intensity * 0.9 * fl, uColor: [0.15, 0.55, 1.0] });
        glw.draw(meshes.ribbon);
        glw.use(P.beam, { uVP: f.vp, uA: A, uB: B, uCamPos: f.camPos, uWidth: 0.7 * b.width, uHead: b.head, uTime: f.time, uIntensity: b.intensity * 1.6 * fl, uColor: [0.5, 0.9, 1.0] });
        glw.draw(meshes.ribbon);
        fx.draw(f, { type: T().BEAM, n: Q.beamParticles, time: f.time, origin: A, target: B, scale: 1.0, intensity: b.intensity, param: [b.head, 0, 0, 0] });
        this.glow(f, A, 4 + b.width * 3, [0.5, 0.9, 1.0], 2.5 * b.intensity, 30, 1.2 * b.intensity);
        if (b.head >= 0.999) {
          // impact point on the sun surface
          this.glow(f, B, 10, [0.7, 0.95, 1.0], 1.6 * b.intensity, 25, 1.0);
          this.glow(f, B, 24, [0.5, 0.8, 1.0], 0.25 * b.intensity, 6, 0);
          fx.draw(f, { type: T().SPARK, n: Q.sparks, time: f.time, origin: B, target: b.normal, scale: 14, intensity: b.intensity });
        }
      }
    }

    glow(f, pos, size, color, intensity, core, rays) {
      const { glw, P, meshes } = this.ctx;
      glw.use(P.glow, { uVP: f.vp, uPos: pos, uRight: f.right, uUp: f.up, uSize: size, uColor: color, uIntensity: intensity, uCore: core, uRays: rays || 0 });
      glw.draw(meshes.quad);
    }

    ringGlow(f, pos, radius, intensity) {
      const { glw, P, meshes } = this.ctx;
      // camera-facing shock ring: plane whose normal points to camera
      const n = M.norm(M.sub(f.camPos, pos));
      M.basis(this.ringModel, pos, f.up, n, radius);
      glw.use(P.shockRing, { uVP: f.vp, uModel: this.ringModel, uIntensity: intensity, uWidth: 0.05, uTime: f.time, uColorA: [0.7, 0.95, 1.0], uColorB: [0.2, 0.5, 1.0] });
      glw.draw(meshes.plane);
    }
  }

  MRV.Ship = Ship;
})(window.MRV = window.MRV || {});
