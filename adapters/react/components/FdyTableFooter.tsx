import type { JSX } from 'react';
import { useId } from 'react';
import { pageWindow, pageIndexForSize } from '../../core/table-model.js';
import type { FdyPageState } from '../../core/table-model.js';
import { FdyCombo } from './FdyCombo';

/*
 * The band under a table: what you are looking at, how much of it you see, where you are.
 *
 * `FdyTable` renders this itself, so most screens never import it. It is exported for the one shape
 * that cannot use the table's own, a RESPONSIVE list, where a `.fdy-datatable` at `lg` and a
 * `.fdy-list` below it are two renderings of ONE page of rows. A footer inside the table is inside
 * the half that is hidden on a phone, so those screens need to render it once, outside both
 * (improvement notes #005 and #008, from IDU_EMATE_APPL_WEB).
 *
 * It owns nothing. `page` in, `onPageChange` out, the same contract as the table's server mode.
 */
export interface FdyTableFooterProps {
  /** The page being shown. `size` drives the range AND the rows-per-page control's value. */
  page: FdyPageState;
  onPageChange?: (page: FdyPageState) => void;
  /**
   * Offer a rows-per-page control. Omit for none; the footer is then range + pager, exactly as
   * before. Picking a size calls `onPageChange` with the new `size` and the index that still holds
   * the row you were looking at.
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
}

export function FdyTableFooter(props: FdyTableFooterProps): JSX.Element | null {
  const { index, size, total } = props.page;
  /* The combo is labelled by the visible word beside it, a <label htmlFor> cannot reach inside a
   * component, and an aria-label would leave that word attached to nothing. */
  const sizeLabelId: string = useId();

  const totalPages: number = size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
  const currentPage1: number = index + 1;
  const rangeFrom: number = total === 0 ? 0 : index * size + 1;
  const rangeTo: number = Math.min(total, (index + 1) * size);
  const pages: Array<number | 'ellipsis'> = pageWindow(currentPage1, totalPages);

  /* Regex with /g, not String.replace on a string pattern, which stops at the first hit and would
   * drop a second `{total}` a translator wrote. This is what `textOf()` does on the raw path. */
  const infoLine: string = (props.infoText ?? 'Showing {from}–{to} of {total}')
    .replace(/\{from\}/g, String(rangeFrom))
    .replace(/\{to\}/g, String(rangeTo))
    .replace(/\{total\}/g, String(total));
  const pageAriaLabel = (page1: number): string =>
    (props.pageLabel ?? 'Go to page {n}').replace(/\{n\}/g, String(page1));

  const hasPager: boolean = size > 0 && totalPages > 1;
  const sizes: readonly number[] = props.pageSizes ?? [];
  /* One page and no size control means there is nothing here to say, the table has always withheld
   * the whole band in that case, and this is where that decision now lives. */
  if (!hasPager && sizes.length === 0) return null;

  function goTo(page1: number): void {
    const clamped: number = Math.min(Math.max(1, page1), totalPages);
    props.onPageChange?.({ index: clamped - 1, size, total });
  }

  function onSize(value: string): void {
    const next: number = Number(value);
    if (!Number.isFinite(next) || next <= 0 || next === size) return;
    props.onPageChange?.({ index: pageIndexForSize(index, size, next), size: next, total });
  }

  return (
    <div className="fdy-table-footer">
      <span className="fdy-table-footer__info">{infoLine}</span>

      {sizes.length > 0 && (
        <div className="fdy-table-footer__size">
          <span id={sizeLabelId}>{props.pageSizeLabel ?? 'Rows'}</span>
          {/* The kit's own listbox, not a native <select>: an OS menu is unthemeable, and on macOS
              it drops a dark panel into a light page. FdyCombo's own header says exactly that. */}
          <FdyCombo
            value={String(size)}
            options={sizes.map((n: number) => ({ value: String(n), label: String(n) }))}
            ariaLabelledby={sizeLabelId}
            onChange={onSize}
          />
        </div>
      )}

      {hasPager && (
        <nav className="fdy-pagination" aria-label={props.paginationLabel ?? 'Pagination'}>
          <ul className="fdy-pagination__list">
            <li>
              <button type="button" className="fdy-pagination__link" aria-label={props.prevLabel ?? 'Previous page'} disabled={currentPage1 === 1} onClick={(): void => goTo(currentPage1 - 1)}>‹</button>
            </li>
            {pages.map((p: number | 'ellipsis', i: number): JSX.Element => (
              <li key={typeof p === 'number' ? `p-${p}` : `gap-${i}`}>
                {p === 'ellipsis' ? (
                  <span className="fdy-pagination__ellipsis">…</span>
                ) : p === currentPage1 ? (
                  <span className="fdy-pagination__link" aria-current="page">{p}</span>
                ) : (
                  <button type="button" className="fdy-pagination__link" aria-label={pageAriaLabel(p)} onClick={(): void => goTo(p)}>{p}</button>
                )}
              </li>
            ))}
            <li>
              <button type="button" className="fdy-pagination__link" aria-label={props.nextLabel ?? 'Next page'} disabled={currentPage1 === totalPages} onClick={(): void => goTo(currentPage1 + 1)}>›</button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
