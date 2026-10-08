/* =====================================================================
 *  MRV UI — HOLOGRAPHIC PROFILE
 *  The real profile photo, framed as a hologram: CSS handles the glow,
 *  scanlines, noise, RGB split, sweep and flicker; this module loads the
 *  photo (with an elegant "pending upload" state), makes the hologram
 *  lean toward a nearby cursor, and draws a light orbiting particle
 *  field on a small canvas. Everything pauses when off-screen.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class HoloProfile {
    constructor(owner, opts) {
      this.root = document.getElementById('holo-profile');
      if (!this.root) return;
      this.reduced = !!opts.reducedMotion;
      this.fine = window.matchMedia('(pointer: fine)').matches;
      this.tilt = this.root.querySelector('.hp-tilt');
      this.img = document.getElementById('profile-img');
      this.cv = this.root.querySelector('.hp-particles');
      this.g = this.cv.getContext('2d');
      this.visible = true;
      this.t = { x: 0, y: 0, k: 0 };   // target (normalised offset + strength)
      this.c = { x: 0, y: 0, k: 0 };   // current (smoothed)
      this.loadPhoto(owner);
      this.initParticles(opts.mobile);
      this.bind();
    }

    loadPhoto(owner) {
      const src = owner.photo;
      this.img.alt = owner.photoAlt || owner.name;
      const fail = () => { this.root.classList.add('no-photo'); this.root.classList.remove('has-photo'); };
      if (!src) { fail(); return; }
      this.img.addEventListener('load', () => {
        this.root.classList.add('has-photo');
        this.root.classList.remove('no-photo');
        // the RGB-split ghost layers reuse the very same image
        const url = 'url("' + src.replace(/"/g, '%22') + '")';
        this.root.querySelectorAll('.hp-rgb').forEach((el) => { el.style.backgroundImage = url; });
      });
      this.img.addEventListener('error', fail);
      this.img.src = src;
    }

    bind() {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((en) => { this.visible = en[0].isIntersecting; }, { rootMargin: '80px' }).observe(this.root);
      }
      if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(this.root);
      else window.addEventListener('resize', () => this.resize());
      this.resize();

      if (!this.fine || this.reduced) return;
      window.addEventListener('pointermove', (e) => {
        if (!this.visible) return;
        const r = this.root.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const reach = r.width * 1.25;
        const dx = (e.clientX - cx) / reach, dy = (e.clientY - cy) / reach;
        const d = Math.hypot(dx, dy);
        const k = Math.max(0, 1 - d / 1.6);             // stronger when the cursor is close
        this.t.x = Math.max(-1, Math.min(1, dx));
        this.t.y = Math.max(-1, Math.min(1, dy));
        this.t.k = k;
      }, { passive: true });
      document.addEventListener('pointerleave', () => { this.t.k = 0; });
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.cv.width = Math.max(2, Math.round(r.width * dpr));
      this.cv.height = Math.max(2, Math.round(r.height * dpr));
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    initParticles(mobile) {
      const n = this.reduced ? 0 : (mobile ? 26 : 46);
      this.parts = [];
      for (let i = 0; i < n; i++) this.parts.push(this.spawn(true));
    }

    spawn(initial) {
      const orbit = Math.random() < 0.65;
      return {
        orbit,
        a: Math.random() * Math.PI * 2,
        r: orbit ? 0.36 + Math.random() * 0.1 : 0.12 + Math.random() * 0.3,
        v: (0.08 + Math.random() * 0.22) * (Math.random() < 0.5 ? -1 : 1),
        y: initial ? Math.random() : 1,
        rise: 0.04 + Math.random() * 0.08,
        s: 0.6 + Math.random() * 1.5,
        hue: Math.random() < 0.78 ? 0 : 1,
        life: Math.random()
      };
    }

    update(dt) {
      if (!this.root) return;
      // cursor-follow lean (smoothed)
      if (this.fine && !this.reduced) {
        const k = 1 - Math.exp(-dt * 6);
        this.c.x += (this.t.x * this.t.k - this.c.x) * k;
        this.c.y += (this.t.y * this.t.k - this.c.y) * k;
        this.c.k += (this.t.k - this.c.k) * k;
        const s = this.tilt.style;
        s.setProperty('--hrx', (-this.c.y * 12).toFixed(2) + 'deg');
        s.setProperty('--hry', (this.c.x * 14).toFixed(2) + 'deg');
        s.setProperty('--htx', (this.c.x * 10).toFixed(2) + 'px');
        s.setProperty('--hty', (this.c.y * 8).toFixed(2) + 'px');
        s.setProperty('--hglow', this.c.k.toFixed(3));
      }
      if (!this.visible || !this.parts.length) return;
      this.draw(dt);
    }

    draw(dt) {
      const g = this.g, w = this.w, h = this.h;
      if (!w || !h) return;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h);
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.parts.length; i++) {
        const p = this.parts[i];
        let x, y, alpha;
        if (p.orbit) {
          p.a += p.v * dt;
          p.life += dt * 0.25;
          x = cx + Math.cos(p.a) * p.r * R;
          y = cy + Math.sin(p.a) * p.r * R * 0.96;
          alpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(p.life * 6.283));
        } else {
          p.y -= p.rise * dt;
          if (p.y < 0) { this.parts[i] = this.spawn(false); continue; }
          x = cx + Math.cos(p.a) * p.r * R;
          y = cy + (p.y - 0.5) * R * 0.95;
          alpha = Math.sin(p.y * Math.PI) * 0.75;
        }
        const col = p.hue ? '139,92,255' : '62,242,255';
        g.fillStyle = 'rgba(' + col + ',' + (alpha * 0.25).toFixed(3) + ')';
        g.fillRect(x - p.s * 2, y - p.s * 2, p.s * 4, p.s * 4);
        g.fillStyle = 'rgba(210,252,255,' + alpha.toFixed(3) + ')';
        g.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  MRV.HoloProfile = HoloProfile;
})(window.MRV = window.MRV || {});
