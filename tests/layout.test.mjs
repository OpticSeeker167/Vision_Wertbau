import test from 'node:test';
import assert from 'node:assert/strict';
import { invert2x2, screenDeltaToLocal, clampOffset } from '../dist/js/layout.js';

function close(actual, expected, tolerance = 1e-8) {
  assert(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

function multiply(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
  };
}

test('screen delta inverts nested artboard zoom, card rotation, skew and single-card scale', () => {
  const angle = -12 * Math.PI / 180;
  const skew = Math.tan(5 * Math.PI / 180);
  const rotation = { a: Math.cos(angle), b: Math.sin(angle), c: -Math.sin(angle), d: Math.cos(angle) };
  const card = multiply(rotation, { a: 1, b: 0, c: skew, d: 1 });
  const matrix = multiply({ a: 0.43, b: 0, c: 0, d: 0.43 }, multiply({ a: 1.35, b: 0, c: 0, d: 1.35 }, card));
  const wanted = { x: 73, y: -19 };
  const screenX = matrix.a * wanted.x + matrix.c * wanted.y;
  const screenY = matrix.b * wanted.x + matrix.d * wanted.y;
  const result = screenDeltaToLocal(screenX, screenY, matrix);
  close(result.x, wanted.x);
  close(result.y, wanted.y);
});

test('screen delta preserves direction on a skewed facade and on flipped axes', () => {
  const facade = { a: 0.6, b: 0.6 * Math.tan(11.7 * Math.PI / 180), c: 0, d: 0.6 };
  const horizontal = screenDeltaToLocal(30, facade.b * 50, facade);
  close(horizontal.x, 50);
  close(horizontal.y, 0);
  assert.deepEqual(screenDeltaToLocal(20, -12, { a: -2, b: 0, c: 0, d: 3 }), { x: -10, y: -4 });
});

test('inverse rejects singular or non-finite matrices but accepts a tiny uniform zoom', () => {
  assert.equal(invert2x2({ a: 1, b: 2, c: 2, d: 4 }), null);
  assert.equal(invert2x2({ a: 0, b: 0, c: 0, d: 0 }), null);
  assert.equal(screenDeltaToLocal(1, 2, { a: Infinity, b: 0, c: 0, d: 1 }), null);
  assert.equal(screenDeltaToLocal(NaN, 2, { a: 1, b: 0, c: 0, d: 1 }), null);
  const tiny = screenDeltaToLocal(0.0003, -0.0002, { a: 0.00001, b: 0, c: 0, d: 0.00001 });
  close(tiny.x, 30);
  close(tiny.y, -20);
});

test('fitting text stays inside 16px padding using its normal-layout origin', () => {
  const box = Object.freeze({ x: 40, y: 30, width: 100, height: 20 });
  const bounds = Object.freeze({ width: 300, height: 200 });
  const desired = Object.freeze({ x: -100, y: 1000 });
  assert.deepEqual(clampOffset(desired, box, bounds), { x: -24, y: 134 });
  assert.deepEqual(clampOffset({ x: 20, y: 40 }, box, bounds), { x: 20, y: 40 });
  assert.equal(box.x, 40);
  assert.equal(desired.x, -100);
});

test('custom absolute text treats offset as position and honors shifted bounds', () => {
  assert.deepEqual(
    clampOffset({ x: 999, y: -999 }, { width: 80, height: 30 }, { x: 20, y: 40, width: 300, height: 200 }),
    { x: 224, y: 56 },
  );
});

test('oversized text remains movable without snapping its top back into view', () => {
  const box = { x: 16, y: 16, width: 180, height: 1200 };
  const bounds = { width: 240, height: 700 };
  assert.deepEqual(clampOffset({ x: 0, y: -700 }, box, bounds), { x: 0, y: -700 });
  const topExtreme = clampOffset({ x: 0, y: -9999 }, box, bounds);
  const bottomExtreme = clampOffset({ x: 0, y: 9999 }, box, bounds);
  close(box.y + topExtreme.y + box.height, 16 + 32);
  close(box.y + bottomExtreme.y, 700 - 16 - 32);
});

test('small surfaces and oversized width keep a finite visible intersection', () => {
  const result = clampOffset({ x: -999, y: 999 }, { x: 0, y: 0, width: 200, height: 200 }, { width: 20, height: 20 });
  assert.deepEqual(result, { x: -190, y: 10 });
  assert.equal(clampOffset({ x: 0, y: Infinity }, { width: 20, height: 20 }, { width: 100, height: 100 }), null);
  assert.equal(clampOffset({ x: 0, y: 0 }, { width: -1, height: 20 }, { width: 100, height: 100 }), null);
});
