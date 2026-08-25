<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick, type ComputedRef, type Ref } from 'vue';

// A Vue-native wrapper over freeday's zero-dependency chart renderer (freeday-chart.js).
// Unlike the input components, charts are not form controls, so re-implementing them in Vue
// would only duplicate the SVG maths. Instead this thin wrapper binds the renderer's data-*
// API reactively and re-invokes window.FreedayChart.update() whenever the data changes, giving
// reactive, typed charts (a drop-in replacement for hand-rolled Chart.js wrappers) with no
// external dependency. Because the renderer paints with CSS var()/--chart-* tokens, charts also
// recolour on data-theme change for free. Requires the freeday enhancers (dist/freeday.js) to be
// loaded so window.FreedayChart exists; until then the slotted fallback content stays visible.

interface FdyChartSeries {
  label: string;
  values: number[];
  role?: string;
}

// Note: no `ariaLabel` prop, pass `aria-label` (and any other native attribute) directly; it
// falls through onto the root element. `role="img"` is set below. Give every chart an aria-label.
const props = defineProps<{
  type: 'line' | 'area' | 'bar' | 'sparkline' | 'donut';
  series?: ReadonlyArray<FdyChartSeries>;
  values?: ReadonlyArray<number>;
  labels?: ReadonlyArray<string>;
  format?: 'number' | 'percent' | 'currency';
  stacked?: boolean;
  legend?: 'auto' | 'always' | 'none';
  /**
   * Per-series colour override. Each entry is a semantic token name (primary/accent/success/
   * warning/danger/info) OR a categorical slot 'chart-1'..'chart-8' to pin a series to the
   * validated palette. Omit to use the default fixed-order chart palette.
   */
  colors?: ReadonlyArray<string>;
  color?: string;
  center?: string | number;
}>();

interface FreedayChartApi { update: (el: HTMLElement) => void; }
function chartApi(): FreedayChartApi | null {
  const api: FreedayChartApi | undefined = (window as unknown as { FreedayChart?: FreedayChartApi }).FreedayChart;
  return api !== undefined && typeof api.update === 'function' ? api : null;
}

const rootEl: Ref<HTMLDivElement | null> = ref(null);

// Cartesian (axes) when line/area, or a bar with multiple series / stacking; those get their
// layout class from the renderer. sparkline/donut/simple-bar need their layout class up front.
const isCartesian: ComputedRef<boolean> = computed((): boolean =>
  props.type === 'line' || props.type === 'area' || (props.type === 'bar' && (props.series !== undefined || props.stacked === true)),
);
const rootClass: ComputedRef<string> = computed((): string => {
  if (props.type === 'sparkline') return 'fdy-sparkline';
  if (props.type === 'donut') return 'fdy-donut';
  if (props.type === 'bar' && !isCartesian.value) return 'fdy-bars';
  return '';
});

function render(): void {
  const el: HTMLDivElement | null = rootEl.value;
  const api: FreedayChartApi | null = chartApi();
  if (el === null || api === null) return;
  api.update(el);
  el.dataset.fdyChartReady = '1'; // claim it so the global auto-init won't render it again
}

onMounted((): void => { void nextTick(render); });
watch(
  (): unknown[] => [props.type, props.series, props.values, props.labels, props.format, props.stacked, props.legend, props.colors, props.color, props.center],
  (): void => { void nextTick(render); },
  { deep: true },
);
onBeforeUnmount((): void => { const el: HTMLDivElement | null = rootEl.value; if (el !== null) el.innerHTML = ''; });
</script>

<template>
  <div
    ref="rootEl"
    :class="rootClass"
    :data-fdy-chart="type"
    :data-series="series !== undefined ? JSON.stringify(series) : undefined"
    :data-values="values !== undefined ? values.join(',') : undefined"
    :data-labels="labels !== undefined ? labels.join(',') : undefined"
    :data-fdy-format="format ?? undefined"
    :data-fdy-stacked="stacked === true ? '' : undefined"
    :data-fdy-legend="legend ?? undefined"
    :data-fdy-colors="colors !== undefined ? colors.join(',') : undefined"
    :data-fdy-color="color ?? undefined"
    :data-fdy-center="center !== undefined ? String(center) : undefined"
    role="img"
  >
    <slot />
  </div>
</template>
