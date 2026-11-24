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
const pair = async (p) => [await prop(p, '--color-primary'), await prop(p, '--color-on-primary')];

test('deep deepens the light fill and leaves dark alone', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    assert.deepEqual(await pair(p), [await prop(p, '--teal-700'), await prop(p, '--neutral-0')],
      'light: teal-700 with a white label');

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
