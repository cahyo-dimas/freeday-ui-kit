/* Freeday, theme preference (optional, zero-dependency, no markup of its own).
 * The light/dark switch every app needs and each one used to write for itself, guessing the kit's
 * contract from the docs (CATATAN-FREEDAY §23). One preference per device: 'light', 'dark' or
 * 'system'.
 *
 * 'system' REMOVES data-theme instead of computing one. The tokens already follow
 * prefers-color-scheme whenever no data-theme says otherwise, so the page tracks an OS switch live,
 * with no listener deciding anything.
 *
 * The preference always lands on <html>. attach(el) adds another root that gets it too: a region
 * that carries its own data-theme in markup (a dark kiosk shell inside a light app) would otherwise
 * keep that fixed value, because a subtree's attribute wins over the document's. Attaching hands the
 * region to the user: with the preference at 'system' its fixed value is removed and it follows the
 * OS like the rest of the page.
 *
 * Every change fires "fdy-theme-change" on document, detail {theme, resolved}; so does an OS switch
 * while the preference is 'system', since `resolved` (what is actually shown) moved. The Vue and
 * React useTheme() import this same file, so a page has one preference whichever way it loaded.
 *
 * Only a script in <head> can apply the stored value before the first paint; this file runs too
 * late for that, and catches up on load. COMPONENTS.md has the one-line snippet. Exposes
 * window.FreedayTheme.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.FreedayTheme) return;

  var KEY = 'fdy-theme';
  var THEMES = ['light', 'dark', 'system'];
  var roots = [];
  var memory = null;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function valid(theme) {
    return THEMES.indexOf(theme) !== -1;
  }

  /* Storage can throw (private mode, a blocked origin); the preference then lasts the page. */
  function read() {
    try {
      var stored = window.localStorage.getItem(KEY);
      if (valid(stored)) return stored;
    } catch (e) { /* fall through to the in-memory value */ }
    return memory !== null ? memory : 'system';
  }
  function write(theme) {
    memory = theme;
    try {
      if (theme === 'system') window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, theme);
    } catch (e) { /* kept in memory only */ }
  }

  function applyTo(el, theme) {
    if (theme === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
  }
  function targets() {
    return [document.documentElement].concat(roots);
  }

  /* What <html> shows: its own attribute if it has one, the OS otherwise. Read from the DOM, not
     from the preference, so markup that ships data-theme="light" before anything is stored is
     reported as light, which is what the user sees. */
  function resolved() {
    var own = document.documentElement.getAttribute('data-theme');
    if (own === 'light' || own === 'dark') return own;
    return media && media.matches ? 'dark' : 'light';
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('fdy-theme-change', { detail: { theme: read(), resolved: resolved() } }));
  }

  function set(theme) {
    if (!valid(theme)) {
      throw new TypeError('FreedayTheme.set: theme must be one of ' + THEMES.join(', ') + ', got ' + JSON.stringify(theme));
    }
    write(theme);
    targets().forEach(function (el) { applyTo(el, theme); });
    emit();
  }

  /* Flips what is SHOWN, so the first press always changes the screen, even from 'system'. */
  function toggle() {
    set(resolved() === 'dark' ? 'light' : 'dark');
  }

  function attach(el) {
    if (!el || roots.indexOf(el) !== -1) return detacher(el);
    roots.push(el);
    applyTo(el, read());
    return detacher(el);
  }
  function detacher(el) {
    return function () {
      var i = roots.indexOf(el);
      if (i !== -1) roots.splice(i, 1);
    };
  }

  /* A stored choice is applied on load as well. The <head> snippet does it before first paint;
     without it the page shows the CSS default for a moment, and then still ends up right. Nothing
     stored means nothing is touched, so markup that ships its own data-theme keeps it. */
  var initial = read();
  if (initial !== 'system') applyTo(document.documentElement, initial);

  if (media) {
    var onOs = function () { if (read() === 'system') emit(); };
    if (media.addEventListener) media.addEventListener('change', onOs);
    else if (media.addListener) media.addListener(onOs);
  }

  window.FreedayTheme = { get: read, resolved: resolved, set: set, toggle: toggle, attach: attach };
})();
