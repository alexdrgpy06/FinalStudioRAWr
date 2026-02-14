import test from 'node:test';
import assert from 'node:assert';
import { parseCubeLUT } from './webgl-engine.js';

test('parseCubeLUT - basic valid data', () => {
  const data = `
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
  `;
  const result = parseCubeLUT(data);
  assert.strictEqual(result.size, 2);
  assert.strictEqual(result.data.length, 24); // 8 points * 3 components
  assert.strictEqual(result.data[0], 0.0);
  assert.strictEqual(result.data[23], 1.0);
});

test('parseCubeLUT - with comments and extra whitespace', () => {
  const data = `
# This is a comment
TITLE "Test LUT"

LUT_3D_SIZE 2

0.0 0.0 0.0
1.0 0.0 0.0
  0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0 # trailing comment
  `;
  const result = parseCubeLUT(data);
  assert.strictEqual(result.size, 2);
  assert.strictEqual(result.data.length, 24);
});

test('parseCubeLUT - missing size', () => {
  const data = `
0.0 0.0 0.0
1.0 1.0 1.0
  `;
  const result = parseCubeLUT(data);
  assert.strictEqual(result.size, 0);
  assert.strictEqual(result.data.length, 6);
});

test('parseCubeLUT - invalid data lines', () => {
  const data = `
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 1.0
0.0 0.0 0.0 0.0
1.0 1.0 1.0
  `;
  const result = parseCubeLUT(data);
  assert.strictEqual(result.size, 2);
  assert.strictEqual(result.data.length, 6); // Only the 3-component lines
});

test('parseCubeLUT - empty input', () => {
  const result = parseCubeLUT("");
  assert.strictEqual(result.size, 0);
  assert.strictEqual(result.data.length, 0);
});

test('parseCubeLUT - handles negative values and different decimal formats', () => {
  const data = `
LUT_3D_SIZE 2
-0.5 0.5 .5
-.1 -.2 -.3
  `;
  const result = parseCubeLUT(data);
  assert.strictEqual(result.size, 2);
  assert.strictEqual(result.data.length, 6);
  assert.strictEqual(result.data[0], -0.5);
  assert.strictEqual(result.data[2], 0.5);
  // Use a small epsilon for float comparison due to Float32Array precision
  assert.ok(Math.abs(result.data[3] - (-0.1)) < 1e-7);
  assert.ok(Math.abs(result.data[5] - (-0.3)) < 1e-7);
});
