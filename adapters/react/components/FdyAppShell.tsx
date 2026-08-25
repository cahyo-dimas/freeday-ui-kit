import type { JSX, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NAV_QUERY,
  applyShellState,
  focusPanel,
  restoreFocus,
  trapTab,
} from '../../core/app-shell.js';

// A React wrapper over freeday's `.fdy-app` shell (src/components/app-shell.css). React port of
// adapters/vue/components/FdyAppShell.vue, sharing adapters/core/app-shell.js so the two cannot
// drift into two different focus traps.
//
// ONE model: `navOpen` means "the nav is visible to the reader". Above the nav breakpoint a hidden
// nav is `--nav-collapsed`, below it a visible nav is `--nav-open`, the kit owns that mapping so an
// app never reasons about the viewport to answer a question about its own UI.
//
// Omit `navOpen` and the component keeps its own, defaulting BY VIEWPORT: a column on a wide screen,
// hidden on a narrow one. That default is why the prop is optional — a parent cannot express it as a
// single initial value before it knows the viewport.

export interface FdyAppShellProps {
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  toggleLabel?: string;
  toggleIcon?: ReactNode;
  skip?: ReactNode;
  brand?: ReactNode;
  nav?: ReactNode;
  topbar?: ReactNode;
  children?: ReactNode;
}

export function FdyAppShell(props: FdyAppShellProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const restoreToRef = useRef<Element | null>(null);
  /* Set while a viewport change is driving the state, so the effect below reconciles `inert` and
     the classes but leaves FOCUS alone: a resize is not a reader asking to go somewhere. */
  const fromResizeRef = useRef<boolean>(false);
  const [overlay, setOverlay] = useState<boolean>(false);
  const [uncontrolled, setUncontrolled] = useState<boolean>(true);

  const controlled: boolean = props.navOpen !== undefined;
  const navVisible: boolean = controlled ? props.navOpen === true : uncontrolled;

  const setVisible = useCallback((next: boolean): void => {
    if (!controlled) setUncontrolled(next);
    if (props.onNavOpenChange !== undefined) props.onNavOpenChange(next);
  }, [controlled, props.onNavOpenChange]);

  /* The media listener reads these through refs and subscribes ONCE. Depending on navVisible would
     resubscribe on every toggle and re-run the handler, and its "narrowing with the nav visible
     hides it" rule would then fire on an ordinary open — closing the panel in the same tick the
     reader opened it. */
  const navVisibleRef = useRef<boolean>(navVisible);
  navVisibleRef.current = navVisible;
  const setVisibleRef = useRef<(next: boolean) => void>(setVisible);
  setVisibleRef.current = setVisible;

  // The media query owns `overlay`, and the two directions are not symmetrical. Narrowing with the
  // nav visible would drop an overlay panel over a page nobody asked to leave, so it is hidden;
  // widening is harmless, since a visible nav simply becomes the column again.
  useEffect((): (() => void) => {
    const media: MediaQueryList = window.matchMedia(NAV_QUERY);
    const onChange = (): void => {
      const nowOverlay: boolean = !media.matches;
      setOverlay((was: boolean): boolean => {
        if (was !== nowOverlay) fromResizeRef.current = true;
        return nowOverlay;
      });
      if (nowOverlay && navVisibleRef.current) setVisibleRef.current(false);
    };
    // Mount: adopt the viewport without the hide-on-narrow side effect — nothing is open yet.
    setOverlay(!media.matches);
    if (!controlled) setUncontrolled(media.matches);
    media.addEventListener('change', onChange);
    return (): void => media.removeEventListener('change', onChange);
  }, [controlled]);

  // Focus moves only after the class change has been painted, or the panel is still off-canvas and
  // the browser refuses to focus what it cannot lay out.
  useEffect((): void => {
    const el: HTMLDivElement | null = rootRef.current;
    if (el === null) return;
    applyShellState(el, { navVisible, overlay });
    if (fromResizeRef.current) {
      fromResizeRef.current = false;
      return;
    }
    if (!overlay) return;
    if (navVisible) restoreToRef.current = focusPanel(el);
    else restoreFocus(el, restoreToRef.current);
  }, [navVisible, overlay]);

  useEffect((): (() => void) => {
    const onKeydown = (e: KeyboardEvent): void => {
      const el: HTMLDivElement | null = rootRef.current;
      if (el === null || !overlay || !navVisible) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setVisible(false);
        return;
      }
      trapTab(el, e);
    };
    document.addEventListener('keydown', onKeydown);
    return (): void => document.removeEventListener('keydown', onKeydown);
  }, [overlay, navVisible, setVisible]);

  const shellClass: string = overlay
    ? (navVisible ? 'fdy-app fdy-app--nav-open' : 'fdy-app')
    : (navVisible ? 'fdy-app' : 'fdy-app fdy-app--nav-collapsed');

  return (
    <div ref={rootRef} className={shellClass}>
      {props.skip}

      <aside
        className="fdy-app__sidebar"
        onClick={(e): void => {
          // Following a link in an overlay nav means "take me there" — the panel must not stay over
          // the page it was just asked for. On a wide viewport the nav is a column: nothing to close.
          if (!overlay || !navVisible) return;
          const target: HTMLElement | null = e.target as HTMLElement | null;
          if (target !== null && target.closest('.fdy-nav__item') !== null) setVisible(false);
        }}
      >
        {props.brand}
        {props.nav}
      </aside>

      <div className="fdy-app__content">
        <header className="fdy-app__topbar">
          <button
            className="fdy-app__navtoggle"
            type="button"
            aria-label={props.toggleLabel ?? 'Toggle navigation'}
            onClick={(): void => setVisible(!navVisible)}
          >{props.toggleIcon ?? '☰'}</button>

          <h1 className="fdy-app__title">{props.title}</h1>

          {props.topbar}
        </header>

        <main className="fdy-app__main">{props.children}</main>
      </div>

      <div
        className="fdy-app__backdrop"
        onClick={(): void => {
          if (overlay && navVisible) setVisible(false);
        }}
      />
    </div>
  );
}
