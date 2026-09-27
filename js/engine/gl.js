/* =====================================================================
 *  MRV ENGINE — WebGL2 WRAPPER
 *  Programs (with automatic typed uniform setters), VAOs, render
 *  targets, textures and blend-state helpers. No external dependencies.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  class GLW {
    constructor(canvas) {
      const gl = canvas.getContext('webgl2', {
        antialias: false, alpha: false, depth: true, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance'
      });
      if (!gl) throw new Error('WebGL2 unavailable');
      this.gl = gl;
      this.canvas = canvas;
      this.floatRT = !!gl.getExtension('EXT_color_buffer_float');
      if (!this.floatRT) this.floatRT = !!gl.getExtension('EXT_color_buffer_half_float');
      this.programs = [];
    }

    /* ---------- shaders ---------- */
    compile(type, src, name) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        const log = gl.getShaderInfoLog(sh);
        const numbered = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
        console.warn('[MRV] shader source (' + name + ')\n' + numbered);
        throw new Error('Shader compile error in "' + name + '": ' + log);
      }
      return sh;
    }

    program(vs, fs, name) {
      const gl = this.gl;
      const p = gl.createProgram();
      gl.attachShader(p, this.compile(gl.VERTEX_SHADER, vs, name + '.vs'));
      gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs, name + '.fs'));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error('Program link error in "' + name + '": ' + gl.getProgramInfoLog(p));
      }
      const uniforms = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const key = info.name.replace(/\[0\]$/, '');
        uniforms[key] = { loc: gl.getUniformLocation(p, info.name), type: info.type };
      }
      const prog = { p, u: uniforms, name };
      this.programs.push(prog);
      return prog;
    }

    use(prog, uniforms) {
      this.gl.useProgram(prog.p);
      if (uniforms) this.set(prog, uniforms);
    }

    /* Set uniforms by name; the GL type is detected automatically. */
    set(prog, obj) {
      const gl = this.gl;
      for (const k in obj) {
        const u = prog.u[k];
        if (!u) continue;
        const v = obj[k];
        switch (u.type) {
          case gl.FLOAT: gl.uniform1f(u.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
          case gl.INT: case gl.BOOL: case gl.SAMPLER_2D: gl.uniform1i(u.loc, v); break;
          default: break;
        }
      }
    }

    /* ---------- geometry ----------
     * attribs: [{ loc, data: Float32Array, size, divisor? , dynamic? }] */
    vao(attribs, indices) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buffers = {};
      for (const a of attribs) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, a.data, a.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        gl.enableVertexAttribArray(a.loc);
        gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, a.stride || 0, a.offset || 0);
        if (a.divisor) gl.vertexAttribDivisor(a.loc, a.divisor);
        buffers[a.loc] = buf;
        // interleaved extras sharing the same buffer
        if (a.extra) {
          for (const e of a.extra) {
            gl.enableVertexAttribArray(e.loc);
            gl.vertexAttribPointer(e.loc, e.size, gl.FLOAT, false, a.stride, e.offset);
            if (a.divisor) gl.vertexAttribDivisor(e.loc, a.divisor);
          }
        }
      }
      let indexType = 0;
      if (indices) {
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        indexType = indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      }
      gl.bindVertexArray(null);
      return { vao, buffers, indexType };
    }

    /* Mesh from geometry {positions, normals?, uvs?, colors?, indices?} */
    mesh(geo, mode) {
      const gl = this.gl;
      const attribs = [{ loc: 0, data: geo.positions, size: geo.posSize || 3 }];
      if (geo.normals) attribs.push({ loc: 1, data: geo.normals, size: 3 });
      if (geo.uvs) attribs.push({ loc: 2, data: geo.uvs, size: 2 });
      if (geo.colors) attribs.push({ loc: 3, data: geo.colors, size: 4 });
      const v = this.vao(attribs, geo.indices);
      return {
        vao: v.vao, buffers: v.buffers, indexType: v.indexType,
        count: geo.indices ? geo.indices.length : geo.positions.length / (geo.posSize || 3),
        mode: mode === undefined ? gl.TRIANGLES : mode
      };
    }

    draw(mesh, instances) {
      const gl = this.gl;
      gl.bindVertexArray(mesh.vao);
      if (mesh.indexType) {
        if (instances) gl.drawElementsInstanced(mesh.mode, mesh.count, mesh.indexType, 0, instances);
        else gl.drawElements(mesh.mode, mesh.count, mesh.indexType, 0);
      } else if (instances) gl.drawArraysInstanced(mesh.mode, 0, mesh.count, instances);
      else gl.drawArrays(mesh.mode, 0, mesh.count);
    }

    /* ---------- render targets ---------- */
    target(w, h, opts) {
      const gl = this.gl;
      opts = opts || {};
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      let useFloat = !!opts.float && this.floatRT;
      const alloc = () => {
        if (useFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      };
      alloc();
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      let rb = null;
      if (opts.depth) {
        rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      }
      if (useFloat && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        useFloat = false;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        alloc();
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fb, tex, rb, w, h, float: useFloat };
    }

    freeTarget(t) {
      if (!t) return;
      const gl = this.gl;
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
      if (t.rb) gl.deleteRenderbuffer(t.rb);
    }

    bindTarget(t) {
      const gl = this.gl;
      if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
    }

    bindTex(unit, tex) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    textureFromCanvas(canvas) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }

    /* ---------- state presets ---------- */
    opaque() {
      const gl = this.gl;
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
    }
    additive(depthTest) {
      const gl = this.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.depthMask(false);
      if (depthTest === false) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
    }
    noDepth() {
      const gl = this.gl;
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
    }
  }

  MRV.GLW = GLW;
})(window.MRV = window.MRV || {});
