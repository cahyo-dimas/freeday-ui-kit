/* Browser regression spec, a stretched target whose overlay escaped its host (CATATAN-FREEDAY §19).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips without
 * Chrome.
 *
 * The failure has no visual symptom, so every case first proves the hazard with elementFromPoint
 * (a tap on the link really reaches the button), then that a real press reports it once. Presses
 * go through clickAt, not clickCenter: clickCenter refuses a point its target does not own, which
 * is the exact situation under test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const page = (kase) => 'file://' + join(HERE, 'fixtures', 'vanilla-stretch-warn.html') + '?case=' + kase;
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));
const ready = 'document.readyState === "complete" && window.FreedayUnhydrated';
const press = async (p, sel) => { const c = await p.centerXY(sel); await p.clickAt(c.x, c.y); };

test('a stretched target inside its host stays quiet', { skip }, async () => {
  await withPage(page('ok'), async (p) => {
    await p.waitFor(ready);
    assert.equal(await p.evalJS('window.hitAt("#title")'), 'ok', 'the card overlay works');
    assert.equal(await p.evalJS('window.hitAt("#ownText")'), 'own1', 'and so does one in its own positioned box');
    await press(p, '#title');
    await press(p, '#ownText');
    assert.deepEqual(await json(p, 'window.warnings'), [], 'a hidden second target overlaps nothing, so it is no rival');
  });
});

for (const kase of ['loose', 'body']) {
  test(`an overlay anchored to the ${kase === 'body' ? 'positioned <body>' : 'viewport'} warns once, on the first tap anywhere`, { skip }, async () => {
    await withPage(page(kase), async (p) => {
      await p.waitFor(ready);
      assert.equal(await p.evalJS('window.hitAt("#profil")'), 'loose', 'the hazard: a tap on the link lands on the button');
      await press(p, '#profil');
      await press(p, '#profil');
      const warnings = await json(p, 'window.warnings');
      assert.equal(warnings.length, 1, `one warning per button: ${JSON.stringify(warnings)}`);
      assert.equal(warnings[0].id, 'loose', 'the button itself is handed to console.warn');
      assert.match(warnings[0].msg, /covers the whole page/);
      assert.match(warnings[0].msg, /position:relative/, 'and it says how to fix it');
    });
  });
}

test('two stretched targets under one containing block warn, naming the shared host', { skip }, async () => {
  await withPage(page('shared'), async (p) => {
    await p.waitFor(ready);
    assert.equal(await p.evalJS('window.hitAt("#s1label")'), 's2', 'the hazard: a tap meant for one opens the other');
    await press(p, '#s1label');
    const warnings = await json(p, 'window.warnings');
    assert.equal(warnings.length, 1, JSON.stringify(warnings));
    assert.equal(warnings[0].id, 's2');
    assert.equal(warnings[0].host, 'host');
    assert.match(warnings[0].msg, /with 1 other/);
  });
});
