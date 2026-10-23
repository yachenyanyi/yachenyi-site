export function setupMorphNavigation() {
  const header = document.querySelector<HTMLElement>('.site-header');
  const dropdown = header?.querySelector<HTMLElement>('.morph-dropdown');
  const triggers = Array.from(header?.querySelectorAll<HTMLAnchorElement>('[data-nav-trigger]') ?? []);
  if (!header || !dropdown) return;
  const panels = Array.from(dropdown.querySelectorAll<HTMLElement>('[data-panel]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const animations = new Map<HTMLElement, Animation>();
  const highlight = document.createElement('div');
  highlight.className = 'morph-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  dropdown.prepend(highlight);
  dropdown.classList.add('has-shared-highlight');
  let active = -1;
  let closeTimer = 0;
  let highlightTimer = 0;
  let highlighted: HTMLAnchorElement | null = null;
  let previewRequest = 0;
  const previewLinks = Array.from(dropdown.querySelectorAll<HTMLAnchorElement>('[data-preview-index]'));
  const previewImages = Array.from(dropdown.querySelectorAll<HTMLImageElement>('[data-preview-image]'));
  const showPreview = (link: HTMLAnchorElement) => {
    const index = Number(link.dataset.previewIndex);
    if (!Number.isInteger(index) || !previewImages[index]) return;
    const request = ++previewRequest;
    previewLinks.forEach((item, i) => item.classList.toggle('is-preview-active', i === index));
    const commit = () => {
      if (request !== previewRequest) return;
      previewImages.forEach((image, i) => image.classList.toggle('is-active', i === index));
    };
    const image = previewImages[index];
    if (image.complete && image.naturalWidth) commit();
    else image.decode().then(commit).catch(() => { /* Keep the last decoded preview on load failure. */ });
  };
  const clearHighlight = () => {
    clearTimeout(highlightTimer);
    highlighted = null;
    highlight.classList.remove('is-visible');
  };
  const follow = (link: HTMLAnchorElement, clientX?: number, clientY?: number) => {
    const panel = link.closest<HTMLElement>('.morph-panel');
    if (!panel || panel.hidden || panel.inert) return;
    // Layout offsets stay stable while the outer surface and content are morphing.
    let left = 0, top = 0;
    let node: HTMLElement | null = link;
    while (node && node !== dropdown) { left += node.offsetLeft; top += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
    const rect = link.getBoundingClientRect();
    const dx = clientX === undefined ? 0 : Math.max(-2, Math.min(2, (clientX - rect.left - rect.width / 2) * .065));
    const dy = clientY === undefined ? 0 : Math.max(-2, Math.min(2, (clientY - rect.top - rect.height / 2) * .065));
    highlight.style.width = `${link.offsetWidth}px`;
    highlight.style.height = `${link.offsetHeight}px`;
    highlight.style.transform = `translate3d(${left + dx}px,${top + dy}px,0)`;
    highlight.style.setProperty('--highlight-x', `${clientX === undefined ? 50 : Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100))}%`);
    highlight.style.setProperty('--highlight-y', `${clientY === undefined ? 50 : Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100))}%`);
  };
  panels.forEach(panel => {
    panel.querySelectorAll<HTMLAnchorElement>('.morph-panel__links > a').forEach(link => {
      const activate = (event?: PointerEvent) => {
        clearTimeout(highlightTimer);
        highlighted = link;
        follow(link, event?.clientX, event?.clientY);
        if (link.dataset.previewIndex !== undefined) showPreview(link);
        // A brief dwell avoids flashing every card crossed on the way to a target.
        highlightTimer = window.setTimeout(() => {
          if (highlighted === link) highlight.classList.add('is-visible');
        }, reduce.matches ? 0 : 45);
      };
      link.addEventListener('pointerenter', event => { if (fine.matches) activate(event); });
      link.addEventListener('pointermove', event => { if (highlighted === link) follow(link, event.clientX, event.clientY); });
      link.addEventListener('pointerleave', () => {
        if (link.dataset.previewIndex !== undefined) return;
        clearTimeout(highlightTimer);
        highlighted = null;
        highlightTimer = window.setTimeout(() => highlight.classList.remove('is-visible'), 120);
      });
      link.addEventListener('focus', () => activate());
      link.addEventListener('blur', clearHighlight);
    });
  });
  const close = () => {
    clearTimeout(closeTimer); clearHighlight();
    animations.forEach(animation => animation.cancel()); animations.clear();
    dropdown.hidden = true;
    panels.forEach(panel => { panel.hidden = true; panel.inert = true; });
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    active = -1;
  };
  const position = () => {
    if (active < 0) return;
    const bounds = header.getBoundingClientRect();
    const trigger = triggers[active].getBoundingClientRect();
    const panel = panels[active];
    const width = Math.min(Number(panel.dataset.width), bounds.width - 24);
    panel.style.width = `${width}px`;
    dropdown.style.width = `${width}px`;
    dropdown.style.left = `${Math.max(12, Math.min(bounds.width - width - 12, trigger.left - bounds.left - 16))}px`;
    dropdown.style.height = `${panel.scrollHeight}px`;
    if (highlighted) follow(highlighted);
  };
  const transitionPanel = (panel: HTMLElement, entering: boolean, direction: number, wasHidden = false) => {
    const style = getComputedStyle(panel);
    const from = wasHidden ? { opacity: 0, transform: `translateX(${direction * 32}px)`, filter: 'blur(9px)' }
      : { opacity: style.opacity, transform: style.transform, filter: style.filter };
    animations.get(panel)?.cancel();
    if (reduce.matches) { panel.hidden = !entering; return; }
    const animation = panel.animate([from, entering
      ? { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' }
      : { opacity: 0, transform: `translateX(${-direction * 26}px)`, filter: 'blur(9px)' },
    ], { duration: entering ? 680 : 520, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    animations.set(panel, animation);
    animation.finished.then(() => {
      if (animations.get(panel) !== animation) return;
      if (!entering && panels[active] !== panel) panel.hidden = true;
      animation.cancel(); animations.delete(panel);
    }).catch(() => { /* Re-targeting a running transition is intentional. */ });
  };
  const open = (index: number) => {
    clearTimeout(closeTimer);
    if (active === index) return;
    const previous = active;
    const direction = previous < index ? 1 : -1;
    const wasHidden = Boolean(panels[index].hidden);
    clearHighlight();
    active = index;
    // Move keyboard focus out before making the outgoing panel inert.
    if (previous >= 0 && panels[previous].contains(document.activeElement)) triggers[index].focus({ preventScroll: true });
    panels.forEach((panel, i) => {
      panel.inert = i !== index;
      panel.style.pointerEvents = i === index ? '' : 'none';
      if (i !== index && i !== previous) { animations.get(panel)?.cancel(); animations.delete(panel); panel.hidden = true; }
    });
    panels[index].hidden = false;
    triggers.forEach((trigger, i) => trigger.setAttribute('aria-expanded', `${i === index}`));
    dropdown.hidden = false;
    position();
    const selected = panels[index].querySelector<HTMLAnchorElement>('[data-preview-index].is-preview-active');
    if (selected) {
      highlighted = selected;
      follow(selected);
      highlight.classList.add('is-visible');
    }
    if (previous >= 0) transitionPanel(panels[previous], false, direction);
    transitionPanel(panels[index], true, direction, wasHidden);
    // One shared surface moves and resizes; blur belongs to its traveling contents.

  };
  triggers.forEach((trigger, index) => {
    trigger.addEventListener('pointerenter', () => { if (fine.matches) open(index); });
    trigger.addEventListener('click', event => {
      if (!fine.matches && active !== index) { event.preventDefault(); open(index); }
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault(); open(index); panels[index].querySelector<HTMLAnchorElement>('a')?.focus();
      }
    });
  });
  header.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  header.addEventListener('pointerleave', () => { closeTimer = window.setTimeout(close, 200); });
  dropdown.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  header.addEventListener('focusout', event => { if (!header.contains(event.relatedTarget as Node | null)) close(); });
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target as Node)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active >= 0) { const trigger = triggers[active]; close(); trigger.focus(); }
  });
  reduce.addEventListener('change', () => { if (active >= 0) close(); });
  document.addEventListener('site:language-change', position);
  window.addEventListener('resize', position, { passive: true });
}
