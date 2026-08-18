import type { ChangeEvent, JSX } from 'react';
import { pageWindow, pageIndexForSize } from '../../core/table-model.js';
import type { FdyPageState } from '../../core/table-model.js';

/*
 * The band under a table: what you are looking at, how much of it you see, where you are.
 *
 * `FdyTable` renders this itself, so most screens never import it. It is exported for the one shape
 * that cannot use the table's own — a RESPONSIVE list, where a `.fdy-datatable` at `lg` and a
 * `.fdy-list` below it are two renderings of ONE page of rows. A footer inside the table is inside
 * the half that is hidden on a phone, so those screens need to render it once, outside both
 * (improvement notes #005 and #008, from IDU_EMATE_APPL_WEB).
 *
 * It owns nothing. `page` in, `onPageChange` out — the same contract as the table's server mode.
 */
export interface FdyTableFooterProps {
  /** The page being shown. `size` drives the range AND the rows-per-page control's value. */
  page: FdyPageState;
  onPageChange?: (page: FdyPageState) => void;
  /**
   * Offer a rows-per-page control. Omit for none — the footer is then range + pager, exactly as
   * before. Picking a size calls `onPageChange` with the new `size` and the index that still holds
   * the row you were looking at.
   */
  pageSizes?: readonly number[];
}

export function FdyTableFooter(props: FdyTableFooterProps): JSX.Element | null {
  const { index, size, total } = props.page;

  const totalPages: number = size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
  const currentPage1: number = index + 1;
  const rangeFrom: number = total === 0 ? 0 : index * size + 1;
  const rangeTo: number = Math.min(total, (index + 1) * size);
  const pages: Array<number | 'ellipsis'> = pageWindow(currentPage1, totalPages);

  const hasPager: boolean = size > 0 && totalPages > 1;
  const sizes: readonly number[] = props.pageSizes ?? [];
  /* One page and no size control means there is nothing here to say — the table has always withheld
   * the whole band in that case, and this is where that decision now lives. */
  if (!hasPager && sizes.length === 0) return null;

  function goTo(page1: number): void {
    const clamped: number = Math.min(Math.max(1, page1), totalPages);
    props.onPageChange?.({ index: clamped - 1, size, total });
  }

  function onSize(event: ChangeEvent<HTMLSelectElement>): void {
    const next: number = Number(event.target.value);
    if (!Number.isFinite(next) || next <= 0 || next === size) return;
    props.onPageChange?.({ index: pageIndexForSize(index, size, next), size: next, total });
  }

  return (
    <div className="fdy-table-footer">
      <span className="fdy-table-footer__info">Showing {rangeFrom}–{rangeTo} of {total}</span>

      {sizes.length > 0 && (
        <label className="fdy-table-footer__size">
          Rows
          <select className="fdy-table-footer__sizeselect" aria-label="Rows per page" value={String(size)} onChange={onSize}>
            {sizes.map((n: number): JSX.Element => <option key={n} value={String(n)}>{n}</option>)}
          </select>
        </label>
      )}

      {hasPager && (
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
      )}
    </div>
  );
}
