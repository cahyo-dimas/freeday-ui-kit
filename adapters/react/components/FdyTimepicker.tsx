import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

// React twin of adapters/vue/components/FdyTimepicker.vue over freeday's `.fdy-timepicker`
// classes (src/components/timepicker.css). See that file's header for why a form control is
// re-implemented natively instead of wrapping freeday-timepicker.js, and why this replaces
// `<input type="time">`: the native picker is drawn by the OS, so iOS shows a scroll wheel,
// Android a clock dial and desktop a stepper, each with its own width and format, and no CSS
// reaches any of them (#094).

export interface FdyTimepickerProps {
  /** `HH:MM`, 24-hour. `''`/`null` for empty. A loose `H:MM` is normalised for matching. */
  value: string | null;
  onChange: (value: string) => void;
  /** Minutes between options. Default 30. */
  step?: number;
  /** `HH:MM` bounds, inclusive. Default `00:00` to `23:59`. */
  min?: string;
  max?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  /** Shown when there is no value. Default `--:--`, the same as the raw path. */
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its time, but can't be opened or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  /**
   * Let a `data-fdy-validate` form demand this control be filled. It renders `data-fdy-required`
   * on the root, and `freeday-form.js` refuses the submit, paints the message in the field and
   * focuses the trigger. Needed because the trigger is a `<button>`: `willValidate` is false, so
   * a plain `required` on it has never meant anything (#096). Override the message per control
   * with `data-fdy-msg-required` on the root.
   */
  required?: boolean;
  invalid?: boolean;
  describedby?: string;
}

const SHAPE: RegExp = /^\d{1,2}:\d{2}$/;

function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
/** `7:0` is not a time; `7:00` is the same time as `07:00`. Anything else answers `''`. */
function normalise(time: string | null): string {
  if (time === null || !SHAPE.test(time)) return '';
  const total: number = toMinutes(time);
  return total >= 0 && total <= 23 * 60 + 59 ? fromMinutes(total) : '';
}
function bound(time: string | undefined, fallback: number): number {
  return time !== undefined && SHAPE.test(time) ? toMinutes(time) : fallback;
}

export function FdyTimepicker(props: FdyTimepickerProps): JSX.Element {
  const baseId: string = useId();
  const triggerId: string = props.id ?? `${baseId}-trigger`;
  const panelId: string = `${baseId}-panel`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<number>(-1);

  // Lift the panel into the top layer so it escapes an ancestor overflow clip. A shift form is a
  // modal, and a time list long enough to scroll is exactly the panel a card would cut off.
  usePopover(panelRef, triggerRef, open);

  // Popover attr for React 18 (JSX may not type it): set once on mount.
  useEffect((): void => {
    panelRef.current?.setAttribute('popover', 'manual');
  }, []);

  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const isInvalid: boolean = props.invalid === true;

  const times: ReadonlyArray<string> = useMemo((): ReadonlyArray<string> => {
    const stride: number = Math.max(1, Math.trunc(props.step ?? 30));
    const from: number = bound(props.min, 0);
    const to: number = bound(props.max, 23 * 60 + 59);
    const out: string[] = [];
    for (let m = from; m <= to; m += stride) out.push(fromMinutes(m));
    return out;
  }, [props.step, props.min, props.max]);

  const value: string = normalise(props.value);
  const selectedIndex: number = times.indexOf(value);
  const shown: string = value !== '' ? value : (props.placeholder ?? '--:--');
  const isPlaceholder: boolean = value === '';
  const activeDescendant: string | undefined = open && highlighted >= 0 ? optionId(highlighted) : undefined;

  /* The panel is `max-height:15rem` and scrolls: a highlight the reader cannot see is no highlight,
     and with 48 half-hour options most of the list is out of view. */
  useEffect((): void => {
    const list: HTMLUListElement | null = panelRef.current;
    if (list === null || highlighted < 0) return;
    const opt: Element | undefined = list.children[highlighted];
    if (opt instanceof HTMLElement) opt.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  /* Clamped, not cyclic: FdyCombo wraps because its lists are short. Here ArrowUp at 00:00 landing
     on 23:30 reads as a glitch. Matches the raw path. */
  const setHighlight = (index: number): void => {
    const last: number = times.length - 1;
    setHighlighted(last < 0 ? -1 : Math.min(last, Math.max(0, index)));
  };
  const openList = (): void => {
    if (isDisabled || isReadonly || open) return;
    setOpen(true);
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
  };
  const closeList = (focusTrigger: boolean): void => {
    setOpen(false);
    setHighlighted(-1);
    if (focusTrigger) triggerRef.current?.focus();
  };
  const toggle = (): void => { if (open) closeList(false); else openList(); };
  const choose = (index: number): void => {
    const next: string | undefined = times[index];
    if (next === undefined) return;
    if (next !== value) props.onChange(next);
    closeList(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isDisabled || isReadonly) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (open) setHighlight(highlighted + 1); else openList(); break;
      case 'ArrowUp': e.preventDefault(); if (open) setHighlight(highlighted - 1); else openList(); break;
      case 'Home': if (open) { e.preventDefault(); setHighlight(0); } break;
      case 'End': if (open) { e.preventDefault(); setHighlight(times.length - 1); } break;
      case 'Enter':
      case ' ': e.preventDefault(); if (open && highlighted >= 0) choose(highlighted); else openList(); break;
      case 'Escape': if (open) { e.preventDefault(); closeList(true); } break;
      case 'Tab': if (open) closeList(false); break;
      default: break;
    }
  };

  const onFocusout = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next: EventTarget | null = e.relatedTarget;
    if (rootRef.current !== null && !(next instanceof Node && rootRef.current.contains(next))) closeList(false);
  };

  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closeList(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={isInvalid ? 'fdy-timepicker fdy-timepicker--error' : 'fdy-timepicker'}
      data-value={value}
      data-fdy-required={props.required === true ? '' : undefined}
      onKeyDown={onKeyDown}
      onBlur={onFocusout}
    >
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className={open ? 'fdy-timepicker__trigger is-open' : 'fdy-timepicker__trigger'}
        aria-haspopup="listbox"
        aria-controls={panelId}
        aria-expanded={open}
        aria-activedescendant={activeDescendant}
        aria-label={props.ariaLabel}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-readonly={isReadonly ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
        onClick={toggle}
      >
        <span className={isPlaceholder ? 'fdy-timepicker__value fdy-timepicker__value--placeholder' : 'fdy-timepicker__value'}>{shown}</span>
        <span className="fdy-timepicker__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
      </button>
      <ul id={panelId} ref={panelRef} className="fdy-timepicker__panel" role="listbox"
          aria-label={props.ariaLabel} hidden={!open}>
        {times.map((t: string, i: number): JSX.Element => (
          // onMouseDown preventDefault keeps focus on the trigger: an <li> isn't focusable, so a
          // plain mousedown moves focus out of the control, fires onBlur and closes the panel
          // before the click lands. Same pattern as FdyCombo.
          <li
            id={optionId(i)}
            key={t}
            className={i === highlighted ? 'fdy-timepicker__opt is-active' : 'fdy-timepicker__opt'}
            role="option"
            aria-selected={t === value}
            onMouseDown={(e: React.MouseEvent): void => e.preventDefault()}
            onClick={(): void => choose(i)}
            onMouseMove={(): void => setHighlight(i)}
          >{t}</li>
        ))}
      </ul>
    </div>
  );
}
