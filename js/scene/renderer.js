/* =====================================================================
 *  MRV SCENE — RENDERER
 *  Owns the WebGL context, compiles programs, builds meshes, and draws
 *  a frame from a plain "state" object produced by the Director
 *  (cinematic) or the portfolio controller.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  class Renderer {
    constructor(canvas, Q) {
      this.canvas = canvas;
      this.Q = Q;
      this.glw = new MRV.GLW(canvas);
      this.scale = Q.scale;
      this.proj = M.mat4(); this.view = M.mat4(); this.vp = M.mat4(); this.invVP = M.mat4();
      this.frame = { vp: this.vp, invVP: this.invVP, view: this.view, camPos: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1], time: 0, px: 1, aspect: 1, w: 1, h: 1 };
      this.cssW = 1; this.cssH = 1;
    }

    /* Async-friendly staged initialisation so the loader can show progress. */
    initPrograms() {
      const Q = this.Q, glw = this.glw;
      const src = MRV.Shaders.build({ FBM_OCT: Q.fbm, RB_SAMPLES: Q.rb });
      const P = {};
      for (const k in src) P[k] = glw.program(src[k].vs, src[k].fs, k);
      this.P = P;
    }

    initMeshes() {
      const glw = this.glw, gl = glw.gl, G = MRV.G, Q = this.Q;
      this.meshes = {
        fsTri: glw.mesh(G.fullscreenTri()),
        quad: glw.mesh(G.quad(), gl.TRIANGLE_STRIP),
        ribbon: glw.mesh(G.ribbon(), gl.TRIANGLE_STRIP),
        plane: glw.mesh(G.plane(), gl.TRIANGLE_STRIP),
        sphere: glw.mesh(G.sphere(Q.sphere[0], Q.sphere[1])),
        sphereLo: glw.mesh(G.sphere(Math.round(Q.sphere[0] * 0.6), Math.round(Q.sphere[1] * 0.6))),
        planetRing: glw.mesh(G.annulus(1.45, 2.5, 128), gl.TRIANGLE_STRIP),
        holoRing: glw.mesh(G.annulus(0.94, 1.0, 128), gl.TRIANGLE_STRIP),
        holoRingThin: glw.mesh(G.annulus(0.975, 1.0, 160), gl.TRIANGLE_STRIP)
      };
      const c = MRV.config.colors;
      this.colors = {
        nebA: [0.05, 0.08, 0.3], nebB: [0.28, 0.08, 0.36], nebC: [0.05, 0.3, 0.42], raw: c
      };
    }

    initScene() {
      const Q = this.Q;
      const fxCount = Math.max(Q.fire, Q.debris, Q.embers, Q.flares, Q.ambient, Q.coreParticles, Q.charge, Q.beamParticles, Q.sparks);
      this.ctx = { glw: this.glw, P: this.P, meshes: this.meshes, Q, colors: this.colors };
      this.ctx.fx = new MRV.FxParticles(this.ctx, fxCount);
      this.space = new MRV.Space(this.ctx);
      this.sun = new MRV.Sun(this.ctx);
      this.ship = new MRV.Ship(this.ctx);
      this.explosion = new MRV.Explosion(this.ctx, this.sun);
      this.holo = new MRV.Hologram(this.ctx);
      this.core = new MRV.HoloCore(this.ctx);
      this.post = new MRV.PostFX(this.ctx);
    }

    buildHologram() {
      return this.holo.build(this.cssW / this.cssH);
    }

    resize(cssW, cssH) {
      const Q = this.Q;
      const dpr = Math.min(window.devicePixelRatio || 1, Q.dprCap);
      const k = dpr * this.scale;
      const w = Math.max(2, Math.round(cssW * k)), h = Math.max(2, Math.round(cssH * k));
      const aspectChanged = Math.abs(cssW / cssH - this.cssW / this.cssH) > 0.02;
      this.cssW = cssW; this.cssH = cssH;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w; this.canvas.height = h;
      }
      if (this.post) this.post.resize(w, h);
      this.frame.px = k;
      this.frame.w = w; this.frame.h = h;
      this.frame.aspect = cssW / cssH;
      return aspectChanged;
    }

    setScale(s) {
      this.scale = s;
      this.resize(this.cssW, this.cssH);
    }

    camera(cam, time) {
      const f = this.frame;
      M.perspective(this.proj, cam.fov * Math.PI / 180, f.aspect, 0.1, 5000);
      M.lookAt(this.view, cam.pos, cam.target, cam.up || [0, 1, 0]);
      M.multiply(this.vp, this.proj, this.view);
      M.invert(this.invVP, this.vp);
      const v = this.view;
      f.camPos = cam.pos.slice();
      f.right = [v[0], v[4], v[8]];
      f.up = [v[1], v[5], v[9]];
      f.fwd = [-v[2], -v[6], -v[10]];
      f.time = time;
    }

    project(p) { return M.project(this.vp, p, this.cssW, this.cssH); }

    update(dt, s) {
      if (s.world) this.ship.update(dt, s);
      else if (this.ship.trail.alive) this.ship.trail.clear();
    }

    render(s, time) {
      const gl = this.glw.gl;
      if (gl.isContextLost()) return;
      this.camera(s.cam, time);
      const f = this.frame;
      s.sunDir = M.norm(M.sub(this.sun.center, f.camPos));
      this.post.begin();

      this.space.drawSky(f, s);
      this.space.drawStars(f, s);
      if (s.world) {
        this.space.drawPlanet(f, s);
        this.space.drawPlanetRing(f, s);
        this.ship.drawHull(f, s);
        if (s.sun.visible) this.sun.draw(f, s);
        this.explosion.draw(f, s);
        this.ship.drawFx(f, s);
      } else {
        this.core.drawGrid(f, s);
        this.core.drawAmbient(f, s);
        this.core.drawCore(f, s);
      }
      this.space.drawDust(f, s);
      this.holo.draw(f, s);

      // heat distortion follows the sun on screen
      const post = s.post;
      if (s.world && s.sun.visible) {
        const sp = this.project(this.sun.center);
        const edge = this.project(M.add(this.sun.center, M.scale(f.up, this.sun.radius)));
        post.heatCenter = [sp.x / this.cssW, 1 - sp.y / this.cssH];
        post.heatRadius = Math.abs(edge.y - sp.y) / this.cssH;
        post.heat = sp.visible ? post.heat : 0;
      } else post.heat = 0;
      if (post.radialTarget) {
        const rp = this.project(post.radialTarget);
        post.radialCenter = rp.visible ? [rp.x / this.cssW, 1 - rp.y / this.cssH] : [0.5, 0.5];
      }
      this.post.end(post, time);
    }
  }

  MRV.Renderer = Renderer;
})(window.MRV = window.MRV || {});
