<script setup lang="ts" generic="Row extends object">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
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
} from '../../core/table-model';
import FdyTableFilter from './FdyTableFilter.vue';

// A controlled Vue data table over freeday's `.fdy-datatable` / `.fdy-table*` / `.fdy-filter*` /
// `.fdy-pagination__*` classes. Unlike the freeday-table.js enhancer (which snapshots static rows
// and fights a framework's patcher), this reads `rows` as the source of truth on every render, so
// it is safe over a `v-for` bound to reactive data. Two modes:
//   • Client mode (no `page` prop): the component sorts/filters (and paginates when `pageSize` is
//     set) over the full `rows`. `sort`/`filters` are controlled when provided, else internal.
//   • Server mode (`page` prop present): `rows` are rendered exactly as given (the server already
//     sorted/filtered/paged); the sort headers, filters and pager only emit intent
//     (`update:sort` / `update:filters` / `update:page`) for the caller to feed back into its query.
// Column filters (text/enum/number/date) apply live; in server mode, debounce the emit if needed.

const props = defineProps<{
  columns: ReadonlyArray<FdyTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row) => string | number;
  /** Controlled sort. Provide (even as null) to own sorting; omit for internal client sort. */
  sort?: FdySortState | null;
  /** Controlled filter map keyed by column key. Provide to own filtering; omit for internal. */
  filters?: FdyFilterMap;
  /** Server pagination state (0-based index). Presence switches the table into server mode. */
  page?: FdyPageState;
  /** Client-side page size when `page` is absent; 0/undefined = render all rows (no pager). */
  pageSize?: number;
  /**
   * Controlled client-side page index (0-based). Provide it — with `pageSize`, without `page` — to
   * own the page while the table keeps doing filter/sort/paginate. This is what lets an EXTERNAL
   * pager drive the table: a responsive screen that hides `.fdy-datatable` below `md` and renders a
   * card list from the `process` event can render one pager for both breakpoints and point it here.
   * Omit for the internal index (unchanged default).
   */
  pageIndex?: number;
  loading?: boolean;
  emptyText?: string;
  ariaLabel?: string;
  /** Opt in to row activation: rows become focusable and emit `row-activate` on click/Enter/Space. */
  rowActivatable?: boolean;
  /** Per-row class hook, e.g. to mark a selected row. */
  rowClass?: (row: Row) => string | undefined;
  /** Controlled: row keys whose `row-detail` slot is shown as a full-width row beneath them. */
  expandedKeys?: ReadonlyArray<string | number>;
}>();

const emit = defineEmits<{
  'update:sort': [sort: FdySortState | null];
  'update:filters': [filters: FdyFilterMap];
  'update:page': [page: FdyPageState];
  /** Client mode with `pageIndex` provided: the table asks for a new 0-based index (pager click, or
   *  a reset to 0 after sort/filter, or a clamp when filtering shrank the set). */
  'update:pageIndex': [index: number];
  /** A row was activated (click, or Enter/Space while the row itself is focused). */
  'row-activate': [row: Row];
  /** The processed page of rows (after filter/sort/paginate) plus the total row count — fires in
   *  BOTH modes whenever they change. Lets a consumer render the SAME processed set elsewhere
   *  (a `< md` card list, a "selected" summary, export-to-CSV) without re-deriving the pipeline. */
  'process': [result: { rows: Row[]; total: number }];
}>();

const internalSort: Ref<FdySortState | null> = ref(null);
const internalFilters: Ref<FdyFilterMap> = ref({});
const internalPageIndex: Ref<number> = ref(0);

const serverPaged: ComputedRef<boolean> = computed((): boolean => props.page != null);
const sortControlled: ComputedRef<boolean> = computed((): boolean => serverPaged.value || props.sort !== undefined);
const filtersControlled: ComputedRef<boolean> = computed((): boolean => serverPaged.value || props.filters !== undefined);

const effectiveSort: ComputedRef<FdySortState | null> = computed((): FdySortState | null =>
  sortControlled.value ? (props.sort ?? null) : internalSort.value,
);
const effectiveFilters: ComputedRef<FdyFilterMap> = computed((): FdyFilterMap =>
  filtersControlled.value ? (props.filters ?? {}) : internalFilters.value,
);

// Enum options: explicit (server mode) or the distinct values across the current rows (client mode).
const enumOptionsMap: ComputedRef<Record<string, ReadonlyArray<string>>> = computed(
  (): Record<string, ReadonlyArray<string>> => {
    const out: Record<string, ReadonlyArray<string>> = {};
    for (const col of props.columns) {
      if (col.filter === 'enum') out[col.key] = col.options ?? distinctValues(props.rows, col);
    }
    return out;
  },
);

const filteredSorted: ComputedRef<Row[]> = computed((): Row[] => {
  if (serverPaged.value) return props.rows.slice();
  const filtered: Row[] = filterRows(props.rows, props.columns, effectiveFilters.value);
  return sortRows(filtered, props.columns, effectiveSort.value);
});
const totalCount: ComputedRef<number> = computed((): number =>
  serverPaged.value ? (props.page as FdyPageState).total : filteredSorted.value.length,
);
/* Client-side page index: the prop when the parent owns it, the internal ref otherwise. Every read
 * goes through clientPageIndex and every write through setClientPage, so controlled and uncontrolled
 * behave identically apart from where the number lives. */
const pageIndexControlled: ComputedRef<boolean> = computed((): boolean => props.pageIndex !== undefined);
const clientPageIndex: ComputedRef<number> = computed((): number =>
  pageIndexControlled.value ? Math.max(0, props.pageIndex as number) : internalPageIndex.value,
);
function setClientPage(index0: number): void {
  if (pageIndexControlled.value) {
    if (index0 !== props.pageIndex) emit('update:pageIndex', index0);
  } else internalPageIndex.value = index0;
}

const displayRows: ComputedRef<Row[]> = computed((): Row[] => {
  if (serverPaged.value) return props.rows.slice();
  if (props.pageSize && props.pageSize > 0) return paginate(filteredSorted.value, clientPageIndex.value, props.pageSize);
  return filteredSorted.value;
});

const pageSizeEff: ComputedRef<number> = computed((): number =>
  serverPaged.value ? (props.page as FdyPageState).size : (props.pageSize ?? 0),
);
const currentPage1: ComputedRef<number> = computed((): number =>
  (serverPaged.value ? (props.page as FdyPageState).index : clientPageIndex.value) + 1,
);
const totalPages: ComputedRef<number> = computed((): number =>
  pageSizeEff.value > 0 ? Math.max(1, Math.ceil(totalCount.value / pageSizeEff.value)) : 1,
);
const hasPager: ComputedRef<boolean> = computed((): boolean => pageSizeEff.value > 0 && totalPages.value > 1);
const pages: ComputedRef<Array<number | 'ellipsis'>> = computed((): Array<number | 'ellipsis'> =>
  pageWindow(currentPage1.value, totalPages.value),
);
const rangeFrom: ComputedRef<number> = computed((): number =>
  totalCount.value === 0 ? 0 : (currentPage1.value - 1) * pageSizeEff.value + 1,
);
const rangeTo: ComputedRef<number> = computed((): number =>
  totalCount.value === 0 ? 0 : rangeFrom.value - 1 + displayRows.value.length,
);

// Client mode: keep the page in range when a filter shrinks the row set.
watch(totalPages, (tp: number): void => {
  if (!serverPaged.value && clientPageIndex.value > tp - 1) setClientPage(Math.max(0, tp - 1));
});

// Surface the processed page + total to the parent (both modes), so the same result can drive a
// responsive card list / summary / export without re-implementing filter/sort/paginate.
watch(
  [displayRows, totalCount],
  (): void => emit('process', { rows: displayRows.value, total: totalCount.value }),
  { immediate: true },
);

function ariaSortOf(col: FdyTableColumn<Row>): 'ascending' | 'descending' | undefined {
  const s: FdySortState | null = effectiveSort.value;
  if (s === null || s.key !== col.key) return undefined;
  return s.dir === 'asc' ? 'ascending' : 'descending';
}
function onSort(col: FdyTableColumn<Row>): void {
  if (col.sortable !== true) return;
  const cur: FdySortState | null = effectiveSort.value;
  const next: FdySortState =
    cur !== null && cur.key === col.key
      ? { key: col.key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
      : { key: col.key, dir: 'asc' };
  if (sortControlled.value) emit('update:sort', next);
  else {
    internalSort.value = next;
    setClientPage(0);
  }
}
function onFilterChange(col: FdyTableColumn<Row>, filter: FdyColumnFilter | null): void {
  const nextMap: FdyFilterMap = { ...effectiveFilters.value };
  if (filter === null) delete nextMap[col.key];
  else nextMap[col.key] = filter;
  if (filtersControlled.value) emit('update:filters', nextMap);
  else {
    internalFilters.value = nextMap;
    setClientPage(0);
  }
}
function goTo(page1: number): void {
  const clamped: number = Math.min(Math.max(1, page1), totalPages.value);
  const index0: number = clamped - 1;
  if (serverPaged.value) {
    const p: FdyPageState = props.page as FdyPageState;
    emit('update:page', { index: index0, size: p.size, total: p.total });
  } else {
    setClientPage(index0);
  }
}

function cellClass(col: FdyTableColumn<Row>): string | undefined {
  return col.mono === true ? 'fdy-mono' : undefined;
}
function alignStyle(col: FdyTableColumn<Row>): Record<string, string> | undefined {
  return col.align !== undefined ? { textAlign: col.align } : undefined;
}

function rowClasses(row: Row): Array<string | undefined> {
  return [props.rowClass?.(row), props.rowActivatable === true ? 'fdy-table__row--activatable' : undefined];
}
function onRowClick(row: Row): void {
  if (props.rowActivatable === true) emit('row-activate', row);
}
// Enter/Space activate only when the row itself is focused — a control inside a cell keeps its own
// event (the `event.target !== event.currentTarget` guard). Click relies on inner controls calling
// stopPropagation, matching the pattern consumers hand-roll today.
function onRowKeydown(e: KeyboardEvent, row: Row): void {
  if (props.rowActivatable !== true || e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  emit('row-activate', row);
}
function isExpanded(row: Row): boolean {
  return props.expandedKeys?.includes(props.rowKey(row)) === true;
}
</script>

<template>
  <div class="fdy-datatable">
    <div v-if="$slots.toolbar" class="fdy-table-toolbar">
      <slot name="toolbar" />
    </div>

    <div class="fdy-table-scroll">
      <table class="fdy-table" :aria-label="ariaLabel">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" scope="col" :style="alignStyle(col)" :aria-sort="ariaSortOf(col)">
              <button
                v-if="col.sortable"
                type="button"
                class="fdy-table__sortbtn"
                @click="onSort(col)"
              >{{ col.label }}</button>
              <template v-else>{{ col.label }}</template>
              <FdyTableFilter
                v-if="col.filter"
                :label="col.label"
                :type="col.filter"
                :filter="effectiveFilters[col.key]"
                :options="enumOptionsMap[col.key] ?? []"
                @change="onFilterChange(col, $event)"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="fdy-table__state" role="status">Loading…</td>
          </tr>
          <tr v-else-if="displayRows.length === 0">
            <td :colspan="columns.length" class="fdy-table__state">
              <slot name="empty">{{ emptyText ?? 'No data' }}</slot>
            </td>
          </tr>
          <template v-else>
            <template v-for="row in displayRows" :key="rowKey(row)">
              <tr
                :class="rowClasses(row)"
                :tabindex="rowActivatable ? 0 : undefined"
                :aria-expanded="$slots['row-detail'] ? (isExpanded(row) ? 'true' : 'false') : undefined"
                @click="onRowClick(row)"
                @keydown="onRowKeydown($event, row)"
              >
                <td v-for="col in columns" :key="col.key" :class="cellClass(col)" :style="alignStyle(col)">
                  <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)">{{ cellText(row, col) }}</slot>
                </td>
              </tr>
              <tr v-if="$slots['row-detail'] && isExpanded(row)" class="fdy-table__detailrow">
                <td :colspan="columns.length"><slot name="row-detail" :row="row" /></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="hasPager" class="fdy-table-footer">
      <span class="fdy-table-footer__info">Showing {{ rangeFrom }}–{{ rangeTo }} of {{ totalCount }}</span>
      <nav aria-label="Pagination">
        <ul class="fdy-pagination__list">
          <li>
            <button
              type="button"
              class="fdy-pagination__link"
              aria-label="Previous page"
              :disabled="currentPage1 === 1"
              @click="goTo(currentPage1 - 1)"
            >‹</button>
          </li>
          <li v-for="(p, i) in pages" :key="typeof p === 'number' ? p : `gap-${i}`">
            <span v-if="p === 'ellipsis'" class="fdy-pagination__ellipsis">…</span>
            <span v-else-if="p === currentPage1" class="fdy-pagination__link" aria-current="page">{{ p }}</span>
            <button v-else type="button" class="fdy-pagination__link" :aria-label="`Go to page ${p}`" @click="goTo(p)">{{ p }}</button>
          </li>
          <li>
            <button
              type="button"
              class="fdy-pagination__link"
              aria-label="Next page"
              :disabled="currentPage1 === totalPages"
              @click="goTo(currentPage1 + 1)"
            >›</button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
