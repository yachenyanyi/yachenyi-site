export function setupProjectCarousel() {
  const viewport = document.querySelector<HTMLElement>('.project-carousel');
  const track = viewport?.querySelector<HTMLElement>('.home-project-grid');
  const toggle = document.querySelector<HTMLButtonElement>('[data-project-rotation]');
  if (!viewport || !track || !toggle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionAllowed = !reducedMotion.matches;
  const originals = Array.from(track.querySelectorAll<HTMLAnchorElement>('.home-project-card'));
  if (originals.length < 2) return;

  // Repeated artwork fills the arc; the original links remain the keyboard stops.
  const copies = originals.map((card) => {
    const copy = card.cloneNode(true) as HTMLAnchorElement;
    copy.setAttribute('aria-hidden', 'true');
    copy.tabIndex = -1;
    copy.dataset.orbitCopy = '';
    track.append(copy);
    return copy;
  });
  const cards = [...originals, ...copies];
  const slots = cards.map((card) => {
    const slot = document.createElement('div');
    slot.className = 'project-orbit-slot';
    card.before(slot);
    slot.append(card);
    return slot;
  });

  let width = viewport.clientWidth;
  let cardWidth = Math.min(330, Math.max(240, width * .29));
  let offset = 0;
  let previousTime = 0;
  let frame = 0;
  let visible = false;
  let paused = false;
  let focused = false;

  const draw = () => {
    const step = cardWidth + (width < 600 ? 54 : 88);
    const circumference = step * slots.length;
    slots.forEach((slot, index) => {
      const x = ((index * step + offset + circumference / 2) % circumference + circumference) % circumference - circumference / 2;
      const progress = x / Math.max(width / 2, 1);
      const depth = -Math.min(360, progress * progress * 105);
      const yaw = -Math.max(-38, Math.min(38, progress * 26));
      slot.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${depth}px) rotateY(${yaw}deg)`;
      slot.style.zIndex = `${Math.round(1000 + depth)}`;
      // Hide wrapped slides well outside the viewport before they reappear.
      const outside = Math.abs(x) > width / 2 + cardWidth;
      slot.style.opacity = outside ? '0' : '1';
      slot.style.pointerEvents = outside ? 'none' : 'auto';
    });
  };
  const canRun = () => visible && !document.hidden && motionAllowed && !paused && !focused;
  const tick = (time: number) => {
    frame = 0;
    if (!canRun()) { previousTime = 0; return; }
    // Use elapsed time: capping each frame's delta made throttled browsers barely move.
    if (previousTime) offset -= (time - previousTime) * .05;
    previousTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    viewport.classList.toggle('is-orbit-ready', motionAllowed);
    toggle.hidden = false;
    const zh = document.documentElement.dataset.lang === 'zh';
    const label = !motionAllowed
      ? (zh ? '启用转动' : 'Enable rotation')
      : paused ? (zh ? '继续转动' : 'Resume rotation') : (zh ? '暂停转动' : 'Pause rotation');
    toggle.setAttribute('aria-pressed', `${!motionAllowed || paused}`);
    toggle.setAttribute('aria-label', label);
    toggle.textContent = `${!motionAllowed || paused ? '▶' : 'Ⅱ'} ${label}`;
    if (motionAllowed) draw();
    else slots.forEach((slot) => {
      slot.style.removeProperty('opacity');
      slot.style.removeProperty('pointer-events');
    });
    if (canRun()) frame = requestAnimationFrame(tick);
  };

  toggle.addEventListener('click', () => {
    if (!motionAllowed) { motionAllowed = true; paused = false; }
    else paused = !paused;
    sync();
  });
  viewport.addEventListener('focusin', (event) => {
    focused = true;
    const index = cards.indexOf(event.target as HTMLAnchorElement);
    if (index >= 0) offset = -index * (cardWidth + (width < 600 ? 54 : 88));
    sync();
  });
  viewport.addEventListener('focusout', (event) => {
    if (!viewport.contains(event.relatedTarget as Node | null)) { focused = false; sync(); }
  });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', () => {
    motionAllowed = !reducedMotion.matches;
    paused = false;
    sync();
  });
  document.addEventListener('site:language-change', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(viewport);
  } else visible = true;
  const resize = () => {
    width = viewport.clientWidth;
    cardWidth = Math.min(330, Math.max(240, width * .29));
    track.style.setProperty('--orbit-card-width', `${cardWidth}px`);
    sync();
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize, { passive: true });
  resize();
  sync();
}
