export function setupStudioMotion() {
  const story = document.querySelector<HTMLElement>('.window-story');
  const scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-scene-tab]'));
  const toggle = document.querySelector<HTMLButtonElement>('.motion-toggle');
  if (!story || !scenes.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const short = matchMedia('(max-height: 720px)');
  let paused = false, frame = 0, manual = false;
  const select = (index: number) => {
    scenes.forEach((scene,i) => { scene.classList.toggle('is-active', i === index); scene.inert = i !== index; });
    tabs.forEach((tab,i) => tab.setAttribute('aria-pressed', String(i === index)));
  };
  const update = () => {
    frame = 0;
    if (document.hidden || paused || reduce.matches || short.matches || manual) return;
    const rect = story.getBoundingClientRect();
    const top = innerWidth <= 600 ? 102 : 90;
    const progress = Math.max(0, Math.min(1, (top - rect.top) / Math.max(1, rect.height - innerHeight + top)));
    story.style.setProperty('--window-scale', String(.96 + Math.min(1, progress * 5) * .04));
    story.style.setProperty('--story-progress', String(progress));
    story.style.setProperty('--scene-progress', String(Math.min(1, (progress * scenes.length) % 1 + .08)));
    const index = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
    // Do not hide a project while a keyboard user is interacting with it.
    if (!scenes.some(scene => scene.contains(document.activeElement))) select(index);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  tabs.forEach((tab,i) => tab.addEventListener('click', () => { manual = true; select(i); story.style.setProperty('--scene-progress','1'); }));
  window.addEventListener('scroll', () => { manual = false; schedule(); }, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });
  const label = () => {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = document.documentElement.lang === 'zh-CN' ? (paused ? '继续动态' : '暂停动态') : (paused ? 'Resume motion' : 'Pause motion');
  };
  toggle?.addEventListener('click', () => { paused = !paused; document.body.classList.toggle('motion-paused',paused); label(); schedule(); });
  document.addEventListener('site:language-change', label);
  document.addEventListener('visibilitychange', () => { document.body.classList.toggle('page-hidden',document.hidden); schedule(); });
  reduce.addEventListener('change', schedule);
  short.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting)));
    document.querySelectorAll('.hero-asterisk,.cta-star').forEach(el => observer.observe(el));
  }
  select(0); label(); schedule();
}
