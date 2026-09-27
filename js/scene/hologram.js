/* =====================================================================
 *  MRV SCENE — HOLOGRAPHIC TEXT MORPH
 *  Explosion particles → holographic particles → "MRV" → full name.
 *  Targets are sampled from text rendered to an offscreen 2D canvas.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;

  const PLANE_Z = -12;
  const FOV = 55 * Math.PI / 180;

  class Hologram {
    constructor(ctx) {
      this.ctx = ctx;
      this.count = ctx.Q.holo;
      this.vp = M.mat4();
      this.proj = M.mat4();
      this.view = M.mat4();
      M.lookAt(this.view, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
      this.vao = null;
      this.aspect = 0;
    }

    /* Sample pixel positions of `lines` of text; returns [x,y] in -0.5..0.5 space (x scaled by aspect). */
    sample(lines, aspect, weight, maxW, heightFrac) {
      const cw = 1400, ch = Math.round(cw / aspect);
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const g = cv.getContext('2d', { willReadFrequently: true });
      const family = '"Orbitron", "Segoe UI", Arial, sans-serif';
      let size = ch * heightFrac / lines.length;
      g.font = weight + ' ' + size + 'px ' + family;
      const widest = Math.max(...lines.map((l) => g.measureText(l).width + l.length * size * 0.08));
      if (widest > cw * maxW) size *= (cw * maxW) / widest;
      g.font = weight + ' ' + size + 'px ' + family;
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if ('letterSpacing' in g) g.letterSpacing = Math.round(size * 0.08) + 'px';
      const lh = size * 1.15;
      const cy = ch * 0.47 - ((lines.length - 1) * lh) / 2;
      lines.forEach((l, i) => g.fillText(l, cw / 2, cy + i * lh));
      const data = g.getImageData(0, 0, cw, ch).data;
      const pts = [];
      const step = 2;
      for (let y = 0; y < ch; y += step) {
        for (let x = 0; x < cw; x += step) {
          if (data[(y * cw + x) * 4 + 3] > 140) pts.push([(x / cw - 0.5) * aspect, 0.5 - y / ch]);
        }
      }
      return pts;
    }

    build(aspect) {
      const { glw } = this.ctx;
      this.aspect = aspect;
      const cfg = MRV.config.owner;
      const portrait = aspect < 1;
      const mrv = this.sample([cfg.initials], aspect, 900, 0.62, portrait ? 0.22 : 0.3);
      const words = cfg.name.split(' ');
      const nameLines = portrait ? words : (aspect < 1.5 && words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [cfg.name]);
      const name = this.sample(nameLines, aspect, 800, 0.9, portrait ? 0.3 : (nameLines.length > 1 ? 0.26 : 0.13));
      if (!mrv.length || !name.length) return false;

      const n = this.count;
      const rnd = M.rng(7);
      const H = 2 * Math.abs(PLANE_Z) * Math.tan(FOV / 2); // world height at plane
      const S = new Float32Array(n * 3), A = new Float32Array(n * 3), B = new Float32Array(n * 3), R = new Float32Array(n * 4);
      const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
      shuffle(mrv); shuffle(name);
      for (let i = 0; i < n; i++) {
        // start: explosion particles all around / in front of the camera
        const z = -rnd(), t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z), d = 4 + Math.pow(rnd(), 0.7) * 30;
        S[i * 3] = r * Math.cos(t) * d; S[i * 3 + 1] = r * Math.sin(t) * d; S[i * 3 + 2] = z * d - 4;
        const a = mrv[i % mrv.length], b = name[i % name.length];
        const j = () => (rnd() - 0.5) * 0.004;
        A[i * 3] = (a[0] + j()) * H; A[i * 3 + 1] = (a[1] + j()) * H; A[i * 3 + 2] = PLANE_Z;
        B[i * 3] = (b[0] + j()) * H; B[i * 3 + 1] = (b[1] + j()) * H; B[i * 3 + 2] = PLANE_Z;
        R[i * 4] = rnd(); R[i * 4 + 1] = rnd(); R[i * 4 + 2] = rnd(); R[i * 4 + 3] = rnd();
      }
      const v = glw.vao([
        { loc: 0, data: S, size: 3 }, { loc: 1, data: A, size: 3 }, { loc: 2, data: B, size: 3 }, { loc: 3, data: R, size: 4 }
      ]);
      if (this.vao) glw.gl.deleteVertexArray(this.vao.vao);
      this.vao = v;
      return true;
    }

    draw(f, s) {
      const h = s.holo;
      if (!h || h.alpha <= 0.001 || !this.vao) return;
      const { glw, P } = this.ctx;
      const gl = glw.gl;
      M.perspective(this.proj, FOV, f.aspect, 0.1, 500);
      M.multiply(this.vp, this.proj, this.view);
      glw.additive(false);
      glw.use(P.holo, {
        uVP: this.vp, uTime: f.time, uP0: h.p0, uP1: h.p1, uDisperse: h.disperse, uHolo: h.holo,
        uPx: f.px * Math.max(0.8, f.h / f.px / 900) * 1.5, uAlpha: h.alpha * 1.9
      });
      gl.bindVertexArray(this.vao.vao);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }
  }

  MRV.Hologram = Hologram;
})(window.MRV = window.MRV || {});
