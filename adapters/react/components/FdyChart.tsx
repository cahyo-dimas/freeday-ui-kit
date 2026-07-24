import { useEffect, useRef, type ReactNode, type JSX } from 'react';

export interface FdyChartSeries {
  label: string;
  values: number[];
  role?: string;
}

export interface FdyChartProps {
  type: 'line' | 'area' | 'bar' | 'sparkline' | 'donut';
  series?: ReadonlyArray<FdyChartSeries>;
  values?: ReadonlyArray<number>;
  labels?: ReadonlyArray<string>;
  format?: 'number' | 'percent' | 'currency';
  stacked?: boolean;
  legend?: 'auto' | 'always' | 'none';
  colors?: ReadonlyArray<string>;
  color?: string;
  center?: string | number;
  'aria-label'?: string;
  children?: ReactNode;
}

interface FreedayChartApi { update: (el: HTMLElement) => void; }
function chartApi(): FreedayChartApi | null {
  const api: FreedayChartApi | undefined = (window as unknown as { FreedayChart?: FreedayChartApi }).FreedayChart;
  return api !== undefined && typeof api.update === 'function' ? api : null;
}

export function FdyChart(props: FdyChartProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  const isCartesian: boolean =
    props.type === 'line' || props.type === 'area' || (props.type === 'bar' && (props.series !== undefined || props.stacked === true));
  const rootClass: string =
    props.type === 'sparkline' ? 'fdy-sparkline'
    : props.type === 'donut' ? 'fdy-donut'
    : props.type === 'bar' && !isCartesian ? 'fdy-bars'
    : '';

  useEffect((): void => {
    const el: HTMLDivElement | null = rootRef.current;
    const api: FreedayChartApi | null = chartApi();
    if (el === null || api === null) return;
    api.update(el);
    el.dataset.fdyChartReady = '1'; // claim it so the global auto-init won't render it again
  }, [props.type, props.series, props.values, props.labels, props.format, props.stacked, props.legend, props.colors, props.color, props.center]);

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-fdy-chart={props.type}
      data-series={props.series !== undefined ? JSON.stringify(props.series) : undefined}
      data-values={props.values !== undefined ? props.values.join(',') : undefined}
      data-labels={props.labels !== undefined ? props.labels.join(',') : undefined}
      data-fdy-format={props.format ?? undefined}
      data-fdy-stacked={props.stacked === true ? '' : undefined}
      data-fdy-legend={props.legend ?? undefined}
      data-fdy-colors={props.colors !== undefined ? props.colors.join(',') : undefined}
      data-fdy-color={props.color ?? undefined}
      data-fdy-center={props.center !== undefined ? String(props.center) : undefined}
      aria-label={props['aria-label']}
      role="img"
    >
      {props.children}
    </div>
  );
}
