/* Browser regression spec, the theme preference (CATATAN-FREEDAY §23).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips without
 * Chrome.
 *
 * Every claim is checked where a user would see it: the attribute, the stored value, AND the colour
 * a card is actually painted in, matched against a light and a dark reference card. The OS setting
 * is the real media feature, emulated over CDP, not a stubbed matchMedia.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));
const state = (p) => json(p, 'window.state()');
before(async () => {
  if (skip === false) await buildEntries();
});

const reload = async (p) => {
  await p.evalJS('window.stale = true; setTimeout(() => location.reload(), 0); true');
  await p.waitFor('!window.stale && document.readyState === "complete" && typeof window.state === "function"');
};

test('a choice is stored, applied, painted, and survives a reload before the kit loads', { skip }, async () => {
  await withPage(fixture('vanilla-theme-pref.html'), async (p) => {
    await p.waitFor('typeof window.state === "function"');
    await p.setColorScheme('light');
    let s = await state(p);
    assert.deepEqual([s.html, s.stored, s.theme, s.resolved, s.page], [null, null, 'system', 'light', 'light'],
      'nothing chosen yet: no attribute, nothing stored, the page follows the OS');

    await p.evalJS('FreedayTheme.toggle(), true');
    s = await state(p);
    assert.deepEqual([s.html, s.stored, s.theme, s.resolved, s.page], ['dark', 'dark', 'dark', 'dark', 'dark'],
      'from system, a toggle flips what is SHOWN');
    assert.deepEqual(await json(p, 'window.events'), [{ theme: 'dark', resolved: 'dark' }]);

    await reload(p);
    assert.equal(await p.evalJS('window.beforeKit'), 'dark', 'the <head> snippet applied it before the kit even loaded');
    s = await state(p);
    assert.deepEqual([s.html, s.theme, s.page], ['dark', 'dark', 'dark']);

    assert.match(await p.evalJS(`(() => { try { FreedayTheme.set('sepia'); return 'accepted'; } catch (e) { return e.name + ': ' + e.message; } })()`),
      /^TypeError: .*light, dark, system.*"sepia"/, 'a value the kit has no tokens for is refused, loudly');
  });
});

test('without the <head> snippet, the kit applies a stored choice on load itself', { skip }, async () => {
  await withPage(fixture('vanilla-theme-nosnippet.html'), async (p) => {
    await p.waitFor('typeof window.state === "function"');
    await p.evalJS(`FreedayTheme.set('dark'); true`);
    await reload(p);
    assert.equal(await p.evalJS('window.beforeKit'), null, 'no snippet, so nothing ran before the kit');
    const s = await state(p);
    assert.deepEqual([s.html, s.page], ['dark', 'dark'], 'late, but the stored choice still wins');
  });
});

test('system removes the attribute, so an OS switch repaints the page live', { skip }, async () => {
  await withPage(fixture('vanilla-theme-pref.html'), async (p) => {
    await p.waitFor('typeof window.state === "function"');
    await p.setColorScheme('light');
    await p.evalJS(`FreedayTheme.set('dark'); FreedayTheme.set('system'); window.events = []; true`);
    let s = await state(p);
    assert.deepEqual([s.html, s.stored, s.page], [null, null, 'light'], 'system stores nothing and removes the attribute');

    await p.setColorScheme('dark');
    s = await state(p);
    assert.deepEqual([s.resolved, s.page], ['dark', 'dark'], 'the OS went dark and the page followed, no reload');
    assert.deepEqual(await json(p, 'window.events'), [{ theme: 'system', resolved: 'dark' }],
      'and said so, so a toggle can update its icon');

    await p.evalJS(`FreedayTheme.set('light'); window.events = []; true`);
    await p.setColorScheme('light');
    await p.setColorScheme('dark');
    assert.deepEqual(await json(p, 'window.events'), [], 'with an explicit choice, the OS changes nothing, so nothing fires');
    assert.equal((await state(p)).page, 'light');

    await p.evalJS(`FreedayTheme.set('system'); FreedayTheme.toggle(); true`);
    s = await state(p);
    assert.deepEqual([s.theme, s.page], ['light', 'light'],
      'OS dark and system: a toggle goes to light, the opposite of what is on screen, not to "dark"');
  });
});

test('attach() hands a region with its own data-theme to the preference, and the detacher hands it back', { skip }, async () => {
  await withPage(fixture('vanilla-theme-pref.html'), async (p) => {
    await p.waitFor('typeof window.state === "function"');
    await p.evalJS(`FreedayTheme.set('light'); true`);
    let s = await state(p);
    assert.deepEqual([s.page, s.kioskPainted], ['light', 'dark'], 'unattached, the region keeps its fixed dark: the case attach() is for');

    await p.evalJS(`window.detach = FreedayTheme.attach(document.getElementById('kiosk')); true`);
    s = await state(p);
    assert.deepEqual([s.kiosk, s.kioskPainted], ['light', 'light'], 'attached, it takes the current choice at once');
    await p.evalJS(`FreedayTheme.set('dark'); true`);
    assert.deepEqual([(await state(p)).page, (await state(p)).kioskPainted], ['dark', 'dark'], 'and every later one');

    await p.evalJS(`window.detach(); FreedayTheme.set('light'); true`);
    s = await state(p);
    assert.deepEqual([s.page, s.kioskPainted], ['light', 'dark'], 'detached, it is left alone again');
  });
});

for (const fw of ['vue', 'react']) {
  test(`${fw}: useTheme() keeps two toggles in step, themes its region, and lets go on unmount`, { skip }, async () => {
    await withPage(fixture(`${fw}-theme.html`), async (p) => {
      await p.waitFor('window.mounted === true && document.getElementById("region")');
      await p.setColorScheme('light');
      const text = async () => json(p, `['a', 'b', 'region'].map((id) => document.getElementById(id).textContent)`);
      const attrs = async () => json(p, `[document.documentElement.getAttribute('data-theme'), document.getElementById('region').getAttribute('data-theme')]`);

      assert.equal(await p.evalJS('typeof window.FreedayTheme'), 'object', 'the hook brought its own core: the fixture loads no freeday.js');
      assert.deepEqual(await text(p), ['system/light', 'system/light', 'light']);
      assert.deepEqual(await attrs(p), [null, null], 'attached under system, the region gave up its fixed dark');

      await p.clickCenter('#a');
      await p.waitFor(`document.getElementById('b').textContent === 'dark/dark'`);
      assert.deepEqual(await text(p), ['dark/dark', 'dark/dark', 'dark'], 'one press, every caller agrees');
      assert.deepEqual(await attrs(p), ['dark', 'dark']);

      await p.clickCenter('#b');
      await p.waitFor(`document.getElementById('a').textContent === 'light/light'`);
      assert.deepEqual(await attrs(p), ['light', 'light'], 'either toggle drives both');

      await p.evalJS('window.hideRegion()');
      await p.clickCenter('#a');
      await p.waitFor(`document.getElementById('a').textContent === 'dark/dark'`);
      assert.equal(await p.evalJS(`window.regionEl.getAttribute('data-theme')`), 'light',
        'unmounted, the region was detached: the core no longer writes to an element that is gone');
    });
  });
}
