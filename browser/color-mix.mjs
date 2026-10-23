/* Browser regression spec: a channel triple really is its role's channels.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * The kit stopped using color-mix() in v3.7.0 because it is not a safe way to put an alpha on a
 * var() colour: a declaration containing var() is assumed valid at PARSE time and only fails at
 * computed-value time, where the property drops to its INITIAL value instead of to the fallback
 * declaration above it. On Safari <= 16.1 that turned 17 border-colors into currentColor — thick
 * black outlines on every iPhone that stopped at iOS 15. Every alpha is now written
 * `rgba(var(--color-<role>-rgb), .26)`, which is the same colour and parses back to Safari 9.
 *
 * "The same colour" is the claim, and test/color-mix.test.mjs checks it against the token file with
 * the kit's OWN arithmetic. That is the weak half of the proof: the same resolver would agree with
 * itself even if the identity were wrong. This asserts it in a real engine instead — the kit's
 * static form against the color-mix() it replaced, resolved by the browser, in both themes and
 * across palettes, so a triple that drifts from its role is caught by something that is not us.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

/* Read the roles off the shipped stylesheet rather than listing them here: a role that gains a
   triple is covered the moment it is built, and one that loses it stops being asserted. */
const tokens = readFileSync(join(REPO, 'dist', 'freeday.tokens.css'), 'utf8');
const ROLES = [...new Set([...tokens.matchAll(/--color-([\w-]+)-rgb\s*:/g)].map(m => m[1]))].sort();

/* The alphas the components actually ask for, so the check runs at the percentages that ship
   rather than at one convenient value. */
const components = readFileSync(join(REPO, 'dist', 'freeday.css'), 'utf8');
const ALPHAS = [...new Set([...components.matchAll(/rgba\(var\(--color-[\w-]+-rgb\),(\.\d+)\)/g)].map(m => m[1]))].sort();

/* The probe host has to EXIST before anything evaluates against it. `waitFor` returns false on
   timeout rather than throwing, and ignoring that return is how this spec failed under
   --test-concurrency=3: three Chromes competing, readyState not yet complete, and
   `document.getElementById('probes')` came back null inside the page. Asserted, not assumed. */
async function ready(p) {
  const ok = await p.waitFor(
    "document.readyState === 'complete' && document.getElementById('probes') !== null",
    { timeout: 20000 },
  );
  assert.ok(ok, 'the probe fixture never finished loading');
}

const COMBOS = [
  ['light', 'azure'], ['dark', 'azure'], ['light', 'yellow'],
  ['dark', 'noir'], ['light', 'orange'], ['dark', 'violet'],
];

/** `rgb(32, 80, 216)` / `color(srgb .12 .31 .84 / .26)` -> [r, g, b, a] in 0..255 / 0..1. */
function channels(computed) {
  let m = computed.match(/^color\(srgb\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
  if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]];
  m = computed.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; }
  throw new Error('cannot read channels from: ' + computed);
}

test('rgba(var(--color-*-rgb), a) is the colour color-mix() would have made', { skip }, async () => {
  assert.ok(ROLES.length >= 9, `found only ${ROLES.length} roles with a channel triple; the token sheet shape changed`);
  assert.ok(ALPHAS.length >= 9, `found only ${ALPHAS.length} alphas in use; the components changed shape`);

  await withPage(fixture('color-mix-identity.html'), async (p) => {
    await ready(p);

    /* One probe pair per role x alpha. `color` is the property under test because it takes a bare
       <color>, so nothing else in the computed value can hide a difference. */
    const built = await p.evalJS(`(() => {
      const roles = ${JSON.stringify(ROLES)}, alphas = ${JSON.stringify(ALPHAS)};
      const host = document.getElementById('probes');
      host.textContent = '';
      for (const role of roles) for (const a of alphas) {
        const ours = document.createElement('i');
        ours.id = 'ours-' + role + '-' + a.slice(1);
        ours.style.color = 'rgba(var(--color-' + role + '-rgb),' + a + ')';
        const ref = document.createElement('i');
        ref.id = 'ref-' + role + '-' + a.slice(1);
        ref.style.color = 'color-mix(in srgb,var(--color-' + role + ') ' + Math.round(parseFloat(a) * 100) + '%,transparent)';
        host.append(ours, ref);
      }
      return host.children.length;
    })()`);
    assert.equal(built, ROLES.length * ALPHAS.length * 2, 'the probes did not all get built');

    for (const [theme, primary] of COMBOS) {
      const seen = await p.evalJS(`(() => {
        document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
        document.documentElement.setAttribute('data-primary', ${JSON.stringify(primary)});
        const roles = ${JSON.stringify(ROLES)}, alphas = ${JSON.stringify(ALPHAS)};
        const out = [];
        for (const role of roles) for (const a of alphas) {
          out.push([role, a,
            getComputedStyle(document.getElementById('ours-' + role + '-' + a.slice(1))).color,
            getComputedStyle(document.getElementById('ref-' + role + '-' + a.slice(1))).color]);
        }
        return out;
      })()`);

      for (const [role, alpha, ours, ref] of seen) {
        /* A reference that did not resolve would make every comparison below vacuously true. */
        assert.notEqual(ref, 'rgb(0, 0, 0)',
          `${theme}/${primary}: the color-mix() reference for --color-${role} at ${alpha} did not resolve`);
        const a = channels(ours), b = channels(ref);
        for (let i = 0; i < 3; i++) {
          assert.ok(Math.abs(a[i] - b[i]) <= 1,
            `${theme}/${primary}: --color-${role}-rgb at ${alpha} is ${ours}, but the mix it replaces is ${ref}`);
        }
        assert.ok(Math.abs(a[3] - b[3]) <= 0.006,
          `${theme}/${primary}: --color-${role}-rgb at ${alpha} carries alpha ${a[3]}, the mix carries ${b[3]}`);
      }
    }
  });
});

test('the flattened stripe is the blend it replaced, to the byte', { skip }, async () => {
  /* --color-surface-stripe is the one colour that was flattened into a literal rather than
     re-expressed, because a frozen column paints it and scrolls over its neighbours, so it has to
     stay OPAQUE. A literal is exactly the kind of value that goes stale when the surfaces around it
     are retuned, so the blend it stands for is re-derived here and compared. */
  await withPage(fixture('color-mix-identity.html'), async (p) => {
    await ready(p);
    for (const theme of ['light', 'dark']) {
      const [ours, ref] = await p.evalJS(`(() => {
        document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
        const host = document.getElementById('probes');
        host.textContent = '';
        const a = document.createElement('i'), b = document.createElement('i');
        a.style.color = 'var(--color-surface-stripe)';
        b.style.color = 'color-mix(in srgb,var(--color-surface-2) 55%,var(--color-surface))';
        host.append(a, b);
        return [getComputedStyle(a).color, getComputedStyle(b).color];
      })()`);
      const x = channels(ours), y = channels(ref);
      for (let i = 0; i < 3; i++) {
        assert.equal(Math.round(x[i]), Math.round(y[i]),
          `${theme}: --color-surface-stripe is ${ours}, but 55% of --color-surface-2 over --color-surface is ${ref}`);
      }
      assert.equal(x[3], 1, `${theme}: the stripe must be opaque, a frozen column paints it`);
    }
  });
});
