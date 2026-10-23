import { watch, onBeforeUnmount, type Ref } from 'vue';

// Vue equivalent of the vanilla freeday-popover.js helper. Lifts a dropdown panel into the top
// layer via the native Popover API so it escapes any ancestor overflow clip (a card, a scroll
// container), then positions it `fixed` against its trigger (flip above when there's no room
// below; match the trigger width; line either edge up with the trigger's). The panel stays in
// the component's DOM, so focus / outside-click / ARIA are untouched. Degrades to the panel's own
// [hidden]/absolute CSS where the Popover API is unavailable. Drive it with the component's
// existing `open` ref.

interface PopoverElement extends HTMLElement {
  showPopover(): void;
  hidePopover(): void;
}

/**
 * Which of the panel's edges lines up with the trigger's. `'start'` (the default everywhere it is
 * omitted) puts the panel's LEFT edge on the trigger's left edge, right for an input-shaped
 * dropdown. `'end'` puts its RIGHT edge on the trigger's right edge, which is what a panel much
 * wider than its trigger needs when the trigger sits in a right-hand gutter or a table header.
 * Same two names as the raw path's `place()`, so one concept does not grow a second vocabulary.
 */
export type FdyPopoverAlign = 'start' | 'end';

const GAP = 4; // ~ --space-1
const supported: boolean =
  typeof HTMLElement !== 'undefined'
  && typeof (HTMLElement.prototype as Partial<PopoverElement>).showPopover === 'function';

function place(
  panel: HTMLElement,
  trigger: HTMLElement,
  align: FdyPopoverAlign | undefined,
  matchWidth: boolean | undefined,
): void {
  /* Take the panel out of the flow BEFORE measuring anything. Until this runs the panel is still
   * `position:absolute` with `top:calc(100% + …)` from its component's stylesheet, an author rule
   * outranks the popover UA style, and in the top layer that `100%` resolves against the viewport.
   * So a panel that has just been shown sits one viewport height down the page and drags the
   * document's scrollable overflow with it. Where scrollbars take layout space (every Windows and
   * Linux browser; macOS overlay scrollbars hide it) the document gains a classic scrollbar for the
   * duration, documentElement.clientWidth drops by its width, and the page relays out that much
   * narrower. A trigger rect read in that instant belongs to a layout the next three lines undo:
   * measured 741 instead of 756 for a combo in a 24px gutter, a scrollbar's width to the left. */
  panel.style.position = 'fixed';
  panel.style.margin = '0';
  panel.style.inset = 'auto';
  const r: DOMRect = trigger.getBoundingClientRect();
  /* The trigger's width as a FLOOR, and `matchWidth !== false` rather than a truthiness test, the
     same spelling the raw `place()` uses. It is what keeps the four input-shaped panels looking
     like one control with its list hanging off it, and it is not cosmetic: `.fdy-combo__listbox`,
     `.fdy-autocomplete__listbox` and `.fdy-cascade__panel` are `min-width:100%`, and once the panel
     is `fixed` in the top layer that 100% is the VIEWPORT, so without this line a 220px combo opens
     a 1000px listbox. A panel whose stylesheet asks for a width of its own opts out instead:
     `.fdy-filter` wants `min-width:14rem` and hangs off a 24px funnel, and an inline floor of 24px
     outranks the rule, which left the typed filter panel 206px wide against the 224 it asked for. */
  if (matchWidth !== false) panel.style.minWidth = `${r.width}px`;
  const ph: number = panel.offsetHeight;
  const pw: number = panel.offsetWidth;
  const vw: number = document.documentElement.clientWidth;
  const vh: number = document.documentElement.clientHeight;
  const below: number = vh - r.bottom - GAP;
  const above: number = r.top - GAP;
  const top: number = ph <= below || below >= above ? r.bottom + GAP : Math.max(GAP, r.top - GAP - ph);
  let left: number = align === 'end' ? r.right - pw : r.left;
  /* Clamped on BOTH sides, and that is not belt-and-braces: the first line keeps a start-aligned
     panel on screen, the second keeps an end-aligned one on screen when the panel is wider than the
     room to the left of its trigger. Keeping only one of them trades an overflow on one edge for an
     overflow on the other. */
  if (left + pw > vw - GAP) left = vw - GAP - pw;
  if (left < GAP) left = GAP;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
}

/**
 * Anchor a dropdown `panelRef` to `triggerRef` in the top layer while `open` is true.
 * The panel element must carry `popover="manual"` in the template (ignored where unsupported).
 * `align` and `matchWidth` are captured once, at setup; omitting them means `'start'` and `true`,
 * which is what nine of the kit's ten typed dropdowns want. Both are plain values and not an
 * options object, so the React port can list them in an effect's dependencies without a caller
 * having to memoise anything, and the two ports keep one signature.
 */
export function usePopover(
  panelRef: Ref<HTMLElement | null>,
  triggerRef: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  align?: FdyPopoverAlign,
  matchWidth?: boolean,
): void {
  function reposition(): void {
    const panel: PopoverElement | null = panelRef.value as PopoverElement | null;
    const trigger: HTMLElement | null = triggerRef.value;
    if (supported && panel !== null && trigger !== null && panel.matches(':popover-open')) place(panel, trigger, align, matchWidth);
  }

  watch(
    open,
    (isOpen: boolean): void => {
      const panel: PopoverElement | null = panelRef.value as PopoverElement | null;
      const trigger: HTMLElement | null = triggerRef.value;
      if (!supported || panel === null || trigger === null) return;
      if (isOpen) {
        if (!panel.matches(':popover-open')) panel.showPopover();
        place(panel, trigger, align, matchWidth);
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
      } else {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
        if (panel.matches(':popover-open')) panel.hidePopover();
      }
    },
    { flush: 'post' },
  );

  onBeforeUnmount((): void => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  });
}
