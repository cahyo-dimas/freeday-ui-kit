import { test } from 'node:test';
import assert from 'node:assert/strict';
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
