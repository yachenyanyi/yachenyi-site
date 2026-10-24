import { createGlassRotation } from './glass-rotation';

type GlassRotation = ReturnType<typeof createGlassRotation>;
type GlassRenderer = { resize: () => void; draw: (rotation: GlassRotation) => void };

/** Decorative glass behind the title, gently following the pointer across the hero. */
export function setupGlassHero() {
  const stage = document.querySelector<HTMLElement>('.glass-title-stage');
  const canvas = stage?.querySelector<HTMLCanvasElement>('canvas');
  const hero = stage?.closest<HTMLElement>('.immersive-hero');
  if (!stage || !canvas || !hero) return;

  let renderer = createWebGLRenderer(canvas) ?? createCSSRenderer(stage);
  const rotation = createGlassRotation();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let targetX = 0, targetY = 0, x = 0, y = 0;
  let frame = 0, last = 0, visible = true;

  const draw = () => {
    rotation.reset();
    // Viewer axes: right increases yaw; down decreases pitch, without accumulating turns.
    rotation.rotate(-y * .14, x * .20);
    stage.style.setProperty('--glass-offset-x', `${x * 18}px`);
    stage.style.setProperty('--glass-offset-y', `${y * 12}px`);
    renderer.draw(rotation);
  };
  const run = (time: number) => {
    frame = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(64, time - last) : 16;
    last = time;
    const ease = 1 - Math.exp(-dt / 150);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    const settled = Math.abs(targetX - x) < .001 && Math.abs(targetY - y) < .001;
    if (settled) { x = targetX; y = targetY; }
    draw();
    if (!settled) frame = requestAnimationFrame(run);
    else last = 0;
  };
  const wake = () => {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(run);
  };
  const reset = () => { targetX = targetY = 0; wake(); };
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !fine.matches || reduce.matches) return;
    const rect = hero.getBoundingClientRect();
    targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    wake();
  }, { passive: true });
  hero.addEventListener('pointerleave', reset);
  hero.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const preferenceChanged = () => {
    if (reduce.matches || !fine.matches) {
      stop(); targetX = targetY = x = y = 0; draw();
    }
  };
  reduce.addEventListener('change', preferenceChanged);
  fine.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else reset();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); stop(); stage.classList.remove('glass-ready');
    renderer = createCSSRenderer(stage); draw(); wake();
  });
  const resize = () => { renderer.resize(); draw(); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize, { passive: true });
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake(); else stop();
    }).observe(stage);
  }
  resize();
}

/** A translucent rounded cube; the real DOM title is rendered above it. */
function createWebGLRenderer(canvas: HTMLCanvasElement): GlassRenderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform vec2 resolution; uniform mat3 rotation;
    float box(vec3 p){vec3 q=abs(p)-vec3(.60);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-.075;}
    void main(){
      vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*2.8;
      vec3 ro=rotation*vec3(0.,0.,4.5),rd=rotation*normalize(vec3(p,-4.5));
      float t=0.;vec3 hit=ro;bool found=false;
      for(int i=0;i<64;i++){hit=ro+rd*t;float d=box(hit);if(d<.001){found=true;break;}t+=d;if(t>8.)break;}
      if(!found) discard;
      vec2 e=vec2(.002,0.);
      vec3 n=normalize(vec3(box(hit+e.xyy)-box(hit-e.xyy),box(hit+e.yxy)-box(hit-e.yxy),box(hit+e.yyx)-box(hit-e.yyx)));
      mat3 localToView=mat3(vec3(rotation[0].x,rotation[1].x,rotation[2].x),vec3(rotation[0].y,rotation[1].y,rotation[2].y),vec3(rotation[0].z,rotation[1].z,rotation[2].z));
      vec3 worldNormal=localToView*n;
      float facing=max(0.,dot(-rd,n));
      float fresnel=pow(1.-facing,3.);
      vec3 light=normalize(vec3(-.6,.9,1.));
      float diffuse=max(0.,dot(worldNormal,light));
      float sheen=pow(max(0.,dot(reflect(localToView*rd,worldNormal),light)),28.);
      vec3 color=mix(vec3(.12,.30,.25),vec3(.45,.75,.62),diffuse*.65);
      color+=vec3(.60,.95,.80)*fresnel*.65+vec3(.85,1.,.94)*sheen*.55;
      gl_FragColor=vec4(color,.30+fresnel*.42+sheen*.16);
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
  if (!vs || !fs || !program) {
    gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(program); return null;
  }
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const orientation = gl.getUniformLocation(program, 'rotation');
  canvas.parentElement!.dataset.glassRenderer = 'webgl';
  canvas.parentElement!.classList.add('glass-ready');
  return {
    resize() {
      const scale = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    },
    draw(rotation) {
      gl.uniformMatrix3fv(orientation, false, rotation.viewToLocal());
      gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT);
      const side = Math.min(canvas.width, Math.ceil(canvas.height * .98));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(Math.floor((canvas.width - side) / 2), 0, side, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
}

/** Keep the same pointer response on devices without WebGL. */
function createCSSRenderer(stage: HTMLElement): GlassRenderer {
  const cube = document.createElement('div');
  cube.className = 'glass-fallback-cube'; cube.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 6; i++) {
    const face = document.createElement('div');
    face.className = `glass-fallback-face glass-fallback-face--${i}`; cube.append(face);
  }
  stage.append(cube); stage.classList.add('glass-fallback-ready'); stage.dataset.glassRenderer = 'css';
  return {
    resize() {},
    draw(rotation) { cube.style.transform = `translate(-50%,-50%) ${rotation.cssTransform()}`; },
  };
}
