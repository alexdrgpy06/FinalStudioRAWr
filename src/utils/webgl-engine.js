
export class WebGLEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      this.gl = canvas.getContext('webgl');
      this.isWebGL2 = false;
    } else {
      this.isWebGL2 = true;
    }
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.program = this.createProgram(this.getVertexShaderSource(), this.getFragmentShaderSource());
    this.setupBuffers();
  }

  getVertexShaderSource() {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
  }

  getFragmentShaderSource() {
    if (this.isWebGL2) {
      return `#version 300 es
        precision highp float;
        precision highp sampler3D;
        
        in vec2 v_texCoord;
        out vec4 outColor;
        
        uniform sampler2D u_image;
        uniform sampler3D u_lut;
        uniform bool u_useLut;
        
        uniform sampler2D u_watermark;
        uniform bool u_useWatermark;
        uniform vec4 u_watermarkRect; // [x, y, width, height] in normalized coords
        uniform float u_watermarkOpacity;

        void main() {
          vec4 color = texture(u_image, v_texCoord);
          
          if (u_useLut) {
            color.rgb = texture(u_lut, color.rgb).rgb;
          }
          
          if (u_useWatermark) {
            vec2 wmCoord = (v_texCoord - u_watermarkRect.xy) / u_watermarkRect.zw;
            if (wmCoord.x >= 0.0 && wmCoord.x <= 1.0 && wmCoord.y >= 0.0 && wmCoord.y <= 1.0) {
              vec4 wmColor = texture(u_watermark, wmCoord);
              color.rgb = mix(color.rgb, wmColor.rgb, wmColor.a * u_watermarkOpacity);
            }
          }
          
          outColor = color;
        }
      `;
    } else {
      // Fallback for WebGL 1 (simplified, no 3D texture support for now in this snippet)
      return `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_image;
        void main() {
          gl_FragColor = texture2D(u_image, v_texCoord);
        }
      `;
    }
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  setupBuffers() {
    const gl = this.gl;
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0,
    ]), gl.STATIC_DRAW);
  }

  createTexture(image) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  create3DTexture(lutData, size) {
    if (!this.isWebGL2) return null;
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB32F, size, size, size, 0, gl.RGB, gl.FLOAT, lutData);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  render(image, options = {}) {
    const gl = this.gl;
    const program = this.program;

    this.canvas.width = image.width;
    this.canvas.height = image.height;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (this.currentProgram !== program) {
      gl.useProgram(program);
      this.currentProgram = program;
    }

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    const mainTexture = this.createTexture(image);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mainTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);

    let lutTexture = null;
    if (options.lut && this.isWebGL2) {
      lutTexture = this.create3DTexture(options.lut.data, options.lut.size);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, lutTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);
      gl.uniform1i(gl.getUniformLocation(program, 'u_useLut'), 1);
    } else {
      gl.uniform1i(gl.getUniformLocation(program, 'u_useLut'), 0);
    }

    let wmTexture = null;
    if (options.watermark && options.watermark.image) {
      wmTexture = this.createTexture(options.watermark.image);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, wmTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_watermark'), 2);
      gl.uniform1i(gl.getUniformLocation(program, 'u_useWatermark'), 1);
      gl.uniform4fv(gl.getUniformLocation(program, 'u_watermarkRect'), options.watermark.rect || [0.8, 0.8, 0.15, 0.15]);
      gl.uniform1f(gl.getUniformLocation(program, 'u_watermarkOpacity'), options.watermark.opacity || 0.5);
    } else {
      gl.uniform1i(gl.getUniformLocation(program, 'u_useWatermark'), 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Cleanup textures to avoid memory leaks
    gl.deleteTexture(mainTexture);
    if (lutTexture) gl.deleteTexture(lutTexture);
    if (wmTexture) gl.deleteTexture(wmTexture);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texCoordBuffer);
  }
}

export function parseCubeLUT(data) {
  const lines = data.split('\n');
  let size = 0;
  const lut = [];
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1]);
    } else if (/^[\d.-]+/.test(line) && !line.startsWith('TITLE') && !line.startsWith('DOMAIN')) {
      const parts = line.split(/\s+/).map(parseFloat);
      if (parts.length === 3) {
        lut.push(...parts);
      }
    }
  }
  
  return { size, data: new Float32Array(lut) };
}
