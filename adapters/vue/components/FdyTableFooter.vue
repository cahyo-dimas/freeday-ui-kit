<script setup lang="ts">
import { computed, useId, type ComputedRef } from 'vue';
import { pageWindow, pageIndexForSize } from '../../core/table-model.js';
import type { FdyPageState } from '../../core/table-model';
import FdyCombo from './FdyCombo.vue';

/*
 * The band under a table: what you are looking at, how much of it you see, where you are.
 *
 * `FdyTable` renders this itself, so most screens never import it. It is exported for the one shape
 * that cannot use the table's own, a RESPONSIVE list, where a `.fdy-datatable` at `lg` and a
 * `.fdy-list` below it are two renderings of ONE page of rows. A footer inside the table is inside
 * the half that is hidden on a phone, so those screens need to render it once, outside both
 * (improvement notes #005 and #008, from IDU_EMATE_APPL_WEB).
 *
 * It owns nothing. `page` in, `update:page` out, the same contract as the table's server mode, so a
 * screen already wired for that switches by moving the prop.
 */
const props = defineProps<{
  /** The page being shown. `size` drives the range AND the rows-per-page control's value. */
  page: FdyPageState;
  /**
   * Offer a rows-per-page control. Omit for none; the footer is then range + pager, exactly as
   * before. Picking a size emits `update:page` carrying the new `size` and the index that still
   * holds the row you were looking at.
   */
  pageSizes?: readonly number[];
  /* The strings, six of them, one per thing this band says. The raw path has had a hatch since
   * 1.39.0 (`data-fdy-text-<key>` read through `textOf()`) and this path had none, so an app that
   * does not speak English could only rewrite the whole band by hand; one shipped eighty one lines
   * of its own markup to change five words. Names follow the enhancer's `TEXT` keys where a key
   * exists, `info`, `prev`, `next`, so one string is not two names across the two paths. The other
   * three have no twin because on the raw path that markup is the app's own. Defaults stay English
   * on every path, which COMPONENTS.md promises and the suite enforces. */
  /**
   * The range line. `{from}`, `{to}` and `{total}` are substituted, every occurrence, as `textOf()`
   * does. Default `Showing {from}–{to} of {total}`, the enhancer's `info`.
   */
  infoText?: string;
  /** The visible word beside the rows-per-page control, which also names it. Default `Rows`. */
  pageSizeLabel?: string;
  /** Accessible name of the pager landmark. Default `Pagination`. */
  paginationLabel?: string;
  /** Accessible name of the previous-page arrow. Default `Previous page`. */
  prevLabel?: string;
  /** Accessible name of the next-page arrow. Default `Next page`. */
  nextLabel?: string;
  /** Accessible name of a numbered page button. `{n}` substituted. Default `Go to page {n}`. */
  pageLabel?: string;
}>();

const emit = defineEmits<{ 'update:page': [page: FdyPageState] }>();

/* The combo is labelled by the visible word beside it, a `<label for>` cannot reach inside a
 * component, and an aria-label would leave that word unattached to anything. */
const sizeLabelId: string = `fdy-rows-${useId()}`;

const totalPages: ComputedRef<number> = computed((): number =>
  props.page.size > 0 ? Math.max(1, Math.ceil(props.page.total / props.page.size)) : 1,
);
const currentPage1: ComputedRef<number> = computed((): number => props.page.index + 1);
const rangeFrom: ComputedRef<number> = computed((): number =>
  props.page.total === 0 ? 0 : props.page.index * props.page.size + 1,
);
const rangeTo: ComputedRef<number> = computed((): number =>
  Math.min(props.page.total, (props.page.index + 1) * props.page.size),
);
const pages: ComputedRef<Array<number | 'ellipsis'>> = computed((): Array<number | 'ellipsis'> =>
  pageWindow(currentPage1.value, totalPages.value),
);

const infoLine: ComputedRef<string> = computed((): string =>
  (props.infoText ?? 'Showing {from}–{to} of {total}')
    .replace(/\{from\}/g, String(rangeFrom.value))
    .replace(/\{to\}/g, String(rangeTo.value))
    .replace(/\{total\}/g, String(props.page.total)),
);

const hasPager: ComputedRef<boolean> = computed((): boolean => props.page.size > 0 && totalPages.value > 1);
const sizes: ComputedRef<readonly number[]> = computed((): readonly number[] => props.pageSizes ?? []);
/* Just the number. The control sits beside a label reading "Rows", so "20 per page" states the same
 * fact twice and truncates doing it. */
const sizeOptions: ComputedRef<Array<{ value: string; label: string }>> = computed(() =>
  sizes.value.map((size: number) => ({ value: String(size), label: String(size) })),
);
/* One page and no size control means there is nothing here to say, the table has always withheld
 * the whole band in that case, and this is where that decision now lives. */
const visible: ComputedRef<boolean> = computed((): boolean => hasPager.value || sizes.value.length > 0);

function pageAriaLabel(page1: number): string {
  return (props.pageLabel ?? 'Go to page {n}').replace(/\{n\}/g, String(page1));
}

function goTo(page1: number): void {
  const clamped: number = Math.min(Math.max(1, page1), totalPages.value);
  emit('update:page', { index: clamped - 1, size: props.page.size, total: props.page.total });
}

function onSize(value: string): void {
  const size: number = Number(value);
  if (!Number.isFinite(size) || size <= 0 || size === props.page.size) return;
  emit('update:page', {
    index: pageIndexForSize(props.page.index, props.page.size, size),
    size,
    total: props.page.total,
  });
}
</script>

<template>
  <div v-if="visible" class="fdy-table-footer">
    <span class="fdy-table-footer__info">{{ infoLine }}</span>

    <div v-if="sizes.length > 0" class="fdy-table-footer__size">
      <span :id="sizeLabelId">{{ pageSizeLabel ?? 'Rows' }}</span>
      <!-- The kit's own listbox, not a native <select>: an OS menu is unthemeable, and on macOS it
           drops a dark panel into a light page. FdyCombo's own header says exactly that. -->
      <FdyCombo
        :model-value="String(page.size)"
        :options="sizeOptions"
        :aria-labelledby="sizeLabelId"
        @update:model-value="onSize"
      />
    </div>

    <nav v-if="hasPager" class="fdy-pagination" :aria-label="paginationLabel ?? 'Pagination'">
      <ul class="fdy-pagination__list">
        <li>
          <button
            type="button"
            class="fdy-pagination__link"
            :aria-label="prevLabel ?? 'Previous page'"
            :disabled="currentPage1 === 1"
            @click="goTo(currentPage1 - 1)"
          >‹</button>
        </li>
        <li v-for="(p, i) in pages" :key="typeof p === 'number' ? p : `gap-${i}`">
          <span v-if="p === 'ellipsis'" class="fdy-pagination__ellipsis">…</span>
          <span v-else-if="p === currentPage1" class="fdy-pagination__link" aria-current="page">{{ p }}</span>
          <button v-else type="button" class="fdy-pagination__link" :aria-label="pageAriaLabel(p)" @click="goTo(p)">{{ p }}</button>
        </li>
        <li>
          <button
            type="button"
            class="fdy-pagination__link"
            :aria-label="nextLabel ?? 'Next page'"
            :disabled="currentPage1 === totalPages"
            @click="goTo(currentPage1 + 1)"
          >›</button>
        </li>
      </ul>
    </nav>
  </div>
</template>
