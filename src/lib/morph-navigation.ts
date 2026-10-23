export function setupMorphNavigation() {
  const header = document.querySelector<HTMLElement>('.site-header');
  const dropdown = header?.querySelector<HTMLElement>('.morph-dropdown');
  const triggers = Array.from(header?.querySelectorAll<HTMLAnchorElement>('[data-nav-trigger]') ?? []);
  if (!header || !dropdown) return;
  const panels = Array.from(dropdown.querySelectorAll<HTMLElement>('[data-panel]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let active = -1;
  let closeTimer = 0;
  const close = () => {
    clearTimeout(closeTimer);
    dropdown.hidden = true;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    active = -1;
  };
  const position = () => {
    if (active < 0) return;
    const bounds = header.getBoundingClientRect();
    const trigger = triggers[active].getBoundingClientRect();
    const panel = panels[active];
    const width = Math.min(Number(panel.dataset.width), bounds.width - 24);
    dropdown.style.width = `${width}px`;
    dropdown.style.left = `${Math.max(12, Math.min(bounds.width - width - 12, trigger.left - bounds.left + trigger.width / 2 - width / 2))}px`;
    dropdown.style.height = `${panel.scrollHeight}px`;
  };
  const open = (index: number) => {
    clearTimeout(closeTimer);
    if (active === index) return;
    const previous = active;
    active = index;
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    triggers.forEach((trigger, i) => trigger.setAttribute('aria-expanded', `${i === index}`));
    dropdown.hidden = false;
    position();
    panels[index].getAnimations().forEach(a => a.cancel());
    if (!reduce.matches) panels[index].animate([
      { opacity: 0, transform: `translateX(${previous < index ? 12 : -12}px)`, filter: 'blur(5px)' },
      { opacity: 1, transform: 'translateX(0)', filter: 'blur(0)' },
    ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
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
  header.addEventListener('pointerleave', () => { closeTimer = window.setTimeout(close, 160); });
  header.addEventListener('focusout', event => { if (!header.contains(event.relatedTarget as Node | null)) close(); });
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target as Node)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active >= 0) { const trigger = triggers[active]; close(); trigger.focus(); }
  });
  document.addEventListener('site:language-change', position);
  window.addEventListener('resize', position, { passive: true });
}
