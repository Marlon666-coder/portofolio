/* =====================================================================
 *  MRV SCENE — PARTICLES
 *  FxParticles : GPU analytic particles (one shared random buffer,
 *                behaviour chosen by uType in the shader).
 *  TrailPool   : small CPU-simulated pool for engine exhaust trails.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  const TYPE = { FLARE: 0, BEAM: 1, SPARK: 2, CHARGE: 3, FIRE: 4, DEBRIS: 5, EMBER: 6, CORE: 7, AMBIENT: 8 };

  class FxParticles {
    constructor(ctx, count) {
      const { glw } = ctx;
      this.ctx = ctx;
      this.count = count;
      const rnd = M.rng(1337);
      const A = new Float32Array(count * 4), B = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        // uniform random unit vector
        const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        A[i * 4] = r * Math.cos(t); A[i * 4 + 1] = r * Math.sin(t); A[i * 4 + 2] = z; A[i * 4 + 3] = rnd();
        for (let k = 0; k < 4; k++) B[i * 4 + k] = rnd();
      }
      const q = MRV.G.quad();
      const v = glw.vao([
        { loc: 0, data: q.positions, size: 2 },
        { loc: 4, data: A, size: 4, divisor: 1 },
        { loc: 5, data: B, size: 4, divisor: 1 }
      ]);
      this.mesh = { vao: v.vao, count: 4, mode: glw.gl.TRIANGLE_STRIP, indexType: 0 };
    }

    /* opts: {type, n, time, origin, target, scale, intensity, param} */
    draw(f, opts) {
      const { glw, P } = this.ctx;
      const n = Math.min(this.count, Math.floor(opts.n));
      if (n <= 0 || opts.intensity <= 0.001) return;
      glw.use(P.fx, {
        uVP: f.vp, uCamPos: f.camPos, uRight: f.right, uUp: f.up,
        uOrigin: opts.origin || [0, 0, 0], uTarget: opts.target || [0, 1, 0],
        uType: opts.type, uTime: opts.time, uScale: opts.scale || 1,
        uIntensity: opts.intensity, uParam: opts.param || [0, 0, 0, 0]
      });
      glw.draw(this.mesh, n);
    }
  }
  FxParticles.TYPE = TYPE;

  class TrailPool {
    constructor(ctx, max) {
      const { glw } = ctx;
      this.ctx = ctx;
      this.max = max;
      this.P = new Float32Array(max * 4);   // x y z size
      this.C = new Float32Array(max * 4);   // r g b a
      this.vel = new Float32Array(max * 3);
      this.life = new Float32Array(max);
      this.age = new Float32Array(max).fill(1e9);
      this.head = 0;
      const q = MRV.G.quad();
      const v = glw.vao([
        { loc: 0, data: q.positions, size: 2 },
        { loc: 4, data: this.P, size: 4, divisor: 1, dynamic: true },
        { loc: 5, data: this.C, size: 4, divisor: 1, dynamic: true }
      ]);
      this.bufP = v.buffers[4];
      this.bufC = v.buffers[5];
      this.mesh = { vao: v.vao, count: 4, mode: glw.gl.TRIANGLE_STRIP, indexType: 0 };
      this.alive = 0;
    }

    emit(pos, vel, life) {
      const i = this.head;
      this.head = (this.head + 1) % this.max;
      this.P[i * 4] = pos[0]; this.P[i * 4 + 1] = pos[1]; this.P[i * 4 + 2] = pos[2];
      this.vel[i * 3] = vel[0]; this.vel[i * 3 + 1] = vel[1]; this.vel[i * 3 + 2] = vel[2];
      this.life[i] = life;
      this.age[i] = 0;
    }

    update(dt) {
      let alive = 0;
      for (let i = 0; i < this.max; i++) {
        const a = (this.age[i] += dt);
        const k = a / this.life[i];
        if (k >= 1) { this.C[i * 4 + 3] = 0; this.P[i * 4 + 3] = 0; continue; }
        alive++;
        this.P[i * 4] += this.vel[i * 3] * dt;
        this.P[i * 4 + 1] += this.vel[i * 3 + 1] * dt;
        this.P[i * 4 + 2] += this.vel[i * 3 + 2] * dt;
        this.P[i * 4 + 3] = 0.12 + k * 0.55;
        const hot = 1 - k;
        this.C[i * 4] = 0.25 + hot * hot * 0.9;
        this.C[i * 4 + 1] = 0.6 + hot * 0.6;
        this.C[i * 4 + 2] = 1.3;
        this.C[i * 4 + 3] = hot * hot * 0.9;
      }
      this.alive = alive;
    }

    clear() { this.age.fill(1e9); this.alive = 0; }

    draw(f) {
      if (!this.alive) return;
      const { glw, P } = this.ctx;
      const gl = glw.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufP);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.P);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufC);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.C);
      glw.use(P.cpu, { uVP: f.vp, uRight: f.right, uUp: f.up });
      glw.draw(this.mesh, this.max);
    }
  }

  MRV.FxParticles = FxParticles;
  MRV.TrailPool = TrailPool;
})(window.MRV = window.MRV || {});
