<script setup lang="ts" generic="Row extends Record<string, unknown>">
import { computed, nextTick, onBeforeUnmount, ref, useId, type ComputedRef, type Ref } from 'vue';

// A Vue-native, *controlled async* choose-from-list over freeday's `.fdy-cfl*` +
// `.fdy-input-group` classes (see src/components/cfl.css, input-group.css). freeday
// ships a framework-agnostic enhancer (freeday-cfl.js) that scans static `.fdy-cfl__row`
// markup; its own header says a framework app should "drive the dialog as a controlled
// component (fetchPage callback + server cache), not a store." This component does exactly
// that: a real `v-model:Row|null` over a native <dialog> whose rows come from an async
// `fetchPage(query, page)`. It re-implements the enhancer's open/close + search + dense
// sticky-header results + single-commit-on-click + keyboard, and adds the pieces a server
// picker needs, loading/empty/error states, retry, pagination, an out-of-order guard, and
// an optional in-memory cache. The enhancer is NOT mounted here (it would fight Vue's DOM).

interface CflColumn {
  key: keyof Row & string;
  label: string;
}

interface CflPage {
  rows: Row[];
  hasMore: boolean;
}

const props = defineProps<{
  /** Single: `Row | null`. With `multiple`, an array, `Row[] | null`, where null and [] both mean
   *  nothing picked. The enhancer has had `data-fdy-cfl-multiple` all along; this is the typed
   *  wrappers catching up (#019). */
  modelValue: Row | Row[] | null;
  fetchPage: (query: string, page: number) => Promise<CflPage>;
  columns: ReadonlyArray<CflColumn>;
  display: (row: Row) => string;
  rowKey: (row: Row) => string;
  /** Advisory only, the caller's `fetchPage` owns paging; kept for API documentation. */
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
  /** aria-label for the button that opens the picker. Default 'Open search'. */
  openLabel?: string;
  /** Tick rows and commit them together, instead of committing the row that was clicked. The kit's
   *  own enhancer offers this (`data-fdy-cfl-multiple`); a screen that gathers six expense claims
   *  onto one document wants one dialog, not six. */
  multiple?: boolean;
  /** Footer label while picking, `{n}` replaced by the tick count. Default '{n} selected'. */
  selectedText?: string;
  /** The multi-select commit button. Default 'Confirm'. */
  confirmText?: string;
  /** Footer hint in single mode. Default 'Click a row to choose it'. */
  hintText?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: shows the picked value (focusable, copyable), but the search dialog can't be opened. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  /** Render a clear button when a row is picked, so an OPTIONAL foreign key can be unset. Without it
   *  `modelValue` accepts `Row | null` but the component can only ever produce a `Row`. */
  clearable?: boolean;
  /** aria-label for the clear button (when `clearable`). Default 'Clear selection'. */
  clearLabel?: string;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Row | Row[] | null];
  change: [value: Row | Row[] | null];
}>();

const baseId: string = useId();
const fieldId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-field`);
const titleId: string = `${baseId}-title`;
const resultsId: string = `${baseId}-results`;
function rowId(index: number): string {
  return `${baseId}-row-${index}`;
}

const dialogEl: Ref<HTMLDialogElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const searchEl: Ref<HTMLInputElement | null> = ref(null);

const query: Ref<string> = ref('');
const rows: Ref<Row[]> = ref([]) as Ref<Row[]>;
const page: Ref<number> = ref(0);
const hasMore: Ref<boolean> = ref(false);
const loading: Ref<boolean> = ref(false);
const error: Ref<Error | null> = ref(null);
const activeIndex: Ref<number> = ref(-1);

const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);

const showClear: ComputedRef<boolean> = computed(
  (): boolean =>
    props.clearable === true && currentRows.value.length > 0 && isDisabled.value === false && isReadonly.value === false,
);
const clearLabelText: ComputedRef<string> = computed((): string => props.clearLabel ?? 'Clear selection');
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
/* `display()` takes one row, so in multi the field states HOW MANY, naming one of six would be a
   lie, and naming all six does not fit a control that is 22rem wide. */
const currentRows: ComputedRef<Row[]> = computed((): Row[] =>
  Array.isArray(props.modelValue) ? props.modelValue : props.modelValue !== null ? [props.modelValue as Row] : [],
);
const selectedTextFor = (n: number): string => (props.selectedText ?? '{n} selected').replace('{n}', String(n));
const displayValue: ComputedRef<string> = computed((): string => {
  if (props.multiple === true) return currentRows.value.length === 0 ? '' : selectedTextFor(currentRows.value.length);
  return props.modelValue !== null ? props.display(props.modelValue as Row) : '';
});
// The results <table> (owner of `resultsId`) only renders in the rows branch, so gate the
// search input's aria refs on rows existing, otherwise they'd dangle during loading/empty/error.
const hasRows: ComputedRef<boolean> = computed((): boolean => rows.value.length > 0);
const controlsId: ComputedRef<string | undefined> = computed((): string | undefined =>
  hasRows.value ? resultsId : undefined,
);
const activeDescendant: ComputedRef<string | undefined> = computed((): string | undefined =>
  hasRows.value && activeIndex.value >= 0 ? rowId(activeIndex.value) : undefined,
);
const isInitialLoading: ComputedRef<boolean> = computed((): boolean => loading.value && rows.value.length === 0);
const isBlockingError: ComputedRef<boolean> = computed((): boolean => error.value !== null && rows.value.length === 0);
const isEmpty: ComputedRef<boolean> = computed(
  (): boolean => !loading.value && error.value === null && rows.value.length === 0,
);

// --- Async engine ---------------------------------------------------------
// Out-of-order guard: every fetch takes a monotonically increasing token; a
// resolved/rejected page is discarded unless it still owns the latest token
// (a newer search, a load-more, or a dialog reset all bump it). This keeps a
// slow stale response from overwriting fresh results.
let reqToken: number = 0;
// Optional in-memory cache, keyed by `${query}::${page}`, cleared on close.
const cache: Map<string, CflPage> = new Map<string, CflPage>();
let lastPage: number = 0;
let lastAppend: boolean = false;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function loadPage(targetPage: number, append: boolean): Promise<void> {
  const q: string = query.value;
  lastPage = targetPage;
  lastAppend = append;
  const token: number = ++reqToken;
  const key = `${q}::${targetPage}`;
  error.value = null;
  loading.value = true;
  try {
    const cached: CflPage | undefined = cache.get(key);
    const res: CflPage = cached ?? (await props.fetchPage(q, targetPage));
    if (token !== reqToken) return; // stale — a newer request has started
    if (cached === undefined) cache.set(key, res);
    const copy: Row[] = res.rows.slice(); // never mutate the caller's array
    rows.value = append ? rows.value.concat(copy) : copy;
    hasMore.value = res.hasMore;
    page.value = targetPage;
    if (!append) activeIndex.value = rows.value.length > 0 ? 0 : -1;
  } catch (err: unknown) {
    if (token !== reqToken) return;
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    if (token === reqToken) loading.value = false;
  }
}

function retry(): void {
  void loadPage(lastPage, lastAppend);
}

function loadMore(): void {
  if (loading.value || !hasMore.value) return;
  void loadPage(page.value + 1, true);
}

function onSearchInput(e: Event): void {
  query.value = (e.target as HTMLInputElement).value;
  if (searchTimer !== null) clearTimeout(searchTimer);
  searchTimer = setTimeout((): void => {
    void loadPage(0, false);
  }, 250);
}

// --- Active-row / keyboard ------------------------------------------------
function setActive(index: number): void {
  if (rows.value.length === 0) {
    activeIndex.value = -1;
    return;
  }
  const clamped: number = Math.max(0, Math.min(index, rows.value.length - 1));
  activeIndex.value = clamped;
  void nextTick((): void => {
    document.getElementById(rowId(clamped))?.scrollIntoView({ block: 'nearest' });
  });
}

/* The ticks live here, not in `modelValue`, because a multi dialog is only committed at Confirm:
   closing it must leave the caller's value exactly as it was. Seeded from `modelValue` on open. */
const picked: Ref<Row[]> = ref([]) as Ref<Row[]>;

const pickedKeys: ComputedRef<Set<string>> = computed(
  (): Set<string> => new Set(picked.value.map((r: Row): string => props.rowKey(r)))
);

function isPicked(row: Row): boolean {
  return pickedKeys.value.has(props.rowKey(row));
}

function togglePick(row: Row): void {
  const key: string = props.rowKey(row);
  const at: number = picked.value.findIndex((r: Row): boolean => props.rowKey(r) === key);
  if (at === -1) picked.value = [...picked.value, row];
  else picked.value = picked.value.filter((_: Row, i: number): boolean => i !== at);
}

/* A click means "tick this" in multi and "this is my answer" in single, the whole difference. */
function onRowClick(row: Row): void {
  if (props.multiple === true) togglePick(row);
  else commit(row);
}

function confirmPicks(): void {
  emit('update:modelValue', picked.value);
  emit('change', picked.value);
  closeDialog();
}

function commit(row: Row | null): void {
  emit('update:modelValue', row);
  emit('change', row);
  closeDialog();
}

/* Unsetting is not "picking nothing", it must not open or close the dialog, and it must leave focus
   on a control that still exists, so focus returns to the trigger beside it. */
function clearValue(): void {
  picked.value = [];
  emit('update:modelValue', null);
  emit('change', null);
  triggerEl.value?.focus();
}

function onKeydown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setActive(activeIndex.value + 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActive(activeIndex.value - 1);
      break;
    case 'Home':
      if (rows.value.length > 0) {
        e.preventDefault();
        setActive(0);
      }
      break;
    case 'End':
      if (rows.value.length > 0) {
        e.preventDefault();
        setActive(rows.value.length - 1);
      }
      break;
    case 'Enter': {
      const row: Row | undefined = activeIndex.value >= 0 ? rows.value[activeIndex.value] : undefined;
      if (row !== undefined) {
        e.preventDefault();
        onRowClick(row);
      }
      break;
    }
    default:
      break; // Escape is left to the native <dialog> cancel/close
  }
}

// --- Open / close ---------------------------------------------------------
function openDialog(): void {
  if (isDisabled.value || isReadonly.value) return;
  if (searchTimer !== null) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  cache.clear();
  query.value = '';
  rows.value = [];
  page.value = 0;
  hasMore.value = false;
  error.value = null;
  activeIndex.value = -1;
  /* Re-seeded per open, so Cancel really is a cancel: the ticks start as whatever the caller holds. */
  picked.value = props.multiple === true ? [...currentRows.value] : [];
  dialogEl.value?.showModal();
  void nextTick((): void => searchEl.value?.focus());
  void loadPage(0, false);
}

function closeDialog(): void {
  dialogEl.value?.close();
}

// Fires for every close path (button, Esc, commit); centralise cleanup here.
function onClose(): void {
  reqToken++; // invalidate any in-flight fetch so it can't apply after close
  if (searchTimer !== null) {
    // Cancel a debounce armed just before close (e.g. typed a char then clicked a
    // row) so it can't fire a stray fetchPage after the dialog is gone.
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  cache.clear();
  loading.value = false;
  triggerEl.value?.focus();
}

function cellText(row: Row, key: keyof Row & string): string {
  const value: unknown = row[key];
  return value === null || value === undefined ? '' : String(value);
}

onBeforeUnmount((): void => {
  if (searchTimer !== null) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="fdy-input-group">
    <input
      :id="fieldId"
      class="fdy-input"
      type="text"
      readonly
      :value="displayValue"
      :placeholder="placeholder"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedby"
      :disabled="isDisabled"
    />
    <button
      v-if="showClear"
      type="button"
      class="fdy-input-group__btn"
      :aria-label="clearLabelText"
      @click="clearValue"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18"></path>
      </svg>
    </button>
    <button
      ref="triggerEl"
      type="button"
      class="fdy-input-group__btn"
      aria-haspopup="dialog"
      :aria-labelledby="ariaLabelledby"
      :aria-label="ariaLabelledby ? undefined : (openLabel ?? 'Open search')"
      :disabled="isDisabled || isReadonly"
      @click="openDialog"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
    </button>

    <dialog ref="dialogEl" class="fdy-modal fdy-modal--cfl" :aria-labelledby="titleId" @close="onClose" @keydown="onKeydown">
      <div class="fdy-modal__header">
        <h3 :id="titleId" class="fdy-modal__title">{{ title ?? 'Choose data' }}</h3>
        <button class="fdy-modal__close" type="button" :aria-label="closeLabel ?? 'Close'" @click="closeDialog">&times;</button>
      </div>

      <div class="fdy-modal__body">
        <div class="fdy-cfl__search">
          <div class="fdy-input-group" style="max-width:none">
            <span class="fdy-input-group__addon fdy-input-group__addon--icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </span>
            <input
              ref="searchEl"
              class="fdy-input"
              type="search"
              :value="query"
              :placeholder="searchPlaceholder ?? 'Search…'"
              :aria-label="searchPlaceholder ?? 'Search…'"
              :aria-controls="controlsId"
              :aria-activedescendant="activeDescendant"
              @input="onSearchInput"
            />
          </div>
        </div>

        <div class="fdy-cfl__results">
          <p v-if="isInitialLoading" class="fdy-cfl__empty" role="status">{{ loadingText ?? 'Loading…' }}</p>

          <div v-else-if="isBlockingError" class="fdy-cfl__empty" role="alert">
            <p style="margin:0 0 var(--space-3)">{{ error?.message }}</p>
            <button class="fdy-btn fdy-btn--sm" type="button" @click="retry">{{ retryText ?? 'Try again' }}</button>
          </div>

          <p v-else-if="isEmpty" class="fdy-cfl__empty">{{ emptyText ?? 'No results.' }}</p>

          <template v-else>
            <table :id="resultsId" class="fdy-table" aria-label="Search results">
              <thead>
                <tr>
                  <th v-if="multiple === true" scope="col"><span class="fdy-visually-hidden">{{ selectedTextFor(picked.length) }}</span></th>
                  <th v-for="col in columns" :key="col.key" scope="col">{{ col.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in rows"
                  :id="rowId(i)"
                  :key="rowKey(row)"
                  class="fdy-cfl__row"
                  :class="{ 'is-active': i === activeIndex }"
                  :aria-selected="multiple === true ? (isPicked(row) ? 'true' : 'false') : i === activeIndex ? 'true' : undefined"
                  @click="onRowClick(row)"
                  @mousemove="setActive(i)"
                >
                  <td v-if="multiple === true" class="fdy-cfl__check">
                    <input class="fdy-checkbox" type="checkbox" tabindex="-1" :checked="isPicked(row)" aria-hidden="true" />
                  </td>
                  <td v-for="col in columns" :key="col.key">{{ cellText(row, col.key) }}</td>
                </tr>
              </tbody>
            </table>

            <div v-if="error !== null" class="fdy-cfl__empty" role="alert" style="padding:var(--space-4) var(--space-5)">
              <p style="margin:0 0 var(--space-3)">{{ error.message }}</p>
              <button class="fdy-btn fdy-btn--sm" type="button" @click="retry">{{ retryText ?? 'Try again' }}</button>
            </div>
            <div v-else-if="hasMore" style="padding:var(--space-3) var(--space-4);text-align:center">
              <button class="fdy-btn fdy-btn--ghost fdy-btn--sm" type="button" :disabled="loading" @click="loadMore">
                {{ loading ? (loadingText ?? 'Loading…') : (moreText ?? 'Load more') }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="fdy-modal__footer">
        <span class="fdy-cfl__count" aria-live="polite">
          {{ multiple === true ? selectedTextFor(picked.length) : (hintText ?? 'Click a row to choose it') }}
        </span>
        <div class="fdy-cfl__actions">
          <button class="fdy-btn fdy-btn--ghost" type="button" @click="closeDialog">{{ closeLabel ?? 'Close' }}</button>
          <button v-if="multiple === true" class="fdy-btn" type="button" @click="confirmPicks">{{ confirmText ?? 'Confirm' }}</button>
        </div>
      </div>
    </dialog>
  </div>
</template>
