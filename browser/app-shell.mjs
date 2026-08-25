/* Browser regression spec — the app shell owns its nav behaviour (NEXT-UP #8).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * `.fdy-app` shipped state classes and no JS, and COMPONENTS.md's instruction — toggle a class on
 * click, clear it on backdrop click — never mentioned Escape, focus, `inert` or focus restore. A
 * consumer following it exactly built an overlay that cannot be closed from the keyboard, and the
 * two hand-rolled copies in this repo's own docs disagreed about which of those they implemented.
 *
 * Everything here is asserted with TRUSTED input and a REAL viewport: only a trusted key moves
 * focus, and only an actual viewport change fires the media query whose crossing is what strands an
 * `inert` attribute on the page behind the panel.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const WIDE = [1000, 900];
const NARROW = [420, 900]; // app-shell.css switches to the overlay at max-width:720px

const state = async (p) => JSON.parse(await p.evalJS('JSON.stringify(window.state())'));

/* Wait on the LAYOUT, never on a duration. The backdrop is position:fixed inset:0 at z-index 55 and
   leaves through a `visibility` transition, so for as long as that runs it still swallows a click
   aimed at the toggle in the topbar underneath it. A fixed pause that is long enough on a developer
   laptop is not long enough on a loaded CI runner, and the test then fails by clicking the wrong
   thing, which is exactly how this spec first went red on CI while passing locally. */
const OPEN = `window.state().open && document.getElementById('sidebar').getBoundingClientRect().left === 0`;
const SHUT = `!window.state().open && getComputedStyle(document.getElementById('backdrop')).visibility === 'hidden'`;
const isWide = (yes) => `window.matchMedia('(min-width: 721px)').matches === ${yes}`;

/* In the wide mode the panel does not slide, it SHRINKS, and the topbar, with the toggle in it,
   travels the whole 15.5rem while it does. Waiting only for the class to flip means the next click
   is aimed at a button that has since moved out from under the pointer, so the wait is on the width
   reaching its end state. */
const COLLAPSED = `window.state().collapsed && document.getElementById('sidebar').getBoundingClientRect().width === 0`;
const EXPANDED = `!window.state().collapsed && document.getElementById('sidebar').getBoundingClientRect().width > 100`;

/* waitFor RETURNS false on timeout rather than throwing, so an unmet condition would otherwise sail
   on and fail some later assertion with a message about the wrong thing. Say which wait expired. */
const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what} — condition never became true: ${condition}`);
};

const ready = async (p, [w, h]) => {
  await until(p, 'document.readyState === "complete" && !!window.state', 'the page and its state probe');
  await p.setViewport(w, h);
  await until(p, isWide(w >= 721), `the ${w >= 721 ? 'wide' : 'narrow'} media query`);
  /* matchMedia().matches flips BEFORE the change listener that reacts to it has run, so waiting on
     the query alone reads the shell mid-transition between modes — invisible on an idle machine,
     visible the moment the suite runs 18 specs at once. Wait for the shell's own answer instead. */
  await until(p, `window.state().expanded === '${w >= 721 ? 'true' : 'false'}'`,
    'the shell to finish reacting to the viewport change');
};

const openNav = async (p) => {
  await p.clickCenter('#toggle');
  await until(p, OPEN, 'the overlay panel to finish sliding in');
};
const expectShut = async (p) => {
  await until(p, SHUT, 'the overlay to close and its backdrop to stop intercepting clicks');
};

test('wide: the toggle collapses the column, and a collapsed nav leaves the tab order (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, WIDE);

    const start = await state(p);
    assert.equal(start.collapsed, false, 'starts as a visible column');
    assert.equal(start.expanded, 'true', 'aria-expanded answers "is the nav showing?"');
    assert.equal(start.sidebarInert, false);

    await p.clickCenter('#toggle');
    await until(p, COLLAPSED, 'the sidebar to finish collapsing');
    const collapsed = await state(p);
    assert.equal(collapsed.collapsed, true, 'the toggle collapses it');
    assert.equal(collapsed.expanded, 'false');
    /* width:0 + overflow:hidden hides a panel from the eye, not from the keyboard. Without this a
       collapsed nav still swallows two Tab presses on the way to the page. */
    assert.equal(collapsed.sidebarInert, true, 'a nav nobody can see must not be tabbable');
    assert.equal(collapsed.contentInert, false, 'the page stays usable — this is a column, not an overlay');

    await p.clickCenter('#toggle');
    await until(p, EXPANDED, 'the sidebar to finish expanding');
    assert.equal((await state(p)).sidebarInert, false, 'and comes back');
  });
});

test('narrow: opening the overlay makes the page behind it inert (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);

    const closed = await state(p);
    assert.equal(closed.open, false);
    assert.equal(closed.sidebarInert, true, 'an off-canvas panel is still on screen — translateX only moves it');

    await openNav(p);
    const open = await state(p);
    assert.equal(open.open, true);
    assert.equal(open.expanded, 'true');
    assert.equal(open.contentInert, true, 'Tab must not reach the page behind the backdrop');
    assert.equal(open.sidebarInert, false);
  });
});

test('narrow: focus enters the panel, is trapped in it, and comes back to the toggle (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);

    await openNav(p);

    const inside = JSON.parse(await p.evalJS('JSON.stringify(window.focusablesInSidebar())'));
    assert.deepEqual(inside, ['brand', 'nav-one', 'nav-two'], 'fixture sanity: three stops in the panel');
    assert.equal((await state(p)).focused, 'brand', 'focus moves into the panel on open');

    /* Tab to the last stop, then once more: it must cycle to the first rather than walk out of the
       document into the browser's own chrome. */
    await p.pressKey('Tab');
    await p.pressKey('Tab');
    assert.equal((await state(p)).focused, 'nav-two', 'reached the last stop');
    await p.pressKey('Tab');
    assert.equal((await state(p)).focused, 'brand', 'and wrapped back to the first');

    await p.pressKey('Escape');
    await expectShut(p);
    const after = await state(p);
    assert.equal(after.open, false, 'Escape closes it');
    assert.equal(after.contentInert, false, 'and gives the page back');
    assert.equal(after.focused, 'toggle', 'focus returns to the control that opened it, never the body');
  });
});

test('narrow: the backdrop and a nav item both close it (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);

    await openNav(p);
    /* Assert it OPENED before asserting it closed: without this the test passes on a shell with no
       behaviour at all, where the nav never opens and "it is closed" is true and meaningless. */
    assert.equal((await state(p)).open, true, 'precondition: the overlay is open');
    await p.evalJS(`document.getElementById('backdrop').click()`);
    await expectShut(p);
    assert.equal((await state(p)).open, false, 'backdrop click closes');

    /* Reopening REQUIRES the backdrop to have finished leaving: until then it is still on top of
       the toggle and takes the click itself. */
    await openNav(p);
    assert.equal((await state(p)).open, true, 'precondition: open again');
    /* Following a link inside an overlay nav means "take me there" — the panel must not stay open
       over the page just asked for. This is the behaviour the repo's own two copies disagreed on. */
    await p.evalJS(`document.getElementById('nav-two').click()`);
    await expectShut(p);
    assert.equal((await state(p)).open, false, 'a nav item closes it');
  });
});

test('crossing the breakpoint while open does not strand the page as inert (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);

    await openNav(p);
    assert.equal((await state(p)).contentInert, true, 'open as an overlay');

    /* The failure this guards: the panel becomes a static column again while --nav-open and the
       content's `inert` are still set, and the page can never be clicked or read again. */
    await p.setViewport(...WIDE);
    await until(p, isWide(true), 'the wide media query after the resize');
    await until(p, '!window.state().open', 'the overlay state to be dropped on crossing');
    const wide = await state(p);
    assert.equal(wide.open, false, 'the overlay state is dropped');
    assert.equal(wide.contentInert, false, 'and the page is usable again');
    assert.equal(wide.sidebarInert, false, 'the nav is a visible column now');
    assert.equal(wide.expanded, 'true');
  });
});

/* The two pieces a host with its own state needs, and the reason they exist: the Blazor wrapper
 * binds @bind-NavOpen through them rather than owning a second copy of this behaviour. The bridge's
 * own doctrine is that the enhancers stay the source of truth. */
test('it announces every real change, including the ones the viewport causes (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);
    /* Narrowing hid a nav that was a visible column, and that IS a change: a host whose bound value
       stayed `true` would be describing a panel nobody can see. */
    assert.deepEqual(JSON.parse(await p.evalJS('JSON.stringify(window.navEvents)')), [false],
      'becoming an overlay is announced, because the nav stopped being visible');

    await p.evalJS('window.navEvents.length = 0');
    await openNav(p);
    await p.pressKey('Escape');
    await expectShut(p);
    await until(p, 'window.navEvents.length === 2', 'an open and a close to be announced');
    assert.deepEqual(JSON.parse(await p.evalJS('JSON.stringify(window.navEvents)')), [true, false],
      'open then close, in order');
  });
});

test('a host can drive it without touching the kit\'s class names (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);
    await p.evalJS('window.navEvents.length = 0');

    await p.evalJS(`window.FreedayAppShell.setVisible(document.getElementById('app'), true)`);
    await until(p, OPEN, 'setVisible(true) to open the overlay');
    assert.equal((await state(p)).contentInert, true, 'and to do the whole job, not just the class');

    await p.evalJS(`window.FreedayAppShell.setVisible(document.getElementById('app'), true)`);
    assert.equal(JSON.parse(await p.evalJS('JSON.stringify(window.navEvents)')).length, 1,
      'setting what is already set announces nothing — a bound host would loop on the echo');

    await p.evalJS(`window.FreedayAppShell.setVisible(document.getElementById('app'), false)`);
    await until(p, SHUT, 'setVisible(false) to close it');
    assert.equal((await state(p)).contentInert, false, 'the page is given back');
  });
});

test('a shell mounted after load is hydrated by initAll, the way the bridge does it (#8)', { skip }, async () => {
  await withPage(fixture('vanilla-app-shell.html'), async (p) => {
    await ready(p, NARROW);

    /* The Blazor path: the markup does not exist at DOMContentLoaded, and FreedayBlazor.initAll
       hands the enhancer the component's own root afterwards. If initShells only ever looked
       INSIDE the element it is given, this would silently do nothing — the shell root is the
       element, not a descendant of it. */
    const wired = await p.evalJS(`(function () {
      var host = document.createElement('div');
      host.innerHTML = document.getElementById('app').outerHTML.replace(/id="app"/, 'id="late"');
      var late = host.firstElementChild;
      late.removeAttribute('data-fdy-app-shell-ready');
      delete late.dataset.fdyAppShellReady;
      document.body.appendChild(late);
      window.FreedayAppShell.init(late);
      return late.querySelector('.fdy-app__navtoggle').getAttribute('aria-expanded');
    })()`);
    assert.equal(wired, 'false', 'the late shell was synced on hydration, not left blank');

    await p.evalJS(`window.FreedayAppShell.setVisible(document.getElementById('late'), true)`);
    await until(p, `document.getElementById('late').classList.contains('fdy-app--nav-open')`,
      'the late shell to respond to setVisible');
    assert.equal(
      await p.evalJS(`document.querySelector('#late .fdy-app__content').hasAttribute('inert')`),
      true, 'and to do the whole job for its own subtree');
  });
});
