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
  let hovered: HTMLElement | null = null;
  const faces = slots.map(() => 0);
  let autoSpeed = 0;
  let scrollRemainder = 0;
  let snapTarget: number | null = null;
  let snapSpeed = 0;
  let holdUntil = 0;
  let hoverDelayUntil = 0;
  const needsFaceUpdate = () => faces.some((face, index) => Math.abs(face - (slots[index] === hovered ? 1 : 0)) > .001);

  const draw = () => {
    const circumference = spacing() * slots.length;
    const normalizedOffset = ((offset % circumference) + circumference) % circumference;
    slots.forEach((slot, index) => {
      const x = ((index * spacing() + normalizedOffset + circumference / 2) % circumference + circumference) % circumference - circumference / 2;
      const progress = x / Math.max(width / 2, 1);
      const depth = -Math.min(420, progress * progress * 170) * (1 - faces[index] * .55);
      const yaw = -Math.max(-52, Math.min(52, progress * 38)) * (1 - faces[index]);
      slot.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${depth}px) rotateY(${yaw}deg)`;
      slot.style.zIndex = slot === hovered ? '1100' : `${Math.round(1000 + depth)}`;
      const outside = Math.abs(x) > width / 2 + cardWidth;
      slot.style.opacity = outside ? '0' : '1';
      slot.style.pointerEvents = outside ? 'none' : 'auto';
    });
  };
  const canRun = () => visible && !document.hidden && !pointer && !focused &&
    ((autoplay && !hovered) || Math.abs(autoSpeed) > .001 || Math.abs(velocity) > .01 || Math.abs(scrollRemainder) > .05 || snapTarget !== null || needsFaceUpdate());
  const tick = (time: number) => {
    frame = 0;
    if (!canRun()) { previousTime = 0; return; }
    if (previousTime) {
      const elapsed = time - previousTime;
      const targetSpeed = autoplay && !hovered && snapTarget === null && Math.abs(velocity) < .02 && time > holdUntil ? -.085 : 0;
      const acceleration = Math.exp(-elapsed / 180);
      offset += targetSpeed * elapsed + (autoSpeed - targetSpeed) * 180 * (1 - acceleration);
      autoSpeed = targetSpeed + (autoSpeed - targetSpeed) * acceleration;
      offset += velocity * 520 * (1 - Math.exp(-elapsed / 520));
      velocity *= Math.exp(-elapsed / 520);
      const scrollStep = scrollRemainder * (1 - Math.exp(-elapsed / 140));
      offset += scrollStep;
      scrollRemainder -= scrollStep;
      if (snapTarget !== null && Math.abs(velocity) < .045) {
        velocity = 0;
        // Critically damped spring: settle on a project without oscillation or frame-rate dependence.
        const displacement = offset - snapTarget;
        const joint = snapSpeed + .012 * displacement;
        const decay = Math.exp(-.012 * elapsed);
        offset = snapTarget + (displacement + joint * elapsed) * decay;
        snapSpeed = (snapSpeed - .012 * joint * elapsed) * decay;
        if (Math.abs(offset - snapTarget) < .35 && Math.abs(snapSpeed) < .005) {
          offset = snapTarget;
          snapTarget = null;
          snapSpeed = 0;
          holdUntil = time + 650;
        }
      }
      faces.forEach((face, index) => {
        const target = slots[index] === hovered ? 1 : 0;
        faces[index] = reducedMotion.matches ? target : target + (face - target) * Math.exp(-elapsed / 100);
      });
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
    autoSpeed = 0;
    scrollRemainder = 0;
    snapTarget = null;
    try { localStorage.setItem('project-rotation', autoplay ? 'on' : 'off'); } catch {}
    sync();
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    suppressClick = false;
    velocity = 0;
    autoSpeed = 0;
    snapTarget = null;
    scrollRemainder = 0;
    hovered?.classList.remove('is-hovered');
    hovered = null;
    faces.fill(0);
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
    velocity = velocity * .35 + Math.max(-2.4, Math.min(2.4, dx / Math.max(1, event.timeStamp - pointer.time))) * .65;
    offset += dx;
    pointer.x = event.clientX;
    pointer.time = event.timeStamp;
    draw();
  });
  const release = (event: PointerEvent) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dragged = pointer.dragging;
    if (!dragged || reducedMotion.matches || event.type === 'pointercancel' || event.timeStamp - pointer.time > 160) velocity = 0;
    if (dragged) hoverDelayUntil = performance.now() + 700;
    pointer = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove('is-dragging');
    if (dragged) {
      suppressClick = true;
      focused = false;
      if (!reducedMotion.matches && event.type === 'pointerup') {
        // Predict the end of the fling, then draw it toward the nearest project.
        snapTarget = Math.round((offset + velocity * 520) / spacing()) * spacing();
        snapSpeed = 0;
      }
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
  cards.forEach((card, index) => {
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || pointer || performance.now() < hoverDelayUntil) return;
      hovered?.classList.remove('is-hovered');
      hovered = slots[index];
      hovered.classList.add('is-hovered');
      velocity = 0;
      snapTarget = null;
      scrollRemainder = 0;
      sync();
    });
    card.addEventListener('pointerleave', () => {
      if (hovered !== slots[index]) return;
      hovered.classList.remove('is-hovered');
      hovered = null;
      sync();
    });
  });
  viewport.addEventListener('click', (event) => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  viewport.addEventListener('focusin', (event) => {
    if (pointer) return;
    focused = true;
    velocity = 0;
    autoSpeed = 0;
    scrollRemainder = 0;
    snapTarget = null;
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
    if (hovered) return;
    scrollRemainder -= delta * .32;
    snapTarget = null;
    schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { velocity = 0; autoSpeed = 0; scrollRemainder = 0; snapTarget = null; sync(); });
  reducedMotion.addEventListener('change', () => {
    if (preference === null) autoplay = !reducedMotion.matches;
    velocity = 0;
    autoSpeed = 0;
    scrollRemainder = 0;
    snapTarget = null;
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
