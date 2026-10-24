import { createGlassRotation } from './glass-rotation';

type GlassRotation = ReturnType<typeof createGlassRotation>;
type GlassRenderer = { resize: () => void; draw: (rotation: GlassRotation) => void };

/** Decorative glass with independent auto-rotation and input-specific pointer following. */
export function setupGlassHero() {
  const stage = document.querySelector<HTMLElement>('.glass-title-stage');
  const canvas = stage?.querySelector<HTMLCanvasElement>('canvas');
  const hero = stage?.closest<HTMLElement>('.immersive-hero');
  if (!stage || !canvas || !hero) return;

  let renderer = createWebGLRenderer(canvas) ?? createCSSRenderer(stage);
  const rotation = createGlassRotation();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let targetX = 0, targetY = 0, x = 0, y = 0;
  let frame = 0, last = 0, visible = true, idleTime = 0, autoYaw = 0;
  const animated = () => !reduce.matches;

  const draw = () => {
    rotation.reset();
    rotation.rotate(0, autoYaw);
    // Viewer axes: right increases yaw; down decreases pitch, without accumulating turns.
    const driftX = animated() ? Math.sin(idleTime / 2800) : 0;
    const driftY = animated() ? Math.sin(idleTime / 3600) : 0;
    rotation.rotate(-y * .22 + driftY * .025, x * .32 + driftX * .035);
    stage.style.setProperty('--glass-offset-x', `${x * 22 + driftX * 1.8}px`);
    stage.style.setProperty('--glass-offset-y', `${y * 14 + driftY * 1.2}px`);
    stage.dataset.glassMotion = reduce.matches ? 'reduced' : visible && !document.hidden ? 'running' : 'paused';
    renderer.draw(rotation);
  };
  const run = (time: number) => {
    frame = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (!animated()) {
      targetX = targetY = x = y = idleTime = 0;
      draw(); last = 0; return;
    }
    const dt = last ? Math.min(64, time - last) : 16;
    last = time;
    if (animated()) idleTime += dt;
    // About 39 seconds per revolution; independent of hover/precision capabilities.
    autoYaw = (autoYaw + dt * .00016) % (Math.PI * 2);
    const ease = 1 - Math.exp(-dt / 150);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    const settled = Math.abs(targetX - x) < .001 && Math.abs(targetY - y) < .001;
    if (settled) { x = targetX; y = targetY; }
    draw();
    if (!settled || animated()) frame = requestAnimationFrame(run);
    else last = 0;
  };
  const wake = () => {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(run);
  };
  const reset = () => { targetX = targetY = 0; wake(); };
  window.addEventListener('pointermove', event => {
    const input = event.pointerType || 'mouse';
    stage.dataset.glassInput = input;
    // Real events also work with a mouse attached to a tablet or touch-primary computer.
    // Pen contact and fingers belong to normal page gestures; only hovering pointers follow.
    if (input === 'touch' || (input === 'pen' && (event.buttons !== 0 || event.pressure > 0))) {
      reset(); return;
    }
    if (!['mouse', 'pen'].includes(input) || !animated()) return;
    targetX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
    targetY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
    wake();
  }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      stage.dataset.glassInput = event.pointerType; reset();
    }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('scroll', wake, { passive: true });
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    stage.dataset.glassMotion = reduce.matches ? 'reduced' : 'paused';
  };
  const preferenceChanged = () => {
    if (reduce.matches) {
      stop(); targetX = targetY = x = y = idleTime = 0; draw();
    } else wake();
  };
  reduce.addEventListener('change', preferenceChanged);
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
  wake();
}

/** Original refractive glass material, sampling the background beneath the DOM title. */
function createWebGLRenderer(canvas: HTMLCanvasElement): GlassRenderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform sampler2D backdrop; uniform vec2 resolution; uniform mat3 rotation; uniform vec4 backdropBounds;
    float box(vec3 p){vec3 q=abs(p)-vec3(.60);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-.075;}
    void main(){
      vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*2.8;
      vec3 ro=rotation*vec3(0.,0.,4.5),rd=rotation*normalize(vec3(p,-4.5));
      float t=0.;vec3 hit=ro;bool found=false;
      for(int i=0;i<64;i++){hit=ro+rd*t;float d=box(hit);if(d<.001){found=true;break;}t+=d;if(t>8.)break;}
      if(!found) discard;
      vec2 e=vec2(.002,0.);
      vec3 n=normalize(vec3(box(hit+e.xyy)-box(hit-e.xyy),box(hit+e.yxy)-box(hit-e.yxy),box(hit+e.yyx)-box(hit-e.yyx)));
      vec3 bent=refract(rd,n,1./1.46);
      vec3 exitPoint=hit+bent*1.05;
      mat3 localToView=mat3(vec3(rotation[0].x,rotation[1].x,rotation[2].x),vec3(rotation[0].y,rotation[1].y,rotation[2].y),vec3(rotation[0].z,rotation[1].z,rotation[2].z));
      vec3 exitWorld=localToView*exitPoint;
      vec2 sampleUV=(exitWorld.xy/2.8/vec2(resolution.x/resolution.y,1.)+.5)*backdropBounds.zw+backdropBounds.xy;
      float fresnel=pow(1.-max(0.,dot(-rd,n)),3.);
      vec2 dispersion=normalize(n.xy+vec2(.001))*(.002+.009*fresnel)*backdropBounds.zw;
      vec3 color=vec3(texture2D(backdrop,clamp(sampleUV+dispersion,.001,.999)).r,texture2D(backdrop,clamp(sampleUV,.001,.999)).g,texture2D(backdrop,clamp(sampleUV-dispersion,.001,.999)).b);
      vec3 light=normalize(vec3(-.6,.9,1.));
      float sheen=pow(max(0.,dot(reflect(rd,n),light)),32.);
      color=color*.88+vec3(.15,.28,.23)*fresnel+vec3(.8,1.,.92)*sheen*.55;
      float edge=pow(1.-max(0.,dot(-rd,n)),7.);
      color+=vec3(.52,.85,.72)*edge*.5;
      gl_FragColor=vec4(color,.24+fresnel*.46+sheen*.12);
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
  const backdropBounds = gl.getUniformLocation(program, 'backdropBounds');
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, 'backdrop'), 0);
  const source = document.createElement('canvas');
  const ctx = source.getContext('2d');
  const image = new Image();
  let lastRotation: GlassRotation | null = null;
  const paintBackdrop = () => {
    if (!ctx) return;
    const width = innerWidth, height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5, gl.getParameter(gl.MAX_TEXTURE_SIZE) / Math.max(width, height));
    source.width = Math.max(1, Math.round(width * scale));
    source.height = Math.max(1, Math.round(height * scale));
    ctx.scale(source.width / width, source.height / height);
    ctx.fillStyle = '#08110f'; ctx.fillRect(0, 0, width, height);
    if (image.naturalWidth && image.naturalHeight) {
      const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const w = image.naturalWidth * cover, h = image.naturalHeight * cover;
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    }
    // Share the background tint with CSS, without copying the foreground text into the glass.
    const style = getComputedStyle(document.body);
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, style.getPropertyValue('--ambient-shade-top').trim());
    shade.addColorStop(.55, style.getPropertyValue('--ambient-shade-middle').trim());
    shade.addColorStop(1, style.getPropertyValue('--ambient-shade-bottom').trim());
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    ctx.save();
    const cx = width * .12, cy = height * .65;
    const rx = width * .88 * Math.SQRT2, ry = height * .65 * Math.SQRT2;
    ctx.translate(cx, cy); ctx.scale(rx, ry);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    glow.addColorStop(0, style.getPropertyValue('--ambient-glow').trim());
    glow.addColorStop(.65, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(-cx / rx, -cy / ry, width / rx, height / ry);
    ctx.restore();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };
  const draw = (rotation: GlassRotation) => {
    lastRotation = rotation;
    const rect = canvas.getBoundingClientRect();
    gl.uniform4f(backdropBounds, rect.left / innerWidth, 1 - rect.bottom / innerHeight, rect.width / innerWidth, rect.height / innerHeight);
    gl.uniformMatrix3fv(orientation, false, rotation.viewToLocal());
    gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT);
    const side = Math.min(canvas.width, Math.ceil(canvas.height * .98));
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(Math.floor((canvas.width - side) / 2), 0, side, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  image.onload = () => { paintBackdrop(); if (lastRotation) draw(lastRotation); };
  window.addEventListener('resize', () => {
    paintBackdrop(); if (lastRotation) draw(lastRotation);
  }, { passive: true });
  const ambient = getComputedStyle(document.body).getPropertyValue('--ambient-image').trim();
  const url = ambient.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
  if (url) image.src = url;
  canvas.parentElement!.dataset.glassRenderer = 'webgl';
  canvas.parentElement!.classList.add('glass-ready');
  return {
    resize() {
      const scale = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      paintBackdrop();
    },
    draw,
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
