/** Motion inspired by the portfolio reference, without replacing the site's content. */
export function setupHomeMotion() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector<HTMLElement>('.immersive-hero');
  const cards = document.querySelectorAll<HTMLElement>('.home-project-card, .home-note-card');
  let scrollFrame = 0;
  let heroVisible = true;

  const updateHero = () => {
    scrollFrame = 0;
    if (!hero) return;
    const offset = reducedMotion.matches ? 0 : Math.max(-60, Math.min(60, -hero.getBoundingClientRect().top * .12));
    hero.style.setProperty('--hero-parallax', `${offset}px`);
  };
  const scheduleHero = () => {
    if (heroVisible && !scrollFrame) scrollFrame = requestAnimationFrame(updateHero);
  };
  window.addEventListener('scroll', scheduleHero, { passive: true });
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      hero.classList.toggle('is-offscreen', !heroVisible);
      if (heroVisible) scheduleHero();
    }).observe(hero);
  }

  const resetters: Array<() => void> = [];
  cards.forEach((card) => {
    const preview = document.createElement('span');
    preview.className = 'card-motion-preview';
    const translatePreview = () => {
      preview.textContent = document.documentElement.dataset.lang === 'zh' ? '查看 ↗' : 'View ↗';
    };
    translatePreview();
    document.addEventListener('site:language-change', translatePreview);
    preview.setAttribute('aria-hidden', 'true');
    card.append(preview);
    let pointerFrame = 0;
    let clientX = 0;
    let clientY = 0;

    const reset = () => {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      card.classList.remove('is-pointer-active');
      card.style.setProperty('--image-x', '0px');
      card.style.setProperty('--image-y', '0px');
    };
    resetters.push(reset);
    card.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const rect = card.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        card.style.setProperty('--preview-x', `${Math.max(42, Math.min(rect.width - 42, x))}px`);
        card.style.setProperty('--preview-y', `${Math.max(26, Math.min(rect.height - 26, y))}px`);
        card.style.setProperty('--image-x', `${(x / rect.width - .5) * 8}px`);
        card.style.setProperty('--image-y', `${(y / rect.height - .5) * 6}px`);
        card.classList.add('is-pointer-active');
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
    card.addEventListener('blur', reset);
  });

  const resetMotion = () => {
    resetters.forEach((reset) => reset());
    updateHero();
  };
  finePointer.addEventListener('change', resetMotion);
  reducedMotion.addEventListener('change', resetMotion);
  window.addEventListener('resize', resetMotion, { passive: true });
  scheduleHero();
}
