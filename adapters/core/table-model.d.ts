// Types for the framework-agnostic table model (adapters/core/table-model.js).
// Shared by FdyTable in both the Vue and React adapters.

export type FdySortDir = 'asc' | 'desc';

/** Which column is sorted and in what direction. */
export interface FdySortState {
  key: string;
  dir: FdySortDir;
}

/** A column's comparator type — how its values are ordered when sorting. */
export type FdyColumnType = 'text' | 'number' | 'date';

/** Cell alignment. Maps to `text-align` on the header and body cells. */
export type FdyColumnAlign = 'left' | 'right' | 'center';

/** The kind of column filter to offer (a funnel popover in the header). */
export type FdyColumnFilterType = 'text' | 'enum' | 'number' | 'date';

/** One column definition. `T` is the row type. */
export interface FdyTableColumn<T> {
  /** Row property key; also the default cell accessor and the filter/sort identity. */
  key: string;
  /** Header label. */
  label: string;
  /**
   * Render the label for assistive tech only — the header cell looks empty.
   *
   * For a column of row CONTROLS (an edit button, a row menu), where a visible
   * heading is noise above a column of icons but the column still has to be
   * named: a `<th>` with no text is announced as nothing, and a reader tabbing
   * the header row cannot tell what it is. The label still names the column's
   * filter popover and its sort button, so it must stay meaningful.
   */
  labelHidden?: boolean;
  /** Show a sort toggle in the header. */
  sortable?: boolean;
  /** Offer a column filter of this type. */
  filter?: FdyColumnFilterType;
  /** Cell alignment (default left). */
  align?: FdyColumnAlign;
  /** Render cells in the monospace data font (`.fdy-mono`). */
  mono?: boolean;
  /** Override the comparator type; defaults to one derived from `filter`, else 'text'. */
  sortType?: FdyColumnType;
  /** Custom value accessor; defaults to `row[key]`. Used for sort, filter, and default cell text. */
  value?: (row: T) => unknown;
  /** Explicit options for an enum filter; defaults to the distinct values in the current rows.
   *  Provide this in server-paged mode, where the rows on screen are only one page. */
  options?: ReadonlyArray<string>;
}

/** The active filter for a single column. */
export type FdyColumnFilter =
  | { type: 'text'; text: string }
  | { type: 'enum'; values: readonly string[] }
  | { type: 'number'; min: number | null; max: number | null }
  | { type: 'date'; from: string | null; to: string | null };

/** Column-key → active filter. */
export type FdyFilterMap = Record<string, FdyColumnFilter>;

/** Server-driven pagination state (0-based page index). */
export interface FdyPageState {
  index: number;
  size: number;
  total: number;
}

export function cellValue<T>(row: T, column: FdyTableColumn<T>): unknown;
export function cellText<T>(row: T, column: FdyTableColumn<T>): string;
export function columnSortType<T>(column: FdyTableColumn<T>): FdyColumnType;
export function compareBy(type: FdyColumnType, a: unknown, b: unknown): number;
export function isFilterActive(filter: FdyColumnFilter | undefined): boolean;
export function filterRows<T>(
  rows: readonly T[],
  columns: ReadonlyArray<FdyTableColumn<T>>,
  filters: FdyFilterMap,
): T[];
export function sortRows<T>(
  rows: readonly T[],
  columns: ReadonlyArray<FdyTableColumn<T>>,
  sort: FdySortState | null,
): T[];
export function paginate<T>(rows: readonly T[], pageIndex: number, pageSize: number): T[];
export function distinctValues<T>(rows: readonly T[], column: FdyTableColumn<T>): string[];
export function pageWindow(current: number, totalPages: number): Array<number | 'ellipsis'>;
/** The 0-based page still holding the old first row after a page-size change. */
export function pageIndexForSize(pageIndex: number, oldSize: number, newSize: number): number;
