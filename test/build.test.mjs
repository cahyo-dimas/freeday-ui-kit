import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flatten, resolveValue, buildTokensCss, bundleCss, bundleJs, bundleFullCss, buildMediaCss, buildNeutralsCss, buildPrimaryFillCss, hexToTriple, hexOfName, valueIndex, neutralDarkKeys, NEUTRAL_SHADES, evalMix, flattenMixes } from '../tokens/build.mjs';

test('bundleFullCss: tokens then components, both present', () => {
  const out = bundleFullCss('/* tok */\n:root{--a:1}', '/* comp */\n.fdy-x{color:var(--a)}');
  assert.match(out, /:root\{--a:1\}/);
  assert.match(out, /\.fdy-x\{color:var\(--a\)\}/);
  assert.ok(out.indexOf(':root{--a:1}') < out.indexOf('.fdy-x'), 'tokens come before components');
});

test('resolveValue: alias -> var()', () => {
  assert.equal(resolveValue('{indigo.600}'), 'var(--indigo-600)');
  assert.equal(resolveValue('{color.primary}'), 'var(--color-primary)');
});

test('resolveValue: literal passes through', () => {
  assert.equal(resolveValue('#574fd6'), '#574fd6');
  assert.equal(resolveValue('0.5rem'), '0.5rem');
});

test('flatten: nested leaves -> dash names with dark/compact', () => {
  const flat = flatten({
    indigo: { 600: { $value: '#574fd6' } },
    color: { primary: { $value: '{indigo.600}', $dark: '{indigo.500}' } },
    control: { h: { $value: '2.5rem', $compact: '2rem' } }
  });
  const byName = Object.fromEntries(flat.map(t => [t.name, t]));
  assert.equal(byName['indigo-600'].value, '#574fd6');
  assert.equal(byName['color-primary'].value, '{indigo.600}');
  assert.equal(byName['color-primary'].dark, '{indigo.500}');
  assert.equal(byName['control-h'].compact, '2rem');
});

test('buildTokensCss: emits root, primitive, semantic-as-var, dark, density', () => {
  const css = buildTokensCss({
    indigo: { 500: { $value: '#6f66ea' }, 600: { $value: '#574fd6' } },
    color: { primary: { $value: '{indigo.600}', $dark: '{indigo.500}' } },
    control: { h: { $value: '2.5rem', $compact: '2rem' } }
  });
  assert.match(css, /:root\s*\{/);
  assert.match(css, /--indigo-600:\s*#574fd6/);
  assert.match(css, /--color-primary:\s*var\(--indigo-600\)/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /\[data-theme="dark"\][\s\S]*--color-primary:\s*var\(--indigo-500\)/);
  assert.match(css, /\[data-density="compact"\][\s\S]*--control-h:\s*2rem/);
  /* Density must NOT be root-scoped: custom properties inherit, so the attribute has to work on
   * any ancestor (a route wrapper densifying one screen). :root still matches the bare selector. */
  assert.doesNotMatch(css, /:root\[data-density="compact"\]/);
  /* Same for the two EXPLICIT theme opt-ins, a dark panel beside a light form is an ordinary
   * layout, and every component inside it should re-theme by inheritance, not by hand. */
  assert.doesNotMatch(css, /:root\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /:root\[data-theme="light"\]/);
  /* But the SYSTEM default must stay root-scoped. Un-rooted, `:not([data-theme="light"])` matches
   * every element that does not itself carry the attribute, including the children of a light
   * panel, which would be dragged back to dark. Verified in Chrome: the light island inside a dark
   * region renders light-on-light with the un-rooted variant. */
  assert.match(css, /@media[^{]*prefers-color-scheme:\s*dark[^{]*\{\s*:root:not\(\[data-theme="light"\]\)/);
  /* Order is load-bearing: both opt-ins carry the same specificity as :root, so they only win by
   * coming after it, and --light only beats --dark (a light island inside a dark region) by
   * coming after that. */
  /* Anchored to the start of a line so it reads the RULES, not the prose about them: the comments
   * above each block name the other selectors too. */
  const at = (re) => css.search(re);
  assert.ok(
    at(/^:root \{/m) < at(/^\[data-theme="dark"\] \{/m)
      && at(/^\[data-theme="dark"\] \{/m) < at(/^\[data-theme="light"\] \{/m),
    'order must be :root -> [data-theme="dark"] -> [data-theme="light"]',
  );
});

test('bundleCss: concatenates parts in order with header', () => {
  const out = bundleCss(['.a{color:red}', '.b{color:blue}']);
  assert.match(out, /GENERATED/);
  assert.ok(out.indexOf('.a{') < out.indexOf('.b{'), 'urutan dipertahankan');
});

test('bundleJs: concatenates enhancers in order with header', () => {
  const out = bundleJs(['(function(){/*a*/})();', '(function(){/*b*/})();']);
  assert.match(out, /GENERATED/);
  assert.ok(out.indexOf('/*a*/') < out.indexOf('/*b*/'), 'urutan dipertahankan');
});

test('density opts back out, and its values are derived rather than restated (#002)', () => {
  /* Custom properties only inherit downhill: once <html> is compact, every subtree is compact and
   * `data-density="comfortable"` on a wrapper used to match nothing at all, the shipped comment
   * promised per-subtree density in both directions and delivered one.
   *
   * The values must come from the DEFAULTS, not be written out again: same key set by construction,
   * and a retuned default cannot leave the two blocks disagreeing. This asserts exactly that seam. */
  const css = buildTokensCss(JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url))));
  const block = (sel) => {
    const m = css.match(new RegExp(`\\[data-density="${sel}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(m, `no [data-density="${sel}"] rule`);
    return Object.fromEntries([...m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]));
  };
  const root = Object.fromEntries(
    [...css.match(/^:root \{([\s\S]*?)\n\}/m)[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]),
  );
  const compact = block('compact');
  const touch = block('touch');
  const comfortable = block('comfortable');

  assert.deepEqual(touch, { '--control-h': '2.75rem' },
    'touch is bigger targets, not a looser layout: it sets the control height and nothing else');
  assert.deepEqual(Object.keys(comfortable).sort(), [...new Set([...Object.keys(compact), ...Object.keys(touch)])].sort(),
    'comfortable must reset every key either other density sets, or one of them cannot be left');
  for (const [k, v] of Object.entries(comfortable)) {
    assert.equal(v, root[k], `${k} must restate the default (${root[k]}), got ${v}, derive it, do not copy it`);
    if (k in compact) assert.notEqual(v, compact[k], `${k} is identical in comfortable and compact, so one of them does nothing`);
    if (k in touch) assert.notEqual(v, touch[k], `${k} is identical in comfortable and touch, so one of them does nothing`);
  }
});

/* Documentation nodes must never become tokens.
 *
 * tokens.json carries notes, and the natural place to put a long one is a node of its own. Written
 * in the same shape as a real token — `"_comment": { "$value": "…" }` — it flattened into
 * `--primary-_comment: Alias ramp. The primary semantics read THESE…;`: a custom property holding a
 * paragraph of English, invalid at its first `[`, shipped in every consumer's bundle. It reached
 * dist and no suite noticed, which is why this guard is a unit test on the function rather than a
 * grep over the output. */
test('flatten skips _-prefixed keys, whatever shape they are written in', () => {
  const flat = flatten({
    ramp: {
      _comment: { $value: 'a note that happens to look exactly like a token' },
      500: { $value: '#abcdef' },
    },
    _private: { 500: { $value: '#000000' } },
  });
  assert.deepEqual(flat.map((t) => t.name), ['ramp-500'],
    'a documentation node must not emit a custom property');
});

test('no shipped custom property carries prose', () => {
  const css = readFileSync(new URL('../dist/freeday.tokens.css', import.meta.url), 'utf8');
  const offenders = [...css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]{0,400});/gm)]
    .filter(([, name, value]) => name.includes('_comment') || /\s\w+\s\w+\s\w+\s\w+\s\w+\s/.test(value))
    .map(([, name]) => name);
  assert.deepEqual(offenders, [], 'these read as sentences, not values:\n  ' + offenders.join('\n  '));
});

/* The CSS half of the breakpoint scale is GENERATED from the JS half, which is the whole point of
 * it (#058 §2): a hand-written second copy is the drift it exists to end. Asserted on a fake scale
 * so the shape is checked, not the kit's current numbers — those are checked against the
 * stylesheets themselves in docs.test.mjs. */
test('buildMediaCss: a below/from pair per ramp step, and the off-ramp widths named', () => {
  const out = buildMediaCss({ nav: 101, filterbar: 90, sm: 200, md: 300 });
  assert.match(out, /@custom-media --fdy-below-sm \(max-width: 199\.98px\);/);
  assert.match(out, /@custom-media --fdy-from-sm \(min-width: 200px\);/);
  assert.match(out, /@custom-media --fdy-below-md \(max-width: 299\.98px\);/);
  assert.match(out, /@custom-media --fdy-from-md \(min-width: 300px\);/);
  /* nav mirrors app-shell's own pair exactly (nav-1 / nav), not the ramp's n-0.02 split. */
  assert.match(out, /@custom-media --fdy-nav-drawer \(max-width: 100px\);/);
  assert.match(out, /@custom-media --fdy-nav-static \(min-width: 101px\);/);
  assert.match(out, /@custom-media --fdy-filterbar-stacked \(max-width: 90px\);/);
  /* The off-ramp widths must never also appear as ramp steps: a `--fdy-below-nav` would read as
     one and invite exactly the substitution the names exist to prevent. */
  assert.ok(!/--fdy-(below|from)-(nav|filterbar)\b/.test(out), 'nav/filterbar must not be emitted as ramp steps');
  /* Rules here would be silently dropped by a consumer that runs no PostCSS. */
  assert.ok(!/\{/.test(out.replace(/\/\*[\s\S]*?\*\//g, '')), 'the media sheet carries at-rules only, never rules');
});

test('no token outside the slate ramp and the neutral alias names a slate shade', () => {
  /* Every semantic reads the neutral alias, so data-neutral can re-point it. A {slate.N} written
     anywhere else stays cool under a warm neutral, and nothing else would notice. */
  const tokens = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
  const found = [];
  const walk = (node, path) => {
    if (typeof node === 'string') {
      if (/\{slate\.\d+/.test(node)) found.push(`${path}: ${node}`);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === '$comment' || k.startsWith('_')) continue;
      walk(v, `${path}.${k}`);
    }
  };
  for (const [k, v] of Object.entries(tokens)) {
    if (k === 'slate' || k === 'neutral') continue;
    walk(v, k);
  }
  assert.deepEqual(found, [], `slate referenced directly:\n  ${found.join('\n  ')}`);
});

const TOKENS = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
const neutralBlock = (css, sel) => {
  const m = css.match(new RegExp(`\\n${sel.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return m === null ? {} : Object.fromEntries([...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(d => [d[1], d[2].trim()]));
};

test('the neutral alias ramp is the slate entry of $neutrals', () => {
  assert.equal(TOKENS.$neutrals.slate.ramp, 'slate');
  for (const s of NEUTRAL_SHADES) {
    assert.equal(TOKENS.neutral[s].$value, `{slate.${s}}`, `neutral.${s} must default to slate.${s}`);
  }
});

test('a non-default neutral re-points every alias shade, and slate emits nothing', () => {
  const css = buildNeutralsCss(TOKENS);
  for (const name of ['grey', 'stone']) {
    const light = neutralBlock(css, `[data-neutral="${name}"]`);
    for (const s of NEUTRAL_SHADES) {
      assert.equal(light[`--neutral-${s}`], `var(--${name}-${s})`, `[data-neutral="${name}"] --neutral-${s}`);
    }
  }
  assert.doesNotMatch(css, /\[data-neutral="slate"\]/, 'the default re-states nothing');
});

test('tone tints are re-flattened over the neutral surface', () => {
  const css = buildTokensCss(TOKENS);
  const dark = neutralBlock(css, '[data-theme="dark"][data-neutral="stone"]');
  const slateDark = flattenMixes(flatten(TOKENS)).find(t => t.name === 'tone-1-bg').dark;
  /* Independent of the build's diffing: 18% of tone 1 (dark) straight over stone 950. */
  const nodes = new Map([['tone-1', { value: TOKENS.chart['1'].$value, dark: TOKENS.chart['1'].$dark }], ['s', { value: TOKENS.stone['950'].$value }]]);
  const expected = evalMix('color-mix(in srgb, {tone.1} 18%, {s})', nodes, 'dark', 'test');
  assert.notEqual(dark['--tone-1-bg'], slateDark, 'stone dark must not reuse the slate tint');
  assert.equal(dark['--tone-1-bg'], expected);
});

test('noir reaches its channels through the neutral alias', () => {
  const noir = neutralBlock(buildTokensCss(TOKENS), '[data-primary="noir"]');
  const rgb = Object.entries(noir).filter(([k]) => /^--primary-\d+-rgb$/.test(k));
  assert.ok(rgb.length > 0, 'noir emits no primary triples, the selector or the palette changed');
  for (const [k, v] of rgb) assert.match(v, /^var\(--neutral-\d+-rgb\)$/, `${k} is a literal, so it stays slate under any neutral`);
});

test('neutralDarkKeys: restates a light-block key whose base declares dark (system dark outranks the light block)', () => {
  const base = new Map([['--x', { light: '#111111', dark: '#222222', declaresDark: true }]]);
  const variant = new Map([['--x', { light: '#333333', dark: '#333333', declaresDark: false }]]);
  const lightSet = new Map([['--x', '#333333']]);
  assert.deepEqual(neutralDarkKeys(base, variant, lightSet).map(([k]) => k), ['--x']);
});

test('neutralDarkKeys: skips a light-block key whose base declares no dark and whose dark equals its light', () => {
  const base = new Map([['--y', { light: '#111111', dark: '#111111', declaresDark: false }]]);
  const variant = new Map([['--y', { light: '#333333', dark: '#333333', declaresDark: false }]]);
  const lightSet = new Map([['--y', '#333333']]);
  assert.deepEqual(neutralDarkKeys(base, variant, lightSet), []);
});

/* The declarations of the first block opened by `selector` (indent-agnostic: the system-dark twins sit inside a media query). */
const declsOf = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `no block for ${selector}`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(d => [d[1], d[2].trim()]));
};

test('the system-dark twin carries exactly the declarations of the explicit dark block', () => {
  const css = buildTokensCss(TOKENS);
  const pairs = [
    [':root:not([data-theme="light"])', '[data-theme="dark"]'],
    ...['grey', 'stone'].map(n => [
      `:root:not([data-theme="light"])[data-neutral="${n}"]`,
      `[data-theme="dark"][data-neutral="${n}"]`,
    ]),
  ];
  for (const [system, explicit] of pairs) {
    const [sys, exp] = [declsOf(css, system), declsOf(css, explicit)];
    assert.ok(Object.keys(sys).length > 0 && Object.keys(exp).length > 0, `empty block for ${system} or ${explicit}`);
    assert.deepEqual(sys, exp, `${system} drifted from ${explicit}`);
  }
});

test('every palette states the ink it uses on the deep fill', () => {
  for (const [name, p] of Object.entries(TOKENS.$primaries)) {
    if (name.startsWith('_')) continue;
    assert.match(String(p.onDeep), /^\{neutral\.\d+\}$/, `$primaries.${name}.onDeep must be a measured neutral ink`);
  }
});

test('deep re-points exactly the fill family, light theme only', () => {
  const css = buildTokensCss(TOKENS);
  const light = neutralBlock(css, '[data-primary-fill="deep"]');
  assert.deepEqual(light, {
    '--color-primary': 'var(--primary-700)',
    '--color-primary-hover': 'var(--primary-800)',
    '--color-primary-active': 'var(--primary-800)',
    '--color-primary-strong': 'var(--primary-800)',
    '--color-primary-rgb': 'var(--primary-700-rgb)',
    '--focus-ring': 'var(--primary-700)',
    '--color-on-primary': 'var(--neutral-0)',
    '--color-on-primary-rgb': 'var(--neutral-0-rgb)',
  });
  const dark = neutralBlock(css, '[data-theme="dark"][data-primary-fill="deep"]');
  const flat = flatten(TOKENS);
  for (const k of Object.keys(light).filter(k => !k.startsWith('--color-on-primary'))) {
    const t = flat.find(x => `--${x.name}` === k);
    assert.equal(dark[k], resolveValue(t.dark ?? t.value), `${k} must be restated to its normal dark value`);
  }
});

test('a dark-ink palette gets its own deep dark twin', () => {
  const css = buildTokensCss(TOKENS);
  const twin = neutralBlock(css, '[data-theme="dark"][data-primary="teal"][data-primary-fill="deep"]');
  assert.equal(twin['--color-on-primary'], 'var(--neutral-950)',
    'the generic deep dark block restates the default dark ink, which is wrong for teal');
});

test('each palette block carries its own 700 channels', () => {
  const css = buildTokensCss(TOKENS);
  const teal = neutralBlock(css, '[data-primary="teal"]');
  assert.equal(teal['--primary-700-rgb'], hexToTriple(hexOfName('teal-700', valueIndex(flatten(TOKENS)))));
  const noir = neutralBlock(css, '[data-primary="noir"]');
  assert.equal(noir['--primary-700-rgb'], 'var(--neutral-800-rgb)');
});
