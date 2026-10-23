import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export function setupSmoothScroll() {
  if (typeof ResizeObserver !== 'function') return;
  let scrolling: Lenis | undefined;
  const start = () => {
    scrolling ??= new Lenis({
      autoRaf: true,
      lerp: .085,
      wheelMultiplier: .95,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -96 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      respectReducedMotion: true,
    });
  };
  start();
  window.addEventListener('pagehide', () => { scrolling?.destroy(); scrolling = undefined; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) start(); });
}
