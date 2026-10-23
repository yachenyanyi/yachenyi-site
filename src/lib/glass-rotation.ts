/** Cube orientation in CSS/viewer coordinates: x right, y down, z toward the user. */
export function createGlassRotation() {
  let x = 0, y = 0, z = 0, w = 1;

  const rotate = (pitch: number, yaw: number) => {
    const angle = Math.hypot(pitch, yaw);
    if (!angle) return;
    const scale = Math.sin(angle / 2) / angle;
    const dx = pitch * scale, dy = yaw * scale, dw = Math.cos(angle / 2);
    // Pre-multiply so every drag uses the viewer's axes, regardless of the visible face.
    const nextX = dw * x + dx * w + dy * z;
    const nextY = dw * y + dy * w - dx * z;
    const nextZ = dw * z + dx * y - dy * x;
    const nextW = dw * w - dx * x - dy * y;
    const length = Math.hypot(nextX, nextY, nextZ, nextW);
    x = nextX / length; y = nextY / length; z = nextZ / length; w = nextW / length;
  };

  const reset = () => {
    x = y = z = 0; w = 1;
    rotate(.28, 0);
    rotate(0, -.45);
  };

  // Column-major local-to-view matrix, shared by both renderers.
  const matrix = () => [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ];

  const cssTransform = () => {
    const m = matrix();
    return `matrix3d(${[m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1].join(',')})`;
  };

  const viewToLocal = () => {
    const m = matrix();
    // WebGL rays use y up and need the inverse object transform: S * transpose(M) * S.
    return new Float32Array([m[0], -m[3], m[6], -m[1], m[4], -m[7], m[2], -m[5], m[8]]);
  };

  reset();
  return { rotate, reset, cssTransform, viewToLocal };
}
