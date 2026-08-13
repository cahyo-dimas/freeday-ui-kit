/* Browser regression spec — `initAll(ctx)` must also enhance `ctx` itself.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * `querySelectorAll` never matches its own root. Putting a framework ref directly on the widget —
 * `<div ref="menu" data-fdy-menu>`, which is completely ordinary in Vue and React — therefore meant
 * the one element that needed enhancing was the only one that could not be found. It failed with no
 * error, no warning, and a UI that looked finished: the markup rendered and simply never opened.
 * Only a real browser shows this, because the symptom is behavioural, not structural.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('a widget mounted after load and initialised via its own root actually works', { skip }, async () => {
  await withPage(fixture('vanilla-root-init.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayMenu && window.FreedayTabs');

    // --- menu: the reported case, checked all the way to "it opens".
    const ready = await p.evalJS('window.mountAndInit("menu")');
    assert.equal(ready, '1', 'initAll(widget) must enhance the widget itself, not silently skip it');
    assert.equal(await p.evalJS(`document.getElementById('trig').getAttribute('aria-expanded')`), 'false');
    await p.clickCenter('#trig');
    assert.equal(
      await p.evalJS(`document.getElementById('trig').getAttribute('aria-expanded')`),
      'true',
      'the enhanced-by-root widget must respond to a real click — being marked ready is not enough',
    );
    assert.equal(await p.evalJS(`!document.querySelector('.fdy-menu').hidden`), true, 'the menu is visible');

    // --- a second enhancer, to prove the fix is the shared pattern and not a one-off.
    assert.equal(await p.evalJS('window.mountAndInit("tabs")'), '1', 'the same holds for FreedayTabs.initAll');
    await p.clickCenter('#tab2');
    assert.equal(await p.evalJS(`document.getElementById('tab2').getAttribute('aria-selected')`), 'true');
  });
});
