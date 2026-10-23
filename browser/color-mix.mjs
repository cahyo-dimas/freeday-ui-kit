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
 *
 * v3.7.0 removed the LAST ten mixes, the ones a channel triple could not express because they tint
 * one role over another: the categorical tone modifiers and .fdy-file--error. Those are computed by
 * tokens/build.mjs now, and the two tests at the bottom of this file are what makes that safe —
 * the first asserts the kit ships none at all, so the ban is a fact about the build output rather
 * than a convention; the second compares every computed token against the mix it replaced by the
 * PIXEL Chrome actually painted, which is the only instrument that settles it. A build-time mix is
 * rounded to 8 bits and the mix it replaces is not, so their computed VALUES differ by up to
 * 0.5/255 by construction; what the two of them put in the framebuffer is identical, and that is
 * the claim worth asserting.
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

// --- nothing left to mix ---------------------------------------------------

test('the shipped stylesheets declare no color-mix() at all', () => {
  /* The ban has to be a fact about the OUTPUT, not about the sources: dist/freeday.bundle.css is
     the file most apps actually load and no node test reads it, so a mix that reached it through a
     stale build would have shipped unseen. Comments are stripped first — the three sheets carry
     several paragraphs explaining why the function is banned, and a guard that cannot tell prose
     from a declaration would force those paragraphs to be deleted to stay green. */
  for (const name of ['freeday.bundle.css', 'freeday.css', 'freeday.tokens.css']) {
    const css = readFileSync(join(REPO, 'dist', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const found = [...css.matchAll(/[^;{}]*color-mix\([^;}]*/g)].map(m => m[0].trim());
    assert.deepEqual(found, [],
      `dist/${name} still declares color-mix(); it is computed in tokens/build.mjs now, because a ` +
      `mix carrying var() drops its property to the INITIAL value on Safari <= 16.1`);
    assert.equal(/@supports\s+not\s*\(\s*color\s*:\s*color-mix\(/.test(css), false,
      `dist/${name} still guards for color-mix() with @supports; nothing calls it, so the block is ` +
      `dead CSS that reads like a live safety net`);
  }
});

/* Each precomputed token beside the mix it replaced. Read off the token sheet rather than listed,
   so a tone that gains a part is covered the moment it is built. */
const TONE_PARTS = [
  ['bg', 18, 'var(--color-surface)'],
  ['ink', 50, 'var(--color-text)'],
  ['border', 30, 'var(--color-border)'],
  ['border-soft', 26, 'transparent'],
];
const PRECOMPUTED = [
  ...TONE_PARTS.flatMap(([part, pct, over]) =>
    [...new Set([...tokens.matchAll(new RegExp(`--tone-(\\d+)-${part}\\s*:`, 'g'))].map(m => m[1]))]
      .map(n => [`--tone-${n}-${part}`, `color-mix(in srgb,var(--tone-${n}) ${pct}%,${over})`])),
  ['--color-danger-border', 'color-mix(in srgb,var(--color-danger) 40%,var(--color-border))'],
];

test('every precomputed colour paints the byte its color-mix() painted', { skip }, async () => {
  assert.ok(PRECOMPUTED.length >= 33,
    `found only ${PRECOMPUTED.length} precomputed colours; the token sheet shape changed`);

  await withPage(fixture('color-mix-identity.html'), async (p) => {
    await ready(p);
    for (const theme of ['light', 'dark']) {
      /* Laid out as a grid of fixed 8px swatches so every probe is inside the viewport: pixelAt
         screenshots a point, and a probe below the fold reads back as the page ground — which
         compares equal to its neighbour and passes while proving nothing. The magenta ground is
         there to catch exactly that. */
      const placed = await p.evalJS(`(() => {
        document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
        document.documentElement.style.background = '#f0f';
        const pairs = ${JSON.stringify(PRECOMPUTED)};
        const host = document.getElementById('probes');
        host.textContent = '';
        const out = [];
        pairs.forEach(([token, mix], i) => {
          const x = (i % 8) * 20, y = Math.floor(i / 8) * 10;
          const put = (value, left) => {
            /* A swatch inside an OPAQUE grey ground, so a translucent edge is compared as it is
               actually seen. Two stacked elements rather than one with a two-stop gradient:
               Chrome dithers gradients, and a dithered byte is a flaky byte. */
            const ground = document.createElement('i');
            ground.style.cssText = 'position:fixed;width:8px;height:8px;background:#808080;top:' + y + 'px;left:' + left + 'px';
            const el = document.createElement('i');
            el.style.cssText = 'display:block;width:8px;height:8px';
            el.style.background = value;
            ground.append(el);
            host.append(ground);
          };
          put('var(' + token + ')', x);
          put(mix, x + 10);
          out.push([token, mix, x, y]);
        });
        return out;
      })()`);
      assert.equal(placed.length, PRECOMPUTED.length, 'the probes did not all get placed');

      for (const [token, mix, x, y] of placed) {
        const ours = await p.pixelAt(x + 4, y + 4);
        const ref = await p.pixelAt(x + 14, y + 4);
        const show = (c) => `${c.r},${c.g},${c.b}`;
        assert.notDeepEqual(ref, { r: 255, g: 0, b: 255 },
          `${theme}: the color-mix() reference for ${token} was never painted (the ground is showing)`);
        assert.deepEqual(ours, ref,
          `${theme}: ${token} paints ${show(ours)}, but \`${mix}\` — the mix it replaced — paints ${show(ref)}`);
      }
    }
  });
});

test('the chip remove veil is the currentColor mix it replaced', { skip }, async () => {
  /* The last mix to go was `.fdy-chip__remove:hover { background: color-mix(in srgb, currentColor
     16%, transparent) }`, and it was the one mix no token could answer: currentColor there is
     whatever the chip variant set, --color-text or --color-primary-strong or --tone-N-ink. It is an
     absolutely-positioned ::before at `opacity:.16` now, which is the same colour by algebra —
     `F·.16 + .84·ground` whether the .16 arrives as an alpha or as an opacity, including over the
     × glyph, where F equals the glyph's own colour and composites back to it.
     Algebra is the argument; this is the measurement, at the ink of each chip variant. */
  await withPage(fixture('color-mix-identity.html'), async (p) => {
    await ready(p);
    const INKS = ['var(--color-text)', 'var(--color-primary-strong)', 'var(--tone-5-ink)'];
    for (const theme of ['light', 'dark']) {
      const placed = await p.evalJS(`(() => {
        document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
        document.documentElement.style.background = '#f0f';
        const host = document.getElementById('probes');
        host.textContent = '';
        const out = [];
        ${JSON.stringify(INKS)}.forEach((ink, i) => {
          const y = i * 12;
          /* Both over the chip's own fill, and both carrying the GLYPH as well as the wash, so the
             comparison covers the antialiased edges the algebra is least obvious about. */
          const put = (left, veiled) => {
            const btn = document.createElement('span');
            btn.style.cssText = 'position:fixed;top:' + y + 'px;left:' + left + 'px;width:10px;height:10px;'
              + 'background:var(--color-surface-3);color:' + ink + ';font:10px/10px monospace';
            btn.textContent = '×';
            const veil = document.createElement('span');
            veil.style.cssText = 'position:absolute;inset:0;background:'
              + (veiled ? 'currentColor;opacity:.16' : 'color-mix(in srgb,currentColor 16%,transparent)');
            btn.append(veil);
            host.append(btn);
          };
          put(0, true);
          put(14, false);
          out.push([ink, y]);
        });
        return out;
      })()`);
      assert.equal(placed.length, INKS.length, 'the veil probes did not all get placed');

      for (const [ink, y] of placed) {
        /* Two points, deliberately: x+2 lands on the × stroke and x+5 on the bare wash beside it
           (measured — 66,70,80 against 203,206,211 in light), so the comparison covers the
           antialiased ink as well as the flat tint. Either one alone would prove half of it. */
        for (const dx of [2, 5]) {
          const ours = await p.pixelAt(dx, y + 5);
          const ref = await p.pixelAt(14 + dx, y + 5);
          const show = (c) => `${c.r},${c.g},${c.b}`;
          assert.notDeepEqual(ref, { r: 255, g: 0, b: 255 },
            `${theme}: the currentColor mix over ${ink} was never painted (the ground is showing)`);
          assert.deepEqual(ours, ref,
            `${theme}: at x+${dx} the opacity veil over ${ink} paints ${show(ours)}, the mix it ` +
            `replaced paints ${show(ref)}`);
        }
      }
    }
  });
});
