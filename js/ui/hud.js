/* =====================================================================
 *  MRV UI — CINEMATIC HUD
 *  Letterbox, telemetry, typed messages, target reticle, energy-core
 *  readout, instability warning and the final identity lines.
 *  Everything is frame-synced (driven from the main loop, no timers).
 * ===================================================================== */
(function (MRV) {
  'use strict';
  const $ = (id) => document.getElementById(id);

  class HUD {
    constructor() {
      this.root = $('intro-hud');
      this.el = {
        msg: $('hud-msg'), sub: $('hud-sub'), time: $('hud-time'), coords: $('hud-coords'),
        reticle: $('hud-reticle'), reticleLabel: $('hud-reticle-label'),
        energy: $('hud-energy'), energyPct: $('energy-pct'), energyFill: $('energy-fill'), energyState: $('energy-state'),
        warning: $('hud-warning'), warnPct: $('warn-pct'), fire: $('hud-fire'),
        identity: $('hud-identity'), role: $('hud-role'), online: $('hud-online')
      };
      this.typed = null;       // { el, text, start, cps }
      this.subTyped = null;
      this.reticleTarget = null;
      this.lastTimeUpdate = 0;
      this.warnStart = -1;
    }

    on(el, v) { if (el) el.classList.toggle('on', !!v); }

    type(el, text, t, cps, cls) {
      el.className = 'hud-text on ' + (cls || '');
      el.dataset.full = text;
      const rec = { el, text, start: t, cps: cps || 38 };
      if (el === this.el.msg) this.typed = rec; else this.subTyped = rec;
    }

    clear(el) {
      el.classList.remove('on');
      if (el === this.el.msg) this.typed = null; else this.subTyped = null;
    }

    reset() {
      this.root.classList.remove('hud-off');
      [this.el.energy, this.el.warning, this.el.fire, this.el.identity, this.el.role, this.el.online, this.el.reticle].forEach((e) => this.on(e, false));
      this.clear(this.el.msg); this.clear(this.el.sub);
      this.reticleTarget = null;
      this.warnStart = -1;
      this.setEnergy(0, 'STANDBY');
    }

    setEnergy(p, state) {
      this.el.energyPct.textContent = String(p).padStart(3, '0') + '%';
      this.el.energyFill.style.transform = 'scaleX(' + (p / 100) + ')';
      if (state) this.el.energyState.textContent = state;
      this.el.energy.classList.toggle('full', p >= 100);
    }

    /* Called by the Director cue system. */
    handle(id, data, t) {
      const E = this.el;
      switch (id) {
        case 'init': this.type(E.msg, 'INITIALIZING SYSTEM...', t, 30, 'mono'); break;
        case 'clear': this.clear(E.msg); break;
        case 'welcome': this.type(E.msg, 'WELCOME TO THE DIGITAL UNIVERSE', t, 34, 'title'); break;
        case 'reticle-ship': this.reticleTarget = 'ship'; E.reticleLabel.textContent = 'CONTACT // VESSEL MRV-01'; this.on(E.reticle, true); break;
        case 'reticle-sun': this.reticleTarget = 'sun'; E.reticleLabel.textContent = 'HELIOS PRIME // CLASS-G STAR'; this.on(E.reticle, true); E.reticle.classList.add('big'); break;
        case 'reticle-off': this.on(E.reticle, false); E.reticle.classList.remove('big'); this.reticleTarget = null; break;
        case 'sub': this.type(E.sub, data, t, 45, 'mono'); break;
        case 'sub-clear': this.clear(E.sub); break;
        case 'energy-on': this.on(E.energy, true); this.setEnergy(0, 'CHARGING WEAPON'); break;
        case 'energy': this.setEnergy(data, data >= 100 ? 'WEAPON READY' : 'CHARGING WEAPON'); break;
        case 'fire': this.on(E.fire, true); this.setEnergy(100, 'DISCHARGE'); break;
        case 'fire-off': this.on(E.fire, false); this.on(E.energy, false); break;
        case 'instability': this.on(E.warning, true); this.warnStart = t; break;
        case 'hud-off': this.on(E.warning, false); this.clear(E.sub); this.root.classList.add('hud-off'); break;
        case 'identity': this.on(E.identity, true); break;
        case 'role': this.on(E.role, true); break;
        case 'online': this.on(E.online, true); break;
        case 'identity-off': this.on(E.identity, false); break;
        default: break;
      }
    }

    tick(rec, t) {
      if (!rec) return;
      const n = Math.min(rec.text.length, Math.floor((t - rec.start) * rec.cps));
      const s = rec.text.slice(0, n);
      if (rec.el.textContent !== s + (n < rec.text.length ? '_' : '')) rec.el.textContent = s + (n < rec.text.length ? '_' : '');
    }

    /* info: { shipScreen, sunScreen, sunRadiusPx, camPos } */
    update(t, info) {
      this.tick(this.typed, t);
      this.tick(this.subTyped, t);
      if (t - this.lastTimeUpdate > 0.05 || t < this.lastTimeUpdate) {
        this.lastTimeUpdate = t;
        const mm = Math.floor(t / 60), ss = Math.floor(t % 60), cs = Math.floor((t % 1) * 100);
        this.el.time.textContent = 'T+' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
        if (info.camPos) {
          const c = info.camPos;
          this.el.coords.textContent = 'X ' + c[0].toFixed(1) + '  Y ' + c[1].toFixed(1) + '  Z ' + c[2].toFixed(1);
        }
      }
      if (this.warnStart >= 0) {
        const p = Math.min(100, Math.floor(((t - this.warnStart) / 1.2) * 100));
        this.el.warnPct.textContent = p + '%';
        this.el.warning.classList.toggle('critical', p >= 100);
      }
      const R = this.el.reticle;
      if (this.reticleTarget) {
        const sp = this.reticleTarget === 'ship' ? info.shipScreen : info.sunScreen;
        if (sp && sp.visible) {
          const size = this.reticleTarget === 'sun' ? Math.max(120, (info.sunRadiusPx || 100) * 2.1) : 74;
          R.style.transform = 'translate3d(' + (sp.x - size / 2).toFixed(1) + 'px,' + (sp.y - size / 2).toFixed(1) + 'px,0)';
          R.style.width = R.style.height = size.toFixed(0) + 'px';
          R.style.opacity = '';
        } else R.style.opacity = '0';
      }
    }
  }

  MRV.HUD = HUD;
})(window.MRV = window.MRV || {});
