export type GlassFrame = { canvas: HTMLCanvasElement; key: string };
export type GlassMaterial = { radius: number; bevel: number; refraction: number; dispersion: number; opacity: number; shade: number };

/** A shared GPU context prevents one WebGL context per card (including carousel copies). */
export function createLiquidRenderer() {
  const output = document.createElement('canvas');
  const gl = output.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv;
    uniform sampler2D backdrop;
    uniform vec2 size;
    uniform vec4 bounds;
    uniform vec4 material;
    uniform float opacity;
    uniform float shade;
    uniform vec2 light;
    float roundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
    vec3 sampleGlass(vec2 p,vec2 shift,vec2 split){
      vec2 u=bounds.xy+(p+shift/size)*bounds.zw;
      vec2 chroma=split/size*bounds.zw;
      return vec3(texture2D(backdrop,clamp(u+chroma,.001,.999)).r,texture2D(backdrop,clamp(u,.001,.999)).g,texture2D(backdrop,clamp(u-chroma,.001,.999)).b);
    }
    void main(){
      vec2 p=(uv-.5)*size;
      float radius=min(material.x,min(size.x,size.y)*.5);
      vec2 halfSize=size*.5-1.;
      float d=roundedBox(p,halfSize,radius);
      if(d>0.)discard;
      float bevel=min(material.y,min(size.x,size.y)*.36);
      float edge=clamp(1.+d/max(bevel,1.),0.,1.);
      vec2 e=vec2(.5,0.);
      vec2 gradient=vec2(roundedBox(p+e.xy,halfSize,radius)-roundedBox(p-e.xy,halfSize,radius),roundedBox(p+e.yx,halfSize,radius)-roundedBox(p-e.yx,halfSize,radius));
      vec2 outward=gradient/max(length(gradient),.001);
      float slope=edge/sqrt(max(1.-edge*edge,.08));
      vec3 normal=normalize(vec3(outward*slope,1.));
      vec3 bent=refract(vec3(0.,0.,-1.),normal,1./1.46);
      vec2 shift=bent.xy/max(-bent.z,.2)*material.z;
      vec2 split=outward*edge*edge*material.w;
      vec3 color=sampleGlass(uv,shift,split);
      // Broad, curved reflections roll into the face instead of forming a hard rim.
      float rim=pow(edge,4.);
      vec3 lamp=normalize(vec3(light.x*1.1,light.y*1.1,1.1));
      float facing=max(0.,dot(reflect(vec3(0.,0.,-1.),normal),lamp));
      float spec=pow(facing,9.);
      float softSpec=pow(facing,3.)*smoothstep(0.,.55,edge);
      float gleam=pow(max(0.,dot(normal,lamp)),6.)*sin(edge*1.5707963);
      color=color*(1.-shade)+vec3(.92,.98,1.)*(rim*.12+spec*.16+softSpec*.10+gleam*.11);
      float coverage=1.-smoothstep(-1.,0.,d);
      gl_FragColor=vec4(color,coverage*opacity);
    }`;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) { gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(program); return null; }
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['backdrop', 'size', 'bounds', 'material', 'opacity', 'shade', 'light'].map(name => [name, gl.getUniformLocation(program, name)]));
  gl.uniform1i(uniforms.backdrop, 0);
  const textures = new Map<string, WebGLTexture>();
  let lost = false;
  output.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; });
  return {
    render(target: HTMLCanvasElement, frame: GlassFrame, bounds: number[], width: number, height: number, material: GlassMaterial, light: number[]) {
      if (lost) return false;
      const context = target.getContext('2d');
      if (!context) return false;
      const scale = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(600000 / Math.max(1, width * height)));
      const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
      if (output.width !== w) output.width = w;
      if (output.height !== h) output.height = h;
      if (target.width !== w) target.width = w;
      if (target.height !== h) target.height = h;
      gl.viewport(0, 0, w, h);
      let entry = textures.get(frame.key);
      if (!entry) {
        const texture = gl.createTexture();
        if (!texture) return false;
        if (frame.key.includes('|viewport|')) {
          for (const [key, old] of textures) {
            if (key.includes('|viewport|')) { gl.deleteTexture(old); textures.delete(key); }
          }
        }
        entry = texture; textures.set(frame.key, entry);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame.canvas);
        // Resize maps are replaceable; cap retained GPU resources.
        if (textures.size > 20) {
          const oldest = textures.keys().next().value;
          if (oldest && oldest !== frame.key) { gl.deleteTexture(textures.get(oldest)!); textures.delete(oldest); }
        }
      } else gl.bindTexture(gl.TEXTURE_2D, entry);
      gl.uniform2f(uniforms.size, width, height);
      gl.uniform4f(uniforms.bounds, bounds[0], bounds[1], bounds[2], bounds[3]);
      gl.uniform4f(uniforms.material, material.radius, material.bevel, material.refraction, material.dispersion);
      gl.uniform1f(uniforms.opacity, material.opacity);
      gl.uniform1f(uniforms.shade, material.shade);
      gl.uniform2f(uniforms.light, light[0], light[1]);
      gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
      context.clearRect(0, 0, w, h); context.drawImage(output, 0, 0);
      return true;
    },
  };
}
