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

test('.fdy-btn--stretch keeps its overlay anchored to the card (#007)', () => {
  /* The overlay is only half the pattern. `.fdy-btn` nudges itself with a transform on :hover and
   * :active, and a transformed element becomes the containing block for its own absolutely
   * positioned descendants — so the overlay silently re-anchors from the card to the button's own
   * box mid-gesture, and the click lands on a common ancestor instead of the button. Neutralising
   * BOTH states is load-bearing: --text/--ghost break on press, the default and --danger fills
   * break one step earlier, on hover. */
  const overlay = rules(css).find(r => r.selector === '.fdy-btn--stretch::after');
  assert.ok(overlay !== undefined, 'the stretched hit area (::after) is gone');
  assert.match(overlay.body, /position:\s*absolute/, 'the overlay must be out of flow');
  assert.match(overlay.body, /inset:\s*0/, 'the overlay must fill its containing block');

  const neutralised = rules(css).find(r => /\.fdy-btn--stretch:hover/.test(r.selector) && /:active/.test(r.selector));
  assert.ok(neutralised !== undefined, 'both :hover and :active must neutralise the transform in one rule');
  assert.match(neutralised.body, /transform:\s*none/, 'the nudge must be off, or the overlay re-anchors mid-gesture');

  /* Forgetting to raise the escape hatch fails silently, so the kit does it rather than documenting it.
   * The host list is `:is(.fdy-card,.fdy-list__row)` — see the row anchor assert below. */
  const raised = rules(css).find(r => /^:is\(\.fdy-card,\.fdy-list__row\):has\(\.fdy-btn--stretch\)/.test(r.selector));
  assert.ok(raised !== undefined, 'focusable controls in the card must be raised above the overlay');
  assert.match(raised.body, /z-index:\s*1/);

  /* ...but `position` must stay a DEFAULT. Merged into the rule above it outweighs the app's own
   * single-class rule and drags an absolutely positioned corner control back into the flow —
   * measured. :where() weighs nothing, so any app rule wins. Splitting these is the fix. */
  assert.doesNotMatch(raised.body, /position:/, 'position must NOT ride along at this specificity');
  const positioned = rules(css).find(r => r.selector.startsWith(':where(') && r.selector.includes('.fdy-btn--stretch'));
  assert.ok(positioned !== undefined, 'the position default must be wrapped in :where()');
  assert.match(positioned.body, /position:\s*relative/);

  /* A list row must anchor the overlay itself (#008 §1). Without this rule the overlay resolves
   * against .fdy-list, every row's target covers the whole list, and the last one in the DOM wins —
   * a click on row one opens row two. Opt-in via :has() so plain rows are untouched. */
  const rowAnchor = rules(css).find(r => r.selector === '.fdy-list__row:has(.fdy-btn--stretch)');
  assert.ok(rowAnchor !== undefined, 'a row hosting a stretched target has no anchor of its own');
  assert.match(rowAnchor.body, /position:\s*relative/);
  assert.ok(!/^\.fdy-list__row\s*\{/m.test(css.slice(css.indexOf('.fdy-list__row:has'))) ||
    !/position:\s*relative/.test(rules(css).find(r => r.selector === '.fdy-list__row').body),
    'plain rows must NOT be positioned — that would newly contain anything an app pinned inside one');
});

test('menu focus is distinguishable from hover (#001 §6)', () => {
  /* freeday-menu.js moves REAL DOM focus with .focus(), so :focus-visible is the only thing a
   * keyboard user has. It used to be the hover fill and nothing else — arrowing through a menu was
   * invisible, and hover and focus were identical to everyone. Reported by two different apps before
   * it was fixed, so it is worth a gate: whatever focus renders, it must not be only what hover does. */
  const all = rules(css);
  const hover = all.find(r => r.selector.includes('.fdy-menu__item:hover'));
  const focus = all.find(r => r.selector === '.fdy-menu__item:focus-visible');
  assert.ok(hover !== undefined && focus !== undefined, 'the menu item lost a state rule');
  const extra = focus.body.replace(/outline:\s*none;?/, '').trim();
  assert.notEqual(extra, hover.body.trim(), 'focus must render as more than the hover fill');
  assert.match(focus.body, /box-shadow:/, 'focus needs a ring of its own (same one .fdy-nav__item uses)');
});

test('the required marker never reaches the accessibility tree (#001 §2)', () => {
  /* The control already carries `required`; the asterisk is decoration. CSS alt text (`content:"*" / ""`)
   * paints the glyph while exposing nothing — drop the `/ ""` and every screen reader starts reading
   * "star" after the label. */
  const rule = rules(css).find(r => r.selector === '.fdy-label--required::after');
  assert.ok(rule !== undefined, '.fdy-label--required::after is gone');
  assert.match(rule.body, /content:\s*"\*"\s*\/\s*""/, 'the alt-text half of `content` is what makes this accessible');
});

test('inline state text uses the inks the contrast gate covers (#001 §5)', () => {
  /* contrast.test.mjs asserts TOKENS, not the classes that spend them, so a class quietly switched
   * from `-strong` to the base ink would keep the suite green while dropping below AA on a plain
   * surface. This is the seam between the two tests. */
  for (const [selector, token] of [
    ['.fdy-text-success', '--color-success-strong'],
    ['.fdy-text-warning', '--color-warning-strong'],
    ['.fdy-text-danger', '--color-danger-strong'],
  ]) {
    const rule = rules(css).find(r => r.selector === selector);
    assert.ok(rule !== undefined, `${selector} is gone`);
    assert.match(rule.body, new RegExp(`color:\\s*var\\(${token}\\)`),
      `${selector} must use ${token} — the ink contrast.test.mjs proves readable on plain surfaces`);
  }
});

/* Any rule that TYPESETS (sets a font-size) is rendering prose, and prose needs a text ink.
 * --color-text-subtle is gated at 3.0 on purpose — placeholders, separators, decorative glyphs —
 * and measures 4.41:1 on surface-2, under AA for text. Two components shipped with it on type
 * before this generalised: .fdy-stat__label (fixed 1.30.0) and .fdy-eyebrow + .fdy-nav__grouplabel
 * (found by axe in a consuming app, one release later). Shape, not a name list, so the third one
 * cannot arrive the same way. */
const SUBTLE_ON_TYPE_OK = new Map([
  ['.fdy-text-subtle', 'the utility IS the decorative role — naming it is opting in'],
  ['.fdy-cal__day.is-outside', 'a date from the adjacent month, repeated in that month\'s own view; paired with opacity as de-emphasis, not as the only copy of the information'],
]);

test('nothing typesets prose in the decorative ink (#007)', () => {
  const offenders = [];
  for (const { selector, body } of rules(css)) {
    if (!/color:\s*var\(--color-text-subtle\)/.test(body)) continue;
    if (!/font-size:/.test(body)) continue;              // sets type -> it is prose
    if (SUBTLE_ON_TYPE_OK.has(selector)) continue;
    offenders.push(selector);
  }
  assert.deepEqual(offenders, [],
    'These rules set a font-size AND spend --color-text-subtle, which is gated at 3.0 (non-text). '
      + 'Use --color-text-muted (gated 4.5), or add the selector to SUBTLE_ON_TYPE_OK with the reason '
      + 'its text is decorative.');
});

test('a stat label spends a TEXT ink, not the decorative one (#006 §6)', () => {
  /* --color-text-subtle is gated at 3.0 by design — placeholders, dividers, decorative glyphs. A stat
   * label is text, and often the only thing naming the number above it; on surface-2 -subtle measures
   * 4.41, under AA. The token gate cannot see this: both inks pass their OWN thresholds, so the defect
   * only exists in the pairing of class and token. */
  const rule = rules(css).find(r => r.selector === '.fdy-stat__label');
  assert.ok(rule !== undefined, '.fdy-stat__label is gone');
  assert.match(rule.body, /color:\s*var\(--color-text-muted\)/,
    'a label is text: use --color-text-muted (gated 4.5), not --color-text-subtle (gated 3.0)');
});

test('.fdy-icon has a display that accepts a width (#001 §4)', () => {
  /* Measured: as a bare inline element the box ignored width:1em entirely and rendered 936px wide —
   * `width` does not apply to non-replaced inline boxes. */
  const rule = rules(css).find(r => r.selector === '.fdy-icon');
  assert.ok(rule !== undefined, '.fdy-icon is gone');
  assert.match(rule.body, /width:\s*1em/);
  assert.match(rule.body, /display:\s*inline-block|display:\s*inline-flex/, 'without this the width is ignored');
});

test('.fdy-visually-hidden still documents why the containers carry it', () => {
  /* The fix is spread across seven files; the explanation lives in exactly one place. If the
   * comment goes, the next reader deletes a `position:relative` that looks decorative. */
  assert.match(base, /containing block/i);
  assert.match(base, /\.fdy-visually-hidden\s*\{[^}]*position:\s*absolute/);
});

test('a class the kit puts on a <p> zeroes the UA margin (#010)', () => {
  /* `<p>` carries a 1em margin from the user agent, and a class that does not clear it inherits
   * spacing nobody wrote. `.fdy-eyebrow` shipped without one: 12px above it and 12px below, which
   * read as 44px of page padding at the top of every screen against 32px at the sides, and as a gap
   * between the eyebrow and the title half again what the flex `gap` declared. Reported by a
   * consuming app as two separate spacing complaints; they were one missing declaration.
   *
   * The list comes from the DOCS — the classes the kit itself demonstrates on a paragraph — so a new
   * one is covered by documenting it, which is the step nobody skips. */
  const docs =
    readFileSync(join(root, 'COMPONENTS.md'), 'utf8') +
    readFileSync(join(root, 'docs', 'reference-screen.html'), 'utf8');
  const onParagraphs = [...new Set([...docs.matchAll(/<p class="([^"]*)"/g)]
    .flatMap(m => m[1].split(/\s+/))
    .filter(c => c.startsWith('fdy-')))];
  assert.ok(onParagraphs.length >= 3, `expected the docs to show several <p> classes, found ${onParagraphs.length}`);

  const missing = onParagraphs.filter(cls => {
    const rule = rules(css).find(r => r.selector === `.${cls}`);
    return rule !== undefined && !/(^|;)\s*margin[:-]/.test(rule.body);
  });
  assert.deepEqual(missing, [], `these are documented on a <p> and never clear its UA margin: ${missing.join(', ')}`);
});

test('a title class renders the same whatever element carries it (#011)', () => {
  /* #010 was the same defect one element over: a class that does not clear the UA's `margin`
   * inherits spacing nobody wrote. That guard scans the classes the docs show on a `<p>`, which is
   * why it could not see this one — `.fdy-list__title` is documented on a `<span>`, and the app put
   * it on an `<h3>`, because a row title IS a heading and the document outline is the APP's call to
   * make, not the kit's. An `<h3>` brings three UA declarations, not one: `font-size:1.17em`,
   * `font-weight:bold` and a block margin. The title rendered a size and a weight the kit never
   * chose, in ten places.
   *
   * So the invariant is not "clear the margin" — it is that a class whose job is to NAME something
   * must be element-independent, because the kit does not own the element. It has to state its own
   * size, weight and margin rather than inherit whichever the app's semantics dropped on it.
   *
   * Scoped to title roles ON PURPOSE. Asserted over every class that sets type, it fails 53 times
   * on things no app puts on a heading (`.fdy-btn--sm`, `.fdy-avatar--xs`, `.fdy-mono`) and the
   * guard becomes noise somebody silences. A `__title` suffix is the kit's own word for "this names
   * the thing", so a new one is covered by being named like its siblings. */
  const TITLE_ROLE = /^\.fdy-[a-z0-9_-]*title$/;
  const SETS_TYPE = /(^|;)\s*font-(family|size|weight)\s*:/;
  /* A flex/grid box named `__heading` is the STACK around a title (eyebrow + h1), not the title. */
  const IS_CONTAINER = /(^|;)\s*display\s*:\s*(inline-)?(flex|grid)/;

  const titles = rules(css).filter(r => TITLE_ROLE.test(r.selector) && SETS_TYPE.test(r.body) && !IS_CONTAINER.test(r.body));
  assert.ok(titles.length >= 10, `expected the kit to ship many title classes, found ${titles.length}`);

  const missing = titles.flatMap(r => {
    const gaps = [];
    if (!/(^|;)\s*margin[:-]/.test(r.body)) gaps.push('margin');
    if (!/(^|;)\s*font-size\s*:/.test(r.body)) gaps.push('font-size');
    if (!/(^|;)\s*font-weight\s*:/.test(r.body)) gaps.push('font-weight');
    return gaps.length ? [`${r.selector} (${gaps.join(', ')})`] : [];
  });
  assert.deepEqual(missing, [],
    `a title class must state its own type — an <h1>-<h6> would otherwise decide it: ${missing.join('; ')}`);
});

test('the month grid outranks the day grid it modifies (#010)', () => {
  /* Both classes sit on the same element and weigh the same, so SOURCE ORDER decides. Declared
   * before `.fdy-cal__grid`, the modifier lost to the base and twelve months rendered seven across —
   * with a comment directly above it describing the 3×4 layout it was failing to produce. A
   * specificity bug no reading of either rule can reveal; only their order shows it. */
  const source = readFileSync(join(root, 'src', 'components', 'datepicker.css'), 'utf8');
  const base = source.indexOf('.fdy-cal__grid{');
  const modifier = source.indexOf('.fdy-cal__grid--months{');
  assert.ok(base !== -1 && modifier !== -1, 'one of the two grid rules is gone');
  assert.ok(modifier > base,
    '.fdy-cal__grid--months must come AFTER .fdy-cal__grid — same weight, so the later one wins');
});

/* A frozen cell must keep the border that separates it from what scrolls past.
 *
 * `position:sticky` is the obvious half and the wrong half on its own. Under
 * `border-collapse:collapse` the shared border is painted by the TABLE, so it stays
 * with the scrolling content and the frozen row/column arrives with no rule at all —
 * the freeze looks like a rendering fault rather than a feature. Raised building the
 * exchange-rate matrix in IDU_EMATE_APPL_WEB. */
test('a frozen table cell keeps its own border (#012)', () => {
  const all = rules(css);

  const root = all.find(r => r.selector === '.fdy-table--sticky');
  assert.ok(root, '.fdy-table--sticky is missing');
  assert.ok(/border-collapse:\s*separate/.test(root.body),
    '.fdy-table--sticky must set border-collapse:separate — a collapsed border belongs to the table, so it scrolls out from under the cell that sticks');

  const frozen = all.filter(r => /\.fdy-table--sticky/.test(r.selector) && /position:\s*sticky/.test(r.body));
  assert.ok(frozen.some(r => /(^|;)\s*top:/.test(r.body)), 'nothing freezes the header row');
  assert.ok(frozen.some(r => /(^|;)\s*left:/.test(r.body)), 'nothing freezes the row header');

  /* Anything frozen sideways slides OVER the data cells, so it must paint an opaque
     background — inheriting one is not enough, the cells beneath show through. */
  for (const rule of frozen) {
    if (!/(^|;)\s*left:/.test(rule.body)) continue;
    const paints = /background(-color)?:/.test(rule.body)
      || all.some(r => r.selector === '.fdy-table th' && /background:/.test(r.body) && /\bth\b/.test(rule.selector));
    assert.ok(paints, `${rule.selector} freezes sideways without an opaque background`);
  }

  /* Sticky resolves against the nearest scrollport: without one that scrolls
     VERTICALLY, `top` never engages and the header only looks frozen until you scroll. */
  const port = all.find(r => r.selector === '.fdy-table-scroll--frozen');
  assert.ok(port && /overflow:\s*auto/.test(port.body),
    '.fdy-table-scroll--frozen must scroll both axes, or the sticky header has nothing to stick to');
});
