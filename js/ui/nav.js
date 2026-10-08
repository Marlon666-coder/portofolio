/* =====================================================================
 *  MRV UI — SPACE NAVIGATION
 *  Smooth-scroll links, active-section tracking (with section groups,
 *  e.g. SKILLS lights up ABOUT), mobile hamburger menu.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Nav {
    constructor() {
      this.root = document.getElementById('nav');
      this.links = Array.from(document.querySelectorAll('[data-nav]'));
      this.toggle = document.getElementById('nav-toggle');
      this.menu = document.getElementById('nav-links');
      const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        const el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        this.close();
        el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      });

      if (this.toggle) {
        this.toggle.addEventListener('click', () => this.setOpen(!this.root.classList.contains('open')));
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.root.classList.contains('open')) { this.close(); this.toggle.focus(); }
        });
        document.addEventListener('pointerdown', (e) => {
          if (this.root.classList.contains('open') && !this.root.contains(e.target)) this.close();
        });
      }

      const sections = Array.from(document.querySelectorAll('main section[id]'));
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            const key = en.target.dataset.navGroup || en.target.id;
            this.links.forEach((l) => {
              const on = l.dataset.nav === key;
              l.classList.toggle('active', on);
              if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
            });
          });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach((s) => io.observe(s));
      }
      window.addEventListener('scroll', () => this.root.classList.toggle('scrolled', scrollY > 30), { passive: true });
    }

    setOpen(open) {
      this.root.classList.toggle('open', open);
      if (!this.toggle) return;
      this.toggle.setAttribute('aria-expanded', String(open));
      this.toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    close() { this.setOpen(false); }
  }

  MRV.Nav = Nav;
})(window.MRV = window.MRV || {});
