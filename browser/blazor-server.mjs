/* Blazor SERVER + prerender (NEXT-UP #2), the render mode bUnit cannot answer for.
 *
 * bUnit renders in-process against a mocked JS runtime, so every Blazor test in test/blazor/ starts
 * from a world where interop already works. Under Server with prerendering the first render happens
 * with NO JS at all: the markup is produced on the server, sent as HTML, and only later does a
 * circuit connect and the enhancers run. Three things can break there and nowhere else —
 * a component whose DOM the enhancer OWNS (FdyCombo stops rendering once hydrated), a native
 * <dialog> whose show/close is an interop call, and a two-way binding reconciled against a DOM the
 * enhancer mutates.
 *
 * Run via `npm run test:blazor-server`. Skips without Chrome or without the built harness. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DLL = join(ROOT, 'test', 'blazor-server', 'bin', 'Debug', 'net8.0', 'Freeday.Blazor.ServerHarness.dll');
const PORT = 5199;
const URL = `http://127.0.0.1:${PORT}/`;

const noChrome = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const noDotnet = spawnSync('dotnet', ['--version'], { stdio: 'ignore' }).status !== 0 ? 'no dotnet SDK' : false;
const skip = noChrome || noDotnet || false;

let server = null;

before(async () => {
  if (skip !== false) return;
  if (!existsSync(DLL)) {
    /* Built here rather than assumed: a harness that silently tests a stale binary is the same
       failure as one that silently skips. */
    spawnSync('dotnet', ['build', join(ROOT, 'test', 'blazor-server'), '-v', 'quiet', '--nologo'], { stdio: 'inherit' });
  }
  server = spawn('dotnet', [DLL, '--urls', `http://127.0.0.1:${PORT}`], { stdio: 'ignore' });
  // Wait for the port rather than a fixed pause: a cold JIT on a loaded machine is slower than any
  // sleep a developer would pick.
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`the Blazor Server harness never answered on ${URL}`);
});

after(() => {
  if (server !== null) server.kill('SIGTERM');
});

test('prerender emits the full markup with no JS having run (#2)', { skip }, async () => {
  const html = await (await fetch(URL)).text();

  // The server rendered real component markup, not a placeholder waiting for a circuit.
  for (const hook of ['data-fdy-app', 'data-fdy-combo', 'fdy-combo__listbox', 'fdy-app__navtoggle']) {
    assert.ok(html.includes(hook), `prerendered HTML is missing ${hook}`);
  }
  // …and nothing enhanced it. Every enhancer stamps a *-ready attribute when it hydrates; one in
  // the prerendered HTML would mean the server had somehow run browser code.
  assert.doesNotMatch(html, /data-fdy-[a-z-]+-ready/,
    'prerendered HTML must carry no hydration marker — the server has no DOM and no JS');
  assert.ok(html.includes('blazor.web.js'), 'the page must actually boot a circuit, or this proves nothing');
});

test('the enhancer hydrates once the circuit connects (#2)', { skip }, async () => {
  await withPage(URL, async (p) => {
    await p.waitFor('window.__interactive === true');
    const hydrated = await p.waitFor(`!!document.querySelector('[data-fdy-combo-ready]')`);
    assert.ok(hydrated, 'FdyCombo never hydrated under Server — its DOM is owned by the enhancer, so it would stay inert');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-app]')._fdyAppShell !== undefined`), true,
      'the app shell never got its handle, so nothing could drive the nav from Blazor');
  });
});

/* The check that first appeared to fail, and the correction is the useful part.
 *
 * It went red with a precise, plausible story: on a real click the combo opened and then closed
 * itself, focus landing on BODY with `relatedTarget=null` — which is what a browser does when the
 * focused node is DETACHED. The node really was detached. The wrong conclusion was WHO detached it.
 *
 * Not Blazor patching under the enhancer per click: Blazor replacing the whole PRERENDERED subtree
 * once, when the circuit connects. The enhancers auto-init on DOMContentLoaded, so they stamp
 * `data-fdy-*-ready` on markup that is about to be thrown away — and a test that waits on that
 * marker is waiting for the wrong thing. Waiting for the component to actually go interactive
 * (`window.__interactive`, set from OnAfterRenderAsync) makes it pass, three runs out of three.
 *
 * So the kit is fine here, and the real lesson is about hydration markers: under prerendering they
 * are true about a DOM with no future. That is worth knowing for any app on this render mode. */
test('a combo picked with a real mouse reaches the Blazor binding (#2)', { skip }, async () => {
  await withPage(URL, async (p) => {
    /* Wait for the circuit, not just for a hydration marker. The enhancers auto-init on
       DOMContentLoaded over the PRERENDERED markup, and Blazor replaces that wholesale when it goes
       interactive — so the marker can be true about a subtree that is about to be thrown away. */
    await p.waitFor('window.__interactive === true');
    await p.waitFor(`!!document.querySelector('[data-fdy-combo-ready]')`);
    await p.clickCenter('.fdy-combo__button');
    const opened = await p.waitFor(`document.querySelector('.fdy-combo__button').getAttribute('aria-expanded') === 'true'`);
    assert.ok(opened, 'the listbox must open under Server too');

    await p.clickCenter('.fdy-combo__option[data-value="b"]');
    /* The round trip that only Server can break: the pick happens in JS, crosses the circuit to
       .NET, and comes back as a re-render. The button label is the far end of that journey. */
    const committed = await p.waitFor(`document.querySelector('.fdy-combo__value').textContent.trim() === 'Badge'`);
    assert.ok(committed,
      `the pick never came back through the circuit, label reads "${await p.evalJS(`document.querySelector('.fdy-combo__value').textContent.trim()`)}"`);
  });
});

test('a <dialog> opened from .NET actually opens under Server (#2)', { skip }, async () => {
  await withPage(URL, async (p) => {
    await p.waitFor('window.__interactive === true');
    await p.waitFor(`!!document.querySelector('[data-fdy-combo-ready]')`);
    assert.equal(await p.evalJS(`document.querySelector('dialog.fdy-modal').open`), false, 'starts shut');

    // Blazor sets a parameter; the bridge has to turn that into showModal() on the real element.
    await p.clickCenter('#open-modal');
    const open = await p.waitFor(`document.querySelector('dialog.fdy-modal').open === true`);
    assert.ok(open, 'the modal never opened — show/close is an interop call, and this is the ordering Server changes');

    await p.pressKey('Escape');
    const shut = await p.waitFor(`document.querySelector('dialog.fdy-modal').open === false`);
    assert.ok(shut, 'Escape must close it, and the close must travel back to .NET');
  });
});
