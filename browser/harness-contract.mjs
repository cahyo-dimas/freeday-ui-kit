/* The harness's own contract: what `clickCenter` promises the specs that use it.
 *
 * Written after CI went red on a DOCS-ONLY commit — three coordinate-clicking specs failing at
 * once, on a runner whose window is not this laptop's, while the neighbouring commit with an
 * identical tree passed. A click is delivered to a POINT, so a target below the fold is clicked
 * where nobody can see, the click reaches nothing, and the run reports whatever assertion came
 * three lines later. The cause was invisible; the symptom was three unrelated failures.
 *
 * These two tests are cheap and they are the reason the rest of the suite can be trusted on a
 * machine that is not this one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('a target below the fold is still clicked, not clicked at', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayCascade');
    await p.setViewport(420, 240);
    await p.evalJS(`(function () {
      var spacer = document.createElement('div');
      spacer.style.height = '1600px';
      document.body.insertBefore(spacer, document.body.firstChild);
      return true;
    })()`);

    const target = '#csPlain button';
    assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(target)}).getBoundingClientRect().top > innerHeight`),
      true, 'the fixture must actually put the target out of view, or this test proves nothing');
    assert.equal(await p.evalJS(`(function () {
      var r = document.querySelector(${JSON.stringify(target)}).getBoundingClientRect();
      return document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)) === null;
    })()`), true, 'and the point those coordinates name must be empty — that is the silent no-op');

    await p.clickCenter(target);
    assert.equal(await p.evalJS('document.querySelector("#csPlain .fdy-cascade__panel").hidden'), false,
      'clickCenter has to bring the target into view before aiming at it');
  });
});

test('a click at an empty point fails by name rather than by symptom', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayCascade');
    /* A target that cannot be scrolled into view: it is laid out off-screen, so scrollIntoView has
       nowhere to put it and the point stays empty. The failure must SAY that. */
    await p.evalJS(`(function () {
      var b = document.querySelector('#csPlain button');
      b.style.position = 'fixed';
      b.style.left = '-9999px';
      b.style.top = '-9999px';
      return true;
    })()`);

    await assert.rejects(
      () => p.clickCenter('#csPlain button'),
      /would not reach it: the point is empty — viewport \d+x\d+/,
      'the error has to name the geometry, since that is what no downstream assertion can see',
    );
  });
});
