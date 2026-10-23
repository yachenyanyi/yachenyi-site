export function setupProjectCarousel() {
  const viewport = document.querySelector<HTMLElement>('.project-carousel');
  const track = viewport?.querySelector<HTMLElement>('.home-project-grid');
  const toggle = document.querySelector<HTMLButtonElement>('[data-project-rotation]');
  if (!viewport || !track || !toggle) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let preference: boolean | null = null;
  try {
    const saved = localStorage.getItem('project-rotation');
    if (saved === 'on' || saved === 'off') preference = saved === 'on';
  } catch { /* Storage may be disabled; the control still works. */ }
  let autoplay = preference ?? !reducedMotion.matches;
  const originals = Array.from(track.querySelectorAll<HTMLAnchorElement>('.home-project-card'));
  if (originals.length < 2) return;
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
  let cardWidth = 260;
  const spacing = () => cardWidth + (width < 600 ? 38 : 68);
  let offset = 0;
  let velocity = 0;
  let previousTime = 0;
  let frame = 0;
  let visible = false;
  let focused = false;
  let lastScroll = window.scrollY;
  let pointer: { id: number; startX: number; startY: number; x: number; time: number; dragging: boolean } | null = null;
  let suppressClick = false;

  const draw = () => {
    const circumference = spacing() * slots.length;
    offset = ((offset % circumference) + circumference) % circumference;
    slots.forEach((slot, index) => {
      const x = ((index * spacing() + offset + circumference / 2) % circumference + circumference) % circumference - circumference / 2;
      const progress = x / Math.max(width / 2, 1);
      const depth = -Math.min(420, progress * progress * 170);
      const yaw = -Math.max(-52, Math.min(52, progress * 38));
      slot.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${depth}px) rotateY(${yaw}deg)`;
      slot.style.zIndex = `${Math.round(1000 + depth)}`;
      const outside = Math.abs(x) > width / 2 + cardWidth;
      slot.style.opacity = outside ? '0' : '1';
      slot.style.pointerEvents = outside ? 'none' : 'auto';
    });
  };
  const canRun = () => visible && !document.hidden && !pointer && !focused && (autoplay || Math.abs(velocity) > .01);
  const tick = (time: number) => {
    frame = 0;
    if (!canRun()) { previousTime = 0; return; }
    if (previousTime) {
      const elapsed = time - previousTime;
      if (autoplay) offset -= elapsed * .034;
      // Integrate exponential drag analytically, so low frame rates remain stable.
      offset += velocity * 260 * (1 - Math.exp(-elapsed / 260));
      velocity *= Math.exp(-elapsed / 260);
    }
    previousTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!frame && canRun()) frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    // Layout and manual interaction remain available even with reduced motion.
    viewport.classList.add('is-orbit-ready');
    toggle.hidden = false;
    const zh = document.documentElement.dataset.lang === 'zh';
    const label = autoplay ? (zh ? '暂停转动' : 'Pause rotation') : (zh ? '启用转动' : 'Enable rotation');
    toggle.setAttribute('aria-pressed', `${!autoplay}`);
    toggle.setAttribute('aria-label', label);
    toggle.textContent = `${autoplay ? 'Ⅱ' : '▶'} ${label}`;
    draw();
    schedule();
  };
  toggle.addEventListener('click', () => {
    autoplay = !autoplay;
    preference = autoplay;
    velocity = 0;
    try { localStorage.setItem('project-rotation', autoplay ? 'on' : 'off'); } catch {}
    sync();
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    suppressClick = false;
    velocity = 0;
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, time: event.timeStamp, dragging: false };
    sync();
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const totalX = event.clientX - pointer.startX;
    const totalY = event.clientY - pointer.startY;
    if (!pointer.dragging) {
      if (Math.abs(totalX) < 7 || Math.abs(totalX) < Math.abs(totalY)) return;
      pointer.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
    }
    event.preventDefault();
    const dx = event.clientX - pointer.x;
    velocity = Math.max(-1.5, Math.min(1.5, dx / Math.max(1, event.timeStamp - pointer.time)));
    offset += dx;
    pointer.x = event.clientX;
    pointer.time = event.timeStamp;
    draw();
  });
  const release = (event: PointerEvent) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dragged = pointer.dragging;
    if (!dragged || reducedMotion.matches || event.type === 'pointercancel' || event.timeStamp - pointer.time > 100) velocity = 0;
    pointer = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove('is-dragging');
    if (dragged) {
      suppressClick = true;
      focused = false;
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
    sync();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', (event) => {
    if (pointer?.id === event.pointerId) release(event);
  });
  viewport.addEventListener('dragstart', (event) => event.preventDefault());
  viewport.addEventListener('click', (event) => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  viewport.addEventListener('focusin', (event) => {
    if (pointer) return;
    focused = true;
    velocity = 0;
    const index = cards.indexOf(event.target as HTMLAnchorElement);
    if (index >= 0) offset = -index * spacing();
    sync();
  });
  viewport.addEventListener('focusout', (event) => {
    if (!viewport.contains(event.relatedTarget as Node | null)) { focused = false; sync(); }
  });
  window.addEventListener('scroll', () => {
    const delta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (!visible || document.hidden || pointer || focused || !autoplay) return;
    offset -= delta * .2;
    draw();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { velocity = 0; sync(); });
  reducedMotion.addEventListener('change', () => {
    if (preference === null) autoplay = !reducedMotion.matches;
    velocity = 0;
    sync();
  });
  document.addEventListener('site:language-change', sync);
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(viewport);
  } else visible = true;
  const resize = () => {
    width = viewport.clientWidth;
    cardWidth = Math.min(270, Math.max(190, width * .21));
    track.style.setProperty('--orbit-card-width', `${cardWidth}px`);
    sync();
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize, { passive: true });
  resize();
}
