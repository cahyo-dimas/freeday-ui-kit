import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

// React port of adapters/vue/components/FdyDatepicker.vue over freeday's `.fdy-datepicker` /
// `.fdy-cal__*` classes (see src/components/datepicker.css). Re-implements the single-date
// calendar behavior (month grid, keyboard nav, min/max clamping, Intl locale formatting) as a
// controlled React component (`value` + `onChange` in place of Vue's `v-model`). Open/close
// (outside-click + focusout) mirrors the already-approved FdyCombo.tsx pattern. Range mode is
// out of scope (v1 = single date).

interface DayCell {
  date: Date;
  iso: string;
  label: number;
  ariaLabel: string;
  outside: boolean;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  focusable: boolean;
}

export interface FdyDatepickerProps {
  value: string | null;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
  /** Show a clear (×) button in the trigger when a date is set, so an optional date can be unset. Calls onChange('') to reset. Off by default. */
  clearable?: boolean;
  /** aria-label for the previous-month nav button. Default 'Previous month' — override for non-English UIs (month/weekday names already follow `locale`). */
  prevMonthLabel?: string;
  /** aria-label for the next-month nav button. Default 'Next month'. */
  nextMonthLabel?: string;
  /** aria-label for the clear button (when `clearable`). Default 'Clear date'. */
  clearLabel?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseISO(s: string | null | undefined): Date | null {
  if (s === null || s === undefined || s === '') return null;
  const parts: string[] = s.split('-');
  if (parts.length !== 3) return null;
  const y: number = Number(parts[0]);
  const m: number = Number(parts[1]);
  const day: number = Number(parts[2]);
  const d: Date = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return a !== null && b !== null && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  const x: Date = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  const x: Date = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function dayClassName(cell: DayCell): string {
  let cls = 'fdy-cal__day';
  if (cell.outside) cls += ' is-outside';
  if (cell.today) cls += ' is-today';
  if (cell.selected) cls += ' is-selected';
  return cls;
}

export function FdyDatepicker(props: FdyDatepickerProps): JSX.Element {
  const baseId: string = useId();
  const triggerId: string = props.id ?? `${baseId}-trigger`;
  const titleId: string = `${baseId}-title`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Set by moveFocus/openPanel, consumed by the focus-sync effect below (React's analogue of
  // Vue's `nextTick(focusCell)`); nav-button clicks intentionally leave this untouched so they
  // don't steal DOM focus off the button, matching the Vue template's behavior.
  const pendingFocusRef = useRef<string | null>(null);

  const [open, setOpen] = useState<boolean>(false);

  // Render the calendar panel in the top layer (popover) so it never gets clipped by a card or
  // scroll container; positions against the trigger.
  usePopover(panelRef, triggerRef, open);

  // Popover attr for React 18 (JSX may not type it): set once on mount.
  useEffect((): void => {
    panelRef.current?.setAttribute('popover', 'manual');
  }, []);

  const selectedDate: Date | null = useMemo((): Date | null => parseISO(props.value), [props.value]);
  const minDate: Date | null = useMemo((): Date | null => parseISO(props.min), [props.min]);
  const maxDate: Date | null = useMemo((): Date | null => parseISO(props.max), [props.max]);
  const isDisabled: boolean = props.disabled === true;
  const isInvalid: boolean = props.invalid === true;
  const displayPlaceholder: string = props.placeholder ?? 'Select date';
  const showClear: boolean = props.clearable === true && selectedDate !== null && !isDisabled;
  const prevMonthLabelText: string = props.prevMonthLabel ?? 'Previous month';
  const nextMonthLabelText: string = props.nextMonthLabel ?? 'Next month';
  const clearLabelText: string = props.clearLabel ?? 'Clear date';

  const [viewMonth, setViewMonth] = useState<Date>((): Date => startOfMonth(parseISO(props.value) ?? new Date()));
  const [focusDate, setFocusDate] = useState<Date>((): Date => parseISO(props.value) ?? new Date());

  // Keep the roving-tabindex cell inside the visible month so the grid stays keyboard-reachable
  // after navigating with Home/End/PageUp/PageDown (mirrors freeday-datepicker.js's clamp).
  const effectiveFocusDate: Date = useMemo((): Date => {
    if (focusDate.getMonth() === viewMonth.getMonth() && focusDate.getFullYear() === viewMonth.getFullYear()) return focusDate;
    const daysInMonth: number = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), Math.min(focusDate.getDate(), daysInMonth));
  }, [focusDate, viewMonth]);

  const monthFmt: Intl.DateTimeFormat = useMemo(
    (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }),
    [props.locale],
  );
  const valueFmt: Intl.DateTimeFormat = useMemo(
    (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [props.locale],
  );
  const dayLabelFmt: Intl.DateTimeFormat = useMemo(
    (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [props.locale],
  );
  const dowFmt: Intl.DateTimeFormat = useMemo(
    (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { weekday: 'short' }),
    [props.locale],
  );

  const displayValue: string = selectedDate !== null ? valueFmt.format(selectedDate) : displayPlaceholder;

  const weekdayHeaders: string[] = useMemo((): string[] => {
    const monday: Date = new Date(2024, 0, 1); // a known Monday
    return Array.from({ length: 7 }, (_unused: unknown, i: number): string => dowFmt.format(addDays(monday, i)));
  }, [dowFmt]);

  function isDayDisabled(d: Date): boolean {
    if (minDate !== null && startOfDay(d).getTime() < startOfDay(minDate).getTime()) return true;
    if (maxDate !== null && startOfDay(d).getTime() > startOfDay(maxDate).getTime()) return true;
    return false;
  }

  const gridCells: DayCell[] = useMemo((): DayCell[] => {
    const first: Date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const offset: number = (first.getDay() + 6) % 7; // Monday-first
    const startCell: Date = addDays(first, -offset);
    const today: Date = new Date();
    const focus: Date = effectiveFocusDate;
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d: Date = addDays(startCell, i);
      cells.push({
        date: d,
        iso: toISO(d),
        label: d.getDate(),
        ariaLabel: dayLabelFmt.format(d),
        outside: d.getMonth() !== viewMonth.getMonth(),
        today: sameDay(d, today),
        selected: sameDay(d, selectedDate),
        disabled: isDayDisabled(d),
        focusable: sameDay(d, focus),
      });
    }
    return cells;
    // Deps intentionally mirror the port recipe, not every closure read: minDate/maxDate,
    // dayLabelFmt and effectiveFocusDate all derive deterministically from the listed deps
    // within the same render pass, so this stays in sync without listing them separately.
  }, [viewMonth, props.value, props.min, props.max, props.locale]);

  // Focus the roving-tabindex cell after a render triggered by moveFocus/openPanel (React's
  // analogue of Vue's `nextTick(focusCell)`). Runs after every render; cheap no-op otherwise.
  useEffect((): void => {
    if (pendingFocusRef.current === null) return;
    const iso: string = pendingFocusRef.current;
    pendingFocusRef.current = null;
    dayRefs.current[iso]?.focus();
  });

  function moveFocus(next: Date): void {
    setFocusDate(next);
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    pendingFocusRef.current = toISO(next);
  }

  function pick(d: Date): void {
    if (isDayDisabled(d)) return;
    const day: Date = startOfDay(d);
    setFocusDate(day);
    const iso: string = toISO(day);
    props.onChange(iso);
    closePanel(true);
  }

  // Clear (reset to empty). Calls onChange('') — parseISO('') is null, so the placeholder shows again.
  function clearValue(): void {
    props.onChange('');
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openPanel(): void {
    if (isDisabled || open) return;
    const next: Date = selectedDate ?? focusDate ?? new Date();
    setFocusDate(next);
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setOpen(true);
    pendingFocusRef.current = toISO(next);
  }

  function closePanel(returnFocus: boolean): void {
    if (!open) return;
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function toggle(): void {
    if (open) closePanel(false);
    else openPanel();
  }

  function onGridKeydown(e: React.KeyboardEvent<HTMLDivElement>): void {
    const f: Date = effectiveFocusDate;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(addDays(f, -1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(addDays(f, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(addDays(f, -7));
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(addDays(f, 7));
        break;
      case 'Home':
        e.preventDefault();
        moveFocus(addDays(f, -((f.getDay() + 6) % 7)));
        break;
      case 'End':
        e.preventDefault();
        moveFocus(addDays(f, 6 - ((f.getDay() + 6) % 7)));
        break;
      case 'PageUp':
        e.preventDefault();
        moveFocus(addMonths(f, e.shiftKey ? -12 : -1));
        break;
      case 'PageDown':
        e.preventDefault();
        moveFocus(addMonths(f, e.shiftKey ? 12 : 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(f);
        break;
      case 'Escape':
        e.preventDefault();
        closePanel(true);
        break;
      default:
        break;
    }
  }

  // Close when focus leaves the control entirely (e.g. Shift+Tab off the trigger).
  const onFocusout = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next: EventTarget | null = e.relatedTarget;
    if (rootRef.current !== null && !(next instanceof Node && rootRef.current.contains(next))) closePanel(false);
  };

  // Close when a pointer lands outside the whole control.
  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closePanel(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={isInvalid ? 'fdy-datepicker fdy-datepicker--error' : 'fdy-datepicker'} onBlur={onFocusout}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className={open ? 'fdy-datepicker__trigger is-open' : 'fdy-datepicker__trigger'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
        onClick={toggle}
      >
        <span className={selectedDate === null ? 'fdy-datepicker__value fdy-datepicker__value--placeholder' : 'fdy-datepicker__value'}>
          {displayValue}
        </span>
        <span className={showClear ? 'fdy-datepicker__icon is-hidden' : 'fdy-datepicker__icon'} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <path d="M16 2v4M8 2v4M3 10h18"></path>
          </svg>
        </span>
      </button>
      {showClear ? (
        <button
          type="button"
          className="fdy-datepicker__clear"
          aria-label={clearLabelText}
          onMouseDown={(e: React.MouseEvent): void => e.preventDefault()}
          onClick={clearValue}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
      ) : null}

      <div ref={panelRef} className="fdy-datepicker__panel" role="dialog" aria-modal="false" aria-labelledby={titleId} hidden={!open}>
        <div className="fdy-cal__head">
          <button type="button" className="fdy-cal__nav" aria-label={prevMonthLabelText} onClick={(): void => setViewMonth(addMonths(viewMonth, -1))}>
            &lsaquo;
          </button>
          <div id={titleId} className="fdy-cal__title">{monthFmt.format(viewMonth)}</div>
          <button type="button" className="fdy-cal__nav" aria-label={nextMonthLabelText} onClick={(): void => setViewMonth(addMonths(viewMonth, 1))}>
            &rsaquo;
          </button>
        </div>
        <div className="fdy-cal__grid" role="grid" aria-labelledby={titleId} onKeyDown={onGridKeydown}>
          {weekdayHeaders.map((w: string): JSX.Element => (
            <div key={w} className="fdy-cal__dow" role="columnheader" aria-label={w}>{w}</div>
          ))}
          {gridCells.map((cell: DayCell): JSX.Element => (
            <button
              key={cell.iso}
              ref={(el: HTMLButtonElement | null): void => {
                dayRefs.current[cell.iso] = el;
              }}
              type="button"
              className={dayClassName(cell)}
              role="gridcell"
              aria-label={cell.ariaLabel}
              aria-selected={cell.selected ? 'true' : undefined}
              disabled={cell.disabled}
              tabIndex={cell.focusable ? 0 : -1}
              onClick={(): void => pick(cell.date)}
            >
              {cell.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
