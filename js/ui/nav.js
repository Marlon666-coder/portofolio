/* =====================================================================
 *  MRV UI — SPACE NAVIGATION
 *  Smooth-scroll links, active-section tracking, mobile menu.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Nav {
    constructor() {
      this.root = document.getElementById('nav');
      this.links = Array.from(document.querySelectorAll('[data-nav]'));
      this.toggle = document.getElementById('nav-toggle');
      this.menu = document.getElementById('nav-links');

      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        const el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        this.close();
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      });

      if (this.toggle) {
        this.toggle.addEventListener('click', () => {
          const open = !this.root.classList.contains('open');
          this.root.classList.toggle('open', open);
          this.toggle.setAttribute('aria-expanded', String(open));
        });
      }

      const sections = this.links.map((l) => document.getElementById(l.dataset.nav)).filter(Boolean);
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) this.links.forEach((l) => l.classList.toggle('active', l.dataset.nav === en.target.id));
          });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach((s) => io.observe(s));
      }
      window.addEventListener('scroll', () => this.root.classList.toggle('scrolled', scrollY > 30), { passive: true });
    }

    close() {
      this.root.classList.remove('open');
      if (this.toggle) this.toggle.setAttribute('aria-expanded', 'false');
    }
  }

  MRV.Nav = Nav;
})(window.MRV = window.MRV || {});
