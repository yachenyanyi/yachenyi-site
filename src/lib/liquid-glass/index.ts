import { createGlassBackdrops } from './backdrop';
import { createLiquidRenderer, type GlassMaterial } from './renderer';

type Surface = { root: HTMLElement; canvas: HTMLCanvasElement; visible: boolean; dirty: boolean; material: GlassMaterial; light: number[]; animateUntil: number };
let initialized = false;

/** Shared optical engine. Every LiquidGlass instance, including carousel clones, uses it. */
export function setupLiquidGlass() {
  if (initialized) return;
  initialized = true;
  const renderer = createLiquidRenderer();
  const surfaces = new Map<HTMLElement, Surface>();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  let frame = 0;
  const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(render); };
  const invalidate = () => { surfaces.forEach(surface => { surface.dirty = true; }); schedule(); };
  const backdrops = createGlassBackdrops(invalidate);
  const materialFor = (root: HTMLElement): GlassMaterial => {
    const style = getComputedStyle(root);
    const number = (name: string, fallback: number) => {
      const value = parseFloat(style.getPropertyValue(`--liquid-${name}`));
      return Number.isFinite(value) ? value : fallback;
    };
    return { radius: parseFloat(style.borderTopLeftRadius) || 0, bevel: number('bevel', 22), refraction: number('refraction', 22), dispersion: number('dispersion', 1.35), opacity: number('opacity', .84), shade: number('shade', .06) };
  };
  function render(time: number) {
    frame = 0;
    if (document.hidden) return;
    let moving = false;
    surfaces.forEach(surface => {
      if (!surface.visible) return;
      if (surface.animateUntil > time && !reducedMotion.matches) { surface.dirty = true; moving = true; }
      if (!surface.dirty) return;
      surface.dirty = false;
      if (!renderer || reducedTransparency.matches) {
        surface.root.dataset.liquidGlassState = reducedTransparency.matches ? 'reduced' : 'fallback'; return;
      }
      const width = surface.canvas.clientWidth, height = surface.canvas.clientHeight;
      if (!width || !height) return;
      surface.material = materialFor(surface.root);
      const backdrop = backdrops.resolve(surface.root, surface.canvas, width, height);
      if (!backdrop) return;
      const ready = renderer.render(surface.canvas, backdrop.frame, backdrop.bounds, width, height, surface.material, surface.light);
      surface.root.dataset.liquidGlassState = ready ? 'ready' : 'fallback';
    });
    if (moving) schedule();
  }
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const surface = surfaces.get(entry.target as HTMLElement);
      if (surface) { surface.visible = entry.isIntersecting; surface.dirty = true; }
    }); schedule();
  }, { rootMargin: '80px' });
  const resize = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const surface = surfaces.get(entry.target as HTMLElement);
      if (surface) { surface.material = materialFor(surface.root); surface.dirty = true; }
    }); schedule();
  });
  const register = (root: HTMLElement) => {
    if (surfaces.has(root)) return;
    const canvas = root.querySelector<HTMLCanvasElement>('.liquid-glass__optics canvas');
    if (!canvas) return;
    const surface: Surface = { root, canvas, visible: false, dirty: true, material: materialFor(root), light: [-.6, .85], animateUntil: 0 };
    root.dataset.liquidGlassState = renderer ? 'pending' : 'fallback';
    surfaces.set(root, surface); visibility.observe(root); resize.observe(root);
    root.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch' || (event.pointerType === 'pen' && event.buttons !== 0)) return;
      const rect = root.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      surface.light = [x * 2 - 1, 1 - y * 2];
      root.style.setProperty('--liquid-light-x', `${x * 100}%`); root.style.setProperty('--liquid-light-y', `${y * 100}%`);
      surface.dirty = true; schedule();
    }, { passive: true });
    root.addEventListener('pointerleave', () => {
      surface.light = [-.6, .85]; root.style.removeProperty('--liquid-light-x'); root.style.removeProperty('--liquid-light-y'); surface.dirty = true; schedule();
    });
    const scene = root.closest<HTMLElement>('[data-liquid-scene]');
    if (scene) {
      const transition = () => { surface.animateUntil = performance.now() + 800; surface.dirty = true; schedule(); };
      scene.addEventListener('pointerenter', transition); scene.addEventListener('pointerleave', transition);
    }
  };
  document.querySelectorAll<HTMLElement>('[data-liquid-glass]').forEach(register);
  new MutationObserver(entries => {
    entries.forEach(entry => entry.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches('[data-liquid-glass]')) register(node);
      node.querySelectorAll<HTMLElement>('[data-liquid-glass]').forEach(register);
    }));
    for (const root of surfaces.keys()) {
      if (!root.isConnected) { visibility.unobserve(root); resize.unobserve(root); surfaces.delete(root); }
    }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', () => { backdrops.clear(); invalidate(); }, { passive: true });
  window.addEventListener('liquid-glass:refresh', invalidate);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else invalidate();
  });
  reducedTransparency.addEventListener('change', invalidate);
  reducedMotion.addEventListener('change', () => {
    surfaces.forEach(surface => { surface.light = [-.6, .85]; surface.animateUntil = 0; }); invalidate();
  });
}
