/* =====================================================================
 *  MRV UI — PORTFOLIO CONTENT + INTERACTIONS
 *  Renders every section from MRV_CONFIG, then wires up scroll reveals,
 *  parallax, 3D card tilt with holographic glare, and hover sparks.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  class Portfolio {
    constructor(cfg, opts) {
      this.cfg = cfg;
      this.reduced = !!opts.reducedMotion;
      this.fine = window.matchMedia('(pointer: fine)').matches;
      this.render();
      this.bindReveal();
      this.bindTilt();
      this.parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
    }

    render() {
      const c = this.cfg, o = c.owner;
      document.title = o.name + ' — THE DIGITAL UNIVERSE';
      // brand colors → CSS variables
      const rs = document.documentElement.style;
      Object.keys(c.colors).forEach((k) => rs.setProperty('--c-' + k, c.colors[k]));

      document.querySelectorAll('[data-initials]').forEach((e) => { e.textContent = o.initials; });
      $('hero-name').innerHTML = o.name.split(' ').map((w, i) =>
        '<span class="hero-word" style="--i:' + i + '" data-text="' + esc(w) + '">' + esc(w) + '</span>').join(' ');
      $('hero-role').textContent = o.role;
      $('hero-tagline').textContent = o.tagline;

      $('about-text').textContent = o.about;
      const rows = [['DESIGNATION', o.name], ['CLASS', o.role], ['STATUS', 'ONLINE'], ['INTERESTS', o.interests.join(' · ')]];
      $('about-data').innerHTML = rows.map((r) => '<div class="data-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('');
      $('about-tags').innerHTML = o.interests.map((t) => '<li>' + esc(t) + '</li>').join('');

      $('skills-grid').innerHTML = c.skills.map((s, i) => `
        <li class="skill-card reveal" style="--d:${(i % 5) * 70}ms" data-tilt>
          <div class="card-glare"></div>
          <span class="skill-index">MOD.${String(i + 1).padStart(2, '0')}</span>
          <span class="skill-glyph">${esc(s.glyph)}</span>
          <span class="skill-name">${esc(s.name)}</span>
          <span class="skill-group">${esc(s.group)}</span>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </li>`).join('');

      $('missions-grid').innerHTML = c.projects.map((p, i) => `
        <article class="mission-card reveal" style="--d:${(i % 2) * 120}ms" data-tilt>
          <div class="card-glare"></div>
          <header class="mission-head">
            <span class="mission-code">MISSION ${esc(p.code)}</span>
            <span class="mission-status"><i></i>LOGGED</span>
          </header>
          <div class="mission-visual" aria-hidden="true">
            <span class="mv-orbit"></span><span class="mv-orbit o2"></span><span class="mv-core">${esc(p.code)}</span>
          </div>
          <h3 class="mission-title">${esc(p.title)}</h3>
          <p class="mission-desc">${esc(p.description)}</p>
          <ul class="mission-tech">${p.tech.map((t) => '<li>' + esc(t) + '</li>').join('')}</ul>
          <div class="mission-links">
            <a class="btn btn-ghost sm" href="${esc(p.github)}" target="_blank" rel="noopener noreferrer">GITHUB</a>
            <a class="btn btn-solid sm" href="${esc(p.demo)}" target="_blank" rel="noopener noreferrer">LIVE DEMO</a>
          </div>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </article>`).join('');

      const mail = $('contact-email');
      mail.href = 'mailto:' + c.contact.email;
      mail.querySelector('span').textContent = c.contact.email;
      $('contact-socials').innerHTML = c.socials.map((s) =>
        '<li><a class="social-link" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(s.label) + '</span><i>-&gt;</i></a></li>').join('');
      $('footer-name').textContent = o.name;
      $('footer-year').textContent = new Date().getFullYear();
    }

    bindReveal() {
      const els = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
      els.forEach((e) => io.observe(e));
    }

    bindTilt() {
      if (!this.fine) return;
      const max = this.reduced ? 3 : 12;
      document.querySelectorAll('[data-tilt]').forEach((card) => {
        let lastSpark = 0;
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--rx', ((0.5 - py) * max).toFixed(2) + 'deg');
          card.style.setProperty('--ry', ((px - 0.5) * max).toFixed(2) + 'deg');
          card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
          const now = performance.now();
          if (!this.reduced && card.classList.contains('skill-card') && now - lastSpark > 90) {
            lastSpark = now;
            this.spark(card, e.clientX - r.left, e.clientY - r.top);
          }
        });
        card.addEventListener('pointerenter', () => card.classList.add('hot'));
        card.addEventListener('pointerleave', () => {
          card.classList.remove('hot');
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
        });
      });
    }

    spark(card, x, y) {
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('i');
        s.className = 'spark';
        const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 40;
        s.style.left = x + 'px'; s.style.top = y + 'px';
        s.style.setProperty('--tx', (Math.cos(a) * d).toFixed(1) + 'px');
        s.style.setProperty('--ty', (Math.sin(a) * d - 20).toFixed(1) + 'px');
        card.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
      }
    }

    /* per-frame: scroll-linked parallax for tagged elements */
    update() {
      if (this.reduced) return;
      const vh = innerHeight;
      for (const el of this.parallaxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const k = ((r.top + r.height / 2) - vh / 2) / vh; // -1..1 around viewport center
        el.style.setProperty('--p', k.toFixed(4));
      }
    }
  }

  MRV.Portfolio = Portfolio;
})(window.MRV = window.MRV || {});
