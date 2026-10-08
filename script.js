/* =====================================================================
 *  MARLO RIZKY VALENTINO — THE DIGITAL UNIVERSE
 *  Bootstrap: quality detection → loader → WebGL (or Canvas fallback)
 *  → cinematic timeline → holographic portfolio. One rAF loop drives
 *  everything (3D, HUD, cursor, parallax).
 *
 *  Debug URL params:
 *    ?skip        go straight to the portfolio
 *    ?t=24        start the cinematic at 24s
 *    ?freeze      freeze time (for screenshots, use with ?t=)
 *    ?q=mobile    force quality tier: desktop | laptop | tablet | mobile
 *    ?fallback    force the Canvas 2D fallback
 * ===================================================================== */
(function (MRV) {
  'use strict';

  const cfg = window.MRV_CONFIG;
  MRV.config = cfg;
  const M = MRV.M;
  const params = new URLSearchParams(location.search);
  const html = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debug = params.has('t') || params.has('freeze') || params.has('q');

  /* ------------------------------------------------------------------
   *  QUALITY TIERS
   * ------------------------------------------------------------------ */
  const TIERS = {
    desktop: { dprCap: 1.5, scale: 1, minScale: 0.55, stars: 7000, dust: 1600, flares: 1400, trail: 900, charge: 500, beamParticles: 500, sparks: 400, fire: 7000, debris: 2200, embers: 2600, holo: 11000, coreParticles: 700, ambient: 700, fbm: 5, rb: 12, sphere: [96, 64], streak: true },
    laptop: { dprCap: 1.25, scale: 1, minScale: 0.5, stars: 5500, dust: 1200, flares: 1100, trail: 700, charge: 400, beamParticles: 400, sparks: 300, fire: 5200, debris: 1600, embers: 2000, holo: 9000, coreParticles: 550, ambient: 550, fbm: 5, rb: 10, sphere: [84, 56], streak: true },
    tablet: { dprCap: 1.25, scale: 0.85, minScale: 0.5, stars: 3800, dust: 800, flares: 700, trail: 450, charge: 280, beamParticles: 280, sparks: 200, fire: 3000, debris: 1000, embers: 1200, holo: 6500, coreParticles: 380, ambient: 380, fbm: 4, rb: 8, sphere: [72, 48], streak: true },
    mobile: { dprCap: 1.25, scale: 0.75, minScale: 0.45, stars: 2600, dust: 500, flares: 450, trail: 300, charge: 200, beamParticles: 200, sparks: 140, fire: 1900, debris: 650, embers: 700, holo: 4800, coreParticles: 260, ambient: 260, fbm: 3, rb: 6, sphere: [60, 40], streak: false }
  };

  function detectTier() {
    const forced = params.get('q');
    if (forced && TIERS[forced]) return forced;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const minSide = Math.min(screen.width, screen.height);
    let tier;
    if (coarse && minSide < 600) tier = 'mobile';
    else if (coarse) tier = 'tablet';
    else if (innerWidth < 1600 || (navigator.hardwareConcurrency || 8) <= 4) tier = 'laptop';
    else tier = 'desktop';
    const order = ['mobile', 'tablet', 'laptop', 'desktop'];
    const weak = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
    if (weak && tier !== 'mobile') tier = order[order.indexOf(tier) - 1];
    return tier;
  }

  const tierName = detectTier();
  const Q = Object.assign({}, TIERS[tierName]);
  if (reducedMotion) {
    ['fire', 'debris', 'embers', 'dust', 'flares', 'sparks', 'trail', 'ambient', 'coreParticles'].forEach((k) => { Q[k] = Math.round(Q[k] * 0.55); });
    Q.rb = Math.max(4, Q.rb >> 1);
  }
  html.dataset.tier = tierName;
  if (reducedMotion) html.classList.add('reduced-motion');

  /* ------------------------------------------------------------------
   *  UI SETUP (works for both WebGL and fallback paths)
   * ------------------------------------------------------------------ */
  const portfolio = new MRV.Portfolio(cfg, { reducedMotion, mobile: tierName === 'mobile' });
  const nav = new MRV.Nav();
  const cursor = new MRV.Cursor();
  const sound = new MRV.Sound(document.getElementById('sound-btn'));
  const hud = new MRV.HUD();
  const loader = new MRV.Loader();
  const anchor = document.getElementById('core-anchor');
  const skipBtn = document.getElementById('skip-btn');
  const replayBtn = document.getElementById('replay-btn');
  const wipe = document.getElementById('wipe');

  let renderer = null, director = null, pscene = null, fallback = null;
  let mode = 'loading';           // loading | intro | portfolio
  let introT = 0;
  let introStartT = 0;
  let introDone = false;
  let lastNow = performance.now();
  let clock = 0;
  const freeze = params.has('freeze');
  const timeScale = (cfg.intro && cfg.intro.timeScale) || 1;
  const introEnabled = !(cfg.intro && cfg.intro.enabled === false) && !params.has('skip');

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------------
   *  CUES (HUD + SOUND) — WebGL cinematic
   * ------------------------------------------------------------------ */
  function registerCues(d) {
    const c = (t, id, data) => d.cue(t, id, data);
    c(0.6, 'init'); c(2.7, 'clear'); c(3.4, 'welcome'); c(6.7, 'clear');
    c(6.9, 'reticle-ship'); c(9.3, 'reticle-off'); c(9.55, 'sfx:flyby');
    c(11.6, 'reticle-sun'); c(12.0, 'sub', 'APPROACH VECTOR LOCKED // HELIOS PRIME'); c(14.6, 'reticle-off'); c(14.9, 'sub-clear');
    c(15.6, 'energy-on'); c(15.8, 'sfx:charge');
    c(16.3, 'energy', 12); c(17.3, 'energy', 47); c(18.3, 'energy', 83); c(19.2, 'energy', 100);
    c(19.8, 'fire'); c(19.8, 'sfx:fire'); c(20.15, 'sfx:impact'); c(20.7, 'fire-off');
    c(20.5, 'sub', 'IMPACT CONFIRMED'); c(21.5, 'sub', 'ENERGY PROPAGATION DETECTED'); c(22.9, 'sub-clear');
    c(23.0, 'instability'); c(23.0, 'sfx:alarm'); c(24.45, 'hud-off'); c(24.5, 'sfx:explosion');
    c(29.0, 'sfx:holo'); c(33.3, 'identity'); c(33.6, 'role'); c(34.4, 'online'); c(34.4, 'sfx:online');
    c(36.0, 'identity-off'); c(36.0, 'portfolio');
  }

  function onCue(id, data, silent) {
    if (id.startsWith('sfx:')) { if (!silent) sound.play(id.slice(4)); return; }
    if (id === 'portfolio') { enterPortfolio(); return; }
    if (id === 'title') { fallback && fallback.setTitle(data, 'mrv'); return; }
    if (id === 'title-name') { fallback && fallback.setTitle(cfg.owner.name, 'name'); hud.handle('identity', null, introT); return; }
    hud.handle(id, data, introT);
  }

  /* ------------------------------------------------------------------
   *  MODE TRANSITIONS
   * ------------------------------------------------------------------ */
  /* In portfolio mode the sound toggle lives inside the navbar so it never
   * covers page content; during the intro it floats above the HUD. */
  function dockSound(inNav) {
    const btn = document.getElementById('sound-btn');
    const nav = document.getElementById('nav');
    if (!btn || !nav) return;
    if (inNav && btn.parentNode !== nav) nav.insertBefore(btn, document.getElementById('nav-toggle'));
    else if (!inNav && btn.parentNode === nav) body.insertBefore(btn, document.getElementById('cursor-dot'));
  }

  function enterIntro(t0) {
    mode = 'intro';
    introDone = false;
    introT = t0 || 0;
    introStartT = introT;
    body.classList.remove('is-loading', 'is-portfolio');
    body.classList.add('is-intro');
    dockSound(false);
    window.scrollTo(0, 0);
    hud.reset();
    if (director) {
      director.reset();
      director.process(-1, introT, onCue, introT);
    }
    if (renderer) renderer.ship.trail.clear();
  }

  function enterPortfolio() {
    if (mode === 'portfolio') return;
    mode = 'portfolio';
    body.classList.remove('is-loading', 'is-intro');
    body.classList.add('is-portfolio');
    dockSound(true);
    hud.root.classList.add('hud-off');
    if (fallback) fallback.title.classList.remove('on');
    portfolio.onEnter();
    const hash = location.hash && document.getElementById(location.hash.slice(1));
    if (hash && hash.id !== 'home') setTimeout(() => hash.scrollIntoView(), 60);
  }

  function skipIntro() {
    if (mode !== 'intro') return;
    wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
    const target = fallback ? MRV.Fallback.cues[MRV.Fallback.cues.length - 1][0] : MRV.Director.T.portfolio;
    setTimeout(() => {
      if (mode !== 'intro') return;
      introT = Math.max(introT, target - 0.01);
      if (director) director.process(-1, introT, onCue, introT + 1);
      else processFallbackCues(introT, true);
    }, 260);
  }

  function replayIntro() {
    wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
    setTimeout(() => {
      fallbackFired = new Set();
      enterIntro(0);
    }, 260);
  }

  skipBtn.addEventListener('click', skipIntro);
  replayBtn.addEventListener('click', replayIntro);
  window.addEventListener('keydown', (e) => { if (mode === 'intro' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); skipIntro(); } });

  /* ------------------------------------------------------------------
   *  FALLBACK PATH
   * ------------------------------------------------------------------ */
  let fallbackFired = new Set();
  function processFallbackCues(t, silent) {
    MRV.Fallback.cues.forEach((c, i) => {
      if (!fallbackFired.has(i) && c[0] <= t) { fallbackFired.add(i); onCue(c[1], c[2], silent); }
    });
  }

  function startFallback(reason) {
    if (reason) console.info('[MRV] using Canvas fallback:', reason);
    if (renderer) { try { renderer.canvas.hidden = true; } catch (e) { /* ignore */ } }
    renderer = null; director = null; pscene = null;
    fallback = new MRV.Fallback(document.getElementById('fallback-canvas'), { reducedMotion, mobile: tierName === 'mobile' });
  }

  /* ------------------------------------------------------------------
   *  BOOT
   * ------------------------------------------------------------------ */
  async function boot() {
    const useFallback = params.has('fallback');
    loader.set(0);
    loader.line('INITIALIZING DIGITAL UNIVERSE...');
    await nextFrame();
    if (!useFallback) {
      try {
        const canvas = document.getElementById('universe');
        renderer = new MRV.Renderer(canvas, Q);
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          startFallback('WebGL context lost');
          if (mode === 'intro') skipIntro();
        });
        await loader.tween(0.18, 260);
        renderer.initPrograms();
        loader.line('LOADING SPACECRAFT...');
        await loader.tween(0.42, 260);
        renderer.initMeshes();
        loader.line('LOADING CORE...');
        await loader.tween(0.64, 260);
        renderer.initScene();
        renderer.resize(innerWidth, innerHeight);
        director = new MRV.Director({ reducedMotion });
        registerCues(director);
        pscene = new MRV.PortfolioScene(renderer, { reducedMotion });
        loader.line('LOADING SYSTEM...');
        await loader.tween(0.82, 240);
        if (document.fonts && document.fonts.load) {
          await Promise.race([document.fonts.load('900 100px "Orbitron"'), wait(1500)]).catch(() => {});
        }
        if (!renderer.buildHologram()) console.warn('[MRV] hologram text sampling returned no points');
        // warm-up: render a few key moments so every shader is compiled before the show
        [4, 17, 21, 26, 31].forEach((t) => {
          const s = director.state(t);
          if (!s.world) pscene.apply(s, t, 0.016, { mouse: { x: 0, y: 0 }, scrollY: 0, anchor: null }, 0);
          renderer.render(s, t);
        });
        const gl = renderer.glw.gl;
        const err = gl.getError();
        if (err && err !== gl.CONTEXT_LOST_WEBGL) console.warn('[MRV] GL warm-up error code', err);
      } catch (e) {
        console.warn('[MRV] WebGL init failed:', e && e.message ? e.message : e);
        startFallback('WebGL init failed');
      }
    } else startFallback('forced by ?fallback');

    if (!renderer && !fallback) startFallback('no renderer');
    await loader.tween(1, 300);
    await loader.online();
    loader.hide();

    const startT = parseFloat(params.get('t'));
    if (introEnabled) enterIntro(isFinite(startT) ? startT : 0);
    else { introT = 999; introDone = true; if (director) director.process(-1, 1e9, onCue, 1e9); enterPortfolio(); }
    lastNow = performance.now();
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------
   *  ADAPTIVE RESOLUTION + PERFORMANCE GUARD
   * ------------------------------------------------------------------ */
  const perf = { acc: 0, frames: 0, slowChecks: 0 };
  function adaptPerformance(dt) {
    if (!renderer) return;
    perf.acc += dt; perf.frames++;
    if (perf.acc < 1.5) return;
    const fps = perf.frames / perf.acc;
    perf.acc = 0; perf.frames = 0;
    const s = renderer.scale;
    if (fps < 42 && s > Q.minScale) renderer.setScale(Math.max(Q.minScale, +(s - 0.12).toFixed(2)));
    else if (fps > 57 && s < Q.scale) renderer.setScale(Math.min(Q.scale, +(s + 0.06).toFixed(2)));
    if (!debug && mode === 'intro' && fps < 12 && renderer.scale <= Q.minScale + 0.001) {
      if (++perf.slowChecks >= 3) skipIntro();
    } else perf.slowChecks = 0;
  }

  /* ------------------------------------------------------------------
   *  MAIN LOOP
   * ------------------------------------------------------------------ */
  let hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; lastNow = performance.now(); });

  function loop(now) {
    requestAnimationFrame(loop);
    if (hidden) return;
    let dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (freeze) dt = 0;
    clock += dt || (freeze ? 0 : 0.016);

    cursor.update(dt || 0.016);
    const mouse = { x: cursor.sx, y: cursor.sy };

    if (mode === 'intro') {
      const prev = introT;
      introT += dt * timeScale;
      if (director) director.process(prev, introT, onCue);
      else processFallbackCues(introT, false);
    }

    try {
      if (renderer) frameWebGL(dt, mouse);
      else if (fallback) {
        fallback.draw(mode === 'intro' ? introT : -1, dt, mouse, scrollY);
        if (mode === 'intro') hud.update(introT, {});
      }
    } catch (e) {
      console.warn('[MRV] render error, switching to fallback:', e && e.message ? e.message : e);
      startFallback('render error');
    }

    if (mode === 'portfolio') portfolio.update();
    adaptPerformance(dt);
  }

  function frameWebGL(dt, mouse) {
    let s;
    const input = { mouse, scrollY: mode === 'portfolio' ? scrollY : 0, anchor: anchor.getBoundingClientRect() };
    if (!introDone && introT < MRV.Director.T.end) {
      s = director.state(introT);
      if (!s.world) pscene.apply(s, clock, dt, input, s.pf);
    } else {
      introDone = true;
      s = {
        world: false, reveal: 1, starReveal: 1, nebula: 0.55, dust: 0.5, sunPos: [0, 0, -420], sunGlow: 0,
        holo: null, sun: { visible: false }, te: -1
      };
      pscene.apply(s, clock, dt, input, 1);
      s.post = pscene.post();
    }
    renderer.update(dt, s);
    renderer.render(s, s.world ? introT : clock);

    if (mode === 'intro') {
      const ship = renderer.project(renderer.ship.nose);
      const sun = renderer.project(renderer.sun.center);
      const edge = renderer.project(M.add(renderer.sun.center, M.scale(renderer.frame.up, renderer.sun.radius)));
      hud.update(introT, { shipScreen: ship, sunScreen: sun, sunRadiusPx: Math.abs(edge.y - sun.y), camPos: s.cam.pos });
    }
  }

  /* ------------------------------------------------------------------
   *  RESIZE
   * ------------------------------------------------------------------ */
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    if (renderer) {
      const aspectChanged = renderer.resize(innerWidth, innerHeight);
      if (aspectChanged) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderer && renderer.buildHologram(), 250);
      }
    }
    if (fallback) fallback.resize();
  });

  boot();
})(window.MRV = window.MRV || {});
