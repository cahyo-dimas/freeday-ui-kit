import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePopover } from '../usePopover';
import { isFilterActive } from '../../core/table-model.js';
import type { FdyColumnFilter, FdyColumnFilterType } from '../../core/table-model.js';

// Internal to FdyTable: one column's header funnel button + its type-aware filter popover
// (text / enum / number / date) over freeday's `.fdy-table__filterbtn` + `.fdy-filter*` classes.
// React port of adapters/vue/components/FdyTableFilter.vue. Reuses usePopover so the panel escapes
// the table's `overflow:hidden` via the top layer. Purely controlled, renders the current
// `filter`, emits the next one (or null to clear); the parent owns where it goes. Not exported.

export interface FdyTableFilterProps {
  label: string;
  type: FdyColumnFilterType;
  filter: FdyColumnFilter | undefined;
  /** Distinct values for an enum filter (computed by the parent over the full row set). */
  options: ReadonlyArray<string>;
  /** The next filter for this column, or null to clear it. */
  onChange: (filter: FdyColumnFilter | null) => void;
}

export function FdyTableFilter(props: FdyTableFilterProps): JSX.Element {
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<boolean>(false);

  usePopover(panelRef, triggerRef, open);
  // Popover attr for React 18/19 JSX typing: set once on mount (same as the other components).
  useEffect((): void => {
    panelRef.current?.setAttribute('popover', 'manual');
  }, []);

  const active: boolean = isFilterActive(props.filter);
  const filter: FdyColumnFilter | undefined = props.filter;
  const textValue: string = filter?.type === 'text' ? filter.text : '';
  const enumValues: ReadonlyArray<string> = filter?.type === 'enum' ? filter.values : [];
  const numMin: string = filter?.type === 'number' && filter.min !== null ? String(filter.min) : '';
  const numMax: string = filter?.type === 'number' && filter.max !== null ? String(filter.max) : '';
  const dateFrom: string = filter?.type === 'date' && filter.from !== null ? filter.from : '';
  const dateTo: string = filter?.type === 'date' && filter.to !== null ? filter.to : '';

  function apply(next: FdyColumnFilter): void {
    props.onChange(isFilterActive(next) ? next : null);
  }
  function parseNum(v: string): number | null {
    const t: string = v.trim();
    if (t === '') return null;
    const n: number = Number(t);
    return Number.isNaN(n) ? null : n;
  }
  function onEnumToggle(value: string, checked: boolean): void {
    const set: string[] = enumValues.filter((v: string): boolean => v !== value);
    if (checked) set.push(value);
    apply({ type: 'enum', values: set });
  }
  function close(returnFocus: boolean): void {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }
  function reset(): void {
    props.onChange(null);
    close(true);
  }

  // Dismiss on outside pointer or Escape while open.
  useEffect((): void | (() => void) => {
    if (!open) return;
    function onPointerDown(e: MouseEvent): void {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) close(false);
    }
    function onKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') close(true);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeydown);
    return (): void => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="fdy-table__filterwrap">
      <button
        ref={triggerRef}
        type="button"
        className={active ? 'fdy-table__filterbtn is-active' : 'fdy-table__filterbtn'}
        aria-haspopup="dialog"
        aria-pressed={active}
        aria-expanded={open}
        aria-label={`Filter ${props.label}`}
        onClick={(e): void => {
          e.stopPropagation();
          setOpen((v: boolean): boolean => !v);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 5h18l-7 8v5l-4 2v-7z" />
        </svg>
      </button>

      <div ref={panelRef} className="fdy-filter" hidden={!open} role="dialog" aria-label={`Filter ${props.label}`}>
        {props.type === 'text' && (
          <>
            <div className="fdy-filter__title">Contains text</div>
            <input
              className="fdy-input"
              type="search"
              placeholder="Contains…"
              value={textValue}
              onChange={(e): void => apply({ type: 'text', text: e.target.value })}
            />
          </>
        )}

        {props.type === 'enum' && (
          <>
            <div className="fdy-filter__title">Show values</div>
            <div className="fdy-filter__list">
              {props.options.map((val: string): JSX.Element => (
                <label key={val} className="fdy-filter__check">
                  <input
                    type="checkbox"
                    className="fdy-checkbox"
                    checked={enumValues.includes(val)}
                    onChange={(e): void => onEnumToggle(val, e.target.checked)}
                  />
                  {val}
                </label>
              ))}
            </div>
          </>
        )}

        {props.type === 'number' && (
          <>
            <div className="fdy-filter__title">Value range</div>
            <div className="fdy-filter__range">
              <input
                className="fdy-input"
                type="text"
                inputMode="numeric"
                placeholder="Min"
                value={numMin}
                onChange={(e): void => apply({ type: 'number', min: parseNum(e.target.value), max: parseNum(numMax) })}
              />
              <span aria-hidden="true">–</span>
              <input
                className="fdy-input"
                type="text"
                inputMode="numeric"
                placeholder="Max"
                value={numMax}
                onChange={(e): void => apply({ type: 'number', min: parseNum(numMin), max: parseNum(e.target.value) })}
              />
            </div>
          </>
        )}

        {props.type === 'date' && (
          <>
            <div className="fdy-filter__title">Date range</div>
            <div className="fdy-filter__range">
              <input
                className="fdy-input"
                type="date"
                aria-label="From"
                value={dateFrom}
                onChange={(e): void => apply({ type: 'date', from: e.target.value || null, to: dateTo || null })}
              />
              <span aria-hidden="true">–</span>
              <input
                className="fdy-input"
                type="date"
                aria-label="To"
                value={dateTo}
                onChange={(e): void => apply({ type: 'date', from: dateFrom || null, to: e.target.value || null })}
              />
            </div>
          </>
        )}

        <div className="fdy-filter__foot">
          <button type="button" className="fdy-btn fdy-btn--ghost fdy-btn--sm" onClick={reset}>Reset</button>
          <button type="button" className="fdy-btn fdy-btn--sm" onClick={(): void => close(true)}>Close</button>
        </div>
      </div>
    </span>
  );
}
