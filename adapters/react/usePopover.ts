import { useEffect, type RefObject } from 'react';

// React port of adapters/vue/usePopover.ts. Lifts a dropdown panel into the top layer via the
// native Popover API so it escapes any ancestor overflow clip (a .fdy-card, a scroll container),
// then positions it `fixed` against its trigger (flip above when there's no room below; match the
// trigger width). Degrades to the panel's own [hidden]/absolute CSS where Popover is unavailable.

interface PopoverElement extends HTMLElement {
  showPopover(): void;
  hidePopover(): void;
}

const GAP = 4; // ~ --space-1
const supported: boolean =
  typeof HTMLElement !== 'undefined'
  && typeof (HTMLElement.prototype as Partial<PopoverElement>).showPopover === 'function';

function place(panel: HTMLElement, trigger: HTMLElement): void {
  const r: DOMRect = trigger.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.margin = '0';
  panel.style.inset = 'auto';
  panel.style.minWidth = `${r.width}px`;
  const ph: number = panel.offsetHeight;
  const pw: number = panel.offsetWidth;
  const vw: number = document.documentElement.clientWidth;
  const vh: number = document.documentElement.clientHeight;
  const below: number = vh - r.bottom - GAP;
  const above: number = r.top - GAP;
  const top: number = ph <= below || below >= above ? r.bottom + GAP : Math.max(GAP, r.top - GAP - ph);
  let left: number = r.left;
  if (left + pw > vw - GAP) left = Math.max(GAP, vw - GAP - pw);
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
}

export function usePopover(
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useEffect((): void | (() => void) => {
    const panel: PopoverElement | null = panelRef.current as PopoverElement | null;
    const trigger: HTMLElement | null = triggerRef.current;
    if (!supported || panel === null || trigger === null) return;

    function reposition(): void {
      if (panel !== null && trigger !== null && panel.matches(':popover-open')) place(panel, trigger);
    }

    if (open) {
      if (!panel.matches(':popover-open')) panel.showPopover();
      place(panel, trigger);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      return (): void => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
        if (panel.matches(':popover-open')) panel.hidePopover();
      };
    }
    return;
  }, [open, panelRef, triggerRef]);
}
