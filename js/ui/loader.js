/* =====================================================================
 *  MRV UI — BOOT LOADER
 *  Shows real progress while shaders / meshes / particles are built.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Loader {
    constructor() {
      this.root = document.getElementById('loader');
      this.log = document.getElementById('loader-log');
      this.fill = document.getElementById('loader-fill');
      this.pct = document.getElementById('loader-pct');
      this.status = document.getElementById('loader-status');
      this.value = 0;
    }

    line(text) {
      const li = document.createElement('li');
      li.textContent = '> ' + text;
      this.log.appendChild(li);
      requestAnimationFrame(() => li.classList.add('on'));
      this.status.textContent = text.replace(/\.+$/, '');
    }

    set(v) {
      this.value = v;
      this.fill.style.transform = 'scaleX(' + v.toFixed(3) + ')';
      this.pct.textContent = String(Math.round(v * 100)).padStart(3, '0') + '%';
    }

    /* animate progress from current value to `to` over `ms` */
    tween(to, ms) {
      const from = this.value, t0 = performance.now();
      return new Promise((res) => {
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          this.set(from + (to - from) * (1 - Math.pow(1 - k, 2)));
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    }

    async online() {
      this.status.textContent = 'SYSTEM ONLINE';
      const li = document.createElement('li');
      li.className = 'ok on';
      li.textContent = '> SYSTEM ONLINE';
      this.log.appendChild(li);
      this.root.classList.add('done');
      await new Promise((r) => setTimeout(r, 650));
    }

    hide() {
      this.root.classList.add('out');
      setTimeout(() => { this.root.hidden = true; }, 900);
    }
  }

  MRV.Loader = Loader;
})(window.MRV = window.MRV || {});
