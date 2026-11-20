/* The default output does not move. Captured from 3.20.0 before the neutral axis existed: every
 * value a consumer could observe without data-neutral, in light and dark, soft and glass, and
 * what each primary palette changes. New tokens are allowed; a captured one that resolves to
 * anything else is a regression for every app that never opted in. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTokensCss } from '../tokens/build.mjs';
import { snapshot } from './token-scopes.mjs';

const tokens = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
const expected = JSON.parse(readFileSync(new URL('./fixtures/tokens-3.20.0.json', import.meta.url), 'utf8'));
const actual = snapshot(buildTokensCss(tokens), Object.keys(expected.palettes));

/* Tier-1 channel triples that stop being emitted in 3.21.0, when every semantic asks for
   {neutral.N.rgb} instead of {slate.N.rgb}. Primitives are not public API (USAGE.md lists the
   semantic triples that ship), no component reads these, and CHANGELOG 3.21.0 names them. Nothing
   else may leave. */
const RETIRED = new Set(['--slate-0-rgb', '--slate-900-rgb', '--slate-950-rgb']);

for (const style of ['soft', 'glass']) {
  for (const theme of ['light', 'dark']) {
    test(`3.20.0 values hold: ${style} ${theme}`, () => {
      const was = expected[style][theme];
      assert.ok(Object.keys(was).length > 300, 'the fixture holds almost nothing, it was captured wrong');
      const moved = Object.keys(was)
        .filter((k) => !RETIRED.has(k))
        .filter((k) => actual[style][theme][k] !== was[k])
        .map((k) => `${k}: ${was[k]} -> ${actual[style][theme][k]}`);
      assert.deepEqual(moved, [], `default output changed:\n  ${moved.join('\n  ')}`);
    });
  }
}

for (const palette of Object.keys(expected.palettes)) {
  test(`3.20.0 values hold: palette ${palette}`, () => {
    assert.deepEqual(actual.palettes[palette], expected.palettes[palette]);
  });
}
