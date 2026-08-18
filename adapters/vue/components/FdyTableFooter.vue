<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import { pageWindow, pageIndexForSize } from '../../core/table-model.js';
import type { FdyPageState } from '../../core/table-model';

/*
 * The band under a table: what you are looking at, how much of it you see, where you are.
 *
 * `FdyTable` renders this itself, so most screens never import it. It is exported for the one shape
 * that cannot use the table's own — a RESPONSIVE list, where a `.fdy-datatable` at `lg` and a
 * `.fdy-list` below it are two renderings of ONE page of rows. A footer inside the table is inside
 * the half that is hidden on a phone, so those screens need to render it once, outside both
 * (improvement notes #005 and #008, from IDU_EMATE_APPL_WEB).
 *
 * It owns nothing. `page` in, `update:page` out — the same contract as the table's server mode, so a
 * screen already wired for that switches by moving the prop.
 */
const props = defineProps<{
  /** The page being shown. `size` drives the range AND the rows-per-page control's value. */
  page: FdyPageState;
  /**
   * Offer a rows-per-page control. Omit for none — the footer is then range + pager, exactly as
   * before. Picking a size emits `update:page` carrying the new `size` and the index that still
   * holds the row you were looking at.
   */
  pageSizes?: readonly number[];
}>();

const emit = defineEmits<{ 'update:page': [page: FdyPageState] }>();

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

const hasPager: ComputedRef<boolean> = computed((): boolean => props.page.size > 0 && totalPages.value > 1);
const sizes: ComputedRef<readonly number[]> = computed((): readonly number[] => props.pageSizes ?? []);
/* One page and no size control means there is nothing here to say — the table has always withheld
 * the whole band in that case, and this is where that decision now lives. */
const visible: ComputedRef<boolean> = computed((): boolean => hasPager.value || sizes.value.length > 0);

function goTo(page1: number): void {
  const clamped: number = Math.min(Math.max(1, page1), totalPages.value);
  emit('update:page', { index: clamped - 1, size: props.page.size, total: props.page.total });
}

function onSize(event: Event): void {
  const size: number = Number((event.target as HTMLSelectElement).value);
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
    <span class="fdy-table-footer__info">Showing {{ rangeFrom }}–{{ rangeTo }} of {{ page.total }}</span>

    <label v-if="sizes.length > 0" class="fdy-table-footer__size">
      Rows
      <select
        class="fdy-table-footer__sizeselect"
        aria-label="Rows per page"
        :value="String(page.size)"
        @change="onSize"
      >
        <option v-for="size in sizes" :key="size" :value="String(size)">{{ size }}</option>
      </select>
    </label>

    <nav v-if="hasPager" aria-label="Pagination">
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
</template>
