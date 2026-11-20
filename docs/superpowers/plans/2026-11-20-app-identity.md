# App identity layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a consuming app own its look inside a stated contract: a fifth theming axis `data-neutral` (slate, grey, stone), a documented set of tokens an app may set in `app.identity.css`, and an agent workflow that writes a design brief and picks a screen shape before any markup.

**Architecture:** The neutral axis copies the primary axis: an alias ramp `neutral.*` that every semantic token reads, and `[data-neutral]` blocks that re-point the alias. Instead of hand-listing what each neutral changes, the build flattens the whole token set twice (default and variant) and emits only the declarations that differ, so mixed tints and channel triples follow the neutral without a separate code path. Docs move the archetype table into the shipped `USAGE.md` and rewrite the agent paste block.

**Tech Stack:** Node 22 (`node --test`), `tokens/build.mjs` (no dependencies), W3C DTCG `tokens/tokens.json`, the CDP browser harness in `browser/`.

**Spec:** [`docs/superpowers/specs/2026-11-20-app-identity-design.md`](../specs/2026-11-20-app-identity-design.md)

## Global Constraints

- Without `data-neutral`, every token resolves to its 3.20.0 value in light, dark, soft and glass, and under every primary palette. Task 1's snapshot test is the proof and must stay green from Task 1 to the end.
- Components never change: no edits in `src/components/*.css`, `src/*.js` or `adapters/`.
- The neutral values: `slate` (default, existing), `grey` (hueless), `stone` (warm). Spelling is British: `grey`, `colour`.
- Every contrast pairing that holds for slate must hold under `grey` and `stone`, in both themes, soft and glass, and under all 18 primary palettes. If one fails, adjust the neutral's ramp, never a threshold or the glass alpha.
- `dist/` is committed. After any change to `tokens/tokens.json` or `tokens/build.mjs`, run `npm run build` and commit `dist/` in the same commit.
- Prose: every new or edited sentence in `USAGE.md`, `COMPONENTS.md`, `docs/*`, `CHANGELOG.md`, `HANDOFF.md`, `NEXT-UP.md`, `README*.md` and commit messages goes through `/humanizer:humanizer`. No em or en dashes in new prose. Write the archetype count as `15`, never as a word (`test/docs.test.mjs` rejects spelled-out counts of eleven and up).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never stage anything under `improvement-notes/` (the pre-commit hook blocks it anyway).
- No version tag and no `npm publish` in this plan. The owner releases.

## Deviations from the spec, decided while planning

1. **Surface stripe is a mix, not a `$neutrals` field.** `#fbfbfc` and `#131721` are exactly `color-mix(in srgb, {color.surface-2} 55%, {color.surface})` in light and dark, verified with the build's own `evalMix`. Written as that mix, the build re-flattens it per neutral with no special case. Spec D3's `stripe`/`stripeDark` fields are dropped.
2. **`border-muted` dark (`#1c2130`) was missed by the spec.** It sits between slate 800 and 900 and is not a mix of any two roles. It becomes a new shade `slate.850`, and `grey`/`stone` get an 850 computed the same way as their other shades. The alias ramp has 14 shades.
3. **No separate "unflattened mix" guard.** The build re-flattens every mix in the variant token set and diffs the result, so a mix cannot escape the neutral. The existing guard against mixes in `$compact`/`$glass`/`$glassDark` stays.
4. **The "default unchanged" proof is a new snapshot test**, `test/token-snapshot.test.mjs`. The spec named `test/baseline.test.mjs`, which is the browser support-floor gate and checks nothing about values.

Task 10 records all four in the spec.

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `test/token-scopes.mjs` (new) | Read a scope's declarations out of the token CSS and resolve `var()` chains, the way a browser computes one element | 1, 5 |
| `test/token-snapshot.test.mjs` (new) | Asserts the default output resolves to the 3.20.0 values | 1 |
| `test/fixtures/tokens-3.20.0.json` (new) | The captured 3.20.0 values | 1 |
| `tokens/tokens.json` | `slate.850`, `grey`, `stone`, `neutral` alias, `$neutrals`, rewired references | 2, 3, 4 |
| `tokens/build.mjs` | `NEUTRAL_SHADES`, `wantedTriples`, `neutralVariant`, `buildNeutralsCss`, noir triples | 4, 6 |
| `test/build.test.mjs` | Shape of the neutral axis | 3, 4 |
| `test/contrast.test.mjs` | Contrast under every neutral | 5 |
| `browser/axis-nesting.mjs`, `browser/fixtures/axis-nesting.html` (new) | Pins what `data-primary`/`data-neutral` do on a nested element | 6 |
| `docs/index.html` | Neutral switcher, corrected nesting claim | 6, 7 |
| `USAGE.md`, `docs/agent-onboarding.md`, `COMPONENTS.md`, `docs/getting-started.md`, `reference/README.md`, `test/docs.test.mjs` | Contract, brief, composition, onboarding | 6, 8, 9 |
| `CLAUDE.md`, `CHANGELOG.md`, `HANDOFF.md`, `NEXT-UP.md`, `package.json`, `package-lock.json`, spec | Release 3.21.0 | 10 |

---

### Task 1: Snapshot the 3.20.0 token values

A characterization test written before any token changes. Every later task must leave it green.

**Files:**
- Create: `test/token-scopes.mjs`
- Create: `test/token-snapshot.test.mjs`
- Create: `test/fixtures/tokens-3.20.0.json` (generated)

**Interfaces:**
- Produces: `block(css: string, selector: string): Record<string,string>`, `resolveAll(scope: Record<string,string>): Record<string,string>`, `scopes(css: string, axes: {neutral: string|null, primary: string|null, glass: boolean}): {light: Record<string,string>, dark: Record<string,string>}`, `snapshot(css: string, palettes: string[]): Snapshot`. Task 5 reuses `block`.

- [ ] **Step 1: Write the helper**

Create `test/token-scopes.mjs`:

```js
/* Reads the token stylesheet the way a browser computes ONE element: the declarations of the
 * scopes that match it, later and more specific scopes winning, then every var() substituted
 * until a literal is left. Used to pin output values (token-snapshot.test.mjs) and to compose the
 * neutral scopes (contrast.test.mjs). */

/**
 * @typedef {Record<string, string>} Scope  custom property name -> raw or resolved value
 * @typedef {{ neutral: string | null, primary: string | null, glass: boolean }} Axes
 * @typedef {{ light: Scope, dark: Scope }} Themed
 * @typedef {{ soft: Themed, glass: Themed, palettes: Record<string, Themed> }} Snapshot
 */

const escape = (s) => s.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&');

/** Declarations of the top-level block whose selector is exactly `selector`, or {} when absent.
 *  @param {string} css @param {string} selector @returns {Scope} */
export function block(css, selector) {
  const m = css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`));
  /** @type {Scope} */
  const out = {};
  if (m === null) return out;
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}

/** Every value with its var() chain substituted down to a literal.
 *  @param {Scope} scope @returns {Scope} */
export function resolveAll(scope) {
  /** @type {(v: string, depth: number) => string} */
  const resolve = (v, depth) => {
    if (depth > 30) throw new Error(`var() cycle or unresolvable value: ${v}`);
    if (!v.includes('var(')) return v;
    return resolve(v.replace(/var\((--[\w-]+)\)/g, (_, name) => {
      const inner = scope[name];
      if (inner === undefined) throw new Error(`undefined custom property ${name}`);
      return inner;
    }), depth + 1);
  };
  /** @type {Scope} */
  const out = {};
  for (const [k, v] of Object.entries(scope)) out[k] = resolve(v, 0);
  return out;
}

/** The resolved light and dark values of an element carrying the given axes and an explicit
 *  data-theme. Spread order follows the cascade: each axis block comes after the theme block at
 *  the same specificity, and its [data-theme="dark"] twin outranks both.
 *  @param {string} css @param {Axes} axes @returns {Themed} */
export function scopes(css, axes) {
  const root = block(css, ':root');
  const axis = (attr, value, theme) => (value === null ? {} : block(css, `${theme}[data-${attr}="${value}"]`));
  const glass = axes.glass ? block(css, '[data-style="glass"]') : {};
  const glassDark = axes.glass ? block(css, '[data-theme="dark"][data-style="glass"]') : {};
  const light = {
    ...root, ...glass,
    ...axis('neutral', axes.neutral, ''), ...axis('primary', axes.primary, ''),
  };
  const dark = {
    ...root, ...block(css, '[data-theme="dark"]'), ...glass, ...glassDark,
    ...axis('neutral', axes.neutral, ''), ...axis('neutral', axes.neutral, '[data-theme="dark"]'),
    ...axis('primary', axes.primary, ''), ...axis('primary', axes.primary, '[data-theme="dark"]'),
  };
  return { light: resolveAll(light), dark: resolveAll(dark) };
}

/** Everything a consumer can observe without data-neutral: soft and glass in both themes, plus,
 *  per palette, the values that palette changes.
 *  @param {string} css @param {string[]} palettes @returns {Snapshot} */
export function snapshot(css, palettes) {
  const soft = scopes(css, { neutral: null, primary: null, glass: false });
  const glass = scopes(css, { neutral: null, primary: null, glass: true });
  /** @type {(m: Scope, base: Scope) => Scope} */
  const diff = (m, base) => Object.fromEntries(Object.entries(m).filter(([k, v]) => base[k] !== v));
  /** @type {Record<string, Themed>} */
  const out = {};
  for (const p of palettes) {
    const s = scopes(css, { neutral: null, primary: p, glass: false });
    out[p] = { light: diff(s.light, soft.light), dark: diff(s.dark, soft.dark) };
  }
  return { soft, glass, palettes: out };
}
```

- [ ] **Step 2: Generate the fixture from the current (3.20.0) build**

```bash
mkdir -p test/fixtures
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
import { buildTokensCss } from "./tokens/build.mjs";
import { snapshot } from "./test/token-scopes.mjs";
const tokens = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));
const palettes = Object.keys(tokens.$primaries).filter((k) => !k.startsWith("_"));
writeFileSync("test/fixtures/tokens-3.20.0.json", JSON.stringify(snapshot(buildTokensCss(tokens), palettes), null, 1) + "\n");
' x
```

The trailing `x` gives `build.mjs` a `process.argv[1]`; without it the module's `main()` guard throws on `resolve(undefined)`.

Expected: `test/fixtures/tokens-3.20.0.json` exists. `node -e 'const s=require("./test/fixtures/tokens-3.20.0.json");console.log(Object.keys(s.soft.light).length, Object.keys(s.palettes).length)'` prints a token count above 300 and `19`.

- [ ] **Step 3: Write the test**

Create `test/token-snapshot.test.mjs`:

```js
/* The default output does not move. Captured from 3.20.0 before the neutral axis existed: every
 * value a consumer could observe without data-neutral, in light and dark, soft and glass, and
 * what each primary palette changes. New tokens are allowed; a captured one that resolves to
 * anything else is a regression for every app that never opted in. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTokensCss } from '../tokens/build.mjs';
import { snapshot } from './token-scopes.mjs';

const tokens = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
const expected = JSON.parse(readFileSync(new URL('./fixtures/tokens-3.20.0.json', import.meta.url), 'utf8'));
const actual = snapshot(buildTokensCss(tokens), Object.keys(expected.palettes));

/* Tier-1 channel triples that stop being emitted in 3.21.0, when every semantic asks for
   {neutral.N.rgb} instead of {slate.N.rgb}. Primitives are not public API (USAGE.md lists the
   semantic triples that ship), no component reads these, and CHANGELOG 3.21.0 names them. Nothing
   else may leave. */
const RETIRED = new Set(['--slate-0-rgb', '--slate-900-rgb', '--slate-950-rgb']);

for (const style of ['soft', 'glass']) {
  for (const theme of ['light', 'dark']) {
    test(`3.20.0 values hold: ${style} ${theme}`, () => {
      const was = expected[style][theme];
      assert.ok(Object.keys(was).length > 300, 'the fixture holds almost nothing, it was captured wrong');
      const moved = Object.keys(was)
        .filter((k) => !RETIRED.has(k))
        .filter((k) => actual[style][theme][k] !== was[k])
        .map((k) => `${k}: ${was[k]} -> ${actual[style][theme][k]}`);
      assert.deepEqual(moved, [], `default output changed:\n  ${moved.join('\n  ')}`);
    });
  }
}

for (const palette of Object.keys(expected.palettes)) {
  test(`3.20.0 values hold: palette ${palette}`, () => {
    assert.deepEqual(actual.palettes[palette], expected.palettes[palette]);
  });
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `node --test test/token-snapshot.test.mjs`
Expected: 23 tests, all pass.

- [ ] **Step 5: Prove it can fail**

Temporarily change `"0": { "$value": "#ffffff" }` in the `slate` ramp of `tokens/tokens.json` to `"#fffffe"`, run `node --test test/token-snapshot.test.mjs`, and confirm `soft light` fails naming `--color-surface`. Revert with `git checkout tokens/tokens.json`.

- [ ] **Step 6: Commit**

```bash
git add test/token-scopes.mjs test/token-snapshot.test.mjs test/fixtures/tokens-3.20.0.json
git commit -m "test(tokens): pin the 3.20.0 values an app sees without opting in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Add slate 850 and the grey and stone ramps

**Files:**
- Modify: `tokens/tokens.json` (the `slate` ramp, lines 12-19, and two new ramps after it)
- Modify: `dist/*` (rebuilt)

**Interfaces:**
- Produces: Tier-1 tokens `slate.850`, `grey.{0,50,100,200,300,400,450,500,600,700,800,850,900,950}`, `stone.{same}`. Task 3 points `neutral.*` at them.

- [ ] **Step 1: Replace the slate ramp and add grey and stone**

In `tokens/tokens.json`, replace:

```json
  "slate": {
    "0": { "$value": "#ffffff" }, "50": { "$value": "#f7f8fa" },
    "100": { "$value": "#eef0f4" }, "200": { "$value": "#e0e3ea" },
    "300": { "$value": "#cbd0da" }, "400": { "$value": "#99a1b3" }, "450": { "$value": "#798295" },
    "500": { "$value": "#6b7488" }, "600": { "$value": "#4d5568" },
    "700": { "$value": "#3a4152" }, "800": { "$value": "#262b38" },
    "900": { "$value": "#171b26" }, "950": { "$value": "#0e111a" }
  },
```

with:

```json
  "slate": {
    "0": { "$value": "#ffffff" }, "50": { "$value": "#f7f8fa" },
    "100": { "$value": "#eef0f4" }, "200": { "$value": "#e0e3ea" },
    "300": { "$value": "#cbd0da" }, "400": { "$value": "#99a1b3" }, "450": { "$value": "#798295" },
    "500": { "$value": "#6b7488" }, "600": { "$value": "#4d5568" },
    "700": { "$value": "#3a4152" }, "800": { "$value": "#262b38" }, "850": { "$value": "#1c2130" },
    "900": { "$value": "#171b26" }, "950": { "$value": "#0e111a" }
  },
  "grey": { "_comment": { "$value": "The hueless neutral. Each shade keeps the OKLCH lightness of the slate shade with the same number and sets chroma to 0, so every contrast ratio the gate measures for slate moves by a few hundredths at most. Computed once, committed as literals; the build does no OKLCH maths." },
    "0": { "$value": "#ffffff" }, "50": { "$value": "#f8f8f8" },
    "100": { "$value": "#f0f0f0" }, "200": { "$value": "#e3e3e3" },
    "300": { "$value": "#d0d0d0" }, "400": { "$value": "#a1a1a1" }, "450": { "$value": "#828282" },
    "500": { "$value": "#747474" }, "600": { "$value": "#555555" },
    "700": { "$value": "#414141" }, "800": { "$value": "#2b2b2b" }, "850": { "$value": "#222222" },
    "900": { "$value": "#1b1b1b" }, "950": { "$value": "#111111" }
  },
  "stone": { "_comment": { "$value": "The warm neutral. Each shade keeps the OKLCH lightness of the slate shade with the same number, at hue 70 and chroma min(0.85 x slate's chroma, 0.020). Computed once, committed as literals; the build does no OKLCH maths." },
    "0": { "$value": "#ffffff" }, "50": { "$value": "#f9f8f6" },
    "100": { "$value": "#f2efed" }, "200": { "$value": "#e7e2dd" },
    "300": { "$value": "#d5cfc7" }, "400": { "$value": "#a99f94" }, "450": { "$value": "#8a8075" },
    "500": { "$value": "#7c7268" }, "600": { "$value": "#5d5449" },
    "700": { "$value": "#484036" }, "800": { "$value": "#322a21" }, "850": { "$value": "#282017" },
    "900": { "$value": "#211a12" }, "950": { "$value": "#161009" }
  },
```

- [ ] **Step 2: Build and run the suite**

Run: `npm run build && npm test`
Expected: all pass. The snapshot allows new tokens, and nothing reads the new ones yet.

- [ ] **Step 3: Commit**

```bash
git add tokens/tokens.json dist/
git commit -m "feat(tokens): grey and stone ramps, and slate gains an 850

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The neutral alias, and every slate reference moved onto it

**Files:**
- Modify: `tokens/tokens.json`
- Modify: `test/build.test.mjs` (append one test)
- Modify: `dist/*`

**Interfaces:**
- Produces: alias tokens `--neutral-<shade>` for the 14 shades, defaulting to slate. After this task no token outside `slate` and `neutral` references `{slate.N}`.

- [ ] **Step 1: Write the failing test**

Append to `test/build.test.mjs`:

```js
test('no token outside the slate ramp and the neutral alias names a slate shade', () => {
  /* Every semantic reads the neutral alias, so data-neutral can re-point it. A {slate.N} written
     anywhere else stays cool under a warm neutral, and nothing else would notice. */
  const tokens = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
  const found = [];
  const walk = (node, path) => {
    if (typeof node === 'string') {
      if (/\{slate\.\d+/.test(node)) found.push(`${path}: ${node}`);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === '$comment' || k.startsWith('_')) continue;
      walk(v, `${path}.${k}`);
    }
  };
  for (const [k, v] of Object.entries(tokens)) {
    if (k === 'slate' || k === 'neutral') continue;
    walk(v, k);
  }
  assert.deepEqual(found, [], `slate referenced directly:\n  ${found.join('\n  ')}`);
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `node --test test/build.test.mjs`
Expected: FAIL, listing about 60 paths such as `color.surface.$value: {slate.0}`, `$primaries.azure.on: {slate.0}` and `chart.grid.$value: {slate.200}`.

- [ ] **Step 3: Add the alias ramp**

In `tokens/tokens.json`, directly after the `primary` alias block (the line ending `"800": { "$value": "{azure.800}" } },`), insert:

```json
  "neutral": { "_comment": { "$value": "Alias ramp for every grey in the kit: surfaces, borders, inks, chart grid, and the noir palette. Semantic tokens read THESE, never a neutral ramp directly, so [data-neutral] re-points fourteen declarations instead of re-deriving every semantic per theme. The default is slate, and it must equal the slate entry of $neutrals (asserted in test/build.test.mjs)." },
    "0": { "$value": "{slate.0}" }, "50": { "$value": "{slate.50}" }, "100": { "$value": "{slate.100}" }, "200": { "$value": "{slate.200}" }, "300": { "$value": "{slate.300}" }, "400": { "$value": "{slate.400}" }, "450": { "$value": "{slate.450}" }, "500": { "$value": "{slate.500}" }, "600": { "$value": "{slate.600}" }, "700": { "$value": "{slate.700}" }, "800": { "$value": "{slate.800}" }, "850": { "$value": "{slate.850}" }, "900": { "$value": "{slate.900}" }, "950": { "$value": "{slate.950}" } },
```

- [ ] **Step 4: Rewrite every other slate reference**

The alias block and the ramp are the only places `{slate.` may stay. Rewrite the rest mechanically, then fix the two literals by hand:

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const path = "tokens/tokens.json";
const lines = readFileSync(path, "utf8").split("\n");
let inKept = false;
const out = lines.map((line) => {
  if (/^  "(slate|neutral)": \{/.test(line)) inKept = true;
  else if (/^  "[\w$-]+": /.test(line)) inKept = false;
  return inKept ? line : line.replace(/\{slate\.(\d+)/g, "{neutral.$1");
});
writeFileSync(path, out.join("\n"));
' x
```

Then in `tokens/tokens.json`:

1. `color.border-muted`: change `"$dark": "#1c2130"` to `"$dark": "{neutral.850}"`.
2. `color.surface-stripe`: replace `"$value": "#fbfbfc", "$dark": "#131721"` with `"$value": "color-mix(in srgb, {color.surface-2} 55%, {color.surface})"`, and replace its `$comment` with: `"The zebra tint: 55% of --color-surface-2 over --color-surface, flattened by the build per theme and per neutral. OPAQUE on purpose, and that is the whole reason it is a token rather than a mix written in the table: a frozen column paints this and scrolls over its neighbours, so a translucent stripe would show the rows travelling underneath it."`
3. `color.surface-raised`: change `"$glassDark": "rgba(23,27,38,.90)"` to `"$glassDark": "rgba({neutral.900.rgb},.90)"`.

- [ ] **Step 5: Run the new test and the snapshot, expect PASS**

Run: `npm run build && node --test test/build.test.mjs test/token-snapshot.test.mjs`
Expected: all pass. `--slate-0-rgb`, `--slate-900-rgb` and `--slate-950-rgb` are no longer emitted; the snapshot's `RETIRED` set already allows exactly those three. Any other missing name is a regression. If the snapshot reports `--color-surface-stripe` moved in dark by one unit, the mix's rounding differs from the measured literal; restore `"$dark": "#131721"` beside the mix and note it in the stripe `$comment`.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all pass, including `test/contrast.test.mjs` and `test/color-mix.test.mjs`.

- [ ] **Step 7: Commit**

```bash
git add tokens/tokens.json test/build.test.mjs dist/
git commit -m "refactor(tokens): every grey reads a neutral alias that defaults to slate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The `data-neutral` axis in the build

**Files:**
- Modify: `tokens/tokens.json` (add `$neutrals`)
- Modify: `tokens/build.mjs`
- Modify: `test/build.test.mjs` (append four tests)
- Modify: `dist/*`

**Interfaces:**
- Consumes: the `neutral` alias from Task 3, ramps from Task 2.
- Produces: `export const NEUTRAL_SHADES: string[]`, `export function wantedTriples(tokens, flat): Set<string>`, `export function neutralVariant(tokens, ramp: string): object`, `export function buildNeutralsCss(tokens): string`. CSS blocks `[data-neutral="grey"]`, `[data-neutral="stone"]` and their dark/light twins, emitted after the style axis and before the primary axis.

- [ ] **Step 1: Write the failing tests**

Update the import line at the top of `test/build.test.mjs` to:

```js
import { flatten, resolveValue, buildTokensCss, bundleCss, bundleJs, bundleFullCss, buildMediaCss, buildNeutralsCss, NEUTRAL_SHADES, evalMix, flattenMixes } from '../tokens/build.mjs';
```

Append:

```js
const TOKENS = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
const neutralBlock = (css, sel) => {
  const m = css.match(new RegExp(`\\n${sel.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return m === null ? {} : Object.fromEntries([...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(d => [d[1], d[2].trim()]));
};

test('the neutral alias ramp is the slate entry of $neutrals', () => {
  assert.equal(TOKENS.$neutrals.slate.ramp, 'slate');
  for (const s of NEUTRAL_SHADES) {
    assert.equal(TOKENS.neutral[s].$value, `{slate.${s}}`, `neutral.${s} must default to slate.${s}`);
  }
});

test('a non-default neutral re-points every alias shade, and slate emits nothing', () => {
  const css = buildNeutralsCss(TOKENS);
  for (const name of ['grey', 'stone']) {
    const light = neutralBlock(css, `[data-neutral="${name}"]`);
    for (const s of NEUTRAL_SHADES) {
      assert.equal(light[`--neutral-${s}`], `var(--${name}-${s})`, `[data-neutral="${name}"] --neutral-${s}`);
    }
  }
  assert.doesNotMatch(css, /\[data-neutral="slate"\]/, 'the default re-states nothing');
});

test('tone tints are re-flattened over the neutral surface', () => {
  const css = buildTokensCss(TOKENS);
  const dark = neutralBlock(css, '[data-theme="dark"][data-neutral="stone"]');
  const slateDark = flattenMixes(flatten(TOKENS)).find(t => t.name === 'tone-1-bg').dark;
  /* Independent of the build's diffing: 18% of tone 1 (dark) straight over stone 950. */
  const nodes = new Map([['tone-1', { value: TOKENS.chart['1'].$value, dark: TOKENS.chart['1'].$dark }], ['s', { value: TOKENS.stone['950'].$value }]]);
  const expected = evalMix('color-mix(in srgb, {tone.1} 18%, {s})', nodes, 'dark', 'test');
  assert.notEqual(dark['--tone-1-bg'], slateDark, 'stone dark must not reuse the slate tint');
  assert.equal(dark['--tone-1-bg'], expected);
});

test('noir reaches its channels through the neutral alias', () => {
  const noir = neutralBlock(buildTokensCss(TOKENS), '[data-primary="noir"]');
  const rgb = Object.entries(noir).filter(([k]) => /^--primary-\d+-rgb$/.test(k));
  assert.ok(rgb.length > 0, 'noir emits no primary triples, the selector or the palette changed');
  for (const [k, v] of rgb) assert.match(v, /^var\(--neutral-\d+-rgb\)$/, `${k} is a literal, so it stays slate under any neutral`);
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --test test/build.test.mjs`
Expected: FAIL with `buildNeutralsCss` not exported (SyntaxError on the import).

- [ ] **Step 3: Add `$neutrals` to `tokens/tokens.json`**

Directly after the closing `},` of `$primaries` (the line after the `noir` entry), insert:

```json
  "$neutrals": {
    "_comment": "The neutral axis. Each entry names the Tier-1 ramp the `neutral` alias points at under [data-neutral=\"name\"]. The build flattens the whole token set once per entry and emits only what differs from the default, so tints mixed over a surface and channel triples follow the neutral with no list kept here. slate is the default and emits nothing.",
    "slate": { "ramp": "slate" },
    "grey": { "ramp": "grey" },
    "stone": { "ramp": "stone" }
  },
```

- [ ] **Step 4: Implement in `tokens/build.mjs`**

4a. After `tripleDecls` (line 118), add:

```js
/* The fourteen shades of the neutral alias. Every one gets a channel triple whether or not a token
   asks for it today: the noir palette and the glass panel reach them through the alias, and a
   triple the default never asked for would be missing under exactly the neutral that needs it. */
export const NEUTRAL_SHADES = ['0', '50', '100', '200', '300', '400', '450', '500', '600', '700', '800', '850', '900', '950'];

/** Every token name whose `-rgb` triple the stylesheet must carry. */
export function wantedTriples(tokens, flat) {
  const names = rgbRefsIn([
    ...flat.flatMap(t => [t.value, t.dark, t.compact, t.glass, t.glassDark]),
    ...primaryInkRefs(tokens),
  ]);
  for (const s of NEUTRAL_SHADES) names.add(`neutral-${s}`);
  return names;
}
```

4b. In `buildTokensCss`, replace:

```js
  const wanted = rgbRefsIn([
    ...flat.flatMap(t => [t.value, t.dark, t.compact, t.glass, t.glassDark]),
    ...primaryInkRefs(tokens),
  ]);
```

with:

```js
  const wanted = wantedTriples(tokens, flat);
```

and replace the last line of its template, `${buildStylesCss(flat)}${buildPrimariesCss(tokens)}\`;`, with:

```js
${buildStylesCss(flat)}${buildNeutralsCss(tokens)}${buildPrimariesCss(tokens)}`;
```

4c. In `buildPrimariesCss`, replace:

```js
  const triple = (ref) => hexToTriple(hexOfValue(ref, index));
```

with:

```js
  /* A palette built on the neutral alias (noir) keeps its channels on the alias too. A literal
     triple here would be slate's, and stay slate's under data-neutral. */
  const triple = (ref) => (/^\{neutral\.\d+\}$/.test(ref)
    ? ref.replace(/\}$/, '.rgb}')
    : hexToTriple(hexOfValue(ref, index)));
```

4d. After `buildStylesCss`, add:

```js
/** The token set with the neutral alias pointed at `ramp`. Nothing else differs. */
export function neutralVariant(tokens, ramp) {
  const variant = structuredClone(tokens);
  for (const s of NEUTRAL_SHADES) variant.neutral[s] = { $value: `{${ramp}.${s}}` };
  return variant;
}

/** name -> { light, dark } for every declaration :root and the dark scope would carry, mixes
 *  flattened, dark falling back to light, plus every channel triple. */
function resolvedLeaves(tokens) {
  const flat = flattenMixes(flatten(tokens));
  const index = valueIndex(flat);
  const out = new Map(flat.map(t => [t.name, { light: String(t.value), dark: String(t.dark ?? t.value) }]));
  for (const n of wantedTriples(tokens, flat)) {
    const triple = hexToTriple(hexOfName(n, index));
    out.set(`${n}-rgb`, { light: triple, dark: triple });
  }
  return out;
}

/* The neutral axis. A neutral is the whole token set with the alias re-pointed, so the block it
 * needs is whatever that set resolves to differently from the default: the fourteen alias shades,
 * their triples, and every tint the build flattened over a neutral surface, border or ink. No list
 * of "neutral-dependent tokens" is kept, so a token added later that mixes over the surface follows
 * the axis without anyone remembering to add it.
 *
 * Scoping is the primary axis's, for the same reasons, with one rule added for what the light
 * block already set. On a dark element both the theme's dark block and this light block match at
 * (0,1,0), and this one comes later, so for a key it sets the light value would win in dark. The
 * dark block therefore restates every key whose dark value differs from what would otherwise show.
 *
 * Like data-primary, this takes effect where the semantics are resolved: on <html>, or on a nested
 * element that also carries data-theme (USAGE.md §5b). */
export function buildNeutralsCss(tokens) {
  const spec = tokens.$neutrals;
  if (spec === undefined) return '';
  const base = resolvedLeaves(tokens);
  const out = [];
  for (const [name, n] of Object.entries(spec)) {
    if (name.startsWith('_')) continue;
    const variant = resolvedLeaves(neutralVariant(tokens, n.ramp));
    const light = [...variant].filter(([k, v]) => base.get(k).light !== v.light);
    const lightSet = new Map(light.map(([k, v]) => [k, v.light]));
    const dark = [...variant].filter(([k, v]) => v.dark !== (lightSet.has(k) ? lightSet.get(k) : base.get(k).dark));
    const sel = `[data-neutral="${name}"]`;
    if (light.length > 0) out.push(`${sel} {\n${light.map(([k, v]) => decl(k, v.light)).join('\n')}\n}`);
    if (dark.length > 0) {
      const darkDecls = dark.map(([k, v]) => decl(k, v.dark)).join('\n');
      out.push(
        `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])${sel} {\n${darkDecls}\n  }\n}`,
        `[data-theme="dark"]${sel} {\n${darkDecls}\n}`,
        `[data-theme="light"]${sel} {\n${dark.map(([k, v]) => decl(k, v.light)).join('\n')}\n}`,
      );
    }
  }
  if (out.length === 0) return '';
  return `/* Neutral axis. ${Object.keys(spec).filter(k => !k.startsWith('_')).length} options, see $neutrals in tokens.json. */\n`
    + out.join('\n') + '\n';
}
```

- [ ] **Step 5: Run the new tests, expect PASS**

Run: `npm run build && node --test test/build.test.mjs`
Expected: all pass.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all pass. The snapshot stays green: noir's triples now read `var(--neutral-N-rgb)`, which resolves to the same channels.

- [ ] **Step 7: Commit**

```bash
git add tokens/tokens.json tokens/build.mjs test/build.test.mjs dist/
git commit -m "feat(tokens): data-neutral, a fifth axis with slate, grey and stone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The contrast gate covers every neutral

**Files:**
- Modify: `test/contrast.test.mjs`

**Interfaces:**
- Consumes: `block` from `test/token-scopes.mjs`; the CSS from Task 4.

- [ ] **Step 1: Turn the inline checks into functions**

In `test/contrast.test.mjs`, the four check bodies get reused under every neutral. Replace the body of the first assert loop:

```js
for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast: ${themeName}`, () => {
    for (const p of req) {
      const r = R(p.fg, p.bg, theme);
      assert.ok(r >= p.min, `${themeName}: ${p.label} = ${r.toFixed(2)}:1 (need ${p.min}:1)`);
    }
  });
}
```

with:

```js
/** Every required pairing that fails in `theme`, as readable lines. */
const reqFails = (theme) => req
  .map((p) => ({ p, r: R(p.fg, p.bg, theme) }))
  .filter(({ p, r }) => r < p.min)
  .map(({ p, r }) => `${p.label} = ${r.toFixed(2)}:1 (need ${p.min}:1)`);

for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast: ${themeName}`, () => {
    assert.deepEqual(reqFails(theme), [], `${themeName} fails:`);
  });
}
```

Replace the tone loop body the same way:

```js
/** Tones whose ink falls under AA on their own tint in `theme`. */
const toneFails = (theme) => [1, 2, 3, 4, 5, 6, 7, 8]
  .map((i) => ({ i, r: ratio(parse(theme[`--tone-${i}-ink`], theme), parse(theme[`--tone-${i}-bg`], theme)) }))
  .filter(({ r }) => r < AA_TEXT)
  .map(({ i, r }) => `tone-${i} = ${r.toFixed(2)}:1 (need ${AA_TEXT}:1)`);

for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast, categorical tones: ${themeName}`, () => {
    assert.deepEqual(toneFails(theme), [], `${themeName} tones fail:`);
  });
}
```

In the palette loop, move the `check` calls into a function above the loop and call it:

```js
/** The palette contract (see the comment above `req` for each threshold), failing pairs only. */
const paletteFails = (theme) => {
  const fails = [];
  const check = (fg, bg, min, label) => {
    const r = R(fg, bg, theme);
    if (r < min) fails.push(`${label}: ${r.toFixed(2)} < ${min}`);
  };
  check('--color-on-primary', '--color-primary', AA_TEXT, 'primary button label');
  check('--color-primary', '--color-surface', AA_UI, 'primary fill vs surface');
  check('--color-primary-strong', '--color-surface', AA_TEXT, 'primary ink on surface');
  check('--color-primary-strong', '--color-surface-2', AA_TEXT, 'primary ink on surface-2');
  check('--color-primary-strong', '--color-surface-3', AA_UI, 'primary ink as an icon on surface-3');
  check('--focus-ring', '--color-surface', AA_UI, 'focus ring on surface');
  for (const s of SURF) {
    check('--color-primary-strong', { soft: '--color-primary-soft', on: s }, AA_TEXT,
      `primary-strong on primary-soft/${s.replace('--color-surface', 'surf')}`);
  }
  return fails;
};
```

and the loop's test body becomes:

```js
    test(`WCAG contrast: palette ${name} (${themeName})`, () => {
      const fails = paletteFails(theme);
      assert.deepEqual(fails, [], `palette "${name}" (${themeName}) fails its contract:\n  ` + fails.join('\n  '));
    });
```

Keep the existing cascade-order comment above `const light = …` in that loop. In the glass section, move the ground loop into a function the same way:

```js
/** Glass ink that does not hold over a black or a white ground in `theme`. */
const glassFails = (theme) => {
  const fails = [];
  for (const [groundName, ground] of Object.entries(GROUNDS)) {
    const bg = over(parse(theme['--color-surface-raised'], theme), parse(ground, theme));
    const check = (fg, min, label) => {
      const r = ratio(parse(theme[fg], theme), bg);
      if (r < min) fails.push(`${label} over ${groundName}: ${r.toFixed(2)} < ${min}`);
    };
    check('--color-text', AA_TEXT, 'body text');
    check('--color-text-muted', AA_TEXT, 'muted text');
    check('--color-primary-strong', AA_TEXT, 'primary-strong');
  }
  return fails;
};

for (const [name, theme] of [['LIGHT', GLASS_LIGHT], ['DARK', GLASS_DARK]]) {
  test(`WCAG contrast: glass (${name}) holds over any ground`, () => {
    const fails = glassFails(theme);
    assert.deepEqual(fails, [], `glass (${name}) fails its contract:\n  ` + fails.join('\n  '));
  });
}
```

- [ ] **Step 2: Run, expect the same pass count as before**

Run: `node --test test/contrast.test.mjs`
Expected: all pass, same number of tests as before the refactor.

- [ ] **Step 3: Add the neutral section**

Add `import { block } from './token-scopes.mjs';` with the other imports at the top. Insert, before the `/* --- no component paints TEXT with --color-primary` section:

```js
/* --- the neutral axis ------------------------------------------------------------------------
 *
 * Every pairing above, again under each neutral: the semantic set and the tones in both themes,
 * glass over both grounds, and all 18 palettes. The ramps keep slate's lightness shade for shade,
 * so these should pass with the same headroom; this is what says so. A failure here is fixed in the
 * neutral's ramp, never by moving a threshold. */
const TOKENS = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url)));
const DEFAULT_RAMP = TOKENS.neutral['0'].$value.match(/^\{(\w+)\.0\}$/)[1];
const NEUTRALS = Object.keys(TOKENS.$neutrals).filter((k) => !k.startsWith('_') && TOKENS.$neutrals[k].ramp !== DEFAULT_RAMP);

test('every non-default neutral is actually emitted', () => {
  assert.ok(NEUTRALS.length >= 2, `expected grey and stone, found ${NEUTRALS.join(', ')}`);
  for (const n of NEUTRALS) {
    assert.ok(Object.keys(block(css, `[data-neutral="${n}"]`)).length >= 14,
      `[data-neutral="${n}"] emitted nothing, a neutral that does not resolve is as green as one that passes`);
  }
});

for (const n of NEUTRALS) {
  const nl = block(css, `[data-neutral="${n}"]`);
  const nd = block(css, `[data-theme="dark"][data-neutral="${n}"]`);
  const glassL = styleVars('[data-style="glass"]');
  const glassD = styleVars('[data-theme="dark"][data-style="glass"]');
  const themes = {
    LIGHT: { ...base, ...nl },
    DARK: { ...base, ...darkVars, ...nl, ...nd },
  };
  for (const [themeName, theme] of Object.entries(themes)) {
    test(`WCAG contrast: neutral ${n} (${themeName})`, () => {
      assert.notEqual(theme['--color-surface-2'], themeName === 'LIGHT' ? base['--color-surface-2'] : dark['--color-surface-2'],
        `neutral ${n} must change the resolved surface-2, or this re-tests slate`);
      assert.deepEqual([...reqFails(theme), ...toneFails(theme)], [], `neutral ${n} (${themeName}) fails:`);
    });
  }
  const glassThemes = {
    LIGHT: { ...base, ...glassL, ...nl },
    DARK: { ...base, ...darkVars, ...glassL, ...glassD, ...nl, ...nd },
  };
  for (const [themeName, theme] of Object.entries(glassThemes)) {
    test(`WCAG contrast: neutral ${n}, glass (${themeName}) holds over any ground`, () => {
      assert.deepEqual(glassFails(theme), [], `neutral ${n} glass (${themeName}) fails:`);
    });
  }
  test(`WCAG contrast: neutral ${n} under every palette`, () => {
    const fails = [];
    for (const p of PALETTES) {
      const pl = paletteScope(p, '');
      const pd = paletteScope(p, '[data-theme="dark"]');
      for (const [themeName, theme] of [['LIGHT', { ...base, ...nl, ...pl }], ['DARK', { ...base, ...darkVars, ...nl, ...nd, ...pl, ...pd }]]) {
        for (const f of paletteFails(theme)) fails.push(`${p} ${themeName}: ${f}`);
      }
    }
    assert.deepEqual(fails, [], `neutral ${n} breaks palettes:\n  ` + fails.join('\n  '));
  });
}
```

Note: `css`, `base`, `darkVars`, `dark`, `styleVars`, `paletteScope`, `PALETTES`, `R`, `parse`, `ratio`, `over` and `GROUNDS` are all defined earlier in the file; this block must sit below the glass section, where `styleVars` and `GROUNDS` exist.

- [ ] **Step 4: Run, expect PASS**

Run: `node --test test/contrast.test.mjs`
Expected: all pass, with 2 × (2 + 2 + 1) = 10 new neutral tests plus the emission test.

If a pairing fails: the failing line names the token and the ratio. Lower or raise the lightness of that shade in the failing ramp (in `tokens/tokens.json`, Task 2's block) by the smallest step that clears it, rebuild, rerun. Do not edit thresholds.

- [ ] **Step 5: Prove the neutral tests can fail**

Temporarily set `stone.600` to `#a99f94` (a light shade, so muted text loses contrast), run `npm run build && node --test test/contrast.test.mjs`, and confirm `neutral stone (LIGHT)` fails on `muted text`. Revert with `git checkout tokens/tokens.json && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add test/contrast.test.mjs
git commit -m "test(contrast): every pairing holds under grey and stone, and under every palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: What the axes do on a nested element, pinned and documented honestly

**Files:**
- Create: `browser/fixtures/axis-nesting.html`
- Create: `browser/axis-nesting.mjs`
- Modify: `package.json` (`test:browser` list)
- Modify: `tokens/build.mjs:313-321` (comment above `buildPrimariesCss`)
- Modify: `docs/index.html:490`
- Modify: `COMPONENTS.md:528-531`
- Modify: `dist/*` (the comment change does not reach CSS output, but rebuild to be sure)

- [ ] **Step 1: Write the fixture**

Create `browser/fixtures/axis-nesting.html`:

```html
<!doctype html>
<!-- data-theme="light" is pinned for the same reason as theme-subtree.html: without it the root
     follows prefers-color-scheme and the probes compare across themes. -->
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<title>Freeday: axes on a nested element</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
</head>
<body>
  <div id="root-probe"></div>
  <div data-primary="teal"><div id="primary-bare"></div></div>
  <div data-primary="teal" data-theme="light"><div id="primary-themed"></div></div>
  <div data-neutral="stone"><div id="neutral-bare"></div></div>
  <div data-neutral="stone" data-theme="light"><div id="neutral-themed"></div></div>
</body>
</html>
```

- [ ] **Step 2: Write the test**

Create `browser/axis-nesting.mjs`:

```js
/* Browser regression spec: what data-primary and data-neutral do below <html> (pure CSS).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The semantic tokens are declared on :root, and an inheriting custom property inherits its
 * RESOLVED value, so re-pointing an alias ramp lower in the tree changes nothing a component reads.
 * The axis takes effect on a nested element only when that element also carries data-theme, whose
 * selectors re-declare the semantics there. Until 3.21.0 the docs said a palette worked on any
 * wrapper; this pins what is true so the claim cannot drift back. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('an axis on a nested element needs data-theme beside it', { skip }, async () => {
  await withPage(fixture('axis-nesting.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const read = (id, prop) => p.evalJS(
      `getComputedStyle(document.getElementById(${JSON.stringify(id)})).getPropertyValue(${JSON.stringify(prop)}).trim()`,
    );

    const rootPrimary = await read('root-probe', '--color-primary');
    assert.equal(await read('primary-bare', '--color-primary'), rootPrimary,
      'a bare nested data-primary does not re-brand; if this now differs, update USAGE.md §5b and COMPONENTS.md');
    assert.notEqual(await read('primary-themed', '--color-primary'), rootPrimary,
      'data-primary with data-theme on the same element re-brands that region');

    const rootSurface = await read('root-probe', '--color-surface-2');
    assert.equal(await read('neutral-bare', '--color-surface-2'), rootSurface,
      'a bare nested data-neutral does not re-tint');
    assert.notEqual(await read('neutral-themed', '--color-surface-2'), rootSurface,
      'data-neutral with data-theme on the same element re-tints that region');

    await p.evalJS('document.documentElement.setAttribute("data-neutral", "stone")');
    assert.notEqual(await read('root-probe', '--color-surface-2'), rootSurface,
      'data-neutral on <html> re-tints the whole app');
  });
});
```

- [ ] **Step 3: Register it and run it**

In `package.json`, in the `test:browser` script, insert `browser/axis-nesting.mjs ` directly after `browser/theme.mjs `.

Run: `node --test browser/axis-nesting.mjs`
Expected: PASS (or SKIP when no Chrome; then set `CHROME_BIN` and rerun, a skipped run does not count).

- [ ] **Step 4: Correct the build comment**

In `tokens/build.mjs`, in the comment above `buildPrimariesCss`, replace:

```
 * Scoping follows `data-theme` exactly, and for the same reasons: the selector is bare, so a palette
 * can be set on any ancestor and re-brand one region; the dark scopes are emitted only for the keys
```

with:

```
 * Scoping follows `data-theme` exactly, and for the same reasons: the selector is bare. A palette
 * re-brands where the semantics are resolved, which is <html>, or a nested element that ALSO carries
 * data-theme (browser/axis-nesting.mjs pins both); on a bare wrapper the alias changes and nothing
 * reads it. The dark scopes are emitted only for the keys
```

- [ ] **Step 5: Correct `COMPONENTS.md`**

Replace:

```
`yellow` `lime` `green` `emerald` `teal` `cyan` · `noir`. Set it anywhere `data-theme` works,
including on a wrapper to re-brand one region:
```

with:

```
`yellow` `lime` `green` `emerald` `teal` `cyan` · `noir`. Set it on `<html>`. To re-brand one
region, put it on that region together with `data-theme`: the palette only reaches the semantic
tokens where `data-theme` re-declares them, so on a bare wrapper it changes nothing.
```

- [ ] **Step 6: Correct `docs/index.html`**

On line 490, replace the sentence `Bisa dipasang di <code>&lt;html&gt;</code> atau di wrapper mana pun untuk me-rebrand satu region.` with:

```html
Pasang di <code>&lt;html&gt;</code>. Untuk me-rebrand satu region, pasang di region itu bersama <code>data-theme</code>: palet baru sampai ke token semantic di tempat <code>data-theme</code> mendeklarasikannya ulang, jadi di wrapper polos ia tak mengubah apa-apa.
```

Run the changed prose through `/humanizer:humanizer` before committing.

- [ ] **Step 7: Run docs tests and the suite**

Run: `npm run build && npm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add browser/axis-nesting.mjs browser/fixtures/axis-nesting.html package.json tokens/build.mjs COMPONENTS.md docs/index.html dist/
git commit -m "fix(docs): a palette on a nested element needs data-theme beside it

The docs said data-primary re-brands any wrapper. It only reaches the
semantic tokens where data-theme re-declares them, so a bare wrapper
changes the alias and nothing reads it. A browser test pins both cases,
for data-neutral too.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Neutral switcher in the playground, and the stone review

**Files:**
- Modify: `docs/index.html` (after the primary palette demo that ends near line 500)

- [ ] **Step 1: Add the switcher**

Directly after the closing `</div>` of the `doc-demo` that holds the primary palette buttons, insert:

```html
      <p class="doc-desc"><strong>Netral: <code>data-neutral</code>.</strong> Tiga pilihan untuk semua abu-abu di kit (surface, border, tinta teks, grid chart, palet <code>noir</code>): <code>slate</code> abu kebiruan (default), <code>grey</code> tanpa hue, <code>stone</code> hangat. Setiap shade menjaga kecerahan shade slate bernomor sama, dan setiap pilihan dijaga gerbang kontras di kedua tema dan di bawah ke-18 palet.</p>
      <div class="doc-demo doc-demo--block">
        <div class="doc-swatches" role="group" aria-label="Pilih netral">
          <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" onclick="document.documentElement.removeAttribute('data-neutral')">slate (default)</button>
          <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" onclick="document.documentElement.dataset.neutral='grey'">grey</button>
          <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" onclick="document.documentElement.dataset.neutral='stone'">stone</button>
        </div>
      </div>
```

Run the new Indonesian sentence through `/humanizer:humanizer`.

- [ ] **Step 2: Review stone in dark mode with the owner**

Open `docs/index.html` in a browser, switch to dark theme, click `stone`, and look at the app surfaces, cards, table rows and the sidebar. Show the owner a screenshot. The question: do shades 800 to 950 read as warm grey, or as brown?

If brown: lower stone's chroma cap for shades 800, 850, 900, 950 only. Regenerate those four with this scratch script (not committed), replacing `CAP_DARK` with the agreed value (start at `0.012`):

```bash
node -e '
const CAP_DARK = 0.012;
const lin=c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const unlin=c=>{const v=c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;return Math.round(Math.min(1,Math.max(0,v))*255)};
const toOk=h=>{const [r,g,b]=[1,3,5].map(i=>lin(parseInt(h.slice(i,i+2),16)));const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);const L=.2104542553*l+.793617785*m-.0040720468*s,A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;return [L,Math.hypot(A,B)]};
const fromOk=(L,C,H)=>{const a=C*Math.cos(H*Math.PI/180),b=C*Math.sin(H*Math.PI/180);const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return "#"+[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(unlin).map(v=>v.toString(16).padStart(2,"0")).join("")};
for (const [k,h] of Object.entries({800:"#262b38",850:"#1c2130",900:"#171b26",950:"#0e111a"})) { const [L,C]=toOk(h); console.log(k, fromOk(L, Math.min(C*0.85, CAP_DARK), 70)); }'
```

Put the printed values into `stone.800/850/900/950`, update the `stone` `_comment` to state the dark cap, then `npm run build && npm test` (the contrast gate must stay green).

- [ ] **Step 3: Commit**

```bash
git add docs/index.html tokens/tokens.json dist/
git commit -m "docs(playground): a neutral switcher beside the palette one

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(If stone was not changed, `tokens/tokens.json` and `dist/` have no diff and `git add` is a no-op for them.)

---

### Task 8: `USAGE.md` gains the identity contract and the composition table

**Files:**
- Modify: `USAGE.md` (new §0 before §1 at line 13; §5b extended; new §7b after §7, before the closing `---`)
- Modify: `COMPONENTS.md` (a `data-neutral` paragraph before the primary palette one)
- Modify: `reference/README.md` (table replaced by a link)
- Modify: `test/docs.test.mjs` (DOCS list, one new test)

- [ ] **Step 1: Write the failing docs test**

In `test/docs.test.mjs`, remove the line `  ['reference/README.md', classesInMarkdown],` from `DOCS` (after this task the file names no classes, and the test requires at least one). Then append:

```js
test('USAGE.md carries the identity contract and the composition table', () => {
  const usage = read('USAGE.md');
  assert.match(usage, /^## 0\. App identity/m, 'the identity contract section is missing');
  assert.match(usage, /^## 7b\. Composition/m, 'the composition section is missing');
  assert.match(usage, /app\.identity\.css/);
  assert.match(usage, /data-neutral/);
  for (const archetype of ['Dashboard / admin', 'Master-detail', 'Kanban board', 'Point of sale', 'Community / forum']) {
    assert.ok(usage.includes(archetype), `archetype row "${archetype}" did not move into USAGE.md`);
  }
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --test test/docs.test.mjs`
Expected: FAIL on `the identity contract section is missing`.

- [ ] **Step 3: Write §0**

Insert before `## 1. Type roles: three title levels, not eleven`:

````markdown
## 0. App identity: what the app decides

Freeday supplies components and tokens. How an app looks is the app's decision, made inside the
contract below. An app that changes nothing looks like the kit's docs page, which is correct for
the docs page and a missed decision anywhere else.

The look lives in two places: the `data-*` attributes on `<html>`, and one file,
`app.identity.css`, loaded after the Freeday bundle.

| The app owns | Where |
|---|---|
| Palette (18), neutral (`slate`, `grey`, `stone`), style, density, default theme | `data-primary`, `data-neutral`, `data-style`, `data-density`, `data-theme` on `<html>` |
| Type families: `--font-display`, `--font-body`, `--font-mono` | `app.identity.css` |
| Weights and tracking: `--weight-*`, `--tracking-*` | `app.identity.css` |
| Shape: `--radius-xs` to `--radius-xl` | `app.identity.css` |
| Depth: `--shadow-1` to `--shadow-4`, `--shadow-lift`, `--shadow-lift-hover` | `app.identity.css`, light and dark |
| Motion: `--dur-*`, `--ease-*` | `app.identity.css` |
| One component, locally: `--fdy-<component>-<property>` | your own CSS |

Everything else stays with the kit. Colour reaches an app only through the attributes, because
the attributes are what the contrast gate tests: no `--color-*`, `--tone-*` or `--chart-*` in your
CSS. Spacing (`--space-*`) and control size (`--control-*`) carry density. The type size scale
(`--text-*`, `--leading-*`) sets control heights and table density, so a screen that wants big
type uses `var(--text-xl)` and up in its own content. `--radius-full`, `--bw-*` and the focus ring
are accessibility contracts.

`app.identity.css` is the one file where literal values belong, and only as values of the tokens
in the table. Shadows need four blocks in this order, because the kit sets dark shadows in three
scopes and a lone `:root` rule loses to one of them in each dark mode:

```css
/* app.identity.css: load after @cahyo-dimas/freeday/css. Owned tokens only. */
:root {
  --font-display: 'Fraunces', ui-serif, Georgia, serif;
  --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --radius-sm: 2px;
  --radius-md: 4px;
  --shadow-1: 0 1px 0 rgba(0,0,0,.06);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --shadow-1: 0 1px 0 rgba(0,0,0,.5); }
}
[data-theme="dark"] { --shadow-1: 0 1px 0 rgba(0,0,0,.5); }
[data-theme="light"] { --shadow-1: 0 1px 0 rgba(0,0,0,.06); }
```

Fonts, radius and motion have no dark value and need only the `:root` block. The file loads its
own fonts. A replacement body or display font needs tabular figures (the OpenType `tnum` feature):
stat values, calendar days, chart values and the slider readout set `tabular-nums`, and without
it their digits shift as they change.

**Decide before the first screen.** A new app starts with a short brief in its own `DESIGN.md`,
then `app.identity.css`, then the attributes. Leaving an axis at its default is fine when the
brief says why.

```markdown
## Design brief
- Who uses this, and the one task they do most:
- Density: comfortable | compact, and why
- Mood, in three words (not "clean", "modern" or "intuitive"):
- Axes: data-primary=… data-neutral=… data-style=… default theme=…
- Type: display / body / mono, and why they suit these users
- Shape and depth: radius scale, shadow scale
- Screens and their archetype (§7b):
- One thing this app has that a default Freeday app does not:
```

````

- [ ] **Step 4: Extend §5b**

At the end of §5b (after the paragraph ending `un-rooting it would re-darken the children of a light island.`), add:

```markdown
**`data-primary` and `data-neutral` follow the same selectors, with one difference.** They re-point
an alias ramp, and the semantic tokens resolve that ramp where they are declared: on `<html>`, or
on an element that carries `data-theme`. So put them on `<html>`. To re-brand or re-tint a single
region, put the axis on that region **together with** `data-theme`. On a bare wrapper the alias
changes and nothing reads it. The same goes for an inverted island inside an app with a
non-default neutral: repeat `data-neutral` on the island beside its `data-theme`.
```

- [ ] **Step 5: Write §7b**

Insert after the paragraph that ends `See\n`docs/getting-started.md` §Core concepts.` and before the closing `---`, in three parts.

Part 1, the heading and lead-in:

```markdown
## 7b. Composition: pick the screen's shape first

Decide what kind of screen this is before reaching for components. Freeday owns components and
tokens, not layout, so for most shapes the frame is yours and the kit fills it. This table is the
honest split for 15 common web-app archetypes:

```

Part 2, the table: copy the 17 table lines from `reference/README.md` verbatim (the header row `| # | Archetype | Freeday gives you | You build |`, its separator, and rows 1 to 15). In row 1, change the link target `../docs/reference-screen.html` to `docs/reference-screen.html`, since `USAGE.md` sits at the repo root.

Part 3, after the table:

```markdown

If a shape needs something the kit has no component for, build the shape and fill it with kit
components. Never invent an `fdy-` class for it; the complete list is `COMPONENTS.md`.

Three habits make every app look like the same template, so avoid them:

- **A stats row on top of every screen.** `.fdy-stats` belongs on a screen whose job is the
  numbers. On a list or a form it pushes the work below the fold.
- **A page that is a grid of identical cards.** See §3: one raised element that matters, the rest
  flat.
- **A sidebar for a handful of destinations.** An app with only a few places to go reads better
  with `.fdy-nav.fdy-nav--horizontal` in the app bar (§6b), and gets the width back.
```

- [ ] **Step 6: Document `data-neutral` in `COMPONENTS.md`**

Insert immediately before the paragraph that begins `**Primary palette: \`data-primary\`.**`:

````markdown
**Neutral: `data-neutral`.** Three options for every grey in the kit (surfaces, borders, text
inks, the chart grid, and the `noir` palette): `slate` (the default, and what you get with no
attribute), `grey` (no hue) and `stone` (warm). Each shade keeps the lightness of the slate shade
with the same number, and every option is contrast-gated in both themes and under all 18 palettes.
Set it on `<html>`; on a region, only together with `data-theme` (`USAGE.md` §5b).

```html
<html data-neutral="stone" data-primary="noir">
```

````

- [ ] **Step 7: Replace the table in `reference/README.md`**

Replace everything from `## The 15 archetypes → Freeday` to the end of the file with:

```markdown
## The 15 archetypes

`layout-patterns.png` is the wireframe. The mapping of each archetype to Freeday's primitives ships
with the package now, in [`USAGE.md` §7b](../USAGE.md#7b-composition-pick-the-screens-shape-first),
so a consuming agent can read it from `node_modules`.
```

- [ ] **Step 8: Humanizer pass, then run the docs tests**

Run every new paragraph in `USAGE.md`, `COMPONENTS.md` and `reference/README.md` through `/humanizer:humanizer` (embedded mode, prose only, code and tables untouched).

Run: `node --test test/docs.test.mjs`
Expected: all pass, including the class check on `USAGE.md` (the moved table's classes all exist) and the "no document states how many typed wrappers there are" check.

- [ ] **Step 9: Commit**

```bash
git add USAGE.md COMPONENTS.md reference/README.md test/docs.test.mjs
git commit -m "docs(usage): what an app owns, and the screen shapes, ship in the package

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The agent paste block asks for a design decision

**Files:**
- Modify: `docs/agent-onboarding.md` (§1 block lines 18-20, the "Before writing" list, non-negotiables 1 and 8; §3 steps 0, 2 and 3)
- Modify: `docs/getting-started.md:60` (font clause)
- Modify: `test/docs.test.mjs` (one new test)

- [ ] **Step 1: Write the failing test**

Append to `test/docs.test.mjs`:

```js
test('the onboarding block sends a new app through the identity contract first', () => {
  const block = read('docs/agent-onboarding.md');
  assert.doesNotMatch(block, /All UI in this project is built from Freeday/,
    'the opening still tells agents the look is not theirs to decide');
  assert.match(block, /USAGE\.md` §0/, 'the block must point at the identity contract');
  assert.match(block, /USAGE\.md` §7b/, 'the block must point at the composition table');
  assert.match(block, /DESIGN\.md/, 'the block must ask for the design brief');
  assert.doesNotMatch(block, /reference\/README\.md/, 'the archetype table ships in USAGE.md now');
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --test test/docs.test.mjs`
Expected: FAIL on the opening sentence.

- [ ] **Step 3: Rewrite the opening**

In `docs/agent-onboarding.md`, replace:

```
All UI in this project is built from Freeday: a **token-driven CSS kit** (`fdy-*` classes on plain
markup) with **typed components for Vue, React and Blazor** layered on top. Most of the kit is
```

with:

```
This project's components and tokens come from Freeday: a **token-driven CSS kit** (`fdy-*` classes
on plain markup) with **typed components for Vue, React and Blazor** layered on top. How the app
looks (type, shape, depth, palette, neutral, and the shape of each screen) is decided for this app,
inside the contract in `USAGE.md` §0. Most of the kit is
```

- [ ] **Step 4: Add the design step to the "Before writing" list**

After the bullet that starts `` - `node_modules/@cahyo-dimas/freeday/docs/screen-states.md` ``, add:

```markdown
- **Starting a new app, decide the look before the first screen.** Write the design brief from
  `USAGE.md` §0 into this project's `DESIGN.md`, then `app.identity.css` from the template beside
  it, then set `data-primary`, `data-neutral`, `data-style`, `data-density` and the default theme on
  `<html>`. Keeping a default is allowed when the brief says why. Then pick each screen's
  archetype from `USAGE.md` §7b before writing its markup.
```

- [ ] **Step 5: Reword non-negotiables 1 and 8**

Replace:

```
1. No raw hex or px in app CSS. Use tokens: `var(--color-primary)`, `var(--space-4)` (4px scale),
   `var(--radius-md)`, `var(--shadow-1)`, `var(--dur-2)`.
```

with:

```
1. No raw hex or px in app CSS. Use tokens: `var(--color-primary)`, `var(--space-4)` (4px scale),
   `var(--radius-md)`, `var(--shadow-1)`, `var(--dur-2)`. The one exception is `app.identity.css`,
   which gives the tokens listed in `USAGE.md` §0 their literal values and sets nothing else.
```

Replace:

```
8. Freeday owns components + tokens, **not layout**. Grids/stacks/one-off gaps come from our own
   layout layer. Build its theme on `var(--space-N)` so both systems stay in step.
```

with:

```
8. Freeday owns components + tokens, **not layout**. Grids/stacks/one-off gaps come from our own
   layout layer. Build its theme on `var(--space-N)` so both systems stay in step. Each screen's
   shape comes from the archetype table in `USAGE.md` §7b: not every screen opens with a stats
   row, a page is not a grid of identical cards, and an app with a few destinations uses a
   horizontal `.fdy-nav` in the app bar instead of a sidebar.
```

- [ ] **Step 6: Fix §3 steps 0, 2 and 3**

Replace step 0 (from `0. **Pick the screen shape first.**` through `Not in the npm package, so read it on GitHub.`) with:

```
0. **Pick the screen shape first.** Which archetype is this: dashboard, master-detail, kanban,
   wizard, POS…? `USAGE.md` §7b maps 15 archetypes to the primitives that compose each one, and
   says plainly which shapes the kit has **no** component for (kanban columns, calendar month grid,
   chat bubbles, canvas), so you build the frame instead of inventing a class.
```

At the end of step 2 (after `so never hand-colour an inverted panel.`), add:

```
   `data-primary` and `data-neutral` are set once on `<html>`; on a region they only take effect
   beside a `data-theme` on the same element (`USAGE.md` §5b).
```

Replace step 3:

```
3. **Fonts:** the package ships **no** `@font-face`. Load Sora / IBM Plex Sans / JetBrains Mono
   yourself, or override `--font-display`/`--font-body`/`--font-mono`. Skipping this reads as
   "unfinished design", not "missing dependency".
```

with:

```
3. **Fonts:** the package ships **no** `@font-face`. Choose the families in `app.identity.css`
   (`USAGE.md` §0) and load them yourself; the defaults are Sora / IBM Plex Sans / JetBrains Mono.
   Skipping this reads as "unfinished design", not "missing dependency".
```

- [ ] **Step 7: Fix `docs/getting-started.md`**

On line 60, replace `(Or a `<link>` to your own self-hosted copies, or override `--font-display`/`--font-body`/`--font-mono`` up to the end of that parenthetical with a pointer: `(Or a <link> to your own self-hosted copies. Choosing different families is part of the app's identity: see USAGE.md §0.)`. Read lines 55-64 first and keep the surrounding sentence intact; only the font-override clause changes.

- [ ] **Step 8: Humanizer pass, then run all docs tests**

Run each changed sentence through `/humanizer:humanizer` (embedded mode). Then:

Run: `node --test test/docs.test.mjs`
Expected: all pass, including `the list of components without a wrapper names none that has one` (the "no wrapper" sentence is untouched).

- [ ] **Step 9: Commit**

```bash
git add docs/agent-onboarding.md docs/getting-started.md test/docs.test.mjs
git commit -m "docs(onboarding): a new app decides its look before its first screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Release notes and version 3.21.0

**Files:**
- Modify: `CLAUDE.md` (theming section, `reference/` paragraph)
- Modify: `CHANGELOG.md` (new top entry)
- Modify: `HANDOFF.md`, `NEXT-UP.md`
- Modify: `docs/superpowers/specs/2026-11-20-app-identity-design.md` (deviations)
- Modify: `package.json`, `package-lock.json` (version)

- [ ] **Step 1: Bump the version**

Run: `npm version minor --no-git-tag-version`
Expected: `v3.21.0`. The `version` script rebuilds `dist/` and stages it.

- [ ] **Step 2: CHANGELOG entry**

Read the top two entries of `CHANGELOG.md` and match their shape (heading, sections, tone). The 3.21.0 entry covers: the `data-neutral` axis and its three values; the identity contract and brief in `USAGE.md` §0; the composition table now shipping in `USAGE.md` §7b; the onboarding block changes; the corrected nesting claim for `data-primary` (what was claimed, what is true, the `data-theme` pairing); the fact that output without `data-neutral` is unchanged, held by `test/token-snapshot.test.mjs`; and the three Tier-1 triples no longer emitted (`--slate-0-rgb`, `--slate-900-rgb`, `--slate-950-rgb`), with their replacements `--neutral-0-rgb`, `--neutral-900-rgb`, `--neutral-950-rgb` for anyone who read them directly. Run it through `/humanizer:humanizer`.

- [ ] **Step 3: `CLAUDE.md`**

In the theming section, after the `data-primary` bullet, add a `data-neutral="slate|grey|stone"` bullet in the file's Indonesian: it re-points the `--neutral-*` alias ramp that every grey reads; slate is the default; grey and stone keep slate's lightness per shade; gated in both themes and under all 18 palettes. Change "3 sumbu" in the section heading to the right count. In the `reference/` paragraph, say the archetype table moved to `USAGE.md` §7b. Humanizer pass.

- [ ] **Step 4: `HANDOFF.md` and `NEXT-UP.md`**

`HANDOFF.md`: current version 3.21.0, the fifth axis, and where the identity contract lives. `NEXT-UP.md`: add sub-projects B (identity presets: `inbox`, `feed`, `thread`, `ledger`, `workspace`, `board`, each an identity file plus one reference screen) and C (an MCP server shipped as a bin in the package, with `check_identity`) as the next candidates, with this release as their trigger. Humanizer pass.

- [ ] **Step 5: Record the plan's deviations in the spec**

In `docs/superpowers/specs/2026-11-20-app-identity-design.md`:
- D3 table, `--color-surface-stripe` row, "Change" cell: `written as color-mix(in srgb, {color.surface-2} 55%, {color.surface}), which reproduces both slate literals to the byte, so the build re-flattens it per neutral.`
- D3 table, new row: `` `--color-border-muted` dark `` | `` literal `#1c2130` `` | `becomes {neutral.850}; slate gains an 850 shade with that value, and grey and stone get an 850 by the §3 method.`
- D3, the flattened-blends row: replace the guard sentence with `The build flattens the whole token set per neutral and emits what differs, so no mix can miss the neutral and no extra guard is needed.`
- §3: add the 850 row (`#1c2130`, `#222222`, `#282017`, or the reviewed stone value from Task 7) and change "thirteen shades" in D2 to "fourteen", adding `850` to the list.
- §5, first bullet: replace `test/baseline.test.mjs` with `test/token-snapshot.test.mjs, against values captured from 3.20.0`.

- [ ] **Step 6: Full verification**

Run: `npm test && npm run test:browser`
Expected: all pass. Paste the summary lines (`# pass`, `# fail`) into the commit body. If `test:browser` skips for lack of Chrome, say so in the commit body instead of claiming it passed.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md CHANGELOG.md HANDOFF.md NEXT-UP.md docs/superpowers/specs/2026-11-20-app-identity-design.md package.json package-lock.json dist/
git commit -m "chore(release): 3.21.0, an app owns its look

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

No tag, no publish. Tell the owner the release commit is ready.
