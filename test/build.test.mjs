import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flatten, resolveValue, buildTokensCss, bundleCss, bundleJs, bundleFullCss } from '../tokens/build.mjs';

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
  const comfortable = block('comfortable');

  assert.deepEqual(Object.keys(comfortable), Object.keys(compact),
    'the two density blocks must cover the same tokens, or one of them is a partial reset');
  for (const [k, v] of Object.entries(comfortable)) {
    assert.equal(v, root[k], `${k} must restate the default (${root[k]}), got ${v} — derive it, do not copy it`);
    assert.notEqual(v, compact[k], `${k} is identical in both densities, so one of them does nothing`);
  }
});
