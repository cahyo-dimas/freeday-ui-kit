import type { CSSProperties, JSX, ReactNode } from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  cellValue,
  cellText,
  distinctValues,
  filterRows,
  sortRows,
  paginate,
  pageWindow,
} from '../../core/table-model.js';
import type {
  FdyTableColumn,
  FdySortState,
  FdyColumnFilter,
  FdyFilterMap,
  FdyPageState,
} from '../../core/table-model.js';
import { FdyTableFilter } from './FdyTableFilter';

// A controlled React data table over freeday's `.fdy-datatable` / `.fdy-table*` / `.fdy-filter*` /
// `.fdy-pagination__*` classes. React port of adapters/vue/components/FdyTable.vue. Unlike the
// freeday-table.js enhancer (which snapshots static rows and fights React's reconciler), this reads
// `rows` as the source of truth on every render. Two modes:
//   • Client mode (no `page` prop): the component sorts/filters (and paginates when `pageSize` is
//     set) over the full `rows`. `sort`/`filters` are controlled when provided, else internal.
//   • Server mode (`page` prop present): `rows` render exactly as given (server already
//     sorted/filtered/paged); the headers, filters and pager only signal intent via
//     `onSortChange` / `onFiltersChange` / `onPageChange` for the caller to feed back into its query.
// Column filters (text/enum/number/date) apply live; in server mode, debounce the callback if needed.

export interface FdyTableProps<Row extends object> {
  columns: ReadonlyArray<FdyTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row) => string | number;
  /** Controlled sort. Provide (even as null) to own sorting; omit for internal client sort. */
  sort?: FdySortState | null;
  onSortChange?: (sort: FdySortState | null) => void;
  /** Controlled filter map keyed by column key. Provide to own filtering; omit for internal. */
  filters?: FdyFilterMap;
  onFiltersChange?: (filters: FdyFilterMap) => void;
  /** Server pagination state (0-based index). Presence switches the table into server mode. */
  page?: FdyPageState;
  onPageChange?: (page: FdyPageState) => void;
  /** Client-side page size when `page` is absent; 0/undefined = render all rows (no pager). */
  pageSize?: number;
  /**
   * Controlled client-side page index (0-based). Provide it — with `pageSize`, without `page` — to
   * own the page while the table keeps doing filter/sort/paginate. This is what lets an EXTERNAL
   * pager drive the table: a responsive screen that hides `.fdy-datatable` below `md` and renders a
   * card list from `onProcess` can render one pager for both breakpoints and point it here.
   * Omit for the internal index (unchanged default).
   */
  /** Withhold the table's own footer (pager + range) so the screen can render one. Server mode had
   *  no way to do this: the app owns the page there ANYWAY, and was still handed a second control —
   *  a responsive list that shows a table at one breakpoint and cards at another ended up with the
   *  kit's pager stacked under its own. Client mode's counterpart is `pageIndex`. Default true. */
  pager?: boolean;
  pageIndex?: number;
  /** Client mode with `pageIndex` provided: the table asks for a new 0-based index (pager click, a
   *  reset to 0 after sort/filter, or a clamp when filtering shrank the set). */
  onPageIndexChange?: (index: number) => void;
  loading?: boolean;
  emptyText?: string;
  ariaLabel?: string;
  /** Custom cell renderer; return undefined for a column to use the default text. */
  renderCell?: (column: FdyTableColumn<Row>, row: Row, value: unknown) => ReactNode;
  toolbar?: ReactNode;
  empty?: ReactNode;
  /** Opt in to row activation: rows become focusable and call `onRowActivate` on click/Enter/Space. */
  rowActivatable?: boolean;
  /** Per-row class hook, e.g. to mark a selected row. */
  rowClass?: (row: Row) => string | undefined;
  /** A row was activated (click, or Enter/Space while the row itself is focused). */
  onRowActivate?: (row: Row) => void;
  /** Called with the processed page of rows (after filter/sort/paginate) plus the total row count —
   *  in BOTH modes, whenever they change. Lets a consumer render the SAME processed set elsewhere
   *  (a `< md` card list, a "selected" summary, export-to-CSV) without re-deriving the pipeline. */
  onProcess?: (result: { rows: Row[]; total: number }) => void;
  /** Controlled: row keys whose detail is shown as a full-width row beneath them. */
  expandedKeys?: ReadonlyArray<string | number>;
  /** Renders the expandable detail row for an expanded row (React equivalent of Vue's `row-detail` slot). */
  renderRowDetail?: (row: Row) => ReactNode;
}

export function FdyTable<Row extends object>(props: FdyTableProps<Row>): JSX.Element {
  const serverPaged: boolean = props.page != null;
  const sortControlled: boolean = serverPaged || props.sort !== undefined;
  const filtersControlled: boolean = serverPaged || props.filters !== undefined;

  const [internalSort, setInternalSort] = useState<FdySortState | null>(null);
  const [internalFilters, setInternalFilters] = useState<FdyFilterMap>({});
  const [internalPageIndex, setInternalPageIndex] = useState<number>(0);

  const effectiveSort: FdySortState | null = sortControlled ? (props.sort ?? null) : internalSort;
  const effectiveFilters: FdyFilterMap = filtersControlled ? (props.filters ?? {}) : internalFilters;

  // Enum options: explicit (server mode) or distinct values across the current rows (client mode).
  const enumOptionsMap: Record<string, ReadonlyArray<string>> = useMemo(() => {
    const out: Record<string, ReadonlyArray<string>> = {};
    for (const col of props.columns) {
      if (col.filter === 'enum') out[col.key] = col.options ?? distinctValues(props.rows, col);
    }
    return out;
  }, [props.columns, props.rows]);

  const filteredSorted: Row[] = useMemo(() => {
    if (serverPaged) return props.rows.slice();
    return sortRows(filterRows(props.rows, props.columns, effectiveFilters), props.columns, effectiveSort);
  }, [serverPaged, props.rows, props.columns, effectiveFilters, effectiveSort]);

  const totalCount: number = serverPaged ? (props.page as FdyPageState).total : filteredSorted.length;

  /* Client-side page index: the prop when the parent owns it, internal state otherwise. Every read
   * goes through clientPageIndex and every write through setClientPage, so controlled and
   * uncontrolled behave identically apart from where the number lives. */
  const pageIndexControlled: boolean = props.pageIndex !== undefined;
  const clientPageIndex: number = pageIndexControlled ? Math.max(0, props.pageIndex as number) : internalPageIndex;
  const onPageIndexChange = props.onPageIndexChange;
  function setClientPage(index0: number): void {
    if (pageIndexControlled) {
      if (index0 !== props.pageIndex) onPageIndexChange?.(index0);
    } else setInternalPageIndex(index0);
  }

  const displayRows: Row[] = useMemo(() => {
    if (serverPaged) return props.rows.slice();
    if (props.pageSize && props.pageSize > 0) return paginate(filteredSorted, clientPageIndex, props.pageSize);
    return filteredSorted;
  }, [serverPaged, props.rows, props.pageSize, filteredSorted, clientPageIndex]);

  const pageSizeEff: number = serverPaged ? (props.page as FdyPageState).size : (props.pageSize ?? 0);
  const currentPage1: number = (serverPaged ? (props.page as FdyPageState).index : clientPageIndex) + 1;
  const totalPages: number = pageSizeEff > 0 ? Math.max(1, Math.ceil(totalCount / pageSizeEff)) : 1;
  const hasPager: boolean = props.pager !== false && pageSizeEff > 0 && totalPages > 1;
  const pages: Array<number | 'ellipsis'> = pageWindow(currentPage1, totalPages);
  const rangeFrom: number = totalCount === 0 ? 0 : (currentPage1 - 1) * pageSizeEff + 1;
  const rangeTo: number = totalCount === 0 ? 0 : rangeFrom - 1 + displayRows.length;

  // Client mode: keep the page in range when a filter shrinks the row set.
  useEffect((): void => {
    if (!serverPaged && clientPageIndex > totalPages - 1) setClientPage(Math.max(0, totalPages - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setClientPage is derived from these
  }, [serverPaged, clientPageIndex, totalPages]);

  // Surface the processed page + total to the parent (both modes), so the same result can drive a
  // responsive card list / summary / export without re-implementing filter/sort/paginate.
  const onProcess = props.onProcess;
  useEffect((): void => {
    onProcess?.({ rows: displayRows, total: totalCount });
  }, [onProcess, displayRows, totalCount]);

  function ariaSortOf(col: FdyTableColumn<Row>): 'ascending' | 'descending' | undefined {
    if (effectiveSort === null || effectiveSort.key !== col.key) return undefined;
    return effectiveSort.dir === 'asc' ? 'ascending' : 'descending';
  }
  function onSort(col: FdyTableColumn<Row>): void {
    if (col.sortable !== true) return;
    const next: FdySortState =
      effectiveSort !== null && effectiveSort.key === col.key
        ? { key: col.key, dir: effectiveSort.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: 'asc' };
    if (sortControlled) props.onSortChange?.(next);
    else {
      setInternalSort(next);
      setClientPage(0);
    }
  }
  function onFilterChange(col: FdyTableColumn<Row>, filter: FdyColumnFilter | null): void {
    const nextMap: FdyFilterMap = { ...effectiveFilters };
    if (filter === null) delete nextMap[col.key];
    else nextMap[col.key] = filter;
    if (filtersControlled) props.onFiltersChange?.(nextMap);
    else {
      setInternalFilters(nextMap);
      setClientPage(0);
    }
  }
  function goTo(page1: number): void {
    const clamped: number = Math.min(Math.max(1, page1), totalPages);
    const index0: number = clamped - 1;
    if (serverPaged) {
      const p: FdyPageState = props.page as FdyPageState;
      props.onPageChange?.({ index: index0, size: p.size, total: p.total });
    } else {
      setClientPage(index0);
    }
  }

  function cellClass(col: FdyTableColumn<Row>): string | undefined {
    return col.mono === true ? 'fdy-mono' : undefined;
  }
  function alignStyle(col: FdyTableColumn<Row>): CSSProperties | undefined {
    return col.align !== undefined ? { textAlign: col.align } : undefined;
  }
  function rowClassName(row: Row): string | undefined {
    const cls: string = [props.rowClass?.(row), props.rowActivatable === true ? 'fdy-table__row--activatable' : undefined]
      .filter(Boolean)
      .join(' ');
    return cls === '' ? undefined : cls;
  }
  // Enter/Space activate only when the row itself is focused — a control inside a cell keeps its own
  // event (the `event.target !== event.currentTarget` guard). Click relies on inner controls calling
  // stopPropagation, matching the pattern consumers hand-roll today.
  function onRowKeydown(e: React.KeyboardEvent<HTMLTableRowElement>, row: Row): void {
    if (props.rowActivatable !== true || e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    props.onRowActivate?.(row);
  }
  function isExpanded(row: Row): boolean {
    return props.expandedKeys?.includes(props.rowKey(row)) === true;
  }
  function renderCellContent(col: FdyTableColumn<Row>, row: Row): ReactNode {
    if (props.renderCell !== undefined) {
      const custom: ReactNode = props.renderCell(col, row, cellValue(row, col));
      if (custom !== undefined) return custom;
    }
    return cellText(row, col);
  }

  const colCount: number = props.columns.length;

  return (
    <div className="fdy-datatable">
      {props.toolbar !== undefined && <div className="fdy-table-toolbar">{props.toolbar}</div>}

      <div className="fdy-table-scroll">
        <table className="fdy-table" aria-label={props.ariaLabel}>
          <thead>
            <tr>
              {props.columns.map((col: FdyTableColumn<Row>): JSX.Element => (
                <th key={col.key} scope="col" style={alignStyle(col)} aria-sort={ariaSortOf(col)}>
                  {col.sortable ? (
                    <button type="button" className="fdy-table__sortbtn" onClick={(): void => onSort(col)}>{col.label}</button>
                  ) : (
                    col.label
                  )}
                  {col.filter && (
                    <FdyTableFilter
                      label={col.label}
                      type={col.filter}
                      filter={effectiveFilters[col.key]}
                      options={enumOptionsMap[col.key] ?? []}
                      onChange={(f: FdyColumnFilter | null): void => onFilterChange(col, f)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={colCount} className="fdy-table__state" role="status">Loading…</td>
              </tr>
            ) : displayRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="fdy-table__state">{props.empty ?? props.emptyText ?? 'No data'}</td>
              </tr>
            ) : (
              displayRows.map((row: Row): JSX.Element => (
                <Fragment key={props.rowKey(row)}>
                  <tr
                    className={rowClassName(row)}
                    tabIndex={props.rowActivatable ? 0 : undefined}
                    aria-expanded={props.renderRowDetail !== undefined ? (isExpanded(row) ? 'true' : 'false') : undefined}
                    onClick={(): void => {
                      if (props.rowActivatable === true) props.onRowActivate?.(row);
                    }}
                    onKeyDown={(e): void => onRowKeydown(e, row)}
                  >
                    {props.columns.map((col: FdyTableColumn<Row>): JSX.Element => (
                      <td key={col.key} className={cellClass(col)} style={alignStyle(col)}>{renderCellContent(col, row)}</td>
                    ))}
                  </tr>
                  {props.renderRowDetail !== undefined && isExpanded(row) && (
                    <tr className="fdy-table__detailrow">
                      <td colSpan={colCount}>{props.renderRowDetail(row)}</td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasPager && (
        <div className="fdy-table-footer">
          <span className="fdy-table-footer__info">Showing {rangeFrom}–{rangeTo} of {totalCount}</span>
          <nav aria-label="Pagination">
            <ul className="fdy-pagination__list">
              <li>
                <button type="button" className="fdy-pagination__link" aria-label="Previous page" disabled={currentPage1 === 1} onClick={(): void => goTo(currentPage1 - 1)}>‹</button>
              </li>
              {pages.map((p: number | 'ellipsis', i: number): JSX.Element => (
                <li key={typeof p === 'number' ? `p-${p}` : `gap-${i}`}>
                  {p === 'ellipsis' ? (
                    <span className="fdy-pagination__ellipsis">…</span>
                  ) : p === currentPage1 ? (
                    <span className="fdy-pagination__link" aria-current="page">{p}</span>
                  ) : (
                    <button type="button" className="fdy-pagination__link" aria-label={`Go to page ${p}`} onClick={(): void => goTo(p)}>{p}</button>
                  )}
                </li>
              ))}
              <li>
                <button type="button" className="fdy-pagination__link" aria-label="Next page" disabled={currentPage1 === totalPages} onClick={(): void => goTo(currentPage1 + 1)}>›</button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
