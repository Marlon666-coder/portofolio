/* =====================================================================
 *  MRV ENGINE — GEOMETRY
 *  Procedural meshes: sphere, billboard quad, plane, annulus rings and
 *  the spacecraft (built entirely from lofted / extruded primitives).
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const G = {};

  G.fullscreenTri = () => ({ positions: new Float32Array([-1, -1, 3, -1, -1, 3]), posSize: 2 });

  /* unit quad corners for billboards (TRIANGLE_STRIP) */
  G.quad = () => ({ positions: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), posSize: 2 });

  /* ribbon corners: x = along (0..1), y = side (-1..1) (TRIANGLE_STRIP) */
  G.ribbon = () => ({ positions: new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), posSize: 2 });

  /* XZ plane, -1..1 (TRIANGLE_STRIP) */
  G.plane = () => ({ positions: new Float32Array([-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1]) });

  G.sphere = (segW, segH) => {
    const pos = [], uv = [], idx = [];
    for (let y = 0; y <= segH; y++) {
      const v = y / segH, th = v * Math.PI;
      for (let x = 0; x <= segW; x++) {
        const u = x / segW, ph = u * Math.PI * 2;
        pos.push(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
        uv.push(u, v);
      }
    }
    const row = segW + 1;
    for (let y = 0; y < segH; y++) {
      for (let x = 0; x < segW; x++) {
        const a = y * row + x, b = a + row;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const positions = new Float32Array(pos);
    return {
      positions, normals: positions, uvs: new Float32Array(uv),
      indices: positions.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)
    };
  };

  /* flat ring in XZ plane. uv.x = radial (0 inner → 1 outer), uv.y = angle 0..1 (TRIANGLE_STRIP) */
  G.annulus = (inner, outer, seg) => {
    const pos = [], uv = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(c * inner, 0, s * inner, c * outer, 0, s * outer);
      uv.push(0, i / seg, 1, i / seg);
    }
    return { positions: new Float32Array(pos), uvs: new Float32Array(uv) };
  };

  /* ------------------------------------------------------------------
   *  SPACECRAFT BUILDER — triangle soup with flat (faceted) normals and
   *  per-vertex RGBA where A = emissive strength.
   * ------------------------------------------------------------------ */
  class Builder {
    constructor() { this.p = []; this.c = []; }
    tri(a, b, c, col) {
      this.p.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) this.c.push(...col);
    }
    quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }

    /* Loft through cross-sections {z, w, h, cx, cy}; polygon with `sides` */
    loft(sections, sides, col, opt) {
      opt = opt || {};
      const ring = (s) => {
        const pts = [];
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2 + Math.PI / sides;
          pts.push([(s.cx || 0) + Math.cos(a) * s.w, (s.cy || 0) + Math.sin(a) * s.h, s.z]);
        }
        return pts;
      };
      const rings = sections.map(ring);
      for (let i = 0; i < rings.length - 1; i++) {
        const A = rings[i], B = rings[i + 1];
        const c = (sections[i].col) || col;
        for (let k = 0; k < sides; k++) {
          const k2 = (k + 1) % sides;
          this.quad(A[k], A[k2], B[k2], B[k], c);
        }
      }
      const cap = (R, s, c) => {
        const ctr = [s.cx || 0, s.cy || 0, s.z];
        for (let k = 0; k < sides; k++) this.tri(ctr, R[k], R[(k + 1) % sides], c);
      };
      if (opt.capStart) cap(rings[0], sections[0], opt.capStartCol || col);
      if (opt.capEnd) cap(rings[rings.length - 1], sections[sections.length - 1], opt.capEndCol || col);
    }

    /* Extrude a convex polygon (XZ points) by thickness around y. */
    slab(poly, y, th, col, xf) {
      xf = xf || ((p) => p);
      const top = poly.map((q) => xf([q[0], y + th / 2, q[1]]));
      const bot = poly.map((q) => xf([q[0], y - th / 2, q[1]]));
      for (let i = 1; i < poly.length - 1; i++) {
        this.tri(top[0], top[i], top[i + 1], col);
        this.tri(bot[0], bot[i + 1], bot[i], col);
      }
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        this.quad(top[i], top[j], bot[j], bot[i], col);
      }
    }

    box(c, s, col) {
      const [x, y, z] = c, [a, b, d] = [s[0] / 2, s[1] / 2, s[2] / 2];
      const v = [[x - a, y - b, z - d], [x + a, y - b, z - d], [x + a, y + b, z - d], [x - a, y + b, z - d],
        [x - a, y - b, z + d], [x + a, y - b, z + d], [x + a, y + b, z + d], [x - a, y + b, z + d]];
      const f = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
      for (const q of f) this.quad(v[q[0]], v[q[1]], v[q[2]], v[q[3]], col);
    }

    /* Mirror every triangle added since index `from` across X. */
    mirrorFrom(from) {
      const pEnd = this.p.length, cStart = (from / 3) * 4;
      const cEnd = this.c.length;
      for (let i = from; i < pEnd; i += 3) this.p.push(-this.p[i], this.p[i + 1], this.p[i + 2]);
      for (let i = cStart; i < cEnd; i++) this.c.push(this.c[i]);
    }

    build() {
      const positions = new Float32Array(this.p);
      const normals = new Float32Array(this.p.length);
      for (let i = 0; i < positions.length; i += 9) {
        const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
        const ux = positions[i + 3] - ax, uy = positions[i + 4] - ay, uz = positions[i + 5] - az;
        const vx = positions[i + 6] - ax, vy = positions[i + 7] - ay, vz = positions[i + 8] - az;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        for (let k = 0; k < 3; k++) { normals[i + k * 3] = nx; normals[i + k * 3 + 1] = ny; normals[i + k * 3 + 2] = nz; }
      }
      return { positions, normals, colors: new Float32Array(this.c) };
    }
  }

  /* Sleek interceptor, nose along +Z, ~7 units long.
   * Returns geometry + named hardpoints in local space. */
  G.spaceship = () => {
    const b = new Builder();
    const HULL = [0.56, 0.6, 0.68, 0];
    const HULL_D = [0.26, 0.28, 0.34, 0];
    const DARK = [0.08, 0.09, 0.12, 0];
    const GLASS = [0.1, 0.35, 0.5, 0.35];
    const GLOW = [0.35, 0.9, 1.0, 1.0];
    const GLOW_HOT = [0.8, 0.97, 1.0, 1.6];

    // fuselage
    b.loft([
      { z: 3.7, w: 0.0, h: 0.0 },
      { z: 2.6, w: 0.26, h: 0.14 },
      { z: 1.2, w: 0.55, h: 0.3 },
      { z: -0.5, w: 0.72, h: 0.42 },
      { z: -2.2, w: 0.64, h: 0.4 },
      { z: -3.0, w: 0.5, h: 0.34 }
    ], 6, HULL, { capEnd: true, capEndCol: DARK });
    // dorsal spine
    b.loft([
      { z: 1.9, w: 0.0, h: 0.0, cy: 0.3 },
      { z: 0.9, w: 0.2, h: 0.12, cy: 0.36 },
      { z: -0.4, w: 0.28, h: 0.18, cy: 0.44 },
      { z: -1.2, w: 0.2, h: 0.12, cy: 0.42 },
      { z: -2.4, w: 0.12, h: 0.08, cy: 0.38 }
    ], 6, GLASS, { capEnd: true });
    // main engine bell + hot core
    b.loft([
      { z: -2.9, w: 0.36, h: 0.26 },
      { z: -3.35, w: 0.42, h: 0.3 }
    ], 8, HULL_D, { capEnd: true, capEndCol: GLOW_HOT });
    // weapon emitter under the nose
    b.loft([
      { z: 3.95, w: 0.05, h: 0.05, cy: -0.14 },
      { z: 3.3, w: 0.1, h: 0.1, cy: -0.14, col: GLOW },
      { z: 2.9, w: 0.1, h: 0.1, cy: -0.14 },
      { z: 1.4, w: 0.16, h: 0.14, cy: -0.2 }
    ], 8, HULL_D, { capStart: true, capStartCol: GLOW_HOT });

    // ---- right side parts (mirrored afterwards) ----
    const from = b.p.length;
    // swept wing with slight anhedral
    const wingXf = (p) => [p[0], p[1] - (p[0] - 0.5) * 0.09, p[2]];
    b.slab([[0.5, 1.0], [0.6, -1.9], [3.5, -2.7], [3.7, -2.25], [1.3, 0.25]], -0.05, 0.09, HULL, wingXf);
    // darker wing inlay
    b.slab([[1.0, -0.4], [1.1, -1.9], [3.0, -2.45], [3.1, -2.2]], 0.005, 0.05, HULL_D, wingXf);
    // leading-edge light strip
    b.slab([[1.35, 0.2], [1.25, 0.1], [3.62, -2.28], [3.72, -2.22]], 0.02, 0.04, GLOW, wingXf);
    // wingtip cannon pod
    b.loft([
      { z: -1.2, w: 0.0, h: 0.0, cx: 3.55, cy: -0.32 },
      { z: -1.7, w: 0.09, h: 0.09, cx: 3.55, cy: -0.32 },
      { z: -3.0, w: 0.09, h: 0.09, cx: 3.55, cy: -0.32 },
      { z: -3.15, w: 0.06, h: 0.06, cx: 3.55, cy: -0.32 }
    ], 6, HULL_D, { capEnd: true, capEndCol: GLOW });
    // engine nacelle
    b.loft([
      { z: 0.5, w: 0.0, h: 0.0, cx: 1.0, cy: -0.08 },
      { z: -0.1, w: 0.28, h: 0.26, cx: 1.0, cy: -0.08 },
      { z: -2.5, w: 0.33, h: 0.3, cx: 1.0, cy: -0.08 },
      { z: -2.85, w: 0.3, h: 0.27, cx: 1.0, cy: -0.08, col: HULL_D },
      { z: -3.2, w: 0.34, h: 0.3, cx: 1.0, cy: -0.08 }
    ], 8, HULL, { capEnd: true, capEndCol: GLOW_HOT });
    // intake ring glow
    b.loft([
      { z: -2.52, w: 0.335, h: 0.305, cx: 1.0, cy: -0.08 },
      { z: -2.62, w: 0.335, h: 0.305, cx: 1.0, cy: -0.08 }
    ], 8, GLOW);
    // canted tail fin
    const finXf = (p) => {
      const ang = 0.35, h = p[0];
      return [0.5 + Math.sin(ang) * h + p[1] * Math.cos(ang), 0.3 + Math.cos(ang) * h - p[1] * Math.sin(ang), p[2]];
    };
    b.slab([[0.0, -0.9], [0.0, -2.9], [1.25, -3.25], [1.2, -2.5]], 0, 0.06, HULL, finXf);
    b.slab([[1.0, -2.45], [1.05, -3.2], [1.25, -3.25], [1.2, -2.5]], 0, 0.07, GLOW, finXf);
    // hull side light strip
    b.box([0.66, 0.02, -0.7], [0.04, 0.05, 2.4], GLOW);
    b.box([0.5, -0.28, 1.2], [0.03, 0.03, 1.2], GLOW);
    // greebles
    b.box([0.35, 0.36, -1.9], [0.18, 0.08, 0.5], HULL_D);
    b.box([0.8, 0.12, -1.4], [0.12, 0.1, 0.9], HULL_D);
    b.mirrorFrom(from);

    const geo = b.build();
    geo.hardpoints = {
      nose: [0, -0.14, 4.25],
      engines: [[1.0, -0.08, -3.35], [-1.0, -0.08, -3.35], [0, 0, -3.5]],
      tips: [[3.55, -0.32, -3.2], [-3.55, -0.32, -3.2]]
    };
    return geo;
  };

  MRV.G = G;
})(window.MRV = window.MRV || {});
