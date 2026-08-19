import type { JSX } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

// React port of adapters/vue/components/FdyCfl.vue over freeday's `.fdy-cfl*` +
// `.fdy-input-group` classes (see src/components/cfl.css, input-group.css). A controlled
// async choose-from-list: `value: Row | null` + `onChange(row)` in place of Vue's
// `v-model:Row|null`, driving a native <dialog> whose rows come from the caller's
// `fetchPage(query, page)`. Re-implements the Vue source's open/close + debounced search +
// dense sticky-header results + single-commit-on-click + keyboard, plus the async-correctness
// pieces a server picker needs: loading/empty/error states, retry, pagination, an
// out-of-order fetch guard, and an in-memory cache cleared on open/close.

export interface CflColumn<Row> {
  key: keyof Row & string;
  label: string;
}

export interface CflPage<Row> {
  rows: Row[];
  hasMore: boolean;
}

export interface FdyCflProps<Row extends Record<string, unknown>> {
  value: Row | null;
  onChange: (value: Row | null) => void;
  fetchPage: (query: string, page: number) => Promise<CflPage<Row>>;
  columns: ReadonlyArray<CflColumn<Row>>;
  display: (row: Row) => string;
  rowKey: (row: Row) => string;
  /** Advisory only — the caller's `fetchPage` owns paging; kept for API documentation. */
  pageSize?: number;
  /** The dialog's heading. Default 'Choose data', matching the Blazor adapter's `Title`. */
  title?: string;
  /** Placeholder AND accessible name of the dialog's search box. Default 'Search…'. */
  searchPlaceholder?: string;
  /** Default 'Loading…'. */
  loadingText?: string;
  /** Default 'No results.'. */
  emptyText?: string;
  /** Default 'Try again'. */
  retryText?: string;
  /** Default 'Load more'. */
  moreText?: string;
  /** aria-label for the dialog's close button. Default 'Close'. */
  closeLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: shows the picked value (focusable, copyable), but the search dialog can't be opened. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  /** Render a clear button when a row is picked, so an OPTIONAL foreign key can be unset. Without it
   *  `value` accepts `Row | null` but the component can only ever produce a `Row`. */
  clearable?: boolean;
  /** aria-label for the clear button (when `clearable`). Default 'Clear selection'. */
  clearLabel?: string;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
}

export function FdyCfl<Row extends Record<string, unknown>>(props: FdyCflProps<Row>): JSX.Element {
  const baseId: string = useId();
  const fieldId: string = props.id ?? `${baseId}-field`;
  const titleId: string = `${baseId}-title`;
  const resultsId: string = `${baseId}-results`;
  const rowId = (index: number): string => `${baseId}-row-${index}`;

  /* Unsetting is not "picking nothing": it must not touch the dialog, and focus must land on a
     control that still exists — the trigger beside it, since this button disappears with the value. */
  const clearLabelText: string = props.clearLabel ?? 'Clear selection';
  const clearValue = (): void => {
    props.onChange(null);
    triggerRef.current?.focus();
  };

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Out-of-order guard: every fetch takes a monotonically increasing token; a resolved or
  // rejected page is applied only if it still owns the latest token. A newer search, a
  // load-more, a dialog close, or an unmount all bump it — this keeps a slow stale response
  // from overwriting fresh results (or a closed/unmounted component's state).
  const reqIdRef = useRef<number>(0);
  // In-memory cache keyed by `${query}::${page}`, cleared on open and on close.
  const cacheRef = useRef<Map<string, CflPage<Row>>>(new Map<string, CflPage<Row>>());
  const lastPageRef = useRef<number>(0);
  const lastAppendRef = useRef<boolean>(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const showClear: boolean =
    props.clearable === true && props.value !== null && isDisabled === false && isReadonly === false;
  const isInvalid: boolean = props.invalid === true;
  const displayValue: string = props.value !== null ? props.display(props.value) : '';
  // The results <table> (owner of `resultsId`) only renders in the rows branch, so gate the
  // search input's aria refs on rows existing — otherwise they'd dangle during loading/empty/error.
  const hasRows: boolean = rows.length > 0;
  const controlsId: string | undefined = hasRows ? resultsId : undefined;
  const activeDescendant: string | undefined = hasRows && activeIndex >= 0 ? rowId(activeIndex) : undefined;
  const isInitialLoading: boolean = loading && rows.length === 0;
  const isBlockingError: boolean = error !== null && rows.length === 0;
  const isEmpty: boolean = !loading && error === null && rows.length === 0;

  // --- Async engine ----------------------------------------------------------------------
  async function load(targetQuery: string, targetPage: number, append: boolean): Promise<void> {
    lastPageRef.current = targetPage;
    lastAppendRef.current = append;
    const token: number = ++reqIdRef.current;
    const key = `${targetQuery}::${targetPage}`;
    setError(null);
    setLoading(true);
    try {
      const cached: CflPage<Row> | undefined = cacheRef.current.get(key);
      const res: CflPage<Row> = cached ?? (await props.fetchPage(targetQuery, targetPage));
      if (token !== reqIdRef.current) return; // stale — a newer request has started
      if (cached === undefined) cacheRef.current.set(key, res);
      const copy: Row[] = res.rows.slice(); // never mutate the caller's array
      setRows((prev: Row[]): Row[] => (append ? prev.concat(copy) : copy));
      setHasMore(res.hasMore);
      setPage(targetPage);
      if (!append) setActiveIndex(copy.length > 0 ? 0 : -1);
    } catch (err: unknown) {
      if (token !== reqIdRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (token === reqIdRef.current) setLoading(false);
    }
  }

  // Mirrors Vue's `retry()`: only `lastPage`/`lastAppend` are frozen from the failed request —
  // the query is re-read live so a retry after editing the search box (within the debounce
  // window) uses what's currently typed, not a stale snapshot.
  function retry(): void {
    void load(query, lastPageRef.current, lastAppendRef.current);
  }

  function loadMore(): void {
    if (loading || !hasMore) return;
    void load(query, page + 1, true);
  }

  function onSearchInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const value: string = e.target.value;
    setQuery(value);
    if (searchTimerRef.current !== null) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout((): void => {
      searchTimerRef.current = null;
      void load(value, 0, false);
    }, 250);
  }

  // --- Active-row / keyboard ---------------------------------------------------------------
  function setActive(index: number): void {
    if (rows.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const clamped: number = Math.max(0, Math.min(index, rows.length - 1));
    setActiveIndex(clamped);
  }

  // Scroll the active row into view once it (re)renders — React's analogue of Vue's
  // `nextTick(() => scrollIntoView(...))`; fires for both keyboard nav and row hover, same as
  // the Vue source's `setActive`.
  useEffect((): void => {
    if (activeIndex < 0) return;
    document.getElementById(rowId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function commit(row: Row): void {
    props.onChange(row);
    closeDialog();
  }

  function onKeydown(e: React.KeyboardEvent<HTMLDialogElement>): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(activeIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(activeIndex - 1);
        break;
      case 'Home':
        if (rows.length > 0) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (rows.length > 0) {
          e.preventDefault();
          setActive(rows.length - 1);
        }
        break;
      case 'Enter': {
        const row: Row | undefined = activeIndex >= 0 ? rows[activeIndex] : undefined;
        if (row !== undefined) {
          e.preventDefault();
          commit(row);
        }
        break;
      }
      default:
        break; // Escape is left to the native <dialog> cancel/close
    }
  }

  // --- Open / close ------------------------------------------------------------------------
  function openDialog(): void {
    if (isDisabled || isReadonly) return;
    if (searchTimerRef.current !== null) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    cacheRef.current.clear();
    setQuery('');
    setRows([]);
    setPage(0);
    setHasMore(false);
    setError(null);
    setActiveIndex(-1);
    dialogRef.current?.showModal();
    searchRef.current?.focus();
    void load('', 0, false);
  }

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  // Fires for every close path (button, Esc, commit); centralise cleanup here.
  function onClose(): void {
    reqIdRef.current++; // invalidate any in-flight fetch so it can't apply after close
    if (searchTimerRef.current !== null) {
      // Cancel a debounce armed just before close (e.g. typed a char then clicked a row) so
      // it can't fire a stray fetchPage after the dialog is gone.
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    cacheRef.current.clear();
    setLoading(false);
    triggerRef.current?.focus();
  }

  function cellText(row: Row, key: keyof Row & string): string {
    const value: unknown = row[key];
    return value === null || value === undefined ? '' : String(value);
  }

  // Unmount safety: bump the token so any in-flight fetch's setState is dropped, and cancel a
  // pending debounce — mirrors Vue's onBeforeUnmount plus the same token trick onClose uses.
  useEffect((): (() => void) => {
    return (): void => {
      reqIdRef.current++;
      if (searchTimerRef.current !== null) clearTimeout(searchTimerRef.current);
    };
  }, []);

  return (
    <div className="fdy-input-group">
      <input
        id={fieldId}
        className="fdy-input"
        type="text"
        readOnly
        value={displayValue}
        placeholder={props.placeholder}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
      />
      {showClear ? (
        <button
          type="button"
          className="fdy-input-group__btn"
          aria-label={clearLabelText}
          onClick={clearValue}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="fdy-input-group__btn"
        aria-haspopup="dialog"
        aria-labelledby={props.ariaLabelledby}
        aria-label={props.ariaLabelledby ? undefined : 'Buka pencarian'}
        disabled={isDisabled || isReadonly}
        onClick={openDialog}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx={11} cy={11} r={7}></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </button>

      <dialog ref={dialogRef} className="fdy-modal fdy-modal--cfl" aria-labelledby={titleId} onClose={onClose} onKeyDown={onKeydown}>
        <div className="fdy-modal__header">
          <h3 id={titleId} className="fdy-modal__title">{props.title ?? 'Choose data'}</h3>
          <button className="fdy-modal__close" type="button" aria-label={props.closeLabel ?? 'Close'} onClick={closeDialog}>&times;</button>
        </div>

        <div className="fdy-modal__body">
          <div className="fdy-cfl__search">
            <div className="fdy-input-group" style={{ maxWidth: 'none' }}>
              <span className="fdy-input-group__addon fdy-input-group__addon--icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx={11} cy={11} r={7}></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </span>
              <input
                ref={searchRef}
                className="fdy-input"
                type="search"
                value={query}
                placeholder={props.searchPlaceholder ?? 'Search…'}
                aria-label={props.searchPlaceholder ?? 'Search…'}
                aria-controls={controlsId}
                aria-activedescendant={activeDescendant}
                onChange={onSearchInput}
              />
            </div>
          </div>

          <div className="fdy-cfl__results">
            {isInitialLoading ? (
              <p className="fdy-cfl__empty" role="status">{props.loadingText ?? 'Loading…'}</p>
            ) : isBlockingError ? (
              <div className="fdy-cfl__empty" role="alert">
                <p style={{ margin: '0 0 var(--space-3)' }}>{error?.message}</p>
                <button className="fdy-btn fdy-btn--sm" type="button" onClick={retry}>{props.retryText ?? 'Try again'}</button>
              </div>
            ) : isEmpty ? (
              <p className="fdy-cfl__empty">{props.emptyText ?? 'No results.'}</p>
            ) : (
              <>
                <table id={resultsId} className="fdy-table" aria-label="Search results">
                  <thead>
                    <tr>
                      {props.columns.map((col: CflColumn<Row>): JSX.Element => (
                        <th key={col.key} scope="col">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: Row, i: number): JSX.Element => (
                      <tr
                        id={rowId(i)}
                        key={props.rowKey(row)}
                        className="fdy-cfl__row"
                        aria-selected={i === activeIndex ? 'true' : undefined}
                        onClick={(): void => commit(row)}
                        onMouseMove={(): void => setActive(i)}
                      >
                        {props.columns.map((col: CflColumn<Row>): JSX.Element => (
                          <td key={col.key}>{cellText(row, col.key)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {error !== null ? (
                  <div className="fdy-cfl__empty" role="alert" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <p style={{ margin: '0 0 var(--space-3)' }}>{error.message}</p>
                    <button className="fdy-btn fdy-btn--sm" type="button" onClick={retry}>Coba lagi</button>
                  </div>
                ) : hasMore ? (
                  <div style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <button className="fdy-btn fdy-btn--ghost fdy-btn--sm" type="button" disabled={loading} onClick={loadMore}>
                      {loading ? (props.loadingText ?? 'Loading…') : (props.moreText ?? 'Load more')}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="fdy-modal__footer">
          <span className="fdy-cfl__count">Click a row to choose it</span>
          <div className="fdy-cfl__actions">
            <button className="fdy-btn fdy-btn--ghost" type="button" onClick={closeDialog}>{props.closeLabel ?? 'Close'}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
