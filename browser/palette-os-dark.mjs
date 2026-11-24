/* Browser regression spec: a palette's label ink under the OS dark setting (pure CSS).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Teal's label is dark ink in both themes. Until 3.22.0 the base rule
 * `:root:not([data-theme="light"])` (0,2,0) outranked the palette block (0,1,0) whenever the OS was
 * in dark mode, explicit data-theme="dark" or not, and every teal button got a white label on a
 * light fill. Measured in a real engine because the contrast suite only models scopes it parses. */
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

test('a dark-ink palette keeps its dark label when the OS is in dark mode', { skip }, async () => {
  await withPage(fixture('palette-os-dark.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const darkInk = await prop(p, '--neutral-950');

    await p.setColorScheme('light');
    assert.equal(await prop(p, '--color-on-primary'), darkInk, 'explicit dark, OS light: dark ink');

    await p.setColorScheme('dark');
    assert.equal(await prop(p, '--color-on-primary'), darkInk,
      'explicit dark, OS dark: the system-dark base rule must not repaint the label white');

    await p.evalJS('document.documentElement.removeAttribute("data-theme")');
    assert.equal(await prop(p, '--color-on-primary'), darkInk, 'no data-theme, OS dark: dark ink');
  });
});
