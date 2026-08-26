<script setup lang="ts" generic="Row extends object">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  cellValue,
  cellText,
  distinctValues,
  filterRows,
  sortRows,
  paginate,
} from '../../core/table-model.js';
import type {
  FdyTableColumn,
  FdySortState,
  FdyColumnFilter,
  FdyFilterMap,
  FdyPageState,
} from '../../core/table-model';
import FdyTableFilter from './FdyTableFilter.vue';
import FdyTableFooter from './FdyTableFooter.vue';

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

/* `pager` MUST go through withDefaults: Vue's boolean-cast gives an omitted Boolean prop `false`,
   not `undefined`, so a plain `props.pager !== false` would withhold the footer from every table that
   never mentions it. Same trap as FdyModal's `dismissible`. */
const props = withDefaults(defineProps<{
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
   * Controlled client-side page index (0-based). Provide it, with `pageSize`, without `page`, to
   * own the page while the table keeps doing filter/sort/paginate. This is what lets an EXTERNAL
   * pager drive the table: a responsive screen that hides `.fdy-datatable` below `md` and renders a
   * card list from the `process` event can render one pager for both breakpoints and point it here.
   * Omit for the internal index (unchanged default).
   */
  /** Withhold the table's own footer (pager + range) so the screen can render one. Server mode had
   *  no way to do this: the app owns the page there ANYWAY, and was still handed a second control,
   *  a responsive list that shows a table at one breakpoint and cards at another ended up with the
   *  kit's pager stacked under its own. Client mode's counterpart is `pageIndex`. Default true. */
  pager?: boolean;
  /**
   * Offer a rows-per-page control in the footer, beside the range and the pager. Omit for none
   * (unchanged default). Every back office has one, and a table that renders two thirds of its own
   * footer forces the app to rebuild all three to add the last (#008).
   *
   * Server mode reports the pick through `update:page`, same event as a page click, with a new
   * `size`. Client mode keeps it internally and also emits `update:pageSize`, so the control works
   * with nothing wired and can still be persisted.
   */
  pageSizes?: readonly number[];
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
  /** Render the checkbox column and the bulk bar. */
  selectable?: boolean;
  /** Controlled selection, as `rowKey` values. Provide to own it; omit for internal (the column
   *  still works with nothing wired). */
  selectedKeys?: ReadonlyArray<string | number>;
  /** Bulk-bar count, `{n}` substituted. Default `{n} selected`. */
  selectedText?: string;
  /** Bulk-bar clear button. Default `Clear`. */
  clearSelectionText?: string;
  /** Accessible name of the header checkbox. Default `Select all rows on this page`. */
  selectAllLabel?: string;
  /** Accessible name of each row checkbox. Default `Select row`. */
  selectRowLabel?: string;
  /** Accessible name of the bulk bar region. Default `Bulk actions`. */
  bulkLabel?: string;
}>(), { pager: true });

const emit = defineEmits<{
  'update:sort': [sort: FdySortState | null];
  'update:filters': [filters: FdyFilterMap];
  'update:page': [page: FdyPageState];
  /** Client mode with `pageIndex` provided: the table asks for a new 0-based index (pager click, or
   *  a reset to 0 after sort/filter, or a clamp when filtering shrank the set). */
  'update:pageIndex': [index: number];
  /** Client mode with `pageSizes`: the reader picked a new rows-per-page. The table has already
   *  applied it, this is for a caller that wants to persist the choice. */
  'update:pageSize': [size: number];
  /** A row was activated (click, or Enter/Space while the row itself is focused). */
  'row-activate': [row: Row];
  /** Selection changed, as `rowKey` values. Fires in both modes, so a screen can watch the
   *  selection without owning it. */
  'update:selectedKeys': [keys: Array<string | number>];
  /** The processed page of rows (after filter/sort/paginate) plus the total row count, fires in
   *  BOTH modes whenever they change. Lets a consumer render the SAME processed set elsewhere
   *  (a `< md` card list, a "selected" summary, export-to-CSV) without re-deriving the pipeline. */
  'process': [result: { rows: Row[]; total: number }];
}>();

const internalSort: Ref<FdySortState | null> = ref(null);
const internalFilters: Ref<FdyFilterMap> = ref({});
const internalPageIndex: Ref<number> = ref(0);
/* Client-mode rows-per-page. `pageSize` is a plain prop with no event, so a footer control that only
 * emitted would do nothing in the app that wired nothing, the table applies the pick itself and
 * reports it. An explicit change to the prop wins back: the parent said something newer. */
const internalPageSize: Ref<number | null> = ref(null);
watch((): number | undefined => props.pageSize, (): void => { internalPageSize.value = null; });

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

const pageSizeEff: ComputedRef<number> = computed((): number =>
  serverPaged.value ? (props.page as FdyPageState).size : (internalPageSize.value ?? props.pageSize ?? 0),
);

const displayRows: ComputedRef<Row[]> = computed((): Row[] => {
  if (serverPaged.value) return props.rows.slice();
  if (pageSizeEff.value > 0) return paginate(filteredSorted.value, clientPageIndex.value, pageSizeEff.value);
  return filteredSorted.value;
});
const currentPage1: ComputedRef<number> = computed((): number =>
  (serverPaged.value ? (props.page as FdyPageState).index : clientPageIndex.value) + 1,
);
const totalPages: ComputedRef<number> = computed((): number =>
  pageSizeEff.value > 0 ? Math.max(1, Math.ceil(totalCount.value / pageSizeEff.value)) : 1,
);
/* What the footer needs, in both modes: the range, the pager and the size control are all derived
 * from these three numbers, so the table hands them over rather than restating them. */
const footerPage: ComputedRef<FdyPageState> = computed((): FdyPageState => ({
  index: currentPage1.value - 1,
  size: pageSizeEff.value,
  total: totalCount.value,
}));

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

/* One event carries both intents, so which one it was is read off `size`. */
function onFooterPage(next: FdyPageState): void {
  if (next.size !== pageSizeEff.value) {
    if (serverPaged.value) emit('update:page', next);
    else {
      internalPageSize.value = next.size;
      emit('update:pageSize', next.size);
      setClientPage(next.index);
    }
    return;
  }
  goTo(next.index + 1);
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
// Enter/Space activate only when the row itself is focused, a control inside a cell keeps its own
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

/* Selection is keyed by `rowKey`, exactly as `expandedKeys` is, and for the same reason: a key
 * survives the re-fetch that replaces every row object, an object identity does not. Controlled when
 * `selectedKeys` is provided, internal otherwise, so the column works with nothing wired. */
const internalSelectedKeys: Ref<Array<string | number>> = ref([]);
const selectionControlled: ComputedRef<boolean> = computed((): boolean => props.selectedKeys !== undefined);
const effectiveSelectedKeys: ComputedRef<ReadonlyArray<string | number>> = computed(
  (): ReadonlyArray<string | number> =>
    selectionControlled.value ? (props.selectedKeys as ReadonlyArray<string | number>) : internalSelectedKeys.value,
);
const selectedCount: ComputedRef<number> = computed((): number => effectiveSelectedKeys.value.length);
/* The select-all box acts on the CURRENT PAGE, not on every filtered row: a header checkbox that
 * silently selects rows the reader cannot see is how bulk deletes go wrong. Keys picked on other
 * pages are preserved rather than dropped, so paging away and back does not lose them. */
const pageKeys: ComputedRef<Array<string | number>> = computed((): Array<string | number> =>
  displayRows.value.map((row: Row): string | number => props.rowKey(row)),
);
const allPageSelected: ComputedRef<boolean> = computed((): boolean =>
  pageKeys.value.length > 0 && pageKeys.value.every((k: string | number): boolean => effectiveSelectedKeys.value.includes(k)),
);
const somePageSelected: ComputedRef<boolean> = computed((): boolean =>
  !allPageSelected.value && pageKeys.value.some((k: string | number): boolean => effectiveSelectedKeys.value.includes(k)),
);

/* Always emits, controlled or not — the same call the `update:pageSize` control makes, and for the
 * same reason: a screen that only wants to WATCH the selection (a summary line, an export button)
 * should not have to take ownership of it to hear about it. */
function setSelection(keys: Array<string | number>): void {
  if (!selectionControlled.value) internalSelectedKeys.value = keys;
  emit('update:selectedKeys', keys);
}
function isSelected(row: Row): boolean {
  return effectiveSelectedKeys.value.includes(props.rowKey(row));
}
function toggleRow(row: Row, checked: boolean): void {
  const key: string | number = props.rowKey(row);
  const next: Array<string | number> = effectiveSelectedKeys.value.filter((k: string | number): boolean => k !== key);
  if (checked) next.push(key);
  setSelection(next);
}
function toggleAllOnPage(checked: boolean): void {
  const onPage: Set<string | number> = new Set(pageKeys.value);
  const offPage: Array<string | number> = effectiveSelectedKeys.value.filter(
    (k: string | number): boolean => !onPage.has(k),
  );
  setSelection(checked ? offPage.concat(pageKeys.value) : offPage);
}
function clearSelection(): void {
  setSelection([]);
}
function selectedLabel(n: number): string {
  return (props.selectedText ?? '{n} selected').replace('{n}', String(n));
}

/* The checkbox column widens every full-width row (loading, empty, row detail) by one. Deriving it
 * once is what keeps a later column change from leaving one of the three behind. */
const colSpan: ComputedRef<number> = computed((): number =>
  props.columns.length + (props.selectable === true ? 1 : 0),
);
</script>

<template>
  <div class="fdy-datatable">
    <div v-if="$slots.toolbar" class="fdy-table-toolbar">
      <slot name="toolbar" />
    </div>

    <div
      v-if="selectable"
      class="fdy-table-bulkbar"
      :hidden="selectedCount === 0"
      role="region"
      :aria-label="bulkLabel ?? 'Bulk actions'"
    >
      <span class="fdy-table-bulkbar__count" aria-live="polite">{{ selectedLabel(selectedCount) }}</span>
      <span class="fdy-table-bulkbar__spacer"></span>
      <div class="fdy-table-bulkbar__actions">
        <slot name="bulk-actions" :keys="effectiveSelectedKeys" :clear="clearSelection" />
        <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" @click="clearSelection">
          {{ clearSelectionText ?? 'Clear' }}
        </button>
      </div>
    </div>

    <div class="fdy-table-scroll">
      <table class="fdy-table" :aria-label="ariaLabel">
        <thead>
          <tr>
            <th v-if="selectable" class="fdy-table__selcol" scope="col">
              <input
                type="checkbox"
                class="fdy-checkbox"
                data-fdy-select-all
                :checked="allPageSelected"
                :indeterminate.prop="somePageSelected"
                :aria-label="selectAllLabel ?? 'Select all rows on this page'"
                @change="toggleAllOnPage(($event.target as HTMLInputElement).checked)"
              >
            </th>
            <th v-for="col in columns" :key="col.key" scope="col" :style="alignStyle(col)" :aria-sort="ariaSortOf(col)">
              <button
                v-if="col.sortable"
                type="button"
                class="fdy-table__sortbtn"
                @click="onSort(col)"
              ><span :class="col.labelHidden ? 'fdy-visually-hidden' : undefined">{{ col.label }}</span></button>
              <span v-else :class="col.labelHidden ? 'fdy-visually-hidden' : undefined">{{ col.label }}</span>
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
            <td :colspan="colSpan" class="fdy-table__state" role="status">Loading…</td>
          </tr>
          <tr v-else-if="displayRows.length === 0">
            <td :colspan="colSpan" class="fdy-table__state">
              <slot name="empty">{{ emptyText ?? 'No data' }}</slot>
            </td>
          </tr>
          <template v-else>
            <template v-for="row in displayRows" :key="rowKey(row)">
              <tr
                :class="rowClasses(row)"
                :tabindex="rowActivatable ? 0 : undefined"
                :aria-expanded="$slots['row-detail'] ? (isExpanded(row) ? 'true' : 'false') : undefined"
                :aria-selected="selectable ? (isSelected(row) ? 'true' : 'false') : undefined"
                @click="onRowClick(row)"
                @keydown="onRowKeydown($event, row)"
              >
                <td v-if="selectable" class="fdy-table__selcol">
                  <!-- `.stop`: without it, ticking a checkbox in an activatable row also fires
                       `row-activate`, so selecting a row would navigate away from it. -->
                  <input
                    type="checkbox"
                    class="fdy-checkbox"
                    data-fdy-row-select
                    :checked="isSelected(row)"
                    :aria-label="selectRowLabel ?? 'Select row'"
                    @click.stop
                    @change="toggleRow(row, ($event.target as HTMLInputElement).checked)"
                  >
                </td>
                <td v-for="col in columns" :key="col.key" :class="cellClass(col)" :style="alignStyle(col)">
                  <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)">{{ cellText(row, col) }}</slot>
                </td>
              </tr>
              <tr v-if="$slots['row-detail'] && isExpanded(row)" class="fdy-table__detailrow">
                <td :colspan="colSpan"><slot name="row-detail" :row="row" /></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <FdyTableFooter
      v-if="pager !== false"
      :page="footerPage"
      :page-sizes="pageSizes"
      @update:page="onFooterPage"
    />
  </div>
</template>
