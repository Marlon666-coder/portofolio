/* =====================================================================
 *  MRV UI — MODAL / LIGHTBOX
 *  One accessible dialog reused for certificate previews and short
 *  system messages (e.g. "CV not uploaded yet"). Esc / backdrop / ×
 *  close it; focus is trapped inside and restored afterwards.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Modal {
    constructor() {
      this.root = document.getElementById('modal');
      this.box = this.root.querySelector('.modal-box');
      this.body = document.getElementById('modal-body');
      this.lastFocus = null;
      this.closeTimer = 0;
      this.root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) this.close(); });
      document.addEventListener('keydown', (e) => {
        if (this.root.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        else if (e.key === 'Tab') this.trap(e);
      });
    }

    /* html: trusted markup built by the caller (values already escaped) */
    open(html, variant) {
      clearTimeout(this.closeTimer);
      this.lastFocus = document.activeElement;
      this.body.innerHTML = html;
      this.root.className = 'modal' + (variant ? ' modal-' + variant : '');
      this.root.hidden = false;
      document.body.classList.add('modal-open');
      void this.root.offsetWidth;
      this.root.classList.add('on');
      const btn = this.root.querySelector('.modal-close');
      (btn || this.box).focus({ preventScroll: true });
    }

    close() {
      if (this.root.hidden) return;
      this.root.classList.remove('on');
      document.body.classList.remove('modal-open');
      this.closeTimer = setTimeout(() => { this.root.hidden = true; this.body.innerHTML = ''; }, 280);
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
    }

    trap(e) {
      const f = Array.from(this.root.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  MRV.Modal = Modal;
})(window.MRV = window.MRV || {});
