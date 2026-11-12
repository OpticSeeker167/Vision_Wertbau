/**
 * Pure geometry for draggable text on transformed mockup surfaces.
 *
 * Matrices follow CSS/DOMMatrix's convention:
 *   screenX = a * localX + c * localY
 *   screenY = b * localX + d * localY
 *
 * Use the combined linear transform of the node's ANCESTORS. Translations and
 * transform origins do not affect a displacement. Perspective is not affine
 * and must not be passed through this helper as a flattened 2D matrix.
 */

const EPSILON = 1e-12;
const finite = Number.isFinite;

/** Return an inverse linear transform, or null for unusable input. */
export function invert2x2(matrix) {
  if (!matrix || ![matrix.a, matrix.b, matrix.c, matrix.d].every(finite)) return null;
  const scale = Math.max(Math.abs(matrix.a), Math.abs(matrix.b), Math.abs(matrix.c), Math.abs(matrix.d));
  if (scale === 0) return null;
  // Normalize before computing the determinant so uniform zoom values do not
  // turn a perfectly invertible transform into a false singularity.
  const a = matrix.a / scale;
  const b = matrix.b / scale;
  const c = matrix.c / scale;
  const d = matrix.d / scale;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) <= EPSILON) return null;
  const result = {
    a: (d / determinant) / scale,
    b: (-b / determinant) / scale,
    c: (-c / determinant) / scale,
    d: (a / determinant) / scale,
  };
  return Object.values(result).every(finite) ? result : null;
}

/**
 * Convert a pointer movement in viewport CSS pixels to an offset in the node's
 * parent axes. Returns null if the inverse would produce invalid coordinates.
 */
export function screenDeltaToLocal(dx, dy, matrix) {
  if (!finite(dx) || !finite(dy)) return null;
  const inverse = invert2x2(matrix);
  if (!inverse) return null;
  const result = {
    x: inverse.a * dx + inverse.c * dy,
    y: inverse.b * dx + inverse.d * dy,
  };
  return finite(result.x) && finite(result.y) ? result : null;
}

function rectangle(value) {
  if (!value) return null;
  const result = { x: value.x ?? 0, y: value.y ?? 0, width: value.width, height: value.height };
  return Object.values(result).every(finite) && result.width >= 0 && result.height >= 0 ? result : null;
}

function clampAxis(offset, origin, size, boundOrigin, boundSize, padding, minVisible) {
  const inset = Math.min(padding, boundSize / 2);
  const innerStart = boundOrigin + inset;
  const innerEnd = boundOrigin + boundSize - inset;
  const available = Math.max(0, innerEnd - innerStart);
  let minimum;
  let maximum;
  if (size <= available) {
    // A fitting element stays fully inside the padded surface.
    minimum = innerStart - origin;
    maximum = innerEnd - origin - size;
  } else {
    // An oversized element may move through the surface. Requiring only a
    // visible strip avoids snapping a very tall text block back to its top.
    const visible = Math.min(minVisible, available, size);
    minimum = innerStart + visible - origin - size;
    maximum = innerEnd - visible - origin;
  }
  return Math.min(maximum, Math.max(minimum, offset));
}

/**
 * Clamp a desired placement offset in a mockup's local coordinate system.
 *
 * offset: {x, y} relative to the normal CSS layout.
 * box: {x, y, width, height} BEFORE applying the placement offset.
 * bounds: {x=0, y=0, width, height} in the same local coordinates.
 *
 * For an absolutely positioned custom text at left:0/top:0, box.x and box.y
 * are zero and offset becomes its position. Padding is respected when the
 * element fits. On an oversized axis, at least minVisible pixels intersect
 * the padded surface (or its whole available size when smaller).
 *
 * Returns null for non-finite or negative geometry. No input is modified.
 */
export function clampOffset(offset, box, bounds, { padding = 16, minVisible = 32 } = {}) {
  const element = rectangle(box);
  const surface = rectangle(bounds);
  if (!offset || ![offset.x, offset.y, padding, minVisible].every(finite) || padding < 0 || minVisible < 0 || !element || !surface) return null;
  const result = {
    x: clampAxis(offset.x, element.x, element.width, surface.x, surface.width, padding, minVisible),
    y: clampAxis(offset.y, element.y, element.height, surface.y, surface.height, padding, minVisible),
  };
  return finite(result.x) && finite(result.y) ? result : null;
}
