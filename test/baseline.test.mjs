import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* The support floor, enforced against the CSS the kit ships.
 *
 * 3.9.0 to 3.9.4 went out in one day, and four of those five releases patched the same class of
 * defect: something that misbehaves in Safari only, found on an iPhone 7 by the person using the
 * kit, one at a time, after the release. The suite could not have caught any of them. It runs in
 * Chrome through CDP, and the floor in the README was prose that nothing read.
 *
 * So this file reads the floor OUT of the README and enumerates what the stylesheets ask for
 * against the version each feature needs. It is a static gate rather than a browser: it answers
 * "does the kit use something a browser inside its own stated floor does not have", which is the
 * question that went unanswered four times in a day.
 *
 * The floor is parsed from README.md and never retyped here, so the prose and the gate cannot
 * drift. The repo already holds that rule for token values in prose, and a floor is the same kind
 * of claim: a promise to a consumer that no code checked.
 *
 * A feature past the floor has three honest ways out, and the gate recognises all three: fenced
 * behind @supports so a working path exists below it, paired with a prefixed twin that reaches
 * further back, or listed in ALLOWED with the degradation written out. An entry in ALLOWED with no
 * reason, or with a reason for a feature that is no longer over the floor, fails here. A list of
 * forgiven features that grows without reasons is a guard that has stopped guarding, which is how
 * two of those four defects reached a release.
 *
 * SINCE on each row is the first stable release of each engine that shipped the feature, from
 * caniuse and MDN. Those numbers are data and live here, once. */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/* Both shipped stylesheets: freeday.css is base + components, the bundle is that with the tokens
   in front of it. A consumer imports one or the other, so both get enumerated. */
const SHEETS = ['dist/freeday.css', 'dist/freeday.bundle.css'];
const AXES = ['chrome', 'safari', 'firefox'];
const ENGINE = { chrome: 'Chrome', safari: 'Safari', firefox: 'Firefox' };

/* The one sentence in the README that states the floor. Keep the shape if you reword around it:
   three engines, a version each, separated by a middle dot, in bold. */
const FLOOR_LINE = /\*\*Chrome (\d+(?:\.\d+)?) · Safari (\d+(?:\.\d+)?) · Firefox (\d+(?:\.\d+)?)\.\*\*/g;

function floorIn(file) {
  const hits = [...read(file).matchAll(FLOOR_LINE)];
  assert.equal(hits.length, 1,
    `${file} must state the support floor exactly once, written `
    + '`**Chrome <version> · Safari <version> · Firefox <version>.**`, '
    + `and ${hits.length} lines in it match that shape. The gate reads the floor from there; `
    + 'it is not retyped in test/baseline.test.mjs.');
  const [, chrome, safari, firefox] = hits[0];
  return { chrome, safari, firefox };
}

/** `null` means no stable release has it yet, which is above every floor. */
const parts = (v) => (v === null ? [Infinity] : v.split('.').map(Number));

/** Is `need` a later release than `floor`? `16.0` is later than `15.4`, `15.4` is not later than itself. */
function past(need, floor) {
  const a = parts(need);
  const b = parts(floor);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

const uncommented = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every @supports block whose condition mentions `probe`, removed whole.
 *
 *  A declaration inside one states the condition it needs, so it makes no claim about the floor.
 *  The `not` form goes too, because that block IS the fallback and the feature is not in it. */
function withoutFence(css, probe) {
  if (probe === undefined) return css;
  let out = '';
  let i = 0;
  for (;;) {
    const at = css.indexOf('@supports', i);
    if (at === -1) return out + css.slice(i);
    const open = css.indexOf('{', at);
    if (open === -1) return out + css.slice(i);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    out += css.slice(i, at);
    if (!css.slice(at, open).includes(probe)) out += css.slice(at, j);
    i = j;
  }
}

/** selector + declarations for every rule that is not itself a wrapper. An at-rule's block holds
 *  braces, so the non-greedy body skips past it and reaches the rules inside. */
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(m => ({ selector: m[1].trim(), body: m[2] }));

/* ---------------------------------------------------------------------------
 * THE TABLE.
 *
 * `used: true` means the kit ships the feature today, and the gate asserts the probe still finds
 * it: a probe that matches nothing is a guard that guards nothing. The rest are tripwires for
 * features nobody has reached for yet, and the gate asserts they are still absent, so the day one
 * arrives it arrives through this file.
 *
 * `fence` is the string an @supports condition has to mention for a usage to count as fenced.
 * `twin` is a prefixed property that has to sit beside the standard one in the same rule.
 * ------------------------------------------------------------------------- */
const FEATURES = [
  // What sets the floor today.
  { name: ':has()', used: true, probe: /:has\(/g, since: { chrome: '105', safari: '15.4', firefox: '121' } },
  { name: '::backdrop', used: true, probe: /::backdrop/g, since: { chrome: '37', safari: '15.4', firefox: '47' } },
  { name: 'accent-color', used: true, probe: /accent-color\s*:/g, since: { chrome: '93', safari: '15.4', firefox: '92' } },
  { name: ':focus-visible', used: true, probe: /:focus-visible/g, since: { chrome: '86', safari: '15.4', firefox: '85' } },
  { name: 'scroll-behavior', used: true, probe: /scroll-behavior\s*:/g, since: { chrome: '61', safari: '15.4', firefox: '36' } },
  { name: 'appearance', used: true, probe: /(?<!-)appearance\s*:/g, since: { chrome: '84', safari: '15.4', firefox: '80' } },

  // Past the floor. Each one is fenced, paired, or in ALLOWED with its degradation.
  { name: '@container', used: true, probe: /@container[\s(]/g, fence: 'container-type', since: { chrome: '105', safari: '16.0', firefox: '110' } },
  { name: 'container-type', used: true, probe: /container-type\s*:/g, fence: 'container-type', since: { chrome: '105', safari: '16.0', firefox: '110' } },
  { name: 'container (shorthand)', used: true, probe: /[;{]\s*container\s*:/g, fence: 'container-type', since: { chrome: '105', safari: '16.0', firefox: '110' } },
  { name: 'overscroll-behavior', used: true, probe: /overscroll-behavior[\w-]*\s*:/g, since: { chrome: '63', safari: '16.0', firefox: '59' } },
  { name: 'text-wrap', used: true, probe: /text-wrap\s*:/g, since: { chrome: '114', safari: '17.5', firefox: '121' } },
  { name: '@starting-style', used: true, probe: /@starting-style/g, since: { chrome: '117', safari: '17.5', firefox: '129' } },
  { name: 'transition-behavior (allow-discrete)', used: true, probe: /allow-discrete/g, since: { chrome: '117', safari: '17.4', firefox: '129' } },
  { name: 'scrollbar-width', used: true, probe: /scrollbar-width\s*:/g, since: { chrome: '121', safari: '18.2', firefox: '64' } },
  { name: 'dvh / svh / lvh', used: true, probe: /\d(dvh|dvw|svh|svw|lvh|lvw)\b/g, since: { chrome: '108', safari: '15.4', firefox: '101' } },
  { name: 'backdrop-filter', used: true, probe: /(?<!-)backdrop-filter\s*:/g, twin: '-webkit-backdrop-filter', since: { chrome: '76', safari: '18.0', firefox: '103' } },
  { name: 'user-select', used: true, probe: /(?<!-)user-select\s*:/g, twin: '-webkit-user-select', since: { chrome: '54', safari: '17.0', firefox: '69' } },

  // Comfortably below the floor. Enumerated so the audit is a table a test reads, not a grep
  // somebody ran once.
  { name: 'inset (shorthand)', used: true, probe: /[;{]\s*inset\s*:/g, since: { chrome: '87', safari: '14.1', firefox: '66' } },
  { name: ':is()', used: true, probe: /:is\(/g, since: { chrome: '88', safari: '14.0', firefox: '78' } },
  { name: ':where()', used: true, probe: /:where\(/g, since: { chrome: '88', safari: '14.0', firefox: '78' } },
  { name: ':focus-within', used: true, probe: /:focus-within/g, since: { chrome: '60', safari: '10.1', firefox: '52' } },
  { name: 'clamp()', used: true, probe: /\bclamp\(/g, since: { chrome: '79', safari: '13.1', firefox: '75' } },
  { name: 'min() / max()', used: true, probe: /\b(min|max)\(/g, since: { chrome: '79', safari: '13.1', firefox: '75' } },
  { name: 'aspect-ratio', used: true, probe: /aspect-ratio\s*:/g, since: { chrome: '88', safari: '15.0', firefox: '89' } },
  { name: 'gap (flexbox)', used: true, probe: /[;{]\s*(column-|row-)?gap\s*:/g, since: { chrome: '84', safari: '14.1', firefox: '63' } },
  { name: 'position:sticky', used: true, probe: /position\s*:\s*sticky/g, since: { chrome: '56', safari: '13.0', firefox: '59' } },
  { name: 'scroll-snap', used: true, probe: /scroll-snap-[\w-]*\s*:/g, since: { chrome: '69', safari: '11.0', firefox: '68' } },
  { name: 'prefers-reduced-motion', used: true, probe: /prefers-reduced-motion/g, since: { chrome: '74', safari: '10.1', firefox: '63' } },
  { name: 'prefers-color-scheme', used: true, probe: /prefers-color-scheme/g, since: { chrome: '76', safari: '12.1', firefox: '67' } },
  { name: '@supports', used: true, probe: /@supports/g, since: { chrome: '28', safari: '9.0', firefox: '22' } },

  /* Tripwires. Nothing ships these yet, and each is a short reach from something the kit already
     does, so the next person to reach for one meets this file first. color-mix() is deliberately
     absent: test/color-mix.test.mjs owns it, with the measurement of why. */
  { name: 'subgrid', used: false, probe: /\bsubgrid\b/g, since: { chrome: '117', safari: '16.0', firefox: '71' } },
  { name: 'popover', used: false, probe: /:popover-open|\[popover/g, since: { chrome: '114', safari: '17.0', firefox: '125' } },
  { name: '@property', used: false, probe: /@property[\s(]/g, since: { chrome: '85', safari: '16.4', firefox: '128' } },
  { name: '@layer', used: false, probe: /@layer[\s{]/g, since: { chrome: '99', safari: '15.4', firefox: '97' } },
  { name: 'nesting (&)', used: false, probe: /&/g, since: { chrome: '120', safari: '17.2', firefox: '117' } },
  { name: 'light-dark()', used: false, probe: /light-dark\(/g, since: { chrome: '123', safari: '17.5', firefox: '120' } },
  { name: ':user-invalid', used: false, probe: /:user-(in)?valid/g, since: { chrome: '119', safari: '16.5', firefox: '88' } },
  { name: 'content-visibility', used: false, probe: /content-visibility\s*:/g, since: { chrome: '85', safari: '18.0', firefox: '125' } },
  { name: 'scrollbar-gutter', used: false, probe: /scrollbar-gutter\s*:/g, since: { chrome: '94', safari: '18.2', firefox: '97' } },
  { name: 'oklch() / lab()', used: false, probe: /\b(oklch|oklab|lch|lab)\(/g, since: { chrome: '111', safari: '15.4', firefox: '113' } },
  { name: 'view transitions', used: false, probe: /@view-transition|view-transition-name/g, since: { chrome: '111', safari: '18.2', firefox: null } },
];

/* ---------------------------------------------------------------------------
 * THE EXCEPTIONS.
 *
 * One entry per feature the kit ships past its own floor without a fence or a twin. The reason is
 * the entry: it says what a browser below the floor loses, and why there is no fence or fallback
 * worth shipping. The test below refuses an entry whose reason is thin, and refuses one whose
 * feature is no longer over the floor, so the list cannot outlive what it excuses.
 * ------------------------------------------------------------------------- */
const ALLOWED = new Map([
  ['text-wrap', `
    Two heading classes ask for \`balance\`. The value is a plain keyword, so a browser that does
    not know it rejects the declaration at parse time and the heading wraps the way headings
    wrapped before the property existed: same font, same size, same box, a last line that can hold
    one word. Nothing moves except where the lines break. @supports would buy nothing here, because
    there is no second way to balance a heading in CSS, and the only substitute below the floor is a
    hand-placed line break inside the consumer's own copy.`],

  ['overscroll-behavior', `
    The scrolling nav and the two sticky page rails set \`contain\` so a scroll that reaches the end
    of the panel stops there instead of carrying on into the page behind it. Below the floor the
    declaration drops and the scroll chains, which is the behaviour the property was added to stop.
    The panel still scrolls, the page still scrolls, nothing is unreachable and no layout moves, so
    what is lost is the stopping point.
    There is no CSS answer below Safari 16. The pre-2022 fix is a scroll lock on the document in JS,
    which this shell deliberately does not do (see the header of src/components/app-shell.css: the
    page scrolls, the sidebar is sticky, nothing is height-trapped) and which would be a behaviour
    change shipped onto the one engine this repo cannot run. Dragging the scrim chains in every
    browser, above the floor included, so the lock was never complete there either. The scrim is
    where a real fix would start, and NEXT-UP.md carries it with the measurement it needs.`],

  ['@starting-style', `
    The entry half of the modal and drawer animations. A browser that does not know the at-rule
    skips the whole block, and the dialog then appears already at its open state with no fade or
    rise. Nothing is left stuck mid-transition, because the open state is declared unconditionally
    and @starting-style only supplies the state to come FROM. This is the one feature in the table
    that is an enhancement by construction: fencing an at-rule that is already skipped when unknown
    would add a condition and change nothing.`],

  ['transition-behavior (allow-discrete)', `
    Four \`transition\` shorthands list \`overlay\` and \`display\` with \`allow-discrete\`, which is
    what keeps a native dialog painted through its exit. A shorthand carrying a keyword the browser
    does not know is invalid at parse time, so below the floor the whole declaration drops and the
    modal and drawer open and close with no animation at all. That is the same outcome
    prefers-reduced-motion asks for and the kit already ships for it, and the end states are
    declared without the transition, so nothing is half-open.
    Splitting the shorthand into longhands would keep the transform half alive below the floor, at
    the price of four declarations that have to stay in step with each other. It is written down in
    NEXT-UP.md instead of guessed at here.`],

  ['scrollbar-width', `
    One rule hides the scrollbar of the carousel track. The rule below it does the same job through
    \`::-webkit-scrollbar{display:none}\` (src/components/carousel.css), which is how every WebKit
    inside the floor hides it, so the standard property is the path for Firefox and recent Chrome
    and the pseudo-element is the path for older Safari. Below both, a native scrollbar shows over
    the slides and the carousel still snaps, scrolls and answers its arrows.`],

  ['dvh / svh / lvh', `
    Three sites, and the only engine inside the floor that lacks the unit is Chrome 105 to 107:
    Safari has it at 15.4, which is the floor itself, and Firefox at 101.
    Two of the three are the off-canvas sidebar, which also sets top:0 and bottom:0, so its height
    is already determined and the dropped declaration changes nothing there. The third caps the
    sticky page rails on screens from 960px, and without it the cap is gone and a long aside grows
    past the viewport instead of scrolling inside itself.
    A \`vh\` line above it would be dead code, which this repo has measured once already: the
    declaration carries var(), so it is held as tokens at parse time and only fails at
    computed-value time, and that path drops the property to its INITIAL value rather than to the
    line above (test/color-mix.test.mjs). A fence is the only working shape, and two @supports
    blocks for three Chrome releases from 2022 on an auto-updating browser is not a trade this kit
    makes. Reconsider it the day the floor moves.`],
]);

const MIN_REASON = 160;

/** How many times the feature shows up in `css` at all, fenced or not. */
const present = (feature, css) => [...css.matchAll(feature.probe)].length;

/** The same count with the feature's own @supports fences removed, which is what the floor asks
 *  about: a usage inside a fence already states the condition it needs. */
const uses = (feature, css) => [...withoutFence(css, feature.fence).matchAll(feature.probe)].length;

test('both READMEs state the same support floor, in the shape the gate reads', () => {
  const en = floorIn('README.md');
  const id = floorIn('README.id.md');
  assert.deepEqual(id, en,
    'README.id.md promises a different floor than README.md. Whichever is wrong, the two are read '
    + 'by the same consumers and one of them is making a promise the kit does not keep.');
  for (const axis of AXES) assert.match(en[axis], /^\d+(\.\d+)?$/);
});

test('the table still describes the CSS the kit ships', () => {
  const css = uncommented(read('dist/freeday.bundle.css'));
  const wrong = [];
  const names = FEATURES.map(f => f.name);
  assert.deepEqual([...new Set(names)], names, 'two rows in FEATURES carry the same name');

  for (const f of FEATURES) {
    const n = present(f, css);
    if (f.used === true && n === 0) {
      wrong.push(`${f.name}: the table says the kit uses it, and the probe ${f.probe} finds nothing. `
        + 'Either the feature is gone, in which case set used:false and keep the row as a tripwire, '
        + 'or the probe has rotted and guards nothing.');
    }
    if (f.used === false && n > 0) {
      wrong.push(`${f.name}: the table carries it as a tripwire, and it is now in the CSS ${n} time(s). `
        + 'Set used:true, and answer the floor test if it lands past the floor.');
    }
  }
  assert.deepEqual(wrong, [], wrong.join('\n\n'));
});

test('no CSS the kit ships reaches past the support floor the README states', () => {
  const floor = floorIn('README.md');
  const stated = AXES.map(a => `${ENGINE[a]} ${floor[a]}`).join(' / ');
  const over = [];

  for (const file of SHEETS) {
    const css = uncommented(read(file));
    for (const f of FEATURES) {
      if (f.twin !== undefined) continue; // the prefixed-twin test below owns these
      const n = uses(f, css);
      if (n === 0) continue;
      const axes = AXES.filter(a => past(f.since[a], floor[a]));
      if (axes.length === 0) continue;
      if (ALLOWED.has(f.name)) continue;
      const needs = axes.map(a => `${ENGINE[a]} ${f.since[a] ?? 'no release yet'}`).join(' / ');
      over.push(`${file}: \`${f.name}\` used ${n} time(s), needs ${needs}; the floor is ${stated}.`);
    }
  }

  assert.deepEqual(over, [],
    'Fence it with @supports so a path exists below the floor, fall back to something close enough, '
    + 'or raise the floor in README.md and say in that section what stops being supported. Listing '
    + 'it in ALLOWED is the fourth way, and it costs a written reason:\n\n' + over.join('\n'));
});

test('every exception carries a reason, and every reason is still earning its place', () => {
  const floor = floorIn('README.md');
  const css = uncommented(read('dist/freeday.bundle.css'));
  const complaints = [];

  for (const [name, reason] of ALLOWED) {
    const f = FEATURES.find(x => x.name === name);
    if (f === undefined) {
      complaints.push(`ALLOWED excuses \`${name}\`, which is not a row in FEATURES. A forgiven `
        + 'feature nothing enumerates is forgiven twice over.');
      continue;
    }
    const text = reason.trim();
    if (text.length < MIN_REASON) {
      complaints.push(`ALLOWED["${name}"] carries ${text.length} characters of reason. Say what a `
        + `browser below the floor loses and why there is no fence or fallback worth shipping; `
        + `${MIN_REASON} characters is the shortest that has ever managed both.`);
    }
    const n = uses(f, css);
    const axes = AXES.filter(a => past(f.since[a], floor[a]));
    if (n === 0 || axes.length === 0) {
      complaints.push(`ALLOWED["${name}"] excuses something that needs no excuse: `
        + `${n} use(s) in the shipped CSS, and ${axes.length === 0 ? 'the floor now covers it' : 'it is not used'}. `
        + 'Delete the entry. An exception that outlives its feature is how the list stops being read.');
    }
  }

  assert.deepEqual(complaints, [], complaints.join('\n\n'));
});

test('a property the floor cannot reach ships beside its prefixed twin', () => {
  const unpaired = [];
  for (const f of FEATURES.filter(x => x.twin !== undefined)) {
    for (const file of SHEETS) {
      for (const rule of rules(uncommented(read(file)))) {
        if ([...rule.body.matchAll(f.probe)].length === 0) continue;
        if (rule.body.includes(`${f.twin}:`)) continue;
        unpaired.push(`${file}: \`${rule.selector}\` declares \`${f.name}\` with no \`${f.twin}\` `
          + `beside it, and ${f.name} alone needs Safari ${f.since.safari}.`);
      }
    }
  }
  assert.deepEqual(unpaired, [],
    'The twin is what carries these back past the floor, so the standard property is never alone:\n'
    + unpaired.join('\n'));
});

/* The one place in the kit where a declaration block is written twice, on purpose: CSS cannot share
   a block between a container query and the media query that stands in for it below the floor. Two
   copies drift, so they are compared here. */
test('the narrow CFL layout reads the same under the container query and under its fallback', () => {
  const css = read('src/components/cfl.css');
  const body = (header) => {
    const at = css.indexOf(header);
    assert.notEqual(at, -1, `src/components/cfl.css no longer contains \`${header}\``);
    let depth = 1;
    let i = at + header.length;
    const from = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    return uncommented(css.slice(from, i - 1)).replace(/\s+/g, ' ').trim();
  };

  assert.equal(
    body('@container fdy-cfl (max-width: 30rem){'),
    body('@media (max-width:32rem){'),
    'The container query and the @supports-not fallback in src/components/cfl.css have to declare '
    + 'the same stacked layout. They are a copy of each other, because no CSS construct shares one '
    + 'block between two conditions, and an edit that reached one of them missed the other.');
});
