/** A ray-marched rounded glass cube, sampling the actual typeset hero text. */
export function setupGlassHero() {
  const stage = document.querySelector<HTMLElement>('.glass-title-stage');
  const canvas = stage?.querySelector<HTMLCanvasElement>('canvas');
  const title = stage?.querySelector<HTMLElement>('h1');
  if (!stage || !canvas || !title) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform sampler2D backdrop; uniform vec2 resolution; uniform vec2 angle;
    mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
    mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
    float box(vec3 p){vec3 q=abs(p)-vec3(.60);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-.075;}
    void main(){
      vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*2.8;
      mat3 rot=rx(angle.y)*ry(angle.x);
      vec3 ro=rot*vec3(0.,0.,4.5),rd=rot*normalize(vec3(p,-4.5));
      float t=0.;vec3 hit=ro;bool found=false;
      for(int i=0;i<64;i++){hit=ro+rd*t;float d=box(hit);if(d<.001){found=true;break;}t+=d;if(t>8.)break;}
      if(!found) discard;
      vec2 e=vec2(.002,0.);
      vec3 n=normalize(vec3(box(hit+e.xyy)-box(hit-e.xyy),box(hit+e.yxy)-box(hit-e.yxy),box(hit+e.yyx)-box(hit-e.yyx)));
      vec3 bent=refract(rd,n,1./1.46);
      // Ray displacement through the volume magnifies and bends the title underneath.
      vec3 exitPoint=hit+bent*1.05;
      mat3 inverseRot=mat3(vec3(rot[0].x,rot[1].x,rot[2].x),vec3(rot[0].y,rot[1].y,rot[2].y),vec3(rot[0].z,rot[1].z,rot[2].z));
      vec3 exitWorld=inverseRot*exitPoint;
      vec2 sampleUV=exitWorld.xy/2.8/vec2(resolution.x/resolution.y,1.)+.5;
      float fresnel=pow(1.-max(0.,dot(-rd,n)),3.);
      vec2 dispersion=normalize(n.xy+vec2(.001))*(.002+.009*fresnel);
      vec3 color=vec3(texture2D(backdrop,clamp(sampleUV+dispersion,.001,.999)).r,texture2D(backdrop,clamp(sampleUV,.001,.999)).g,texture2D(backdrop,clamp(sampleUV-dispersion,.001,.999)).b);
      vec3 light=normalize(vec3(-.6,.9,1.));
      float sheen=pow(max(0.,dot(reflect(rd,n),light)),32.);
      color=color*.88+vec3(.15,.28,.23)*fresnel+vec3(.8,1.,.92)*sheen*.55;
      float edge=pow(1.-max(0.,dot(-rd,n)),7.);
      color+=vec3(.52,.85,.72)*edge*.5;
      gl_FragColor=vec4(color,1.);
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
  if (!vs || !fs || !program) { gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(program); return; }
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program,'backdrop'),0);
  const resolution = gl.getUniformLocation(program,'resolution'), angle = gl.getUniformLocation(program,'angle');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let x = -.45, y = .28, speed = 0, last = 0, frame = 0, visible = true, paused = false, dragging = false;
  let pointer: {id:number;x:number;y:number;time:number;startX:number;startY:number} | null = null;
  const paint = () => {
    const rect = stage.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * scale); canvas.height = Math.round(rect.height * scale);
    gl.viewport(0,0,canvas.width,canvas.height); gl.uniform2f(resolution,canvas.width,canvas.height);
    const source = document.createElement('canvas'); source.width=canvas.width; source.height=canvas.height;
    const ctx = source.getContext('2d'); if (!ctx) return;
    ctx.scale(scale,scale);
    const bg=ctx.createLinearGradient(0,0,rect.width,rect.height); bg.addColorStop(0,'#142d27'); bg.addColorStop(1,'#203b34');
    ctx.fillStyle=bg;ctx.fillRect(0,0,rect.width,rect.height);
    // DOM ranges preserve language, line wrapping and actual browser glyph positions.
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode; const parent=node.parentElement; if(!parent) continue;
      const style=getComputedStyle(parent);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.textBaseline='alphabetic';ctx.fillStyle=parent.closest('.saas-gradient-text')?'#a9e7c8':'#f4faf6';
      const text=node.textContent || '';
      for(let i=0;i<text.length;i++) {
        if(!text[i].trim()) continue;
        const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const glyph=range.getBoundingClientRect();
        ctx.fillText(text[i],glyph.left-rect.left,glyph.top-rect.top+parseFloat(style.fontSize)*.81);
      }
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    draw();
  };
  const draw = () => {
    gl.uniform2f(angle,x,y);gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);
    // Restrict expensive ray marching to the cube's possible silhouette.
    const side=Math.min(canvas.width,Math.ceil(canvas.height*.98));
    gl.enable(gl.SCISSOR_TEST);gl.scissor(Math.floor((canvas.width-side)/2),0,side,canvas.height);
    gl.drawArrays(gl.TRIANGLES,0,6);
  };
  const run = (time:number) => {
    frame=0;if(!visible || document.hidden) {last=0;return;}
    const dt=last?Math.min(64,time-last):0;last=time;
    if(!pointer && !reduce.matches){x+=speed*1400*(1-Math.exp(-dt/1400));speed*=Math.exp(-dt/1400);if(!paused && Math.abs(speed)<.00005)x+=dt*.00014;}
    draw();if(pointer || (!reduce.matches && (!paused || Math.abs(speed)>.00001))) frame=requestAnimationFrame(run);else last=0;
  };
  const wake=()=>{if(!frame && visible && !document.hidden)frame=requestAnimationFrame(run);};
  canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary || event.button!==0)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:event.timeStamp};speed=0;});
  canvas.addEventListener('pointermove',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    if(!dragging){if(Math.abs(event.clientX-pointer.startX)<6 || Math.abs(event.clientX-pointer.startX)<Math.abs(event.clientY-pointer.startY))return;dragging=true;canvas.setPointerCapture(event.pointerId);}
    event.preventDefault();const dx=event.clientX-pointer.x;if(dx===0 && event.clientY===pointer.y)return;speed=reduce.matches?0:Math.max(-.012,Math.min(.012,dx/Math.max(1,event.timeStamp-pointer.time)*.012));
    x+=dx*.012;y=Math.max(-1.1,Math.min(1.1,y+(event.clientY-pointer.y)*.008));pointer.x=event.clientX;pointer.y=event.clientY;pointer.time=event.timeStamp;draw();
  });
  const release=(event:PointerEvent)=>{if(pointer?.id!==event.pointerId)return;pointer=null;dragging=false;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(event.type!=='pointerup')speed=0;wake();};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerenter',()=>{paused=true;});canvas.addEventListener('pointerleave',()=>{paused=false;wake();});
  stage.querySelectorAll<HTMLButtonElement>('[data-glass-turn]').forEach(button=>button.addEventListener('click',()=>{x+=Number(button.dataset.glassTurn)*Math.PI/2;speed=0;draw();wake();}));
  stage.querySelector('[data-glass-reset]')?.addEventListener('click',()=>{x=-.45;y=.28;speed=0;draw();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);stage.classList.remove('glass-ready');});
  document.addEventListener('visibilitychange',()=>{last=0;wake();});reduce.addEventListener('change',()=>{speed=0;last=0;wake();});
  document.addEventListener('site:language-change',()=>requestAnimationFrame(paint));
  if(typeof ResizeObserver==='function')new ResizeObserver(paint).observe(stage);else window.addEventListener('resize',paint,{passive:true});
  if(typeof IntersectionObserver==='function')new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;last=0;if(visible)wake();}).observe(stage);
  document.fonts.ready.then(paint);paint();stage.classList.add('glass-ready');wake();
}
