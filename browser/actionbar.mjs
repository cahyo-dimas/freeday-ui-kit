/* Browser regression spec for `.fdy-actionbar` (pure CSS). Run via `npm run test:browser`.
 * A bar of actions pinned to the bottom of a phone screen: above the bottom nav when the shell
 * has one, at the viewport's edge otherwise, and never covering the last row of content. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const box = async (p, sel) => JSON.parse(await p.evalJS(
  `JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`));

const PHONE = [390, 800];
const DESKTOP = [1000, 800];

test('on a phone the bar sits directly above the bottom nav', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.01,
      `the bar ends at ${bar.bottom}px and the nav starts at ${nav.top}px: the nav must be sized by --fdy-bottomnav-h, the value the bar rests on`);
  });
});

test('scrolled to the end, the last row is above the bar', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS('window.scrollTo(0, document.documentElement.scrollHeight)');
    await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    const row = await box(p, '#row40');
    const bar = await box(p, '#bar');
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('on a desktop the bar sits at the viewport edge, and its buttons share the width', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    const bar = await box(p, '#bar');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
    const b1 = await box(p, '#b1');
    const b2 = await box(p, '#b2');
    assert.ok(Math.abs(b1.width - b2.width) <= 1, `buttons ${b1.width}px and ${b2.width}px should share the bar`);
  });
});

const toEnd = async (p) => {
  await p.evalJS('window.scrollTo(0, document.documentElement.scrollHeight)');
  await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
};

test('scrolled to the end on a phone, the bar still rests on the nav and clears the last row', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await toEnd(p);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    const row = await box(p, '#row40');
    // 0.5px, not 0.01: the page height is fractional (here 2522.875) and the browser scrolls to a
    // whole pixel, so at the very end a sticky bar can sit up to a pixel's fraction short.
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the nav starts at ${nav.top}px`);
    assert.ok(row.bottom <= bar.top + 0.01, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('mid-scroll on a phone, the bar rests on the nav', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS('window.scrollTo(0, 400)');
    await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.01, `mid-scroll the bar ends at ${bar.bottom}px, the nav starts at ${nav.top}px`);
  });
});

test('scrolled to the end on a desktop, the bar is at the viewport edge', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    await toEnd(p);
    const bar = await box(p, '#bar');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
  });
});

test('scrolled to the end on a phone without a bottom nav, the bar is at the viewport edge', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS(`document.getElementById('app').classList.remove('fdy-app--has-bottomnav')`);
    await toEnd(p);
    const bar = await box(p, '#bar');
    assert.ok(Math.abs(bar.bottom - PHONE[1]) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the viewport at ${PHONE[1]}px`);
  });
});

// Framework pages put the bar inside `.fdy-page` rather than directly in main. The wrapper has to
// be main's last child and carry no bottom padding or margin; `.fdy-page` is a flex column with a gap only.
const wrapInPage = (p) => p.evalJS(`(() => {
  const main = document.getElementById('main');
  const page = document.createElement('div');
  page.className = 'fdy-page';
  while (main.firstChild) page.appendChild(main.firstChild);
  main.appendChild(page);
  return true;
})()`);

test('inside a .fdy-page wrapper on a phone, the bar still rests on the nav at the end', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await wrapInPage(p);
    await toEnd(p);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    const row = await box(p, '#row40');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the nav starts at ${nav.top}px`);
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('inside a .fdy-page wrapper on a desktop, the bar is at the viewport edge at the end', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    await wrapInPage(p);
    await toEnd(p);
    const bar = await box(p, '#bar');
    const row = await box(p, '#row40');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

// The adapters' shell renders its slot inside main: main > [page, closed dialog, the fixed nav].
const ronda = (p) => p.evalJS(`(() => {
  const main = document.getElementById('main');
  const page = document.createElement('div');
  page.className = 'fdy-page';
  while (main.firstChild) page.appendChild(main.firstChild);
  main.appendChild(page);
  main.appendChild(document.createElement('dialog'));
  main.appendChild(document.getElementById('nav'));
  return true;
})()`);

test('Ronda layout (page, closed dialog, nav inside main) on a phone: the bar rests on the nav at the end', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await ronda(p);
    await toEnd(p);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    const row = await box(p, '#row40');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the nav starts at ${nav.top}px`);
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('Ronda layout on a desktop: the bar is at the viewport edge at the end', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    await ronda(p);
    await toEnd(p);
    const bar = await box(p, '#bar');
    const row = await box(p, '#row40');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `at the end the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('a bar inside an open dialog inside main is not lifted by the nav offset', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS(`(() => {
      const d = document.createElement('dialog');
      d.id = 'dlg';
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:auto;margin:0;padding:0;border:0;height:200px;overflow:auto;z-index:60;';
      d.innerHTML = '<div style="height:500px"></div><div class="fdy-actionbar" id="dbar"><button class="fdy-btn" type="button">OK</button></div>';
      document.getElementById('main').appendChild(d);
      d.show();
      return true;
    })()`);
    const bar = await box(p, '#dbar');
    assert.ok(Math.abs(bar.bottom - PHONE[1]) <= 0.5, `the dialog bar ends at ${bar.bottom}px, its panel at ${PHONE[1]}px`);
  });
});

test('two wrappers deep (page > form > bar) on a phone, the bar rests on the nav mid-scroll', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS(`(() => {
      const main = document.getElementById('main');
      const page = document.createElement('div');
      page.className = 'fdy-page';
      const form = document.createElement('form');
      while (main.firstChild) form.appendChild(main.firstChild);
      page.appendChild(form);
      main.appendChild(page);
      return true;
    })()`);
    await p.evalJS('window.scrollTo(0, 400)');
    await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.01, `mid-scroll the bar ends at ${bar.bottom}px, the nav starts at ${nav.top}px`);
  });
});

// On a phone the bar spans the screen edge to edge, like the nav it rests on; main's 20px side
// padding would otherwise leave a strip of content showing on either side of it. The screen is the
// layout width, not the viewport: Chrome on Linux keeps a 15px classic scrollbar, so there it is 375px.
const layoutWidth = async (p) => Number(await p.evalJS('document.documentElement.clientWidth'));
const spansPhone = (bar, width) => Math.abs(bar.left) <= 0.5 && Math.abs(bar.right - width) <= 0.5;

test('on a phone the bar spans the full screen width', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    const bar = await box(p, '#bar');
    const width = await layoutWidth(p);
    assert.ok(spansPhone(bar, width), `the bar runs from ${bar.left}px to ${bar.right}px, the screen from 0 to ${width}px`);
  });
});

test('inside a .fdy-page wrapper on a phone, the bar spans the full screen width', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await wrapInPage(p);
    const bar = await box(p, '#bar');
    const width = await layoutWidth(p);
    assert.ok(spansPhone(bar, width), `the bar runs from ${bar.left}px to ${bar.right}px, the screen from 0 to ${width}px`);
  });
});

test('on a desktop the bar keeps main\'s side padding', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    const bar = await box(p, '#bar');
    const list = await box(p, '#list');
    assert.ok(Math.abs(bar.left - list.left) <= 0.5 && Math.abs(bar.right - list.right) <= 0.5,
      `the bar runs ${bar.left}-${bar.right}px, the content ${list.left}-${list.right}px`);
  });
});

test('a bar inside a dialog inside main stays within the dialog', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS(`(() => {
      const d = document.createElement('dialog');
      d.style.cssText = 'position:fixed;left:40px;right:40px;bottom:0;top:auto;margin:0;padding:0;border:0;height:200px;width:auto;overflow:auto;';
      d.innerHTML = '<div class="fdy-actionbar" id="dbar"><button class="fdy-btn" type="button">OK</button></div>';
      document.getElementById('main').appendChild(d);
      d.show();
      return true;
    })()`);
    const bar = await box(p, '#dbar');
    const panel = await box(p, 'dialog[open]');
    assert.ok(Math.abs(bar.left - panel.left) <= 0.5 && Math.abs(bar.right - panel.right) <= 0.5,
      `the dialog bar runs ${bar.left}-${bar.right}px, its panel ${panel.left}-${panel.right}px`);
  });
});
