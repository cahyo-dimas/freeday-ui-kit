/* Browser regression spec: a picker's panel inside an OPEN modal, at phone width.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * `FdyModal` is a native <dialog> opened with showModal(), so it sits in the top layer, and a
 * picker's panel is `popover="manual"`, which goes there too. Nothing in the stylesheet can answer
 * which one paints on top: z-index does not apply in the top layer, and the order is the order the
 * elements entered it. A panel behind the dialog is not cosmetic — the control cannot be used at
 * all, which is the class of fault keamanan-cluster kept finding on a real phone.
 *
 * `browser/over-dialog.mjs` already covers a toast and a checkbox over a modal. No picker had ever
 * been checked there, and keamanan-cluster's shift form now puts two of them inside one (#096).
 *
 * Asserted with elementFromPoint, not by reading styles: "what is actually on top at this pixel"
 * is the only form of the question that cannot be satisfied by a rule that looks right.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(async () => {
  if (skip === false) await buildEntries();
});

const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}, condition never became true: ${condition}`);
};

/* What is painted at the centre of the open panel. If the dialog covers it this answers with the
   dialog or the form inside it, and the control is dead. */
const topAt = (p, panelSel) => p.evalJS(`(() => {
  const panel = document.querySelector(${JSON.stringify(panelSel)});
  const r = panel.getBoundingClientRect();
  const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 8));
  return el === null ? 'null' : (el.closest(${JSON.stringify(panelSel)}) !== null ? 'panel' : el.className || el.localName);
})()`);

for (const [nama, trigger, panel, option] of [
  ['timepicker', '.fdy-timepicker__trigger', '.fdy-timepicker__panel', '.fdy-timepicker__opt'],
  ['datepicker', '.fdy-datepicker__trigger', '.fdy-datepicker__panel', '.fdy-cal__day'],
]) {
  test(`${nama}: the panel paints over the modal it is inside`, { skip }, async () => {
    await withPage(fixture('vue-picker-in-modal.html'), async (p) => {
      await p.setViewport(375, 667);
      await until(p, `document.querySelector('dialog[open]') !== null`, 'the modal to open');
      await until(p, `document.querySelector(${JSON.stringify(trigger)}) !== null`, `the ${nama} to render`);
      await p.clickCenter(trigger);
      await until(p, `document.querySelector(${JSON.stringify(trigger)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
      assert.equal(await topAt(p, panel), 'panel',
        `the ${nama} panel is behind the dialog, so nothing in it can be clicked`);
    });
  });

  test(`${nama}: an option inside the modal can actually be picked`, { skip }, async () => {
    await withPage(fixture('vue-picker-in-modal.html'), async (p) => {
      await p.setViewport(375, 667);
      await until(p, `document.querySelector(${JSON.stringify(trigger)}) !== null`, `the ${nama} to render`);
      await p.clickCenter(trigger);
      await until(p, `document.querySelector(${JSON.stringify(trigger)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
      /* Painting on top and being clickable are two claims: a panel can be visible and still have
         the dialog swallow the pointer event. */
      await p.clickCenter(`${panel} ${option}:not([aria-disabled="true"])`);
      await until(p, `document.querySelector(${JSON.stringify(trigger)}).getAttribute('aria-expanded') === 'false'`, 'the pick to close the panel');
      assert.notEqual(
        await p.evalJS(`document.querySelector(${JSON.stringify(panel)}).closest('[data-value]').getAttribute('data-value')`),
        '', 'the pick never reached the binding');
    });
  });
}

test('the required picker still refuses the submit from inside the modal', { skip }, async () => {
  await withPage(fixture('vue-picker-in-modal.html'), async (p) => {
    await p.setViewport(375, 667);
    await until(p, `document.querySelector('#kirim') !== null`, 'the form to render');
    await p.clickCenter('#kirim');
    await until(p, 'window.__invalid === 1', 'the form to refuse');
    assert.equal(await p.evalJS('window.__valid'), 0);
    assert.equal(
      await p.evalJS(`document.querySelector('.fdy-timepicker__trigger').getAttribute('aria-invalid')`),
      'true');
  });
});

test('neither picker overflows a 375px modal', { skip }, async () => {
  await withPage(fixture('vue-picker-in-modal.html'), async (p) => {
    await p.setViewport(375, 667);
    await until(p, `document.querySelector('.fdy-timepicker__trigger') !== null`, 'the pickers to render');
    /* The phone complaint that started this whole audit was a control wider than its container. */
    assert.equal(await p.evalJS(`document.scrollingElement.scrollWidth <= window.innerWidth`), true,
      'something inside the modal is wider than the viewport');
    /* The floor is WCAG 2.5.8 AA (24x24 CSS px), NOT the 44px of Apple's HIG. 44 is a value an
       APP chooses by raising --control-h: keamanan-cluster sets 2.75rem and gets 44px on every
       control, pickers included, while the kit's own comfortable default is 2.5rem. Asserting 44
       here would be testing one consumer's token against the kit.
       "A trigger is exactly --control-h" is deliberately NOT asserted here, though it is the real
       invariant: it belongs to browser/control-heights.mjs, which now includes both triggers and
       owns the 1.5px-border rounding that makes an exact pixel dpr-dependent. Asserting it twice
       bought a second copy that reported 39 against 40 under concurrency and nothing else. */
    const salah = await p.evalJS(`(() => {
      const out = [];
      for (const sel of ['.fdy-timepicker__trigger', '.fdy-datepicker__trigger']) {
        const h = document.querySelector(sel).getBoundingClientRect().height;
        if (h < 24) out.push(sel + ' is ' + Math.round(h) + 'px, under the 24px WCAG 2.5.8 floor');
      }
      return out;
    })()`);
    assert.deepEqual(salah, [], 'a trigger is under the accessibility floor');
  });
});
