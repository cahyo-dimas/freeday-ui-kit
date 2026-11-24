/* Browser regression spec: data-primary-fill="deep" (pure CSS). Run via `npm run test:browser`.
 * Light theme: the fill is the palette's 700 shade with a white label. Dark theme: exactly the
 * values the palette has without deep, under an explicit theme and under the OS setting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const prop = (p, name) => p.evalJS(
  `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`);
const hexTriple = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
const NOIR_PROPS = ['--color-primary', '--color-primary-rgb', '--color-on-primary', '--focus-ring', '--primary-700', '--primary-700-rgb'];
const snap = async (p) => Object.fromEntries(await Promise.all(NOIR_PROPS.map(async (n) => [n, await prop(p, n)])));
const pair = async (p) => [await prop(p, '--color-primary'), await prop(p, '--color-on-primary')];

test('deep deepens the light fill and leaves dark alone', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    assert.deepEqual(await pair(p), [await prop(p, '--teal-700'), await prop(p, '--neutral-0')],
      'light: teal-700 with a white label');
    assert.equal(await prop(p, '--focus-ring'), await prop(p, '--teal-700'), 'light: focus ring follows the fill');
    assert.equal(await prop(p, '--color-primary-rgb'), await prop(p, '--primary-700-rgb'), 'light: rgb triple follows the fill');
    assert.equal(await prop(p, '--primary-700-rgb'), hexTriple(await prop(p, '--teal-700')), 'light: triple is teal-700 channels');

    const setTheme = (v) => p.evalJS(`document.documentElement.setAttribute("data-theme", ${JSON.stringify(v)})`);
    const dropFill = () => p.evalJS('document.documentElement.removeAttribute("data-primary-fill")');
    const addFill = () => p.evalJS('document.documentElement.setAttribute("data-primary-fill", "deep")');

    await setTheme('dark');
    await dropFill();
    const plainDark = await pair(p);
    await addFill();
    assert.deepEqual(await pair(p), plainDark, 'explicit dark: deep changes nothing');

    await p.evalJS('document.documentElement.removeAttribute("data-theme")');
    await p.setColorScheme('dark');
    await dropFill();
    const osDark = await pair(p);
    await addFill();
    assert.deepEqual(await pair(p), osDark, 'OS dark: deep changes nothing');
  });
});

test('deep leaves noir untouched under explicit dark with an OS light scheme', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    await p.evalJS('document.documentElement.setAttribute("data-primary", "noir"); document.documentElement.setAttribute("data-theme", "dark")');
    await p.evalJS('document.documentElement.removeAttribute("data-primary-fill")');
    const plain = await snap(p);
    await p.evalJS('document.documentElement.setAttribute("data-primary-fill", "deep")');
    assert.deepEqual(await snap(p), plain, 'noir dark: deep changes nothing');
  });
});

test('a deep region inside an inherited palette gets that palette triple', { skip }, async () => {
  await withPage(fixture('primary-fill-region.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    const read = (n) => p.evalJS(`getComputedStyle(document.getElementById("region")).getPropertyValue(${JSON.stringify(n)}).trim()`);
    assert.equal(await read('--color-primary-rgb'), hexTriple(await read('--color-primary')),
      'region: --color-primary-rgb is the channels of --color-primary');
  });
});

// A bare deep wrapper applies its light values in every theme. Under a dark theme (here an
// explicit ancestor) the fill is the 700 shade on a dark surface; a region repeats data-theme AND
// data-primary beside data-primary-fill. These pin the hazard USAGE.md section 5b documents.
const regionProp = (p, id, name) => p.evalJS(
  `getComputedStyle(document.getElementById(${JSON.stringify(id)})).getPropertyValue(${JSON.stringify(name)}).trim()`);
const setupDarkTeal = (p) => p.evalJS(`(() => {
  const r = document.documentElement;
  r.setAttribute('data-theme', 'dark');
  r.setAttribute('data-primary', 'teal');
  r.removeAttribute('data-primary-fill');
  document.body.insertAdjacentHTML('beforeend',
    '<div id="bare" data-primary-fill="deep"></div>' +
    '<div id="plain" data-theme="dark" data-primary="teal"></div>' +
    '<div id="region" data-theme="dark" data-primary="teal" data-primary-fill="deep"></div>' +
    '<div id="inherit" data-theme="dark" data-primary-fill="deep"></div>');
  return true;
})()`);

test('a bare deep wrapper under a dark ancestor still takes the light 700 fill', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    await setupDarkTeal(p);
    assert.equal(await regionProp(p, 'bare', '--color-primary'), await prop(p, '--teal-700'),
      'bare deep: teal-700 even though the ancestor is dark');
    assert.equal(await regionProp(p, 'bare', '--color-primary-strong'), await prop(p, '--teal-800'),
      'bare deep: the strong ink is teal-800, wrong on a dark surface');
  });
});

test('a region repeating data-theme and data-primary is unchanged by deep in dark', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    await setupDarkTeal(p);
    for (const name of ['--color-primary', '--color-primary-strong', '--color-on-primary']) {
      assert.equal(await regionProp(p, 'region', name), await regionProp(p, 'plain', name),
        `${name}: the deep region equals the same region without deep`);
    }
  });
});

test('a dark deep region without its own data-primary loses the dark-ink twin', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    await setupDarkTeal(p);
    assert.notEqual(await regionProp(p, 'inherit', '--color-on-primary'), await regionProp(p, 'plain', '--color-on-primary'),
      'inheriting the palette from html gives the default dark ink, not the teal one');
  });
});
