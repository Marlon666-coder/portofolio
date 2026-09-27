/* =====================================================================
 *  MRV ENGINE — MATH
 *  Tiny column-major matrix / vector helpers (gl-matrix conventions),
 *  easing helpers and a time-parametrised Hermite path.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  const M = {};

  /* ---------- scalar helpers ---------- */
  M.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.range = (t, a, b) => M.clamp((t - a) / (b - a), 0, 1);
  M.smooth = (t) => t * t * (3 - 2 * t);
  M.sr = (t, a, b) => M.smooth(M.range(t, a, b));          // smooth range
  M.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  M.easeIn = (t) => t * t * t;
  M.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  M.pulse = (t, c, w) => Math.exp(-((t - c) / w) * ((t - c) / w));
  M.damp = (a, b, lambda, dt) => M.lerp(a, b, 1 - Math.exp(-lambda * dt));

  /* ---------- vec3 (plain arrays) ---------- */
  M.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  M.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  M.scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  M.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  M.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  M.len = (a) => Math.hypot(a[0], a[1], a[2]);
  M.norm = (a) => { const l = M.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  M.mix = (a, b, t) => [M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t), M.lerp(a[2], b[2], t)];
  M.dist = (a, b) => M.len(M.sub(a, b));
  /* rotate vector v around unit axis k by angle (Rodrigues) */
  M.rotateAxis = (v, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), d = M.dot(k, v), x = M.cross(k, v);
    return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
  };

  /* ---------- mat4 (Float32Array(16), column-major) ---------- */
  M.mat4 = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };

  M.perspective = (out, fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) * nf; out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  };

  M.lookAt = (out, eye, target, up) => {
    let z = M.norm(M.sub(eye, target));
    let x = M.cross(up, z);
    if (M.len(x) < 1e-6) x = M.cross([0, 0, 1], z);
    x = M.norm(x);
    const y = M.cross(z, x);
    out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
    out[12] = -M.dot(x, eye); out[13] = -M.dot(y, eye); out[14] = -M.dot(z, eye); out[15] = 1;
    return out;
  };

  M.multiply = (out, a, b) => {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let row = 0; row < 4; row++) {
        r[c * 4 + row] = a[row] * b[c * 4] + a[4 + row] * b[c * 4 + 1] + a[8 + row] * b[c * 4 + 2] + a[12 + row] * b[c * 4 + 3];
      }
    }
    out.set(r);
    return out;
  };

  M.invert = (out, a) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out;
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  };

  /* Model matrix whose local +Z points along `fwd`, +Y roughly along `up`. */
  M.basis = (out, pos, fwd, up, s) => {
    const z = M.norm(fwd);
    let x = M.cross(up, z);
    if (M.len(x) < 1e-6) x = M.cross([1, 0, 0], z);
    x = M.norm(x);
    const y = M.cross(z, x);
    out[0] = x[0] * s; out[1] = x[1] * s; out[2] = x[2] * s; out[3] = 0;
    out[4] = y[0] * s; out[5] = y[1] * s; out[6] = y[2] * s; out[7] = 0;
    out[8] = z[0] * s; out[9] = z[1] * s; out[10] = z[2] * s; out[11] = 0;
    out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
    return out;
  };

  /* Model matrix from euler angles (XYZ order), position and uniform scale. */
  M.euler = (out, rx, ry, rz, pos, s) => {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Rz * Ry * Rx
    out[0] = cz * cy * s; out[1] = sz * cy * s; out[2] = -sy * s; out[3] = 0;
    out[4] = (cz * sy * sx - sz * cx) * s; out[5] = (sz * sy * sx + cz * cx) * s; out[6] = cy * sx * s; out[7] = 0;
    out[8] = (cz * sy * cx + sz * sx) * s; out[9] = (sz * sy * cx - cz * sx) * s; out[10] = cy * cx * s; out[11] = 0;
    out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
    return out;
  };

  M.transformPoint = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];

  /* Project world point → {x, y} in CSS pixels (0,0 top-left) + visibility. */
  M.project = (vp, p, w, h) => {
    const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
    const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
    const cw = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
    if (cw <= 0.0001) return { x: -9999, y: -9999, visible: false, ndcX: 0, ndcY: 0 };
    const nx = x / cw, ny = y / cw;
    return { x: (nx * 0.5 + 0.5) * w, y: (1 - (ny * 0.5 + 0.5)) * h, ndcX: nx, ndcY: ny, visible: Math.abs(nx) < 1.2 && Math.abs(ny) < 1.2 };
  };

  /* Ray from camera through NDC point intersected with plane z = planeZ. */
  M.unprojectToZ = (invVP, ndcX, ndcY, planeZ) => {
    const tp = (m, x, y, z) => {
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
    };
    const a = tp(invVP, ndcX, ndcY, -1), b = tp(invVP, ndcX, ndcY, 1);
    const d = M.sub(b, a);
    const t = Math.abs(d[2]) < 1e-6 ? 0 : (planeZ - a[2]) / d[2];
    return M.add(a, M.scale(d, t));
  };

  /* ---------- Time-parametrised cubic Hermite path (C1 continuous) ----------
   * keys: [[t, [x,y,z]], ...] sorted by time. Tangents are computed from the
   * neighbouring keys, divided by the time spacing, so velocity is smooth. */
  M.path = (keys) => {
    const n = keys.length;
    const tan = keys.map((k, i) => {
      if (k[2]) return k[2]; // explicit velocity
      const a = keys[Math.max(0, i - 1)], b = keys[Math.min(n - 1, i + 1)];
      const dt = b[0] - a[0] || 1;
      return M.scale(M.sub(b[1], a[1]), 1 / dt);
    });
    return (t) => {
      if (t <= keys[0][0]) return keys[0][1].slice();
      if (t >= keys[n - 1][0]) return keys[n - 1][1].slice();
      let i = 0;
      while (i < n - 2 && t > keys[i + 1][0]) i++;
      const t0 = keys[i][0], t1 = keys[i + 1][0], h = t1 - t0;
      const s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
      const p0 = keys[i][1], p1 = keys[i + 1][1], m0 = tan[i], m1 = tan[i + 1];
      return [0, 1, 2].map((c) => h00 * p0[c] + h10 * h * m0[c] + h01 * p1[c] + h11 * h * m1[c]);
    };
  };

  /* Seeded PRNG (mulberry32) for deterministic particle layouts. */
  M.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  MRV.M = M;
})(window.MRV = window.MRV || {});
