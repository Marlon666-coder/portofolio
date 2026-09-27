/* =====================================================================
 *  MRV SCENE — GIANT SUN
 *  Plasma surface (fbm + granulation), impact / crack energy waves,
 *  corona billboard with animated rays and prominence particles.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class Sun {
    constructor(ctx) {
      this.ctx = ctx;
      this.center = [0, 0, -420];
      this.radius = 60;
    }

    /* s.sun = { wave, crack, crackR, critical, shake, pulse, heat, corona, flare, impactDir } */
    draw(f, s) {
      const { glw, P, meshes, fx, Q } = this.ctx;
      const u = s.sun;
      glw.opaque();
      glw.use(P.sun, {
        uVP: f.vp, uCenter: this.center, uRadius: this.radius, uTime: f.time, uShake: u.shake, uPulse: u.pulse,
        uCamPos: f.camPos, uImpactDir: u.impactDir, uWave: u.wave, uCrack: u.crack, uCrackR: u.crackR,
        uCritical: u.critical, uHeat: u.heat
      });
      glw.draw(meshes.sphere);

      // corona halo
      glw.additive(true);
      const size = this.radius * 4.2 * u.pulse;
      glw.use(P.corona, {
        uVP: f.vp, uPos: this.center, uRight: f.right, uUp: f.up, uSize: size,
        uTime: f.time, uIntensity: u.corona, uSR: size / (this.radius * u.pulse), uColor: [1.0, 0.42, 0.1]
      });
      glw.draw(meshes.quad);

      // prominences / solar flare particles
      fx.draw(f, {
        type: MRV.FxParticles.TYPE.FLARE, n: Q.flares, time: f.time, origin: this.center,
        scale: this.radius * u.pulse, intensity: 0.6 + u.flare * 0.6, param: [u.flare, 0, 0, 0]
      });
    }
  }

  MRV.Sun = Sun;
})(window.MRV = window.MRV || {});
