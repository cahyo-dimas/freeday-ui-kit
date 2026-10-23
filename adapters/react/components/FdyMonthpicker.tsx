import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';
import {
  YEARS_PER_PAGE,
  addMonths,
  monthCells as buildMonthCells,
  monthFormatters,
  monthKeyIntent,
  pageLocale,
  parseISOMonth,
  startOfMonth,
  toISOMonth,
  yearCells as buildYearCells,
  yearKeyIntent,
  yearPageStart,
  yearRangeLabel,
  type FdyMonthCell,
  type FdyMonthFormatters,
  type FdyYearCell,
} from '../../core/month-grid.js';

// React port of adapters/vue/components/FdyMonthpicker.vue over freeday's `.fdy-datepicker` /
// `.fdy-cal__*` classes (see src/components/datepicker.css). Controlled (`value` + `onChange` in
// place of Vue's `v-model`). The month and year grids come from adapters/core/month-grid.js, the
// same module FdyDatepicker reads, so the rule has one home.
//
// It exists for its SIGNATURE. 3.8.0 answered "we need a month" with `mode="month"` on
// FdyDatepicker, which left `value: string | null` carrying `YYYY-MM-DD` or `YYYY-MM` depending on
// a different prop. Here the value has one format, there is no mode to read, and the day grid is
// absent rather than merely unvisited.

/** The one format this component speaks, re-exported so the name has a single home. */
export type { FdyMonth } from '../../core/month-grid';

/** Which grid is on screen. There is no level below months here: that is the component. */
type CalendarLevel = 'months' | 'years';

export interface FdyMonthpickerProps {
  /** The chosen month, ISO `YYYY-MM` (`'2026-10'`). `''`/`null` for empty. One format, always. */
  value: string | null;
  onChange: (value: string) => void;
  /** Earliest selectable month, `YYYY-MM` (a full `YYYY-MM-DD` is read too, as its own month). */
  min?: string;
  /** Latest selectable month. A bound that falls inside a month leaves that month pickable. */
  max?: string;
  /** BCP-47 tag for the month names. Defaults to the page's `<html lang>`, then `en`. */
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its month, but can't be opened, cleared, or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
  /** Show a clear (×) button in the trigger when a month is set, so an optional month can be unset. Calls onChange('') to reset. Off by default. */
  clearable?: boolean;
  /** aria-label for the clear button (when `clearable`). Default 'Clear month'. */
  clearLabel?: string;
  /** aria-labels for the year arrows shown in the month grid. Defaults 'Previous year' / 'Next year'. */
  prevYearLabel?: string;
  nextYearLabel?: string;
  /** aria-label for the title button that drills from the month grid to the year grid. Default 'Choose year'. */
  chooseYearLabel?: string;
  /** aria-labels for the page arrows shown in the year grid. Defaults 'Previous years' / 'Next years'. */
  prevYearsLabel?: string;
  nextYearsLabel?: string;
}

export function FdyMonthpicker(props: FdyMonthpickerProps): JSX.Element {
  const baseId: string = useId();
  const triggerId: string = props.id ?? `${baseId}-trigger`;
  const titleId: string = `${baseId}-title`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const yearRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  // Set by the move/open handlers, consumed by the focus-sync effects below (React's analogue of
  // Vue's `nextTick(focusCell)`).
  const pendingMonthFocusRef = useRef<number | null>(null);
  const pendingYearFocusRef = useRef<number | null>(null);

  const [open, setOpen] = useState<boolean>(false);
  const [level, setLevel] = useState<CalendarLevel>('months');
  const [focusMonth, setFocusMonth] = useState<number>(0);
  const [focusYear, setFocusYear] = useState<number>(0);
  /** The year the month grid shows, held as its January so the shared helpers can take a Date. */
  const [viewMonth, setViewMonth] = useState<Date>((): Date => startOfMonth(parseISOMonth(props.value) ?? new Date()));

  // Render the panel in the top layer (popover) so it never gets clipped by a card or scroll
  // container; positions against the trigger.
  usePopover(panelRef, triggerRef, open);

  // Popover attr for React 18 (JSX may not type it): set once on mount.
  useEffect((): void => {
    panelRef.current?.setAttribute('popover', 'manual');
  }, []);

  /** Resolved once so every formatter below reads the same tag. */
  const activeLocale: string = props.locale ?? pageLocale();
  const formatters: FdyMonthFormatters = useMemo(
    (): FdyMonthFormatters => monthFormatters(activeLocale),
    [activeLocale],
  );

  const selectedDate: Date | null = useMemo((): Date | null => parseISOMonth(props.value), [props.value]);
  const minDate: Date | null = useMemo((): Date | null => parseISOMonth(props.min), [props.min]);
  const maxDate: Date | null = useMemo((): Date | null => parseISOMonth(props.max), [props.max]);
  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const isInvalid: boolean = props.invalid === true;
  const displayPlaceholder: string = props.placeholder ?? 'Select month';
  const showClear: boolean = props.clearable === true && selectedDate !== null && !isDisabled && !isReadonly;
  const clearLabelText: string = props.clearLabel ?? 'Clear month';
  const chooseYearLabelText: string = props.chooseYearLabel ?? 'Choose year';
  const prevYearLabelText: string = props.prevYearLabel ?? 'Previous year';
  const nextYearLabelText: string = props.nextYearLabel ?? 'Next year';
  const prevYearsLabelText: string = props.prevYearsLabel ?? 'Previous years';
  const nextYearsLabelText: string = props.nextYearsLabel ?? 'Next years';

  /* The month named in the page's language, through the same formatter the cells use. This is the
     capability `<input type="month">` cannot be pushed into: it reads the browser. */
  const displayValue: string = selectedDate === null ? displayPlaceholder : formatters.name.format(selectedDate);

  const monthCells: FdyMonthCell[] = useMemo((): FdyMonthCell[] => buildMonthCells({
    year: viewMonth.getFullYear(),
    selected: selectedDate,
    min: minDate,
    max: maxDate,
    focusMonth,
    formatters,
  }), [viewMonth, selectedDate, minDate, maxDate, focusMonth, formatters]);

  const yearPage: number = yearPageStart(focusYear);

  const yearCells: FdyYearCell[] = useMemo((): FdyYearCell[] => buildYearCells({
    pageStart: yearPage,
    selected: selectedDate,
    min: minDate,
    max: maxDate,
    focusYear,
  }), [yearPage, selectedDate, minDate, maxDate, focusYear]);

  useEffect((): void => {
    if (pendingMonthFocusRef.current === null) return;
    const index: number = pendingMonthFocusRef.current;
    pendingMonthFocusRef.current = null;
    monthRefs.current[index]?.focus();
  });

  useEffect((): void => {
    if (pendingYearFocusRef.current === null) return;
    const year: number = pendingYearFocusRef.current;
    pendingYearFocusRef.current = null;
    yearRefs.current[year]?.focus();
  });

  /** `index` is already 0-11: the wrap lives in `monthKeyIntent`, so it is applied in one place. */
  function moveMonthFocus(index: number, yearDelta: number): void {
    if (yearDelta !== 0) setViewMonth(addMonths(viewMonth, yearDelta * 12));
    setFocusMonth(index);
    pendingMonthFocusRef.current = index;
  }

  /* A month is the ANSWER here. In FdyDatepicker the same click walks down into the month's days,
     which is the one thing the two components do differently with the shared grid. */
  function pickMonth(index: number): void {
    if (monthCells[index].disabled) return;
    const first: Date = new Date(viewMonth.getFullYear(), index, 1);
    setFocusMonth(index);
    setViewMonth(first);
    props.onChange(toISOMonth(first));
    closePanel(true);
  }

  function openYearGrid(): void {
    setFocusYear(viewMonth.getFullYear());
    setLevel('years');
    pendingYearFocusRef.current = viewMonth.getFullYear();
  }

  function openMonthGridAt(year: number, month: number): void {
    setViewMonth(new Date(year, month, 1));
    setFocusMonth(month);
    setLevel('months');
    pendingMonthFocusRef.current = month;
  }

  /* Picking a year is NAVIGATION and commits nothing: it drops to that year's months, where the
     answer is given. Without this level, reaching a month four years back is four arrow presses per
     year and no pointer route at all. */
  function openYear(year: number): void {
    openMonthGridAt(year, viewMonth.getMonth());
  }

  function moveYearFocus(year: number): void {
    setFocusYear(year);
    setViewMonth(new Date(year, viewMonth.getMonth(), 1));
    pendingYearFocusRef.current = year;
  }

  function onMonthKeydown(e: React.KeyboardEvent): void {
    const intent = monthKeyIntent(e.key, focusMonth);
    if (intent.action === 'none') return;
    e.preventDefault();
    if (intent.action === 'focus') moveMonthFocus(intent.index, intent.yearDelta);
    else if (intent.action === 'choose') pickMonth(intent.index);
    else closePanel(true);
  }

  function onYearKeydown(e: React.KeyboardEvent): void {
    const intent = yearKeyIntent(e.key, focusYear);
    if (intent.action === 'none') return;
    /* stopPropagation as well, matching FdyDatepicker's year grid: the panel is in the top layer
       and a bubbling Escape would otherwise be read a second time by whatever is behind it. */
    e.preventDefault();
    e.stopPropagation();
    if (intent.action === 'focus') moveYearFocus(intent.year);
    else if (intent.action === 'choose') openYear(intent.year);
    else closePanel(true);
  }

  // Clear (reset to empty). Calls onChange(''), parseISOMonth('') is null, so the placeholder shows.
  function clearValue(): void {
    props.onChange('');
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openPanel(): void {
    if (isDisabled || isReadonly || open) return;
    const next: Date = startOfMonth(selectedDate ?? viewMonth);
    setViewMonth(next);
    /* Reopening starts on months. Without this a picker that drilled to the year grid and was
       dismissed would open on years next time, and a keyboard user would land on a grid that
       cannot answer. */
    setLevel('months');
    setFocusMonth(next.getMonth());
    setOpen(true);
    pendingMonthFocusRef.current = next.getMonth();
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

  /* A null relatedTarget means focus fell to <body>, which is what happens when the element the
     user just pressed is REMOVED by the click it triggered (drilling into the year grid replaces
     the grid, and with it the cell that had focus). That is not focus leaving the control, and
     closing on it made the panel vanish mid-navigation. A pointer that really lands outside is
     handled by the mousedown listener, which is the reliable path for that case. */
  const onFocusout = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next: EventTarget | null = e.relatedTarget;
    if (next === null) return;
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
        aria-readonly={isReadonly ? 'true' : undefined}
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
        {/* ONE head for both levels on purpose: swapping it destroys the very button the user just
            pressed, focus falls to <body>, and the panel's own focusout handler closes it. */}
        <div className="fdy-cal__head">
          <button
            type="button"
            className="fdy-cal__nav"
            aria-label={level === 'years' ? prevYearsLabelText : prevYearLabelText}
            onClick={(): void => {
              if (level === 'years') moveYearFocus(focusYear - YEARS_PER_PAGE);
              else moveMonthFocus(focusMonth, -1);
            }}
          >
            &lsaquo;
          </button>
          <button
            id={titleId}
            type="button"
            className="fdy-cal__title"
            aria-label={level === 'years' ? undefined : chooseYearLabelText}
            onClick={(): void => {
              if (level === 'years') openMonthGridAt(viewMonth.getFullYear(), viewMonth.getMonth());
              else openYearGrid();
            }}
          >
            {level === 'years' ? yearRangeLabel(yearPage) : String(viewMonth.getFullYear())}
          </button>
          <button
            type="button"
            className="fdy-cal__nav"
            aria-label={level === 'years' ? nextYearsLabelText : nextYearLabelText}
            onClick={(): void => {
              if (level === 'years') moveYearFocus(focusYear + YEARS_PER_PAGE);
              else moveMonthFocus(focusMonth, 1);
            }}
          >
            &rsaquo;
          </button>
        </div>
        {level === 'years' ? (
          <div className="fdy-cal__grid fdy-cal__grid--years" role="grid" aria-labelledby={titleId} onKeyDown={onYearKeydown}>
            {yearCells.map((cell: FdyYearCell): JSX.Element => (
              <button
                key={cell.year}
                ref={(el: HTMLButtonElement | null): void => { yearRefs.current[cell.year] = el; }}
                type="button"
                className={['fdy-cal__year', cell.today ? 'is-today' : '', cell.selected ? 'is-selected' : ''].filter(Boolean).join(' ')}
                role="gridcell"
                aria-label={String(cell.year)}
                aria-selected={cell.selected ? true : undefined}
                disabled={cell.disabled}
                tabIndex={cell.focusable ? 0 : -1}
                onClick={(): void => openYear(cell.year)}
              >
                {cell.year}
              </button>
            ))}
          </div>
        ) : (
          <div className="fdy-cal__grid fdy-cal__grid--months" role="grid" aria-labelledby={titleId} onKeyDown={onMonthKeydown}>
            {monthCells.map((cell: FdyMonthCell): JSX.Element => (
              <button
                key={cell.index}
                ref={(el: HTMLButtonElement | null): void => { monthRefs.current[cell.index] = el; }}
                type="button"
                className={['fdy-cal__month', cell.today ? 'is-today' : '', cell.selected ? 'is-selected' : ''].filter(Boolean).join(' ')}
                role="gridcell"
                aria-label={cell.ariaLabel}
                aria-selected={cell.selected ? true : undefined}
                disabled={cell.disabled}
                tabIndex={cell.focusable ? 0 : -1}
                onClick={(): void => pickMonth(cell.index)}
              >
                {cell.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
