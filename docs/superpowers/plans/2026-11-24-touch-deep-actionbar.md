# Touch density, deep primary fill, action bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release 3.22.0: `data-density="touch"`, `data-primary-fill="deep"`, `.fdy-actionbar`, and a USAGE.md §8 "Mobile" doctrine, plus a fix for palette label ink under the OS dark setting found while planning.

**Architecture:** `touch` follows the existing `$compact` pattern (a `$touch` token value emitted under `[data-density="touch"]`, with `comfortable` resetting the union of both). `deep` is data in `tokens.json` (`$primaryFill.deep`: which semantic token points at which alias shade) emitted by a new `buildPrimaryFillCss`, with a measured `onDeep` ink per palette and dark-theme re-asserts so it is light-only. `.fdy-actionbar` is one CSS-only component file. Docs collect existing mobile rules into USAGE.md §8.

**Tech Stack:** Node 22 (`node --test`), `tokens/build.mjs` (no dependencies), W3C DTCG `tokens/tokens.json`, the CDP browser harness in `browser/` (`withPage`, `p.setViewport`, `p.setColorScheme`, `p.evalJS`, `p.waitFor`).

**Spec:** [`docs/superpowers/specs/2026-11-24-touch-deep-actionbar-design.md`](../specs/2026-11-24-touch-deep-actionbar-design.md)

## Global Constraints

- Without the new attributes, every token resolves to its 3.21.0 value in light, dark, soft and glass, under every palette and neutral. `test/token-snapshot.test.mjs` (fixture captured from 3.20.0, unchanged in 3.21.0) is the proof and must stay green throughout.
- `data-density="touch"` sets `--control-h: 2.75rem` and nothing else.
- `data-primary-fill="deep"` is light-theme only and maps exactly: `--color-primary` → `{primary.700}`, `--color-primary-hover` → `{primary.800}`, `--color-primary-active` → `{primary.800}`, `--color-primary-strong` → `{primary.800}`, `--color-primary-rgb` → `{primary.700.rgb}`, `--focus-ring` → `{primary.700}`, `--color-on-primary` → the palette's `onDeep`. Soft wash and border do not change.
- `onDeep` is `{neutral.0}` for all 18 palettes (measured 2026-11-24: white on the 700 shade clears 4.5:1 everywhere, lowest lime 4.99:1, under slate, grey and stone).
- The component is named `.fdy-actionbar`, in `src/components/actionbar.css`. CSS only: no enhancer, no Vue/React/Blazor wrapper.
- Components never use raw hex; spacing comes from `--space-*`.
- Prose through `/humanizer:humanizer`; no em or en dashes in new or changed prose; British spelling; counts of eleven and up as digits in README/USAGE/COMPONENTS/docs files. Each file keeps its language (docs/index.html, README.id.md, CHANGELOG.md, NEXT-UP.md, CLAUDE.md are Indonesian; the rest English).
- `dist/` is committed: after any change to `tokens/` or `src/`, run `npm run build` and commit `dist/` in the same commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No tag, no push, no publish in this plan.

## Deviations from the spec, decided while planning

1. **A bug fix joins B1 as Task 1.** For the 7 palettes whose label ink is dark in both themes (orange, amber, lime, green, emerald, teal, cyan), the label turns white on the 500 fill (about 2.5:1) whenever the OS is in dark mode, even with `data-theme="dark"` set. Verified in Chromium against 3.21.0: the base system-dark rule `:root:not([data-theme="light"])` (0,2,0) outranks the palette block (0,1,0), and `buildPrimariesCss` only emits dark twins when a palette's `onDark` differs from its `on`. The contrast gate never modelled the OS dark scope. Same bug class as the neutral axis's `neutralDarkKeys` fix.
2. **No new 3.21.0 fixture.** The spec asked for one; the existing 3.20.0 fixture already pins the default, and 3.21.0 changed no default value (the snapshot stayed green across that release).
3. **`--fdy-bottomnav-h` is declared on `.fdy-app--has-bottomnav`** (the shell that carries the bar), not on `:root`, following how component tokens are scoped in this kit, **and the bottom nav reads it for its own height.** Measured 2026-11-24: the nav is 61.39px while `2.75rem + 2 × space-2 + bw` is 61px, because an item's content (icon, gap, label) is 0.39px taller than its 44px `min-height`, and that excess depends on the app's font metrics. Only a nav whose height IS the token keeps the action bar from sliding under it. A browser test pins the match exactly.
4. **No extra bottom reservation for the action bar.** A `position: sticky` element keeps its place in flow, so the last row above it is never covered; the browser test proves it.

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `tokens/build.mjs` | palette dark-ink fix; `$touch`; `buildPrimaryFillCss` | 1, 2, 3 |
| `tokens/tokens.json` | `control.h.$touch`; `onDeep` on every palette; `$primaryFill` | 2, 3 |
| `test/build.test.mjs` | emission shape of touch and deep | 2, 3 |
| `test/contrast.test.mjs` | palettes under OS dark; deep in light; deep leaves dark alone | 1, 4 |
| `browser/palette-os-dark.mjs` + fixture | label ink under OS dark, real Chrome | 1 |
| `browser/control-heights.mjs` + fixture | 44px under touch, 40px in a comfortable island | 2 |
| `browser/primary-fill.mjs` + fixture | deep fill in light, unchanged in dark | 3 |
| `src/components/actionbar.css` | the component | 5 |
| `browser/actionbar.mjs` + fixture | sits above the bottom nav, never covers the last row | 5 |
| `COMPONENTS.md`, `USAGE.md`, `docs/agent-onboarding.md`, `test/docs.test.mjs` | doctrine and reference | 5, 6 |
| `docs/index.html` | playground | 7 |
| `CHANGELOG.md`, `CLAUDE.md`, `HANDOFF.md`, `NEXT-UP.md`, `package*.json`, `README*.md` stamps, spec | release | 8 |

---

### Task 1: Palette label ink under the OS dark setting

**Files:**
- Modify: `tokens/build.mjs` (`buildPrimariesCss`, the comment above it and the two `p.onDark !== p.on` conditions)
- Modify: `test/contrast.test.mjs` (new section after the palette section)
- Create: `browser/fixtures/palette-os-dark.html`, `browser/palette-os-dark.mjs`
- Modify: `package.json` (`test:browser` list), `dist/*`

**Interfaces:**
- Produces: for every palette whose `onDark` differs from the base dark ink (`color.on-primary.$dark`), `buildPrimariesCss` emits the system-dark, `[data-theme="dark"]` and `[data-theme="light"]` twins with `--color-on-primary`/`-rgb`. Task 3 relies on these blocks existing.

- [ ] **Step 1: Write the failing contrast test**

In `test/contrast.test.mjs`, directly after the palette loop (the `for (const name of PALETTES) { … }` block that defines the `WCAG contrast: palette ${name}` tests), add:

```js
/* --- palettes under the OS dark setting -----------------------------------------------------
 *
 * The suite above models [data-theme="dark"] only. Under the OS setting the base rule is
 * `:root:not([data-theme="light"])` at (0,2,0), which OUTRANKS a palette's own block (0,1,0), so a
 * palette that relied on its light-block ink in dark shipped white labels on a light fill for
 * every phone in dark mode. Spread by specificity, not source order: the palette block, then the
 * base system-dark rule that beats it, then the palette's own system-dark twin (0,3,0). */
const mediaBlock = (sel) => {
  const m = css.match(new RegExp(`\\n  ${sel.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&')} \\{([\\s\\S]*?)\\n  \\}`));
  return m === null ? {} : vars(m[1]);
};
const SYSTEM_DARK = ':root:not([data-theme="light"])';

test('the OS dark scope actually resolves', () => {
  assert.ok(Object.keys(mediaBlock(SYSTEM_DARK)).length > 20,
    `${SYSTEM_DARK} parsed ${Object.keys(mediaBlock(SYSTEM_DARK)).length} vars, the media block shape changed`);
});

for (const name of PALETTES) {
  test(`WCAG contrast: palette ${name} under the OS dark setting`, () => {
    const theme = { ...base, ...paletteScope(name, ''), ...mediaBlock(SYSTEM_DARK), ...mediaBlock(`${SYSTEM_DARK}[data-primary="${name}"]`) };
    const fails = paletteFails(theme);
    assert.deepEqual(fails, [], `palette "${name}" under the OS dark setting:\n  ` + fails.join('\n  '));
  });
}
```

`css`, `vars`, `base`, `paletteScope`, `PALETTES` and `paletteFails` are already defined above this point in the file.

- [ ] **Step 2: Run it, expect FAIL**

Run: `node --test test/contrast.test.mjs 2>&1 | grep -E "^not ok|primary button label" | head`
Expected: FAIL for orange, amber, lime, green, emerald, teal and cyan, each on `primary button label` (about 2:1 to 3:1).

- [ ] **Step 3: Fix `buildPrimariesCss`**

In `tokens/build.mjs`, inside `buildPrimariesCss`, after `const index = valueIndex(flat);` add:

```js
  /* The base dark scopes declare --color-on-primary too, and the system-dark one,
     `:root:not([data-theme="light"])` at (0,2,0), OUTRANKS this palette's own block (0,1,0). So a
     palette whose dark ink differs from the BASE dark ink restates it in its dark twins even when
     its own light and dark inks agree; otherwise every OS in dark mode shows the base ink on this
     palette's fill. */
  const baseDarkOn = tokens.color['on-primary'].$dark;
```

Then inside the `for` loop, before `const darkDecls = [`, add:

```js
    const darkInk = p.onDark !== p.on || p.onDark !== baseDarkOn;
```

and in both `darkDecls` and `backLight`, replace the condition `p.onDark !== p.on` with `darkInk` (two occurrences, one in each array).

- [ ] **Step 4: Build and run the contrast test, expect PASS**

Run: `npm run build && node --test test/contrast.test.mjs 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`.

- [ ] **Step 5: Write the browser fixture and test**

Create `browser/fixtures/palette-os-dark.html`:

```html
<!doctype html>
<html lang="en" data-primary="teal" data-theme="dark">
<head>
<meta charset="utf-8">
<title>Freeday: palette ink under the OS dark setting</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
</head>
<body>
  <button class="fdy-btn" id="btn" type="button">Simpan</button>
</body>
</html>
```

Create `browser/palette-os-dark.mjs`:

```js
/* Browser regression spec: a palette's label ink under the OS dark setting (pure CSS).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Teal's label is dark ink in both themes. Until 3.22.0 the base rule
 * `:root:not([data-theme="light"])` (0,2,0) outranked the palette block (0,1,0) whenever the OS was
 * in dark mode, explicit data-theme="dark" or not, and every teal button got a white label on a
 * light fill. Measured in a real engine because the contrast suite only models scopes it parses. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const prop = (p, name) => p.evalJS(
  `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`);

test('a dark-ink palette keeps its dark label when the OS is in dark mode', { skip }, async () => {
  await withPage(fixture('palette-os-dark.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const darkInk = await prop(p, '--neutral-950');

    await p.setColorScheme('light');
    assert.equal(await prop(p, '--color-on-primary'), darkInk, 'explicit dark, OS light: dark ink');

    await p.setColorScheme('dark');
    assert.equal(await prop(p, '--color-on-primary'), darkInk,
      'explicit dark, OS dark: the system-dark base rule must not repaint the label white');

    await p.evalJS('document.documentElement.removeAttribute("data-theme")');
    assert.equal(await prop(p, '--color-on-primary'), darkInk, 'no data-theme, OS dark: dark ink');
  });
});
```

In `package.json`, in the `test:browser` script, insert `browser/palette-os-dark.mjs ` directly after `browser/axis-nesting.mjs `.

- [ ] **Step 6: Run the browser test**

Run: `node --test browser/palette-os-dark.mjs`
Expected: PASS. If it reports skipped, set `CHROME_BIN` to the binary under `~/.cache/puppeteer/chrome-headless-shell/<version>/chrome-headless-shell-<platform>/` and rerun; a skip does not count. To prove it catches the bug, temporarily revert Step 3, `npm run build`, rerun and see the second assertion fail, then restore and rebuild.

- [ ] **Step 7: Full suite and commit**

Run: `npm test` (expect all pass; `test/token-snapshot.test.mjs` stays green because it models `[data-theme="dark"]`, where these palettes already resolved correctly).

```bash
git add tokens/build.mjs test/contrast.test.mjs browser/palette-os-dark.mjs browser/fixtures/palette-os-dark.html package.json dist/
git commit -m "fix(tokens): a dark-ink palette keeps its label when the OS is dark

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `data-density="touch"`

**Files:**
- Modify: `tokens/tokens.json` (`control.h`), `tokens/build.mjs` (`flatten`, `flattenMixes`, `wantedTriples`, `buildPrimariesCss`'s `asked`, `buildTokensCss`), `test/build.test.mjs` (density test), `browser/fixtures/vanilla-control-heights.html`, `browser/control-heights.mjs`, `dist/*`

**Interfaces:**
- Produces: a `touch` field on every flattened leaf (`flatten(tokens)[i].touch`), and the CSS blocks `[data-density="touch"]` and a `[data-density="comfortable"]` that resets the union of compact and touch keys.

- [ ] **Step 1: Write the failing build test**

In `test/build.test.mjs`, replace the body of the test `density opts back out, and its values are derived rather than restated (#002)` from `const compact = block('compact');` to the end of the test with:

```js
  const compact = block('compact');
  const touch = block('touch');
  const comfortable = block('comfortable');

  assert.deepEqual(touch, { '--control-h': '2.75rem' },
    'touch is bigger targets, not a looser layout: it sets the control height and nothing else');
  assert.deepEqual(Object.keys(comfortable).sort(), [...new Set([...Object.keys(compact), ...Object.keys(touch)])].sort(),
    'comfortable must reset every key either other density sets, or one of them cannot be left');
  for (const [k, v] of Object.entries(comfortable)) {
    assert.equal(v, root[k], `${k} must restate the default (${root[k]}), got ${v}, derive it, do not copy it`);
    if (k in compact) assert.notEqual(v, compact[k], `${k} is identical in comfortable and compact, so one of them does nothing`);
    if (k in touch) assert.notEqual(v, touch[k], `${k} is identical in comfortable and touch, so one of them does nothing`);
  }
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --test test/build.test.mjs 2>&1 | grep -E "^not ok|no \[data-density"`
Expected: FAIL with `no [data-density="touch"] rule`.

- [ ] **Step 3: Implement**

`tokens/tokens.json`: replace `"control": { "h": { "$value": "2.5rem", "$compact": "2rem" },` with `"control": { "h": { "$value": "2.5rem", "$compact": "2rem", "$touch": "2.75rem" },`.

`tokens/build.mjs`:
- In `flatten`, after `compact: val.$compact,` add `touch: val.$touch,`.
- In `flattenMixes`, change `for (const axis of ['compact', 'glass', 'glassDark'])` to `for (const axis of ['compact', 'touch', 'glass', 'glassDark'])`.
- In `wantedTriples` and in `buildPrimariesCss`'s `asked`, change `[t.value, t.dark, t.compact, t.glass, t.glassDark]` to `[t.value, t.dark, t.compact, t.touch, t.glass, t.glassDark]` (two places).
- In `buildTokensCss`, replace:

```js
  const compactTokens = flat.filter(t => t.compact !== undefined);
  const compact = compactTokens.map(t => decl(t.name, t.compact)).join('\n');
  /* The counterpart, DERIVED from the same tokens' defaults rather than restated: same key set by
     construction, so a token that gains a $compact value automatically gains its way back out, and
     a retuned default can never leave the two blocks disagreeing. */
  const comfortable = compactTokens.map(t => decl(t.name, t.value)).join('\n');
```

with:

```js
  const compact = flat.filter(t => t.compact !== undefined).map(t => decl(t.name, t.compact)).join('\n');
  const touch = flat.filter(t => t.touch !== undefined).map(t => decl(t.name, t.touch)).join('\n');
  /* The way back out, DERIVED from the defaults of every token EITHER density moves: a token that
     gains a $compact or a $touch value automatically gains its reset, and a retuned default can
     never leave the blocks disagreeing. */
  const comfortable = flat.filter(t => t.compact !== undefined || t.touch !== undefined)
    .map(t => decl(t.name, t.value)).join('\n');
```

and in the template, between the `[data-density="compact"] {…}` block and the comment that starts `/* ...and the way back out.`, insert:

```js
/* Touch: the control height a thumb or a gloved finger hits reliably (44px), for an app used
 * standing up or on the move. Spacing stays comfortable; a bigger target is not a looser layout. */
[data-density="touch"] {
${touch}
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm run build && node --test test/build.test.mjs test/token-snapshot.test.mjs 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`.

- [ ] **Step 5: Measure it in a browser**

In `browser/fixtures/vanilla-control-heights.html`, after the `data-density="compact"` div, add:

```html
  <div data-density="touch" style="display:flex;gap:8px;align-items:flex-start;margin-top:8px">
    <button class="fdy-btn" id="tbtn">Button</button>
    <span class="fdy-input-group" id="tgrp"><input class="fdy-input"></span>
    <div data-density="comfortable"><button class="fdy-btn" id="tcbtn">Back to comfortable</button></div>
  </div>
```

and in `window.heights`, after `compactBtn: h('cbtn'), compactGroup: h('cgrp'),` add `touchBtn: h('tbtn'), touchGroup: h('tgrp'), touchComfortableBtn: h('tcbtn'),`.

In `browser/control-heights.mjs`, after the compact assertion, add:

```js
    /* Touch is 2.75rem, 44px at the harness's 16px root: the smallest target a thumb hits
       reliably. A comfortable island inside it must return to the default height. */
    assert.equal(h.touchBtn, 44, `a button under data-density="touch" is ${h.touchBtn}px, expected 44`);
    assert.equal(h.touchGroup, h.touchBtn, `under touch: group ${h.touchGroup}px vs button ${h.touchBtn}px`);
    assert.equal(h.touchComfortableBtn, h.btn,
      `a comfortable island inside touch is ${h.touchComfortableBtn}px, the default is ${h.btn}px`);
```

Run: `node --test browser/control-heights.mjs` (real Chrome; a skip does not count). Expected: PASS.

- [ ] **Step 6: Full suite and commit**

Run: `npm test`. Expected: all pass.

```bash
git add tokens/tokens.json tokens/build.mjs test/build.test.mjs browser/control-heights.mjs browser/fixtures/vanilla-control-heights.html dist/
git commit -m "feat(tokens): data-density=\"touch\", 44px controls for apps used on the move

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `data-primary-fill="deep"` in tokens and build

**Files:**
- Modify: `tokens/tokens.json` (`onDeep` on every `$primaries` entry; new `$primaryFill`), `tokens/build.mjs` (`wantedTriples`, `buildPrimariesCss`'s `asked`, new `buildPrimaryFillCss`, `buildTokensCss` template), `test/build.test.mjs`, `dist/*`
- Create: `browser/fixtures/primary-fill.html`, `browser/primary-fill.mjs`; Modify: `package.json`

**Interfaces:**
- Consumes: Task 1's per-palette dark twins.
- Produces: `export function buildPrimaryFillCss(tokens): string`; CSS blocks `[data-primary-fill="deep"]`, `[data-theme="dark"][data-primary-fill="deep"]`, its system-dark twin, `[data-theme="light"][data-primary-fill="deep"]`, and per palette `[data-theme="dark"][data-primary="<name>"][data-primary-fill="deep"]` plus its system-dark twin where the palette's `onDark` differs from the default's. Task 4's contrast tests read these selectors.

- [ ] **Step 1: Write the failing build tests**

Update the import line at the top of `test/build.test.mjs` to add `buildPrimaryFillCss`. Append:

```js
test('every palette states the ink it uses on the deep fill', () => {
  for (const [name, p] of Object.entries(TOKENS.$primaries)) {
    if (name.startsWith('_')) continue;
    assert.match(String(p.onDeep), /^\{neutral\.\d+\}$/, `$primaries.${name}.onDeep must be a measured neutral ink`);
  }
});

test('deep re-points exactly the fill family, light theme only', () => {
  const css = buildTokensCss(TOKENS);
  const light = neutralBlock(css, '[data-primary-fill="deep"]');
  assert.deepEqual(light, {
    '--color-primary': 'var(--primary-700)',
    '--color-primary-hover': 'var(--primary-800)',
    '--color-primary-active': 'var(--primary-800)',
    '--color-primary-strong': 'var(--primary-800)',
    '--color-primary-rgb': 'var(--primary-700-rgb)',
    '--focus-ring': 'var(--primary-700)',
    '--color-on-primary': 'var(--neutral-0)',
    '--color-on-primary-rgb': 'var(--neutral-0-rgb)',
  });
  const dark = neutralBlock(css, '[data-theme="dark"][data-primary-fill="deep"]');
  const flat = flatten(TOKENS);
  for (const k of Object.keys(light).filter(k => !k.startsWith('--color-on-primary'))) {
    const t = flat.find(x => `--${x.name}` === k);
    assert.equal(dark[k], resolveValue(t.dark ?? t.value), `${k} must be restated to its normal dark value`);
  }
});

test('a dark-ink palette gets its own deep dark twin', () => {
  const css = buildTokensCss(TOKENS);
  const twin = neutralBlock(css, '[data-theme="dark"][data-primary="teal"][data-primary-fill="deep"]');
  assert.equal(twin['--color-on-primary'], 'var(--neutral-950)',
    'the generic deep dark block restates the default dark ink, which is wrong for teal');
});
```

`TOKENS`, `neutralBlock`, `flatten` and `resolveValue` already exist in this file.

- [ ] **Step 2: Run, expect FAIL**

Run: `node --test test/build.test.mjs 2>&1 | grep -E "^not ok|SyntaxError" | head`
Expected: FAIL (import error for `buildPrimaryFillCss`).

- [ ] **Step 3: Add the data**

In `tokens/tokens.json`, add `"onDeep": "{neutral.0}"` to every `$primaries` entry except `_comment` (18 entries). Run this once:

```bash
node -e '
const fs=require("fs");const p="tokens/tokens.json";let s=fs.readFileSync(p,"utf8");
s=s.replace(/("onDark": "\{neutral\.\d+\}")/g, "$1, \"onDeep\": \"{neutral.0}\"");
fs.writeFileSync(p,s);
const t=JSON.parse(s);const n=Object.entries(t.$primaries).filter(([k,v])=>!k.startsWith("_")&&v.onDeep===undefined);
console.log(n.length?"MISSING onDeep: "+n.map(x=>x[0]).join(","):"all 18 palettes have onDeep");'
```

Expected: `all 18 palettes have onDeep`.

Then, directly after the closing `},` of `$primaries`, insert:

```json
  "$primaryFill": {
    "_comment": "Sub-axis of the palette: [data-primary-fill=\"deep\"] re-points these semantic tokens at the next shade down the alias ramp, light theme only, and swaps the label ink for each palette's measured onDeep. The soft wash and its border do not move. Dark keeps its normal values: dark fills are already lighter than the surface needs.",
    "deep": {
      "color-primary": "{primary.700}",
      "color-primary-hover": "{primary.800}",
      "color-primary-active": "{primary.800}",
      "color-primary-strong": "{primary.800}",
      "color-primary-rgb": "{primary.700.rgb}",
      "focus-ring": "{primary.700}"
    }
  },
```

- [ ] **Step 4: Implement the build**

In `tokens/build.mjs`:

4a. In `wantedTriples`, inside the array passed to `rgbRefsIn`, after `...primaryInkRefs(tokens),` add `...Object.values(tokens.$primaryFill?.deep ?? {}),`. In `buildPrimariesCss`, change the `asked` line to:

```js
  const asked = rgbRefsIn([
    ...flat.flatMap(t => [t.value, t.dark, t.compact, t.touch, t.glass, t.glassDark]),
    ...Object.values(tokens.$primaryFill?.deep ?? {}),
  ]);
```

4b. After `buildPrimariesCss`, add:

```js
/* The primary-fill sub-axis. `deep` puts the fill family one shade down the alias ramp in the LIGHT
 * theme, for an app that wants a white label on a darker fill (a measured choice per palette,
 * `onDeep`). Dark is left alone: a dark fill is already lighter than the surface needs, and a
 * deeper one would lower the fill against the surface.
 *
 * Which token points where is data ($primaryFill.deep), so this function only emits scopes:
 * - the light block (0,1,0), after every palette block, so it wins their fill and ink;
 * - its [data-theme="dark"] twin (0,2,0) and system-dark twin (0,3,0), restating each token's
 *   normal dark value, because a later (0,1,0) block would otherwise win in an explicit dark theme;
 * - a [data-theme="light"] re-assert, as every axis has;
 * - per palette, where the palette's ink differs from the default's: its own deep light block for
 *   onDeep (0,2,0), and deep dark twins (0,3,0) and (0,4,0) for onDark, since the generic dark twin
 *   restates the DEFAULT dark ink and would put white on teal. */
export function buildPrimaryFillCss(tokens) {
  const deep = tokens.$primaryFill?.deep;
  const spec = tokens.$primaries;
  if (deep === undefined || spec === undefined) return '';
  const byName = new Map(flatten(tokens).map(t => [t.name, t]));
  const defaultName = String(tokens.primary['600'].$value).match(/^\{(\w+)\.600\}$/)?.[1];
  const dflt = spec[defaultName];
  if (dflt === undefined) throw new Error(`the primary alias defaults to "${defaultName}", which is not in $primaries`);
  const ink = (ref) => [decl('color-on-primary', ref), decl('color-on-primary-rgb', ref.replace(/\}$/, '.rgb}'))];
  const darkOf = (name) => {
    const t = byName.get(name);
    if (t === undefined) throw new Error(`$primaryFill.deep names --${name}, which is not a token`);
    return decl(name, t.dark ?? t.value);
  };
  const lightDecls = [...Object.entries(deep).map(([n, ref]) => decl(n, ref)), ...ink(dflt.onDeep)].join('\n');
  const darkDecls = [...Object.keys(deep).map(darkOf), ...ink(dflt.onDark)].join('\n');
  const SEL = '[data-primary-fill="deep"]';
  const SYS = ':root:not([data-theme="light"])';
  const out = [
    `${SEL} {\n${lightDecls}\n}`,
    `@media (prefers-color-scheme: dark) {\n  ${SYS}${SEL} {\n${darkDecls}\n  }\n}`,
    `[data-theme="dark"]${SEL} {\n${darkDecls}\n}`,
    `[data-theme="light"]${SEL} {\n${lightDecls}\n}`,
  ];
  for (const [name, p] of Object.entries(spec)) {
    if (name.startsWith('_')) continue;
    if (p.onDeep === undefined) throw new Error(`$primaries.${name} has no onDeep, measure the ink on its 700 shade`);
    const P = `[data-primary="${name}"]${SEL}`;
    if (p.onDeep !== dflt.onDeep) {
      out.push(`${P} {\n${ink(p.onDeep).join('\n')}\n}`, `[data-theme="light"]${P} {\n${ink(p.onDeep).join('\n')}\n}`);
    }
    if (p.onDark !== dflt.onDark) {
      out.push(
        `@media (prefers-color-scheme: dark) {\n  ${SYS}${P} {\n${ink(p.onDark).join('\n')}\n  }\n}`,
        `[data-theme="dark"]${P} {\n${ink(p.onDark).join('\n')}\n}`,
      );
    }
  }
  return '/* Primary fill sub-axis, see $primaryFill in tokens.json. */\n' + out.join('\n') + '\n';
}
```

4c. In `buildTokensCss`, change the last template line to:

```js
${buildStylesCss(flat)}${buildNeutralsCss(tokens)}${buildPrimariesCss(tokens)}${buildPrimaryFillCss(tokens)}`;
```

- [ ] **Step 5: Run, expect PASS**

Run: `npm run build && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`. The snapshot stays green: nothing changes without the attribute.

- [ ] **Step 6: Browser test**

Create `browser/fixtures/primary-fill.html`:

```html
<!doctype html>
<html lang="en" data-primary="teal" data-primary-fill="deep" data-theme="light">
<head>
<meta charset="utf-8">
<title>Freeday: deep primary fill</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
</head>
<body><button class="fdy-btn" id="btn" type="button">Simpan</button></body>
</html>
```

Create `browser/primary-fill.mjs`:

```js
/* Browser regression spec: data-primary-fill="deep" (pure CSS). Run via `npm run test:browser`.
 * Light theme: the fill is the palette's 700 shade with a white label. Dark theme: exactly the
 * values the palette has without deep, under an explicit theme and under the OS setting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const prop = (p, name) => p.evalJS(
  `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`);
const pair = async (p) => [await prop(p, '--color-primary'), await prop(p, '--color-on-primary')];

test('deep deepens the light fill and leaves dark alone', { skip }, async () => {
  await withPage(fixture('primary-fill.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.setColorScheme('light');
    assert.deepEqual(await pair(p), [await prop(p, '--teal-700'), await prop(p, '--neutral-0')],
      'light: teal-700 with a white label');

    const setTheme = (v) => p.evalJS(`document.documentElement.setAttribute("data-theme", ${JSON.stringify(v)})`);
    const dropFill = () => p.evalJS('document.documentElement.removeAttribute("data-primary-fill")');
    const addFill = () => p.evalJS('document.documentElement.setAttribute("data-primary-fill", "deep")');

    await setTheme('dark');
    await dropFill();
    const plainDark = await pair(p);
    await addFill();
    assert.deepEqual(await pair(p), plainDark, 'explicit dark: deep changes nothing');

    await p.evalJS('document.documentElement.removeAttribute("data-theme")');
    await p.setColorScheme('dark');
    await dropFill();
    const osDark = await pair(p);
    await addFill();
    assert.deepEqual(await pair(p), osDark, 'OS dark: deep changes nothing');
  });
});
```

In `package.json` `test:browser`, insert `browser/primary-fill.mjs ` directly after `browser/palette-os-dark.mjs `.

Run: `node --test browser/primary-fill.mjs` (real Chrome). Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tokens/tokens.json tokens/build.mjs test/build.test.mjs browser/primary-fill.mjs browser/fixtures/primary-fill.html package.json dist/
git commit -m "feat(tokens): data-primary-fill=\"deep\", a darker fill with a white label

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The contrast gate covers the deep fill

**Files:**
- Modify: `test/contrast.test.mjs` (new section after the neutral section, before the `no component paints TEXT with --color-primary` section)

**Interfaces:**
- Consumes: `block` (imported from `./token-scopes.mjs`), `base`, `darkVars`, `paletteScope`, `paletteFails`, `PALETTES`, `NEUTRALS` (all defined earlier in the file), Task 3's selectors.

- [ ] **Step 1: Write the tests**

```js
/* --- the deep primary fill ------------------------------------------------------------------
 *
 * Light: every palette under every neutral passes the palette contract with the fill one shade
 * deeper and the measured onDeep ink. Dark: deep must change nothing; the generic dark twin
 * restates the default's values, and a dark-ink palette needs its own twin or its label goes
 * white, so this compares resolved values rather than trusting the blocks. Spread in source and
 * specificity order: palette (0,1,0), deep (0,1,0, later), palette-specific deep (0,2,0); in dark,
 * the deep dark twin (0,2,0) after the palette's dark twin, then the palette-specific one (0,3,0). */
const DEEP = '[data-primary-fill="deep"]';
const DEEP_KEYS = ['--color-primary', '--color-primary-hover', '--color-primary-active', '--color-primary-strong',
  '--color-primary-rgb', '--focus-ring', '--color-on-primary', '--color-on-primary-rgb'];
const resolved = (k, t) => {
  let v = t[k];
  for (let i = 0; i < 20 && v.includes('var('); i++) v = v.replace(/var\((--[\w-]+)\)/g, (_, n) => t[n]);
  return v;
};

test('the deep fill is actually emitted', () => {
  assert.equal(block(css, DEEP)['--color-primary'], 'var(--primary-700)', 'no deep light block, or it maps the fill elsewhere');
  assert.ok(Object.keys(block(css, `[data-theme="dark"]${DEEP}`)).length >= 6, 'no deep dark twin');
});

for (const n of [null, ...NEUTRALS]) {
  const label = n ?? 'slate';
  const nl = n === null ? {} : block(css, `[data-neutral="${n}"]`);
  const nd = n === null ? {} : block(css, `[data-theme="dark"][data-neutral="${n}"]`);

  test(`WCAG contrast: deep fill under every palette, neutral ${label} (LIGHT)`, () => {
    const fails = [];
    for (const p of PALETTES) {
      const theme = { ...base, ...nl, ...paletteScope(p, ''), ...block(css, DEEP), ...block(css, `[data-primary="${p}"]${DEEP}`) };
      assert.equal(theme['--color-primary'], 'var(--primary-700)', `${p}: deep did not reach the fill`);
      for (const f of paletteFails(theme)) fails.push(`${p}: ${f}`);
    }
    assert.deepEqual(fails, [], `deep fill (${label}, LIGHT):\n  ` + fails.join('\n  '));
  });

  test(`deep leaves the dark theme alone, neutral ${label}`, () => {
    const moved = [];
    for (const p of PALETTES) {
      const plain = { ...base, ...darkVars, ...nl, ...nd, ...paletteScope(p, ''), ...paletteScope(p, '[data-theme="dark"]') };
      const deep = { ...plain, ...block(css, DEEP), ...block(css, `[data-theme="dark"]${DEEP}`), ...block(css, `[data-theme="dark"][data-primary="${p}"]${DEEP}`) };
      for (const k of DEEP_KEYS) {
        if (resolved(k, deep) !== resolved(k, plain)) moved.push(`${p} ${k}: ${resolved(k, plain)} -> ${resolved(k, deep)}`);
      }
    }
    assert.deepEqual(moved, [], `deep moved dark values (${label}):\n  ` + moved.join('\n  '));
  });
}
```

- [ ] **Step 2: Run, expect PASS; prove it bites**

Run: `node --test test/contrast.test.mjs 2>&1 | grep -E "^# (pass|fail)"` → `# fail 0`.
Then temporarily delete the per-palette dark twin emission in `buildPrimaryFillCss` (the `if (p.onDark !== dflt.onDark)` block), `npm run build`, rerun, and confirm `deep leaves the dark theme alone` fails naming teal's `--color-on-primary`. Restore with `git checkout tokens/build.mjs && npm run build`.

- [ ] **Step 3: Commit**

```bash
git add test/contrast.test.mjs
git commit -m "test(contrast): deep holds in light and leaves dark alone, for every palette and neutral

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `.fdy-actionbar`

**Files:**
- Create: `src/components/actionbar.css`, `browser/fixtures/vanilla-actionbar.html`, `browser/actionbar.mjs`
- Modify: `src/components/bottomnav.css` (declare `--fdy-bottomnav-h` and size the nav by it), `COMPONENTS.md` (new section after "Bottom navigation"), `package.json`, `dist/*`

- [ ] **Step 1: Write the browser fixture and failing test**

`browser/fixtures/vanilla-actionbar.html`:

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Freeday: action bar</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
</head>
<body>
  <div class="fdy-app fdy-app--has-bottomnav" id="app">
    <aside class="fdy-app__sidebar"><nav class="fdy-nav"><a class="fdy-nav__item" href="#">Beranda</a></nav></aside>
    <div class="fdy-app__content">
      <header class="fdy-app__topbar"><h1 class="fdy-app__title">Persetujuan</h1></header>
      <main class="fdy-app__main" id="main">
        <ul class="fdy-list" id="list"></ul>
        <div class="fdy-actionbar" id="bar">
          <button class="fdy-btn fdy-btn--ghost" type="button" id="b1">Tolak</button>
          <button class="fdy-btn" type="button" id="b2">Setujui</button>
        </div>
      </main>
    </div>
    <nav class="fdy-bottomnav" id="nav" aria-label="Navigasi utama">
      <a class="fdy-bottomnav__item" href="#" aria-current="page"><span class="fdy-bottomnav__icon">▣</span><span class="fdy-bottomnav__label">Beranda</span></a>
      <a class="fdy-bottomnav__item" href="#"><span class="fdy-bottomnav__icon">▤</span><span class="fdy-bottomnav__label">Setujui</span></a>
    </nav>
  </div>
<script>
  var list = document.getElementById('list');
  for (var i = 1; i <= 40; i++) {
    var li = document.createElement('li');
    li.className = 'fdy-list__row'; li.id = 'row' + i; li.textContent = 'Dokumen ' + i;
    list.appendChild(li);
  }
</script>
</body>
</html>
```

`browser/actionbar.mjs`:

```js
/* Browser regression spec for `.fdy-actionbar` (pure CSS). Run via `npm run test:browser`.
 * A bar of actions pinned to the bottom of a phone screen: above the bottom nav when the shell
 * has one, at the viewport's edge otherwise, and never covering the last row of content. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const box = async (p, sel) => JSON.parse(await p.evalJS(
  `JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`));

const PHONE = [390, 800];
const DESKTOP = [1000, 800];

test('on a phone the bar sits directly above the bottom nav', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.01,
      `the bar ends at ${bar.bottom}px and the nav starts at ${nav.top}px: the nav must be sized by --fdy-bottomnav-h, the value the bar rests on`);
  });
});

test('scrolled to the end, the last row is above the bar', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS('window.scrollTo(0, document.documentElement.scrollHeight)');
    await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    const row = await box(p, '#row40');
    const bar = await box(p, '#bar');
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('on a desktop the bar sits at the viewport edge, and its buttons share the width', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    const bar = await box(p, '#bar');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
    const b1 = await box(p, '#b1');
    const b2 = await box(p, '#b2');
    assert.ok(Math.abs(b1.width - b2.width) <= 1, `buttons ${b1.width}px and ${b2.width}px should share the bar`);
  });
});
```

In `package.json` `test:browser`, insert `browser/actionbar.mjs ` directly after `browser/bottom-nav.mjs `.

- [ ] **Step 2: Run, expect FAIL**

Run: `npm run build && node --test browser/actionbar.mjs`
Expected: FAIL (no `.fdy-actionbar` rules: the bar is an ordinary block at the end of the list, far below the viewport).

- [ ] **Step 3: Write the component**

`src/components/actionbar.css`:

```css
/* Freeday. Action bar
 *
 * One to three actions pinned to the bottom of the screen, where a thumb reaches them on a phone:
 * the sign-in button, approve and reject on a document, save on a long form. Before this, an app
 * either put its primary action mid-page, where it scrolled away, or hand-wrote a fixed bar that
 * sat on top of the bottom nav.
 *
 * Sticky, not fixed: the bar keeps its place in the flow, so the last row above it is never
 * covered and the page needs no extra reservation. In a shell with a bottom nav it rests on top of
 * the nav; anywhere else it clears the home indicator itself. */
.fdy-actionbar{
  position:sticky;bottom:0;z-index:40;
  display:flex;gap:var(--space-2);
  padding:var(--space-3) var(--space-4);
  padding-bottom:calc(var(--space-3) + env(safe-area-inset-bottom,0px));
  background:var(--color-surface-raised);
  backdrop-filter:var(--surface-filter);
  -webkit-backdrop-filter:var(--surface-filter);
  border-top:var(--bw) solid var(--color-border);
}
/* The buttons share the width; the primary action goes last, nearest the thumb. */
.fdy-actionbar > .fdy-btn{flex:1 1 0;min-width:0;}
/* Above the bottom nav: --fdy-bottomnav-h is declared, and obeyed, in bottomnav.css. The nav adds
 * the safe-area inset itself, so the bar rests on all of it and does not add the inset twice. */
@media (max-width:720px){
  .fdy-app--has-bottomnav .fdy-actionbar{
    bottom:calc(var(--fdy-bottomnav-h) + env(safe-area-inset-bottom,0px));
    padding-bottom:var(--space-3);
  }
}
```

In `src/components/bottomnav.css`, directly after the header comment and before `.fdy-bottomnav{display:none;}`, add:

```css
/* The bar's height, stated once so anything resting on the bar (the action bar) reads the same
 * number the bar is drawn with: a 44px item, the vertical padding, the top hairline. Before this
 * the height was only implied, and an item's icon and label made it 0.39px taller than the sum,
 * more with a taller app font. The safe-area inset is added where it is used, not here. */
.fdy-app--has-bottomnav{--fdy-bottomnav-h:calc(2.75rem + 2 * var(--space-2) + var(--bw));}
```

and inside the existing `@media (max-width:720px){ .fdy-bottomnav{ … } }` rule, add after `border-top:var(--bw) solid var(--color-border);`:

```css
    box-sizing:border-box;
    height:calc(var(--fdy-bottomnav-h,auto) + env(safe-area-inset-bottom,0px));
```

A shell without `--has-bottomnav` has no token, the `calc()` falls back to `auto + inset`, which is invalid, and the declaration drops to the initial `height:auto`: the nav keeps its content height exactly as before.

- [ ] **Step 4: Run, expect PASS**

Run: `npm run build && node --test browser/actionbar.mjs browser/bottom-nav.mjs` (real Chrome). Expected: all pass. The bottom-nav suite proves the 44px targets and the content reservation survived the fixed height. Do not loosen the 0.01px match: if it fails, the nav is not being sized by the token.

- [ ] **Step 5: Document it in COMPONENTS.md**

`test/docs.test.mjs` fails until every component stylesheet has a section. Insert after the "Bottom navigation" section (before the next `## ` heading):

````markdown
## Action bar — `.fdy-actionbar`
One to three actions pinned to the bottom of the screen, where a thumb reaches them on a phone: the
sign-in button, approve and reject on a document, save at the end of a long form. Put it as the last
child of the page content (`.fdy-app__main`), holding `.fdy-btn` elements. They share the width, and
the primary action goes last, nearest the thumb.

- It is `position: sticky`, so it keeps its place in the flow and never covers the last row above it.
- In a shell with `.fdy-app--has-bottomnav`, below 720px it rests on top of the bottom nav, using
  `--fdy-bottomnav-h` (declared on that shell). Elsewhere it clears the home indicator with
  `env(safe-area-inset-bottom)`.
- No ARIA of its own: it is a row of buttons, and each keeps its own name.
- CSS only. There is no wrapper in Vue, React or Blazor, and none is needed.

```html
<main class="fdy-app__main">
  <!-- the screen -->
  <div class="fdy-actionbar">
    <button class="fdy-btn fdy-btn--ghost" type="button">Reject</button>
    <button class="fdy-btn" type="button">Approve</button>
  </div>
</main>
```
````

Note the heading keeps the file's existing `## Name — \`.class\`` shape (with its em dash), which the docs test and every other section use; the rule against new dashes covers prose, not this heading format. Run the prose through `/humanizer:humanizer`.

- [ ] **Step 6: Full suite and commit**

Run: `npm test`. Expected: all pass (including `COMPONENTS.md covers every component stylesheet` and the support-floor gate in `test/baseline.test.mjs`).

```bash
git add src/components/actionbar.css src/components/bottomnav.css browser/actionbar.mjs browser/fixtures/vanilla-actionbar.html COMPONENTS.md package.json dist/
git commit -m "feat(actionbar): actions pinned above the bottom nav, never over the last row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Doctrine: USAGE.md §0, §6, §8, COMPONENTS.md, onboarding

**Files:**
- Modify: `USAGE.md`, `COMPONENTS.md`, `docs/agent-onboarding.md`, `test/docs.test.mjs`

- [ ] **Step 1: Write the failing docs test**

Append to `test/docs.test.mjs`:

```js
test('USAGE.md carries the mobile doctrine and the touch and deep routes', () => {
  const usage = read('USAGE.md');
  assert.match(usage, /^## 8\. Mobile/m, 'the mobile section is missing');
  assert.match(usage, /data-density="touch"/);
  assert.match(usage, /data-primary-fill="deep"/);
  assert.match(usage, /\.fdy-actionbar/);
  assert.doesNotMatch(usage, /^Everything else stays with the kit\./m, '§0 still calls the rest locked');
  assert.match(read('docs/agent-onboarding.md'), /USAGE\.md` §8/, 'onboarding must point phone screens at §8');
});
```

Run: `node --test test/docs.test.mjs` → FAIL on `the mobile section is missing`.

- [ ] **Step 2: USAGE.md §0, replace the "Everything else" paragraph**

Replace the paragraph that starts `Everything else stays with the kit.` and ends `ring are accessibility contracts.` with:

```markdown
Everything else is outside the kit's guarantee. You may override it, and some apps need to, but the
contrast gate and the kit's own tests no longer cover what you change: check the contrast yourself
and write down why in `DESIGN.md`. Take a sanctioned route first when one exists. Colour reaches an
app through the attributes, including `data-primary-fill="deep"` for a white label on a darker fill.
Control size has `data-density="touch"` for 44px targets. Spacing (`--space-*`) carries density, and
the type size scale (`--text-*`, `--leading-*`) sets control heights and table density, so a screen
that wants big type uses `var(--text-xl)` and up in its own content. `--radius-full`, `--bw` and the
focus ring are accessibility contracts; overriding them is the one change no reason in `DESIGN.md`
makes safe.
```

- [ ] **Step 3: USAGE.md §6, add touch**

Append to §6 (after the paragraph ending `retunes a step.`):

```markdown
**`touch` is for apps used on the move.** `data-density="touch"` sets the control height to 2.75rem
(44px), the smallest target a thumb or a gloved finger hits reliably, and keeps comfortable spacing.
Use it for a whole app used standing up (a guard's phone, a warehouse scanner) or for one shell of a
mixed app, and avoid `.fdy-btn--sm` there: it is 36px under `touch`. `comfortable` resets it like it
resets `compact`.
```

- [ ] **Step 4: USAGE.md §8, the mobile doctrine**

Insert before the final `---` line of USAGE.md (after §7b):

```markdown
## 8. Mobile: the phone is its own layout

A phone is not a narrow desktop. Most of these rules already live in COMPONENTS.md; they are
collected here because they are the ones apps miss.

- **Navigation.** A bottom nav (`.fdy-bottomnav`) carries three to five destinations, chosen by role.
  Everything else goes behind an account or "More" item. Labels are not optional.
- **Lists, not tables.** Below `md`, a table becomes a `.fdy-list` (COMPONENTS.md, List). A row is
  one tap target that opens its detail. Row actions move into a `.fdy-menu` behind a "…" button or
  onto the detail screen; a column of stacked buttons makes one row as tall as the screen.
- **The primary action stays in reach.** Put it in `.fdy-actionbar` or a `.fdy-fab--extended`, not
  in the page body where it scrolls away.
- **One frame.** The page header is not wrapped in a card on a phone; the screen already is the
  frame.
- **Drop the views a phone cannot use.** A list/box/grid switch shows only list (and box, if it
  reads) below `md`.
- **Say where the user is.** A multi-tenant app (several sites, clusters or companies) shows the
  current one as a chip in the topbar, with the switch beside it.
- **Size targets for the way the app is held.** An app used standing up or on the move sets
  `data-density="touch"` (§6), per app or per shell.
```

- [ ] **Step 5: COMPONENTS.md: touch and deep**

In the density paragraph (the one starting `Density: \`data-density="compact"\` works on`), append:

```markdown
`data-density="touch"` is the third value: 2.75rem (44px) controls with comfortable spacing, for an app
used standing up or on the move. `comfortable` resets it too.
```

After the primary palette section's last paragraph (the one about the palettes the gate forced an exception on), add:

```markdown
**Deep fill: `data-primary-fill="deep"`.** For a white label on a darker fill, in the light theme
only. The fill, hover, active and strong ink move one shade down the palette's ramp (fill 700,
hover/active/strong 800, focus ring 700), and the label becomes the palette's measured `onDeep` ink,
which is white for all 18 palettes (lowest: lime, 4.99:1). The soft wash does not change, and the
dark theme keeps its normal values. Set it beside `data-primary`, on `<html>` or on a region with
`data-theme`.
```

- [ ] **Step 6: Onboarding**

In `docs/agent-onboarding.md`, in the paste block's new-app bullet, replace `archetype from \`USAGE.md\` §7b before writing its markup.` with `archetype from \`USAGE.md\` §7b before writing its markup, and lay out phone screens by \`USAGE.md\` §8.`. In non-negotiable 1, replace `which gives the tokens listed in \`USAGE.md\` §0 their literal values and sets nothing else.` with `which gives the tokens listed in \`USAGE.md\` §0 their literal values. Overriding anything else takes the app outside the kit's guarantee (§0): prefer the sanctioned attribute, such as \`data-density="touch"\` or \`data-primary-fill="deep"\`, when one exists.`

- [ ] **Step 7: Humanizer, tests, commit**

Run every new paragraph through `/humanizer:humanizer` (embedded mode; keep every fact and token name). Then `node --test test/docs.test.mjs` and `npm test`: all pass.

```bash
git add USAGE.md COMPONENTS.md docs/agent-onboarding.md test/docs.test.mjs
git commit -m "docs(usage): a phone is its own layout, and overriding is allowed outside the guarantee

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Playground

**Files:**
- Modify: `docs/index.html`

- [ ] **Step 1: Density switcher gains touch**

At `docs/index.html` ~line 2279, replace:

```js
  densityBtn.onclick = () => { const d = root.dataset.density === 'compact' ? 'comfortable' : 'compact'; root.dataset.density = d; densityBtn.setAttribute('aria-pressed', String(d === 'compact')); };
```

with:

```js
  const DENSITIES = ['comfortable', 'compact', 'touch'];
  densityBtn.onclick = () => {
    const d = DENSITIES[(DENSITIES.indexOf(root.dataset.density) + 1) % DENSITIES.length];
    root.dataset.density = d;
    densityBtn.setAttribute('aria-pressed', String(d !== 'comfortable'));
    densityBtn.title = d;
  };
```

- [ ] **Step 2: Deep toggle beside the palette switcher**

Inside the palette `doc-swatches` group (the `role="group" aria-label="Pilih palet primary"` div), after the `noir` button, add:

```html
          <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" aria-pressed="false" onclick="const r=document.documentElement;const on=r.dataset.primaryFill!=='deep';if(on){r.dataset.primaryFill='deep'}else{delete r.dataset.primaryFill}this.setAttribute('aria-pressed',String(on))">deep</button>
```

And append to the palette `doc-desc` paragraph (before its closing `</p>`): ` <code>data-primary-fill="deep"</code> menggeser fill satu shade lebih gelap dengan label putih, di tema terang saja.`

- [ ] **Step 3: Action bar demo**

Find the bottom navigation demo section (search for `fdy-bottomnav` in docs/index.html) and, after its demo block, add a demo inside a short scrolling box so the stickiness is visible:

```html
      <p class="doc-desc"><strong>Action bar: <code>.fdy-actionbar</code>.</strong> Aksi yang menempel di bawah layar, di atas bottom nav kalau ada. Tetap di alur halaman, jadi baris terakhir tidak pernah tertutup.</p>
      <div class="doc-demo doc-demo--block">
        <div style="max-height:12rem;overflow:auto;border:var(--bw) solid var(--color-border);border-radius:var(--radius-md)">
          <ul class="fdy-list" style="border:0">
            <li class="fdy-list__row">PO-0412 · Semen 40 sak</li>
            <li class="fdy-list__row">PO-0413 · Cat tembok 12 galon</li>
            <li class="fdy-list__row">PO-0414 · Kabel NYM 3x2.5</li>
            <li class="fdy-list__row">PO-0415 · Pipa PVC 4 inci</li>
            <li class="fdy-list__row">PO-0416 · Lampu jalan LED</li>
            <li class="fdy-list__row">PO-0417 · Pasir 2 truk</li>
          </ul>
          <div class="fdy-actionbar">
            <button class="fdy-btn fdy-btn--ghost" type="button">Tolak</button>
            <button class="fdy-btn" type="button">Setujui</button>
          </div>
        </div>
      </div>
```

(The demo's inline styles use tokens only. A scrolling box is the sticky container here, so the bar pins to the box's bottom.)

- [ ] **Step 4: Check, humanizer, commit**

Open `docs/index.html` in a browser: the density button cycles comfortable → compact → touch; `deep` darkens teal's fill and gives it a white label in light and changes nothing in dark; the action bar stays at the bottom of its box while the list scrolls. Run the two Indonesian sentences through `/humanizer:humanizer`. `npm test` (docs tests check classes) must pass.

```bash
git add docs/index.html
git commit -m "docs(playground): touch density, the deep fill and an action bar demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Release 3.22.0

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm version`), version stamps in `README.md`, `README.id.md`, `docs/getting-started.md`, `docs/index.html` (the docs test lists them), `CHANGELOG.md`, `CLAUDE.md`, `HANDOFF.md`, `NEXT-UP.md`, the spec

- [ ] **Step 1: Version**

Run: `npm version minor --no-git-tag-version` → `v3.22.0`. Then `grep -rn "3\.21\.0" README.md README.id.md docs/getting-started.md docs/index.html` and bump each version stamp the docs test guards (not historical mentions). Run `npm test` until the stamp test passes.

- [ ] **Step 2: CHANGELOG 3.22.0 (Indonesian, matching the file)**

Read the 3.21.0 entry for shape. The 3.22.0 entry covers:
- Added: `data-density="touch"`; `data-primary-fill="deep"` with `onDeep` per palette (all white, lowest lime 4.99:1); `.fdy-actionbar` and `--fdy-bottomnav-h`; USAGE.md §8 Mobile.
- Fixed: palette label ink under the OS dark setting for orange, amber, lime, green, emerald, teal and cyan (white on the 500 fill, about 2.5:1, whenever the OS was dark, even with `data-theme="dark"`), with the cause and the new browser and contrast tests.
- Changed (docs): USAGE §0 now says "outside the kit's guarantee" instead of locked.
- Upgrade note for apps like Ronda: drop a hand-set `--control-h: 2.75rem` for `data-density="touch"`; drop a hand-set deeper primary (`--color-primary: var(--primary-700)` and friends) for `data-primary-fill="deep"`; an app that set `--color-on-primary` to dark ink under `[data-theme='dark']` to work around the OS-dark bug can drop that too.
Run it through `/humanizer:humanizer`.

- [ ] **Step 3: CLAUDE.md, HANDOFF.md, NEXT-UP.md**

- CLAUDE.md theming section: under `data-density`, add `touch` (44px, comfortable spacing); add a bullet for `data-primary-fill="deep"` (light only, `onDeep` measured, `$primaryFill` in tokens.json). Indonesian, humanizer.
- HANDOFF.md: a 3.22.0 paragraph at the top of the current state.
- NEXT-UP.md: mark B1 done; B2 (presets `ledger`, `inbox`, `thread`, `field`, each with desktop and mobile screens built on §8) is next, trigger: owner request. Add a row for Ronda's own follow-up (adopt touch and deep, drop the overrides, apply §8 to its list screens), owned by the Ronda repo.

- [ ] **Step 4: Record the plan's deviations in the spec**

In `docs/superpowers/specs/2026-11-24-touch-deep-actionbar-design.md`, add a section "6. Decided during planning" listing: the OS-dark palette fix joined B1; no new fixture (the 3.20.0 one pins the default); `--fdy-bottomnav-h` declared on `.fdy-app--has-bottomnav`; no extra bottom reservation for a sticky bar; `onDeep` measured white for all 18 palettes.

- [ ] **Step 5: Full verification and commit**

Run: `npm test && npm run test:browser` (CHROME_BIN set if needed). Expected: all pass; put the `# pass`/`# fail` lines in the commit body. If anything skipped, say so instead of claiming it passed.

```bash
git add -A ':!improvement-notes'
git commit -m "chore(release): 3.22.0, touch, a deeper fill, and the phone as its own layout

<paste the node and browser test summary lines here>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

No tag, no push, no publish: the owner releases.
