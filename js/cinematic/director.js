/* =====================================================================
 *  MRV CINEMATIC — DIRECTOR (TIMELINE)
 *  The whole intro is a pure function of time t → scene state, which
 *  keeps every transition continuous (one camera, one timeline).
 *  Cues (HUD text, sound) fire once when t crosses their timestamp.
 *
 *  BLACK → SPACE → STARS → SHIP → FLYBY → GIANT SUN → CHARGE → BEAM →
 *  IMPACT → CORE INSTABILITY → SUPERNOVA → ENTER EXPLOSION →
 *  PARTICLES FORM "MRV" → FULL NAME → ROLE → SYSTEM ONLINE → PORTFOLIO
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const M = MRV.M;
  const { range, sr, pulse, clamp, easeOut, easeIn } = M;

  const T = {
    init: 0.6, welcome: 3.4, shipIn: 6.3, flyby: 10.15, chargeOn: 15.6, charge: 15.8, fire: 19.8, impact: 20.15,
    phase2: 21.4, phase3: 23.0, boom: 24.5, enter: 27.6, holoOn: 28.3, swap: 29.2, formMRV: 29.2, formName: 31.9,
    role: 33.6, online: 34.4, portfolio: 36.0, end: 37.6
  };

  const SUN_C = [0, 0, -420], SUN_R = 60;

  // spacecraft trajectory
  const shipPath = M.path([
    [6.3, [-52, 24, 540]],
    [8.5, [-18, 8, 250]],
    [9.7, [-4, 2, 72]],
    [10.2, [4.5, -1.6, 4]],
    [10.7, [5, -1.4, -58]],
    [12.3, [1.6, -0.5, -200]],
    [14.3, [0, 0, -284]],
    [15.6, [0, 0, -300], [0, 0, 0]],
    [19.8, [0, 0, -301]],
    [20.1, [0, 0.12, -297.5]],
    [21.2, [0, 0, -298.5]],
    [24.5, [0, 0, -298.5], [0, 0, 0]],
    [26.3, [8, 6, -262]],
    [28.4, [26, 15, -205]]
  ]);

  // camera position
  const camPath = M.path([
    [0, [0, 0.5, 0]],
    [5, [0, 0.5, 5]],
    [9.8, [0, 0.5, 9.8]],
    [10.6, [1.8, 1.4, 5]],
    [12.5, [-4, 4, -145]],
    [14.5, [-7, 4, -250]],
    [16.8, [-24, 4.5, -290]],
    [19.8, [-25.5, 4.8, -289]],
    [23.0, [-29, 5.5, -284]],
    [24.5, [-36, 7.5, -268]],
    [26.3, [-62, 18, -196]],
    [27.6, [-48, 14, -214]],
    [28.6, [-1, 0.2, -405]],
    [29.2, [0, 0, -440]]
  ]);
  // early look target (before tracking the ship) and late composition target
  const lookA = M.path([[0, [-45, -10, 100]], [6, [-30, -2, 110]], [9, [-12, 4, 120]]]);
  const lookB = M.path([[12.3, [0, 0, -260]], [15, [-1, -1, -335]], [23, [-2, -1, -345]], [24.5, [0, 0, -400]], [27.6, [0, 0, -420]], [29.2, [0, 0, -560]]]);

  class Director {
    constructor(opts) {
      this.reduced = !!opts.reducedMotion;
      this.motion = this.reduced ? 0.15 : 1;
      this.cues = [];
      this.fired = new Set();
      this.t = 0;
      this.T = T;
    }

    /* Register {t, id, data?}; handler receives (id, data, silent). */
    cue(t, id, data) { this.cues.push({ t, id, data }); }

    /* Fire cues crossed between prev and now. Cues before `silentBefore` are replayed silently (used by ?t= jumps). */
    process(prev, now, handler, silentBefore) {
      for (let i = 0; i < this.cues.length; i++) {
        const c = this.cues[i];
        if (this.fired.has(i)) continue;
        if (c.t <= now) {
          this.fired.add(i);
          handler(c.id, c.data, silentBefore !== undefined && c.t < silentBefore);
        }
      }
    }

    reset() { this.fired.clear(); }

    shake(t) {
      const te = t - T.boom;
      let a = 0.5 * pulse(t, T.flyby, 0.25) + 0.18 * pulse(t, T.fire + 0.05, 0.15) + 0.08 * range(t, T.impact, T.phase3) * (t < T.boom ? 1 : 0);
      a += 0.35 * sr(t, T.phase3, T.boom) * (t < T.boom ? 1 : 0);
      if (te > 0) a += 1.3 * Math.exp(-te * 1.1);
      a += 0.35 * range(t, T.enter, 28.6) * (t < T.swap ? 1 : 0);
      return a * this.motion;
    }

    state(t) {
      const s = {};
      const te = t - T.boom;
      s.t = t;
      s.te = te;
      s.world = t < T.swap;
      s.reveal = sr(t, 1.4, 5.5);
      s.starReveal = s.world ? s.reveal : 0.45 + 0.55 * sr(t, T.portfolio - 0.2, T.end);
      s.nebula = s.world ? 1 : 0.55 * sr(t, T.portfolio - 0.2, T.end);
      s.dust = s.world ? 0.8 * s.reveal : 0.5 * sr(t, T.portfolio, T.end);
      s.sunPos = SUN_C;
      s.sunGlow = s.world ? (t < T.boom ? 1 : Math.exp(-te * 0.4) * 2) : 0;

      // ---------------- spacecraft ----------------
      const sp = shipPath(t);
      const ahead = shipPath(t + 0.12), behind = shipPath(t - 0.06);
      let fwd = M.sub(ahead, behind);
      const speed = M.len(fwd) / 0.18;
      const settle = sr(t, 13.5, 15.8) * (1 - sr(t, T.boom + 0.2, T.boom + 1.5));
      fwd = M.len(fwd) < 0.05 ? [0, 0, -1] : M.norm(fwd);
      fwd = M.norm(M.mix(fwd, [0, 0, -1], settle));
      if (t > T.boom) {
        // tumbling from the blast wave
        const k = sr(t, T.boom, T.boom + 2.5);
        fwd = M.norm(M.rotateAxis([0, 0, -1], [1, 0, 0], k * 0.9 * this.motion + (1 - this.motion) * 0));
      }
      const bank = -0.9 * pulse(t, 10.4, 0.7) + 0.25 * pulse(t, 12.6, 0.9) + (t > T.boom ? sr(t, T.boom, 27) * 1.2 : 0);
      const up = M.rotateAxis([0, 1, 0], fwd, bank + Math.sin(t * 0.9) * 0.03);
      const engine = t < 14.2 ? 1.7 : (t < 15.8 ? M.lerp(1.7, 0.55, range(t, 14.2, 15.8)) : (t < T.boom ? 0.55 : 0.15));
      s.ship = {
        pos: sp, fwd, up, speed, visible: t > T.shipIn && t < T.swap, engine,
        orb: 0, fxLight: 0, muzzle: -1
      };

      // weapon charge
      const charge = range(t, T.charge, 19.6);
      s.charge = charge;
      if (t > T.charge - 0.2 && t < 22.6) {
        const pre = sr(t, T.charge - 0.2, 19.7);
        const post = t > T.fire ? 0.35 * (1 - sr(t, 22.0, 22.6)) : 0;
        const collapse = t > T.fire ? 1 - sr(t, T.fire, T.fire + 0.12) : 1;
        s.ship.orb = Math.max(pre * collapse, post);
        s.ship.fxLight = 4 * s.ship.orb;
      }
      s.ship.muzzle = range(t, T.fire, T.fire + 0.6);
      if (t < T.fire) s.ship.muzzle = -1;

      // beam
      const toShip = M.norm(M.sub([0, 0, -300], SUN_C));
      const beamOn = t >= T.fire && t < 22.6;
      s.beam = {
        intensity: beamOn ? (1 - sr(t, 22.0, 22.6)) * (0.9 + 0.1 * Math.sin(t * 90)) : 0,
        head: easeOut(range(t, T.fire, T.impact)),
        width: 1 + 0.6 * pulse(t, T.impact, 0.15),
        target: M.add(SUN_C, M.scale(toShip, SUN_R * 0.99)),
        normal: toShip
      };

      // ---------------- sun ----------------
      const wave = sr(t, T.impact, T.impact + 0.5) * (1 - sr(t, 23.6, T.boom));
      const critical = sr(t, T.phase3, 24.35);
      const implode = sr(t, 24.15, T.boom);
      s.sun = {
        visible: t < T.boom,
        impactDir: toShip,
        wave,
        crack: sr(t, T.phase2 - 0.1, 22.4),
        crackR: 3.3 * sr(t, T.phase2 - 0.2, 23.8),
        critical,
        shake: 0.3 * wave + 1.4 * critical,
        pulse: (1 + 0.012 * wave * Math.sin(t * 34) + 0.02 * critical * Math.sin(t * 55)) * (1 - 0.14 * implode),
        heat: wave + critical,
        corona: 1 + wave * 0.6 + sr(t, T.phase2, T.phase3) * 0.6 + critical * 2.2 + implode * 2,
        flare: wave * 1.2 + critical * 2
      };

      // sunlight on the ship
      const flash = te > 0 ? Math.exp(-te * 2.4) : 0;
      const li = 1 + critical * 1.5 + flash * 5;
      s.sunLight = [1.0 * li, 0.72 * li, 0.5 * li];

      // ---------------- camera ----------------
      let pos = camPath(t);
      let target;
      if (t < 11.5) target = M.mix(lookA(t), sp, sr(t, 6.9, 8.9));
      else target = M.mix(sp, lookB(t), sr(t, 12.3, 15.0));
      const shk = this.shake(t);
      if (shk > 0.001) {
        const j = (a, b) => (Math.sin(t * a) + Math.sin(t * b + 1.3) * 0.6);
        pos = M.add(pos, M.scale([j(37.1, 51.7), j(43.3, 29.1), j(31.7, 47.9)], 0.18 * shk));
        target = M.add(target, M.scale([j(23.3, 41.9), j(39.7, 27.3), 0], 0.9 * shk));
      }
      const roll = 0.1 * pulse(t, 10.35, 0.5) * this.motion;
      const dir = M.norm(M.sub(target, pos));
      const fov = 52 + 7 * pulse(t, T.flyby, 0.35) * this.motion + 36 * easeIn(range(t, T.enter, 28.9)) * (t < T.swap ? 1 : 0) + 4 * sr(t, T.phase3, T.boom);
      s.cam = { pos, target, up: M.rotateAxis([0, 1, 0], dir, roll), fov };

      // ---------------- explosion / whiteout ----------------
      const white = sr(t, 28.0, 28.7) * (1 - sr(t, T.swap, 30.2));
      const radial = (0.05 * pulse(t, T.flyby, 0.3) + (te > 0 ? 0.14 * Math.exp(-te * 1.3) : 0) + 0.22 * sr(t, T.enter, 28.6) * (1 - range(t, 28.6, T.swap))) * (this.reduced ? 0.3 : 1);
      s.post = {
        exposure: (1 + critical * 0.1) * (te > 0 && t < T.swap ? 1 - 0.3 * Math.exp(-te * 0.6) : 1),
        flash: Math.max(flash * 0.4, white) + 0.08 * pulse(t, T.fire, 0.08),
        flashColor: white > flash ? [0.85, 0.95, 1.0] : [1.0, 0.85, 0.7],
        radial,
        radialTarget: te > 0 ? SUN_C : null,
        aberr: 0.004 + 0.012 * pulse(t, T.flyby, 0.3) + (te > 0 ? 0.008 * Math.exp(-te) : 0) + 0.006 * critical,
        grain: 0.035,
        vignette: 1,
        heat: 0.6 + critical * 1.5,
        fade: 1 - sr(t, 0.0, 1.2),
        bloom: 1,
        streak: 1
      };

      // ---------------- hologram ----------------
      s.holo = {
        alpha: sr(t, T.holoOn, 29.3),
        holo: sr(t, 28.8, 30.2),
        p0: range(t, T.formMRV, 31.1),
        p1: range(t, T.formName, 33.5),
        disperse: sr(t, T.portfolio, T.end)
      };

      // ---------------- portfolio background fade-in ----------------
      s.pf = sr(t, T.portfolio - 0.2, T.end);
      return s;
    }
  }

  Director.T = T;
  MRV.Director = Director;
})(window.MRV = window.MRV || {});
