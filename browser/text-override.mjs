/* Browser regression spec — the enhancer string contract (#016).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * 1.39.0 moved every user-facing string in nine enhancers into a TEXT table read through
 * textOf(). The node guard proves the literals SIT there; it cannot prove the wiring runs — it
 * reads the source as text. Of the nine files, only upload had any browser coverage, so eight had
 * their DOM-writing rewired with nothing executing it: a `zone` out of scope or a getAttribute on
 * a non-element would throw at init and every existing test would still pass.
 *
 * Both halves are asserted. The Indonesian default is a contract too — COMPONENTS.md documents it
 * and apps on the raw path adopted it, so a fix that quietly turned the enhancers English would be
 * a breaking change wearing a bugfix's clothes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('every enhancer renders its default and honours data-fdy-text-*', { skip }, async () => {
  await withPage(fixture('vanilla-text-override.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayTable && window.Freeday');

    const r = JSON.parse(await p.evalJS('JSON.stringify(window.textReport())'));

    /* Each pair is one enhancer: the documented default, then the same markup overridden. */
    const pairs = [
      ['table info',    r.tableInfoA, /Menampilkan/,            r.tableInfoB, /^Showing 1–2 of 2$/],
      ['table rows',    r.tableRowsA, /baris/,                  r.tableRowsB, /^2 rows$/],
      ['stepper next',  r.stepNextA,  /^Lanjut$/,               r.stepNextB,  /^Next$/],
      ['password show', r.pwA,        /^Tampilkan kata sandi$/, r.pwB,        /^Show password$/],
      ['slide position',r.slideA,     /dari/,                   r.slideB,     /^1 of 2$/],
      ['carousel dot',  r.dotA,       /^Slide 1$/,              r.dotB,       /^Slide 1$/],
      ['cascade back',  r.backA,      /^Kembali satu tingkat$/, r.backB,      /^Back one level$/]
    ];
    for (const [name, def, defRe, over, overRe] of pairs) {
      assert.notEqual(def, null, `${name}: the enhancer did not render — its init threw or never ran`);
      assert.match(def, defRe, `${name}: the documented Indonesian default must survive, got "${def}"`);
      assert.match(over, overRe, `${name}: data-fdy-text-* must win, got "${over}"`);
    }

    /* Toast takes its override through the options bag, not an attribute — it has no root element
     * to carry one. This is the string FreedayBlazor.toast defaults to 'Close'. */
    const t = JSON.parse(await p.evalJS('JSON.stringify(window.toastLabels())'));
    assert.equal(t.def, 'Tutup', 'the raw toast keeps its documented default');
    assert.equal(t.override, 'Close', 'toast({ closeLabel }) must reach the close button');

    /* A camelCase key can only be written kebab in markup — HTML lowercases attribute names, so
     * `data-fdy-text-filterText` and `data-fdy-text-filter-text` are DIFFERENT attributes and the
     * one an author reaches for was the one the enhancer did not read. It failed silently, which is
     * the only way an override can fail. */
    const filterTitle = await p.evalJS('window.openFilter()');
    assert.equal(filterTitle, 'Contains text',
      `a kebab-cased override of a camelCase key must win, got "${filterTitle}"`);

    /* The form's messages moved to a TEXT table read through the FORM element, which is the level
     * a host needs: nine messages set once instead of on every input. */
    const f = JSON.parse(await p.evalJS('JSON.stringify(window.formMessages())'));
    assert.match(f.frmA, /Wajib diisi\./, `the default validation message must survive, got "${f.frmA}"`);
    assert.equal(f.frmB, 'This field is required.', 'data-fdy-text-required on the <form> must win');
  });
});
