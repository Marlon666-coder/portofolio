/* =====================================================================
 *  MRV UI — SOUND DESIGN (procedural Web Audio, no asset files needed)
 *  Default OFF. Nothing is created until the user presses SOUND.
 *  If an AudioContext is not available the button shows "SOUND: N/A".
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Sound {
    constructor(button) {
      this.btn = button;
      this.enabled = false;
      this.ctx = null;
      this.supported = !!(window.AudioContext || window.webkitAudioContext);
      if (!this.supported) { button.textContent = 'SOUND: N/A'; button.disabled = true; return; }
      button.addEventListener('click', () => this.toggle());
      this.render();
    }

    render() {
      this.btn.textContent = 'SOUND: ' + (this.enabled ? 'ON' : 'OFF');
      this.btn.setAttribute('aria-pressed', String(this.enabled));
      this.btn.classList.toggle('on', this.enabled);
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp).connect(c.destination);
      // shared noise buffer
      const len = c.sampleRate * 2;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.35 + b * 2.2; }
      this.startAmbience();
    }

    toggle() {
      try {
        this.enabled = !this.enabled;
        if (this.enabled) {
          this.init();
          if (this.ctx.state === 'suspended') this.ctx.resume();
          this.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.4);
        } else if (this.ctx) {
          this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
        }
      } catch (e) {
        this.enabled = false;
        console.warn('[MRV] audio unavailable:', e.message);
      }
      this.render();
    }

    noise(loop) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf; s.loop = !!loop;
      return s;
    }

    env(g, t0, a, peak, dcy) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy);
    }

    startAmbience() {
      const c = this.ctx, t = c.currentTime;
      const g = c.createGain(); g.gain.value = 0.18; g.connect(this.master);
      [55, 82.4, 110.3].forEach((f, i) => {
        const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f;
        const og = c.createGain(); og.gain.value = i === 2 ? 0.05 : 0.22;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + i * 0.05;
        const lg = c.createGain(); lg.gain.value = 0.08; lfo.connect(lg).connect(og.gain);
        o.connect(og).connect(g); o.start(t); lfo.start(t);
      });
      const n = this.noise(true), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.7;
      const ng = c.createGain(); ng.gain.value = 0.12;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.05;
      const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency);
      n.connect(lp).connect(ng).connect(g); n.start(t); lfo.start(t);
    }

    /* Public cue entry point — silently ignored while muted. */
    play(id) {
      if (!this.enabled || !this.ctx) return;
      try { if (this[id]) this[id](); } catch (e) { /* never break the site for audio */ }
    }

    flyby() {
      const c = this.ctx, t = c.currentTime;
      const n = this.noise(), bp = c.createBiquadFilter(), g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.55); bp.frequency.exponentialRampToValueAtTime(180, t + 1.8);
      this.env(g, t, 0.5, 1.2, 1.4);
      let node = n.connect(bp).connect(g);
      if (pan) { pan.pan.setValueAtTime(-0.9, t); pan.pan.linearRampToValueAtTime(0.9, t + 1.2); node = node.connect(pan); }
      node.connect(this.master);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(70, t + 1.6);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      this.env(og, t, 0.45, 0.25, 1.2);
      o.connect(lp).connect(og).connect(this.master);
      n.start(t); n.stop(t + 2); o.start(t); o.stop(t + 2);
    }

    charge() {
      const c = this.ctx, t = c.currentTime, d = 3.9;
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(1300, t + d);
      o2.frequency.setValueAtTime(113, t); o2.frequency.exponentialRampToValueAtTime(1330, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1);
      const trem = c.createOscillator(), tg = c.createGain(); trem.frequency.setValueAtTime(6, t); trem.frequency.linearRampToValueAtTime(28, t + d); tg.gain.value = 0.08;
      trem.connect(tg).connect(g.gain);
      o.connect(g); o2.connect(g); g.connect(this.master);
      [o, o2, trem].forEach((x) => { x.start(t); x.stop(t + d + 0.2); });
    }

    fire() {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.9);
      this.env(g, t, 0.01, 0.5, 0.9);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1);
      // sustained beam hum
      const h = c.createOscillator(), hg = c.createGain(), lp = c.createBiquadFilter();
      h.type = 'square'; h.frequency.value = 72; lp.type = 'lowpass'; lp.frequency.value = 700;
      hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.16, t + 0.1);
      hg.gain.setValueAtTime(0.16, t + 2.2); hg.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      h.connect(lp).connect(hg).connect(this.master); h.start(t); h.stop(t + 2.9);
      const n = this.noise(), hp = c.createBiquadFilter(), ng = c.createGain();
      hp.type = 'highpass'; hp.frequency.value = 2500; this.env(ng, t, 0.005, 0.35, 0.4);
      n.connect(hp).connect(ng).connect(this.master); n.start(t); n.stop(t + 0.6);
    }

    impact() {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 1.2);
      this.env(g, t, 0.01, 0.9, 1.3);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.5);
      const n = this.noise(), lp = c.createBiquadFilter(), ng = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 900; this.env(ng, t, 0.02, 0.5, 2.5);
      n.connect(lp).connect(ng).connect(this.master); n.start(t); n.stop(t + 3);
    }

    alarm() {
      const c = this.ctx, t = c.currentTime;
      for (let i = 0; i < 6; i++) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.value = i % 2 ? 660 : 880;
        const s = t + i * 0.24;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.07, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
        o.connect(g).connect(this.master); o.start(s); o.stop(s + 0.22);
      }
      // rising rumble
      const n = this.noise(), lp = c.createBiquadFilter(), ng = c.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(120, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 1.5);
      ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.6, t + 1.45); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
      n.connect(lp).connect(ng).connect(this.master); n.start(t); n.stop(t + 1.6);
    }

    explosion() {
      const c = this.ctx, t = c.currentTime;
      const n = this.noise(), lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(90, t + 5);
      this.env(g, t, 0.02, 1.6, 5.5);
      n.loop = true;
      n.connect(lp).connect(g).connect(this.master); n.start(t); n.stop(t + 6);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(22, t + 4);
      this.env(og, t, 0.02, 1.4, 4.5);
      o.connect(og).connect(this.master); o.start(t); o.stop(t + 5);
    }

    holo() {
      const c = this.ctx, t = c.currentTime;
      [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const s = t + i * 0.18;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.06, s + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, s + 2.5);
        o.connect(g).connect(this.master); o.start(s); o.stop(s + 2.6);
      });
    }

    online() {
      const c = this.ctx, t = c.currentTime;
      [[880, 0], [1318.5, 0.14]].forEach(([f, d]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
        o.connect(g).connect(this.master); o.start(t + d); o.stop(t + d + 1);
      });
    }

    blip() {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.06);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
    }
  }

  MRV.Sound = Sound;
})(window.MRV = window.MRV || {});
