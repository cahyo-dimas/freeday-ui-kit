import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* Invariant: every clipping / scrolling container is also a CONTAINING BLOCK.
 *
 * `overflow` clips a descendant only when that descendant's containing block is inside the overflow
 * box. An absolutely positioned child of an unpositioned scroller therefore resolves against the
 * INITIAL containing block and is clipped by nothing — it parks at its static position and drags
 * the whole document sideways. The kit hits this with its own `.fdy-visually-hidden` (see base.css):
 * measured 1351px of phantom page scroll from 11 hidden labels in one horizontally scrolling table,
 * unaffected by `overflow-x:hidden` on every wrapper, and invisible in the DOM.
 *
 * So: a rule that declares `overflow` must also make the element positioned — unless it is listed
 * below with the reason its content is already contained by an ancestor the kit itself positions. */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'dist', 'freeday.css'), 'utf8');
const base = readFileSync(join(root, 'src', 'base.css'), 'utf8');

/* selector -> why it needs no `position` of its own. Verified in real Chrome (escape = 0px) or
 * structurally guaranteed by a positioned ancestor the kit ships. */
const CONTAINED_BY_ANCESTOR = new Map([
  ['.fdy-modal', 'a native <dialog>: the UA stylesheet positions it (absolute, fixed when modal)'],
  ['.fdy-modal__body', 'inside <dialog class="fdy-modal">, which is position:fixed'],
  ['.fdy-modal--cfl .fdy-modal__body', 'same element as .fdy-modal__body'],
  ['.fdy-drawer__body', 'inside <dialog class="fdy-drawer">, which is position:fixed'],
  ['.fdy-cfl__results', 'inside the CFL modal (position:fixed)'],
  ['.fdy-filter__list', 'inside .fdy-filter, which is position:fixed'],
  ['.fdy-cascade__list', 'inside .fdy-cascade__panel, which is position:absolute'],
  ['.fdy-app__sidebar', 'position:sticky already — a containing block'],
  ['.fdy-nav', 'lives in .fdy-app__sidebar (sticky) or a drawer (fixed); both contain it'],
  ['.fdy-datatable', 'its scrolling child .fdy-table-scroll is positioned; toolbar/footer wrap'],
  ['.fdy-input-group', 'holds bounded form controls only — nothing wide enough to park off-screen'],
  ['.fdy-avatar', 'fixed 2.5rem box, image or initials only'],
  ['.fdy-progress', 'holds its own __bar only'],
  ['.fdy-accordion__item > summary::after', 'generated content, not a container'],
  ['.fdy-carousel__viewport::-webkit-scrollbar', 'scrollbar pseudo-element, not a container'],
]);

/** Flatten a stylesheet into `{ selector, body }` for every top-level rule (at-rules included). */
function rules(source) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().split('\n').pop().trim();
    if (selector === '' || selector.startsWith('@')) continue;
    out.push({ selector, body: m[2] });
  }
  return out;
}

const CLIPS = /(^|;|\s)overflow(-x|-y)?\s*:\s*(auto|scroll|hidden)/;
const POSITIONED = /(^|;|\s)position\s*:\s*(relative|absolute|fixed|sticky)/;
/* `overflow:hidden` + `text-overflow:ellipsis` is the single-line truncation idiom on a text leaf
 * (a title, a label, a value), not a container: its box is bounded by the row it sits in, so
 * nothing inside it can park off-screen. Excluded by shape rather than by name so new truncating
 * labels don't have to be added to the allowlist one at a time. */
const TRUNCATES = /(^|;|\s)text-overflow\s*:/;

test('every clipping container is a containing block for its own out-of-flow content', () => {
  const offenders = [];
  for (const { selector, body } of rules(css)) {
    if (!CLIPS.test(body)) continue;
    if (POSITIONED.test(body)) continue;
    if (TRUNCATES.test(body)) continue;
    if (CONTAINED_BY_ANCESTOR.has(selector)) continue;
    offenders.push(selector);
  }
  assert.deepEqual(
    offenders,
    [],
    'These rules clip but are not positioned, so absolutely positioned content inside them '
      + '(.fdy-visually-hidden above all) escapes to the initial containing block and can scroll '
      + 'the page. Add `position:relative`, or add the selector to CONTAINED_BY_ANCESTOR with the '
      + 'ancestor that already contains it.',
  );
});

test('the containers the escape was measured on keep their position', () => {
  /* Named individually so a "cleanup" that drops one is caught even if the sweep above is
   * loosened. Each was measured in real Chrome: page escape before -> 0 after. */
  for (const selector of [
    '.fdy-table-scroll',
    '.fdy-table-wrap',
    '.fdy-list',
    '.fdy-card',
    '.fdy-tabs__list',
    '.fdy-carousel__viewport',
    '.fdy-accordion',
  ]) {
    const rule = rules(css).find(r => r.selector === selector);
    assert.ok(rule !== undefined, `${selector} has no rule at all`);
    assert.match(rule.body, POSITIONED, `${selector} must stay positioned`);
  }
});

test('the native spin buttons stay hidden on .fdy-input[type="number"] (#44)', () => {
  /* A themed field with the user agent's own spin buttons inside it is the one unthemed control on
   * the page — OS widget colours no stylesheet reaches. Both halves are load-bearing and neither is
   * visible in a code review: `appearance` is the Firefox path, the pseudo-elements the Blink/WebKit
   * one, and dropping either brings the artefact back on that engine only.
   *
   * Deliberately NOT extended to `type="search"` or `type="date"`: their native widgets are the only
   * way to clear the field / open the picker, so hiding them removes function rather than chrome.
   * COMPONENTS.md states that split — if this test ever grows a search clause, that decision changed. */
  const number = rules(css).filter(r => r.selector.includes('.fdy-input[type="number"]'));
  assert.ok(number.length >= 2, `expected the appearance rule and the spin-button rule, got ${number.length}`);
  assert.ok(number.some(r => /appearance:\s*textfield/.test(r.body)), 'the Firefox half (appearance:textfield) is gone');
  const pseudo = number.find(r => r.selector.includes('-webkit-inner-spin-button'));
  assert.ok(pseudo !== undefined, 'the ::-webkit-inner-spin-button rule is gone');
  assert.match(pseudo.body, /appearance:\s*none/, 'the WebKit half must neutralise the pseudo-element');
  assert.ok(pseudo.selector.includes('-webkit-outer-spin-button'), 'the outer spin button is neutralised too');
});

test('.fdy-visually-hidden still documents why the containers carry it', () => {
  /* The fix is spread across seven files; the explanation lives in exactly one place. If the
   * comment goes, the next reader deletes a `position:relative` that looks decorative. */
  assert.match(base, /containing block/i);
  assert.match(base, /\.fdy-visually-hidden\s*\{[^}]*position:\s*absolute/);
});
