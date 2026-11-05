/* Freeday. React theme preference (CATATAN-FREEDAY §23). A thin view over window.FreedayTheme,
 * which this file loads itself, so it needs no `import 'freeday'` first and a page still has one
 * preference if the root import is there too (the core registers once).
 *
 * Usage:
 *   const { theme, resolved, setTheme, toggleTheme } = useTheme();
 *   // <button onClick={toggleTheme} aria-label={resolved === 'dark' ? 'Light theme' : 'Dark theme'}>
 *
 * Pass a ref to also put the preference on that element, for a region whose markup fixes its own
 * data-theme. Every instance reads the same store through useSyncExternalStore, so two toggles on
 * one page never disagree.
 */
import { useEffect, useSyncExternalStore } from 'react';
import '../../dist/freeday-theme.js';

function subscribe(onChange) {
  document.addEventListener('fdy-theme-change', onChange);
  return function () { document.removeEventListener('fdy-theme-change', onChange); };
}
function getTheme() { return window.FreedayTheme.get(); }
function getResolved() { return window.FreedayTheme.resolved(); }
function serverTheme() { return 'system'; }
function serverResolved() { return 'light'; }
function setTheme(next) { window.FreedayTheme.set(next); }
function toggleTheme() { window.FreedayTheme.toggle(); }

export function useTheme(rootRef) {
  var theme = useSyncExternalStore(subscribe, getTheme, serverTheme);
  var resolved = useSyncExternalStore(subscribe, getResolved, serverResolved);
  useEffect(function () {
    if (rootRef && rootRef.current) return window.FreedayTheme.attach(rootRef.current);
    return undefined;
  }, [rootRef]);
  return { theme: theme, resolved: resolved, setTheme: setTheme, toggleTheme: toggleTheme };
}
