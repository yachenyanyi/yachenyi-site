import type { GlassFrame } from './renderer';

/** Aligned decorative copies only: foreground text is never captured or distorted. */
export function createGlassBackdrops(ready: () => void) {
  const images = new Map<string, HTMLImageElement>();
  const frames = new Map<string, GlassFrame>();
  let revision = 0;
  const imageFor = (url: string) => {
    let image = images.get(url);
    if (!image) {
      image = new Image(); image.crossOrigin = 'anonymous'; image.decoding = 'async';
      image.onload = () => { revision++; frames.clear(); ready(); };
      images.set(url, image); image.src = url;
    }
    return image.naturalWidth ? image : null;
  };
  const cover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, w: number, h: number) => {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
  };
  const makeFrame = (key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    let frame = frames.get(key);
    if (frame) return frame;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2048 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(canvas.width / width, canvas.height / height); paint(ctx);
    frame = { canvas, key }; frames.set(key, frame);
    if (frames.size > 12) frames.delete(frames.keys().next().value!);
    return frame;
  };
  return {
    clear() { revision++; frames.clear(); },
    resolve(root: HTMLElement, canvas: HTMLCanvasElement, width: number, height: number) {
      const source = root.dataset.liquidImage;
      const scene = root.closest<HTMLElement>('[data-liquid-scene]');
      if (source && scene) {
        const image = imageFor(source);
        if (!image) return null;
        const w = scene.clientWidth, h = scene.clientHeight;
        if (!w || !h) return null;
        const original = scene.querySelector<HTMLImageElement>('[data-liquid-source]');
        const style = original ? getComputedStyle(original) : null;
        const filter = style?.filter ?? 'none';
        const key = `${revision}|${source}|${w}|${h}|${filter}`;
        const frame = makeFrame(key, w, h, ctx => { ctx.filter = filter; cover(ctx, image, w, h); });
        if (!frame) return null;
        let left = root.clientLeft, top = root.clientTop;
        let node: HTMLElement | null = root;
        while (node && node !== scene) { left += node.offsetLeft; top += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
        const transform = style?.transform;
        const matrix = new DOMMatrixReadOnly(transform && transform !== 'none' ? transform : undefined);
        const sx = matrix.a || 1, sy = matrix.d || 1;
        return { frame, bounds: [
          .5 + (left / w - .5 - matrix.e / w) / sx,
          .5 + (1 - (top + height) / h - .5 + matrix.f / h) / sy,
          width / w / sx, height / h / sy,
        ] };
      }
      const style = getComputedStyle(document.body);
      const url = style.getPropertyValue('--ambient-image').trim().match(/^url\(["']?(.*?)["']?\)$/)?.[1];
      if (!url) return null;
      const image = imageFor(url);
      if (!image) return null;
      const w = innerWidth, h = innerHeight;
      const colors = ['--ambient-glow', '--ambient-shade-top', '--ambient-shade-middle', '--ambient-shade-bottom'].map(name => style.getPropertyValue(name).trim());
      const key = `${revision}|viewport|${url}|${w}|${h}|${colors.join('|')}`;
      const frame = makeFrame(key, w, h, ctx => {
        cover(ctx, image, w, h);
        const shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, colors[1] || 'transparent'); shade.addColorStop(.55, colors[2] || 'transparent'); shade.addColorStop(1, colors[3] || 'transparent');
        ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
        const cx = w * .12, cy = h * .65, rx = w * .88 * Math.SQRT2, ry = h * .65 * Math.SQRT2;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, colors[0] || 'transparent'); glow.addColorStop(.65, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(-cx / rx, -cy / ry, w / rx, h / ry); ctx.restore();
      });
      if (!frame) return null;
      const rect = canvas.getBoundingClientRect();
      return { frame, bounds: [rect.left / w, 1 - rect.bottom / h, rect.width / w, rect.height / h] };
    },
  };
}
