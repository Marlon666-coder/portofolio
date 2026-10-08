/* =====================================================================
 *  MRV UI — PORTFOLIO CONTENT + INTERACTIONS
 *  Renders every section from MRV_CONFIG (hero, about, skills,
 *  education, projects, certificates, CV, contact, footer), then wires
 *  up scroll reveals, parallax, 3D card tilt with holographic glare,
 *  hover sparks, the typed tagline, the certificate lightbox, the CV
 *  availability check and the scroll progress bar.
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* a link is "real" when it is set and not one of the old template placeholders */
  const real = (u) => !!u && !/your-username|example\.com/i.test(u);

  /* ---------- inline SVG icons (crisp at any DPI) ---------- */
  const svg = (body, vb) => '<svg class="ico" viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  const ICON = {
    instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="fill"/>'),
    whatsapp: svg('<path d="M20.5 11.8a8.6 8.6 0 0 1-12.7 7.5L3.5 20.5l1.2-4.2a8.6 8.6 0 1 1 15.8-4.5Z"/><path d="M9 8.2c.2-.5.5-.6.8-.6h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.4 0 .6.5.9 1.4 1.8 2.4 2.3.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.5 0 .9-.6 1.7-1.6 1.9-.8.2-2.2 0-4-1.1a10 10 0 0 1-3.2-3.5c-.7-1.3-.7-2.6 0-3.7Z" class="fill"/>'),
    github: svg('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
    linkedin: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    arrow: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
    uni: svg('<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6"/>'),
    medal: svg('<circle cx="12" cy="14" r="6"/><path d="m9 3 3 5 3-5M7.5 3h9"/><path d="m12 11 .9 1.9 2.1.3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 13.2l2.1-.3Z" class="fill"/>'),
    doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>')
  };
  MRV.ICON = ICON;

  class Portfolio {
    constructor(cfg, opts) {
      this.cfg = cfg;
      this.reduced = !!opts.reducedMotion;
      this.fine = window.matchMedia('(pointer: fine)').matches;
      this.modal = new MRV.Modal();
      this.cvState = 'checking';
      this.render();
      this.profile = new MRV.HoloProfile(cfg.owner, { reducedMotion: this.reduced, mobile: !!opts.mobile });
      this.bindReveal();
      this.bindTilt();
      this.bindCertificates();
      this.setupCV();
      this.parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
      this.progress = document.querySelector('#scroll-progress i');
      this.lastT = performance.now();
      this.typedStarted = false;
    }

    /* ================================================================
     *  RENDER
     * ================================================================ */
    render() {
      const c = this.cfg, o = c.owner;
      document.title = o.name + ' — THE DIGITAL UNIVERSE';
      const rs = document.documentElement.style;
      Object.keys(c.colors).forEach((k) => rs.setProperty('--c-' + k, c.colors[k]));
      document.querySelectorAll('[data-initials]').forEach((e) => { e.textContent = o.initials; });

      /* hero */
      $('hero-name').innerHTML = o.name.split(' ').map((w, i) =>
        '<span class="hero-word" style="--i:' + i + '" data-text="' + esc(w) + '">' + esc(w) + '</span>').join(' ');
      $('hero-role').textContent = o.role;
      $('hero-uni').textContent = o.university.toUpperCase();
      const tag = $('hero-tagline');
      tag.setAttribute('aria-label', o.tagline);
      tag.querySelector('.typed').textContent = o.tagline;   // full text until typing starts
      const hudRole = $('hud-role');
      if (hudRole) hudRole.textContent = o.role;

      /* about */
      $('about-name').textContent = o.name;
      $('about-role').textContent = o.major + ' Student · ' + o.university;
      $('about-text').textContent = o.about;
      const edu0 = (c.education && c.education[0]) || {};
      const rows = [
        ['NAME', o.name],
        ['UNIVERSITY', o.university],
        ['MAJOR', o.major],
        ['PERIOD', edu0.period || ''],
        ['STATUS', 'ACTIVE']
      ].filter((r) => r[1]);
      $('about-data').innerHTML = rows.map((r) => '<div class="data-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('');
      $('about-tags').innerHTML = o.interests.map((t) => '<li>' + esc(t) + '</li>').join('');

      /* skills */
      $('skills-grid').innerHTML = c.skills.map((s, i) => `
        <li class="skill-card reveal" style="--d:${(i % 5) * 70}ms" data-tilt>
          <div class="card-glare"></div>
          <span class="skill-index">MOD.${String(i + 1).padStart(2, '0')}</span>
          <span class="skill-glyph">${esc(s.glyph)}</span>
          <span class="skill-name">${esc(s.name)}</span>
          <span class="skill-group">${esc(s.group)}</span>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </li>`).join('');

      this.renderEducation();
      this.renderProjects();
      this.renderCertificates();
      this.renderContact();
      this.renderFooter();

      $('cv-name').textContent = o.name;
      $('cv-sub').textContent = o.major + ' Student · ' + o.university;
    }

    renderEducation() {
      const list = this.cfg.education || [];
      const items = list.map((e, i) => `
        <li class="edu-item reveal" style="--d:${i * 120}ms">
          <span class="edu-node" aria-hidden="true"><i></i></span>
          <article class="edu-card">
            <div class="edu-icon">${ICON.uni}</div>
            <div class="edu-main">
              <span class="edu-period">${esc(e.period)}</span>
              <h3 class="edu-inst">${esc(e.institution)}</h3>
              <p class="edu-program">${esc(e.program)}</p>
              ${e.description ? '<p class="edu-desc">' + esc(e.description) + '</p>' : ''}
            </div>
            ${e.status ? '<span class="edu-status"><i></i>' + esc(e.status) + '</span>' : ''}
            <span class="card-corner tl"></span><span class="card-corner br"></span>
          </article>
        </li>`).join('');
      const next = '<li class="edu-item edu-next reveal" aria-hidden="true"><span class="edu-node"><i></i></span><span class="edu-next-label">NEXT MILESTONE // LOADING<span class="caret">_</span></span></li>';
      $('edu-timeline').innerHTML = items + next;
    }

    renderProjects() {
      const btn = (url, label, cls, soon) => real(url)
        ? `<a class="btn ${cls} sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (opens in a new tab)</span></a>`
        : `<span class="btn ${cls} sm is-disabled" aria-disabled="true" title="Link coming soon">${soon}</span>`;
      $('missions-grid').innerHTML = this.cfg.projects.map((p, i) => {
        const live = real(p.demo);
        const visual = p.image
          ? `<img src="${esc(p.image)}" alt="Preview of ${esc(p.title)}" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has-img');this.remove()">`
          : '';
        return `
        <article class="mission-card reveal" style="--d:${(i % 2) * 120}ms" data-tilt>
          <div class="card-glare"></div>
          <header class="mission-head">
            <span class="mission-code">PROJECT ${esc(p.code)}</span>
            <span class="mission-status${live ? ' live' : ''}"><i></i>${live ? 'LIVE' : 'LOGGED'}</span>
          </header>
          <div class="mission-visual${p.image ? ' has-img' : ''}" aria-hidden="${p.image ? 'false' : 'true'}">
            ${visual}
            <span class="mv-orbit"></span><span class="mv-orbit o2"></span><span class="mv-core">${esc(p.code)}</span>
            <span class="mv-scan"></span>
          </div>
          <h3 class="mission-title">${esc(p.title)}</h3>
          <p class="mission-desc">${esc(p.description)}</p>
          <ul class="mission-tech" aria-label="Technologies">${p.tech.map((t) => '<li>' + esc(t) + '</li>').join('')}</ul>
          <div class="mission-links">
            ${btn(p.demo, '<span>VIEW PROJECT</span>', 'btn-solid', '<span>DEMO SOON</span>')}
            ${btn(p.github, '<span>GITHUB</span>', 'btn-ghost', '<span>CODE SOON</span>')}
          </div>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </article>`;
      }).join('');
    }

    renderCertificates() {
      const list = this.cfg.certificates || [];
      const grid = $('cert-grid');
      if (!list.length) {
        const slot = (n) => `
          <article class="cert-card is-placeholder reveal" style="--d:${n * 110}ms" aria-hidden="true">
            <div class="cert-preview"><span class="cp-empty">${ICON.lock}<b>SLOT ${String(n + 1).padStart(2, '0')}</b></span></div>
            <div class="cert-body">
              <span class="cert-index">CERT.${String(n + 1).padStart(2, '0')} // RESERVED</span>
              <span class="skel w80"></span><span class="skel w50"></span><span class="skel w65"></span>
            </div>
          </article>`;
        grid.innerHTML = `
          <div class="cert-empty reveal">
            <span class="ce-icon">${ICON.medal}</span>
            <div>
              <h3>CERTIFICATES COMING SOON</h3>
              <p>Verified achievements and course certificates will be displayed here.</p>
            </div>
            <span class="ce-chip"><i></i>STATUS: COLLECTING</span>
          </div>
          <div class="cert-cards">${slot(0)}${slot(1)}${slot(2)}</div>`;
        return;
      }
      grid.innerHTML = '<div class="cert-cards">' + list.map((ct, i) => `
        <article class="cert-card reveal" style="--d:${(i % 3) * 110}ms">
          <button class="cert-preview" type="button" data-cert="${i}" aria-label="View certificate: ${esc(ct.title)}">
            ${ct.image ? `<img src="${esc(ct.image)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.cert-preview').classList.add('img-missing');this.remove()">` : ''}
            <span class="cp-empty">${ICON.medal}<b>PREVIEW</b></span>
            <span class="cp-zoom">VIEW</span>
          </button>
          <div class="cert-body">
            <span class="cert-index">CERT.${String(i + 1).padStart(2, '0')}</span>
            <h3 class="cert-title">${esc(ct.title)}</h3>
            <dl class="cert-meta">
              ${ct.issuer ? '<div><dt>ISSUER</dt><dd>' + esc(ct.issuer) + '</dd></div>' : ''}
              ${ct.date ? '<div><dt>DATE</dt><dd>' + esc(ct.date) + '</dd></div>' : ''}
            </dl>
            ${ct.credential ? '<p class="cert-cred">' + esc(ct.credential) + '</p>' : ''}
            <div class="cert-actions">
              <button class="btn btn-solid sm" type="button" data-cert="${i}"><span>VIEW CERTIFICATE</span></button>
            </div>
          </div>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </article>`).join('') + '</div>';
      grid.querySelectorAll('.cert-preview').forEach((b) => { if (!b.querySelector('img')) b.classList.add('img-missing'); });
    }

    renderContact() {
      const ct = this.cfg.contact;
      const cards = [];
      if (ct.instagram && real(ct.instagram.url)) cards.push({ k: 'instagram', label: 'INSTAGRAM', value: ct.instagram.handle, hint: 'Send a direct message', url: ct.instagram.url });
      if (ct.whatsapp && real(ct.whatsapp.url)) cards.push({ k: 'whatsapp', label: 'WHATSAPP', value: ct.whatsapp.display, hint: 'Start a chat', url: ct.whatsapp.url });
      $('contact-cards').innerHTML = cards.map((c, i) => `
        <a class="contact-card cc-${c.k} reveal" style="--d:${i * 120}ms" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="${c.label}: ${esc(c.value)} (opens in a new tab)">
          <span class="cc-icon">${ICON[c.k]}</span>
          <span class="cc-text"><small>${c.label}</small><b>${esc(c.value)}</b><em>${c.hint}</em></span>
          <span class="cc-cta">${c.label} ${ICON.arrow}</span>
          <span class="cc-glare" aria-hidden="true"></span>
          <span class="card-corner tl"></span><span class="card-corner br"></span>
        </a>`).join('');

      const socials = [];
      if (real(ct.github)) socials.push(['GitHub', ct.github, 'github']);
      if (real(ct.linkedin)) socials.push(['LinkedIn', ct.linkedin, 'linkedin']);
      $('contact-socials').innerHTML = socials.map((s) =>
        '<li><a class="social-link" href="' + esc(s[1]) + '" target="_blank" rel="noopener noreferrer">' + ICON[s[2]] + '<span>' + esc(s[0]) + '</span><i>-&gt;</i></a></li>').join('');

      const mail = $('contact-email');
      if (real(ct.email)) {
        mail.hidden = false;
        mail.href = 'mailto:' + ct.email;
        mail.querySelector('span').textContent = ct.email;
      }
    }

    renderFooter() {
      const o = this.cfg.owner, ct = this.cfg.contact;
      const links = [];
      if (ct.instagram && real(ct.instagram.url)) links.push(['Instagram', ct.instagram.url, 'instagram']);
      if (ct.whatsapp && real(ct.whatsapp.url)) links.push(['WhatsApp', ct.whatsapp.url, 'whatsapp']);
      if (real(ct.github)) links.push(['GitHub', ct.github, 'github']);
      if (real(ct.linkedin)) links.push(['LinkedIn', ct.linkedin, 'linkedin']);
      $('footer-links').innerHTML = links.map((l) =>
        '<li><a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + ICON[l[2]] + '<span>' + l[0] + '</span></a></li>').join('');
      $('footer-brand').textContent = o.name;
      $('footer-info').innerHTML = esc(o.major) + ' Student<br />' + esc(o.university);
      $('footer-name').textContent = o.name.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
      $('footer-year').textContent = Math.max(2026, new Date().getFullYear());
    }

    /* ================================================================
     *  INTERACTIONS
     * ================================================================ */
    bindReveal() {
      const els = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      els.forEach((e) => io.observe(e));
      // section-level "transition": glowing divider + heading sweep
      const sio = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('section-in'); sio.unobserve(en.target); } });
      }, { threshold: 0.08 });
      document.querySelectorAll('main .section').forEach((s) => sio.observe(s));
    }

    bindTilt() {
      if (!this.fine) return;
      const max = this.reduced ? 3 : 10;
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
      // glare position for contact cards
      document.querySelectorAll('.contact-card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
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

    bindCertificates() {
      $('cert-grid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cert]');
        if (!b) return;
        const ct = this.cfg.certificates[+b.dataset.cert];
        if (!ct) return;
        const hasImg = !!ct.image && !b.closest('.cert-card').querySelector('.img-missing');
        const meta = [ct.issuer && ['ISSUER', ct.issuer], ct.date && ['DATE', ct.date]].filter(Boolean)
          .map((m) => '<div><dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd></div>').join('');
        this.modal.open(`
          <div class="lb-media">${hasImg
            ? `<img src="${esc(ct.image)}" alt="Certificate: ${esc(ct.title)}" decoding="async">`
            : `<div class="lb-missing">${ICON.medal}<span>CERTIFICATE IMAGE NOT AVAILABLE YET</span></div>`}</div>
          <div class="lb-info">
            <span class="cert-index">CERTIFICATE // RECORD</span>
            <h3 id="modal-title">${esc(ct.title)}</h3>
            <dl class="cert-meta">${meta}</dl>
            ${ct.credential ? '<p class="cert-cred">' + esc(ct.credential) + '</p>' : ''}
            <div class="lb-actions">
              ${hasImg ? `<a class="btn btn-ghost sm" href="${esc(ct.image)}" target="_blank" rel="noopener"><span>OPEN FULL SIZE</span></a>` : ''}
              ${real(ct.url) ? `<a class="btn btn-solid sm" href="${esc(ct.url)}" target="_blank" rel="noopener noreferrer"><span>VERIFY CREDENTIAL</span></a>` : ''}
            </div>
          </div>`, 'lightbox');
      });
    }

    setupCV() {
      const cv = this.cfg.cv || {};
      const view = $('cv-view'), dl = $('cv-download');
      const status = $('cv-status');
      const set = (state) => {
        this.cvState = state;
        status.dataset.state = state;
        status.querySelector('span').textContent = {
          checking: 'CHECKING FILE…',
          ready: 'FILE ONLINE // PDF READY',
          missing: 'CV IS BEING PREPARED // AVAILABLE SOON',
          unknown: 'PDF DOCUMENT'
        }[state];
        [view, dl].forEach((a) => a.classList.toggle('is-pending', state === 'missing'));
      };
      if (!cv.file) { set('missing'); }
      else {
        view.href = cv.file;
        dl.href = cv.file;
        dl.setAttribute('download', cv.downloadName || '');
        set('checking');
        if (/^https?:$/.test(location.protocol) && window.fetch) {
          fetch(cv.file, { method: 'HEAD', cache: 'no-store' })
            .then((r) => {
              const type = r.headers.get('content-type') || '';
              set(r.ok && !/text\/html/i.test(type) ? 'ready' : 'missing');
            })
            .catch(() => set('missing'));
        } else set('unknown');   // file:// cannot be probed; let the browser try
      }
      const guard = (e) => {
        if (this.cvState !== 'missing' && this.cvState !== 'checking') return;
        e.preventDefault();
        this.modal.open(`
          <div class="msg">
            <span class="msg-icon">${ICON.doc}</span>
            <span class="cert-index">SYSTEM NOTICE // DOSSIER</span>
            <h3 id="modal-title">CV IS BEING PREPARED</h3>
            <p>The latest CV of ${esc(this.cfg.owner.name.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()))} has not been uploaded yet. Please check back soon, or get in touch directly.</p>
            <div class="lb-actions"><a class="btn btn-solid sm" href="#contact" data-close><span>CONTACT ME</span></a></div>
          </div>`, 'message');
      };
      view.addEventListener('click', guard);
      dl.addEventListener('click', guard);
    }

    /* called once when the portfolio becomes visible */
    onEnter() {
      if (this.typedStarted) return;
      this.typedStarted = true;
      const el = document.querySelector('#hero-tagline .typed');
      const text = this.cfg.owner.tagline;
      if (this.reduced) { el.textContent = text; return; }
      el.textContent = '';
      let i = 0;
      const step = () => {
        i++;
        el.textContent = text.slice(0, i);
        if (i < text.length) this.typeTimer = setTimeout(step, 34 + Math.random() * 40);
        else el.parentNode.classList.add('typed-done');
      };
      this.typeTimer = setTimeout(step, 1100);
    }

    /* per-frame (portfolio mode): parallax, scroll progress, hologram profile */
    update() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - this.lastT) / 1000);
      this.lastT = now;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (this.progress) this.progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ')';
      if (this.profile) this.profile.update(dt);
      if (this.reduced) return;
      const vh = innerHeight;
      for (const el of this.parallaxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const k = ((r.top + r.height / 2) - vh / 2) / vh;
        el.style.setProperty('--p', k.toFixed(4));
      }
    }
  }

  MRV.Portfolio = Portfolio;
})(window.MRV = window.MRV || {});
