# Freeday: App identity layer (Design Spec)

- **Status:** Approved 2026-11-20. Both questions in §9 answered by the owner.
- **Date:** 2026-11-20
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 3.20.0
- **Scope:** tokens, build, contrast gate, docs, agent onboarding. No component CSS changes, no
  enhancer changes, no adapter changes.
- **Sub-project A of three.** B (identity presets with one reference screen each) and C (an MCP
  server shipped inside the package) get their own specs. Both depend on this one: a preset is an
  identity file plus a screen, and the MCP's `check_identity` tool checks against the contract
  defined here.

---

## 1. Problem

An agent told to build an app "with Freeday" produces an app that looks like the kit's docs page.
It writes no CSS of its own, keeps Sora, IBM Plex, azure and slate, and lays every screen out as a
sidebar plus a grid of cards. The owner currently gets a distinct result only by designing the app
first in Claude Design, with Freeday as the design system, and handing that to the coding agent.

The cause is in what the kit tells agents, not in the agent:

- The block an app pastes into its agent instructions opens with "All UI in this project is built
  from Freeday" (`docs/agent-onboarding.md` §1) and continues with nine prohibitions. Nothing in it
  says which parts of the look belong to the app.
- The tokens that carry identity are already overridable (`--font-*`, `--radius-*`, `--shadow-*`,
  `--dur-*`, `--ease-*`) and four `data-*` axes exist. The only shipped mention of overriding any of
  them is one clause about fonts in `docs/getting-started.md`.
- Rule 8 says Freeday "owns components + tokens, not layout" without asking the agent to design the
  layout. The one document that maps screen shapes to components, the 15-archetype table in
  `reference/README.md`, is never shipped, so no consuming agent has seen it.
- The neutral ramp is fixed. Every surface, border and grey ink reads `slate`, a cool blue-grey.
  Much of what separates a mail client from a social thread from a notes app is the temperature of
  its greys, and an app cannot change it without breaking the "no `--color-*` override" rule.

The owner's complaint covers both the skin (fonts, colour, shape, depth) and the composition (every
screen has the same shape). This spec addresses both: the skin through an identity contract and a
new neutral axis, the composition through a design-direction step and the archetype table.

## 2. Decisions

### D1. The identity contract: what an app owns

An app's look is set in two places: `data-*` attributes on `<html>`, and one file,
`app.identity.css`, loaded after the Freeday bundle. The file may set the tokens in the "owned"
column and nothing else.

| Owned by the app | How |
|---|---|
| Primary palette (18), neutral (D2), style, density, default theme | `data-primary`, `data-neutral`, `data-style`, `data-density`, `data-theme` on `<html>` |
| Type families: `--font-display`, `--font-body`, `--font-mono` | `app.identity.css` |
| Weights and tracking: `--weight-*`, `--tracking-*` | `app.identity.css` |
| Shape: `--radius-xs` through `--radius-xl` | `app.identity.css` |
| Depth: `--shadow-1` through `--shadow-4`, `--shadow-lift`, `--shadow-lift-hover` | `app.identity.css`, light and dark (see below) |
| Motion: `--dur-*`, `--ease-*` | `app.identity.css` |
| Local component overrides: `--fdy-<component>-<property>` | app CSS, as today |

Locked, for the reason given:

| Locked | Why |
|---|---|
| Every `--color-*`, `--tone-*`, `--chart-*` | Colour reaches the app only through the `data-*` axes, because the axes are what the contrast gate tests. A hand-set colour token is untested. |
| `--space-*`, `--control-*` | Spacing and control height carry the density axis and the 4px rhythm. |
| `--text-*` (size scale), `--leading-*` | Control heights and table density are built on the size scale. A screen that wants large type uses `var(--text-xl)` and up in its own content CSS. |
| `--radius-full`, `--bw-*`, `--focus-ring*` | Pills must stay pills; border width and the focus ring are accessibility contracts. |

`app.identity.css` is the one file in an app where literal values (a font stack, `4px`, a shadow) are
allowed, and only as values of owned tokens. Non-negotiable 1 ("no raw hex or px in app CSS") is
reworded to say so.

**Shadows need four scopes, in this order.** The kit declares dark shadows under
`:root:not([data-theme="light"])` inside the dark-scheme media query (specificity 0,2,0) and under
`[data-theme="dark"]` (0,1,0), and re-asserts light under `[data-theme="light"]`. An app that only
writes `:root { --shadow-1: … }` gets its light shadow in explicit dark mode (its `:root` rule comes
later at equal specificity) and the kit's shadow in system dark mode. The shipped template states
all four scopes in the right order, so the agent copies the shape instead of deriving it:

```css
/* app.identity.css: load after @cahyo-dimas/freeday/css. Owned tokens only (USAGE.md, "App identity"). */
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

Tokens without a dark value (fonts, radius, motion) need only the `:root` block.

**Fonts.** The identity file loads its own fonts. A replacement `--font-body` or `--font-display`
must have tabular figures: `.fdy-stat__value`, the datepicker days, chart values and the slider
readout set `font-variant-numeric: tabular-nums`, and a font without a `tnum` feature makes their
digits jitter.

**Enforcement in v1 is doctrine only.** Nothing in a consuming project can run the kit's tests. The
machine check is `check_identity` in sub-project C. Until then the template and the brief (D5) carry
the contract.

### D2. A fifth axis: `data-neutral`

The neutral ramp becomes an axis built the same way `data-primary` is.

- **Alias ramp.** A Tier-1 alias `neutral.*` with the thirteen shades the semantics consume (`0 50
  100 200 300 400 450 500 600 700 800 900 950`), defaulting to `slate`. Every `{slate.N}` reference
  outside the `slate` ramp itself becomes `{neutral.N}`, in `$value` and `$dark` alike. That covers
  the semantic colours (surface, text, border, control border, inverse, the `on-*` inks), the channel
  triples that read slate, `chart.grid`, `chart.tick`, and the `noir` primary palette (D4).
- **`$neutrals` in `tokens.json`**, three entries:

  | Value | Character | Ramp |
  |---|---|---|
  | `slate` (default) | cool blue-grey, today's look | existing `slate` |
  | `grey` | no hue at all | new Tier-1 `grey` |
  | `stone` | warm | new Tier-1 `stone` |

  The hueless neutral is named `grey`: not `zinc`, which in Tailwind is slightly cool, and spelled
  the way the rest of the kit spells (`colour`, `optimisation`).
- **`buildNeutralsCss`**, next to `buildPrimariesCss`, emits for each non-default neutral the alias
  shades, the channel triples the tokens ask for, and the flattened blends of D3, under the same
  three scopes the primary axis uses (dark media query, `[data-theme="dark"]`, `[data-theme="light"]`
  re-assert). `slate` emits nothing: it is what `:root` already says.
- **No change for existing consumers.** Without the attribute, `dist/freeday.tokens.css` resolves to
  the same values as 3.20.0. `test/baseline.test.mjs` asserts it.

### D3. Everything that silently assumed slate

The review traced every place a slate value reaches output without going through a reference. Each
one has to follow the neutral or the warm theme ships with cool pieces in it.

| Where | Today | Change |
|---|---|---|
| Flattened blends: `--tone-N-bg`, `--tone-N-ink`, `--tone-N-border`, `--color-danger-border`, and any other `color-mix()` the build flattens | computed once, over slate surface, text and border | `buildNeutralsCss` flattens each blend per neutral and emits it only where it differs. The existing guard that throws on a mix in an unflattened axis is extended: a mix whose chain reaches `neutral.*` and is not flattened per neutral fails the build. |
| `--color-surface-stripe` | literals `#fbfbfc` / `#131721` | moves into `$neutrals` as `stripe` / `stripeDark` per entry; `:root` and the theme scopes read the `slate` entry, so the default output is the same two literals. No mix weight reproduces them exactly, which is why this is a measured value per entry instead of a blend. The `grey` and `stone` values sit at the same relative position between their own `0`/`50` and `950`/`900`. |
| Glass dark surface `rgba(23,27,38,.90)` | literal; `23,27,38` is `slate.900` | becomes `rgba({neutral.900.rgb},.90)`. Same output for slate. |
| `noir` primary palette | aliases `{slate.N}` directly | aliases `{neutral.N}`, so a black primary on a warm app is a warm black. |
| `chart.grid`, `chart.tick` | `{slate.N}` | `{neutral.N}` (covered by D2's rewrite, listed here because they sit outside `color`). |
| `--color-scrim`, shadow tints `rgba(16,14,30,…)`, `--color-shadow-inset` | literals | **unchanged.** A scrim at 50% and shadows at 4 to 33% carry no visible hue, and shadows are app-owned anyway (D1). |

### D4. Scoping: what the axes do on a nested element

Verified 2026-11-20 in Chromium against `dist/freeday.tokens.css` (3.20.0):

| Markup | `--primary-600` | `--color-primary` |
|---|---|---|
| `<html>` default | `#2050d8` | `#2050d8` |
| `<div data-primary="teal">` | `#0d9488` | `#2050d8` (unchanged) |
| `<div data-primary="teal" data-theme="light">` | `#0d9488` | `#0d9488` |

Semantic tokens are declared on `:root` and an inheriting custom property inherits its resolved
value, so redefining the alias ramp lower in the tree changes nothing a component reads. The palette
takes effect on a nested element only when the same element also carries `data-theme`, whose
selectors re-declare the semantics there. `docs/index.html` claims the palette can be set "on
`<html>` or any wrapper to re-brand a region", and the comment above `buildPrimariesCss` says the
same. Both are wrong.

`data-neutral` uses the same mechanism and gets the same behaviour. Decision:

- The documented contract for both axes: set on `<html>`. On a nested region, set it together with
  `data-theme` on the same element.
- Correct the claim in `docs/index.html` and the build comment. Add a browser test that pins the
  three rows of the table above for both axes, so the contract cannot drift back.
- Making a bare nested palette work (re-declaring every alias-reading semantic under each palette,
  per theme) is not done. No app has asked for it, and the `data-theme` pairing already covers the
  "one branded panel" case.

### D5. Design direction before the first screen

The paste block in `docs/agent-onboarding.md` changes in three places.

1. **The opening.** It stops saying "All UI in this project is built from Freeday" and says what is
   true: Freeday supplies the components and tokens, and the app's look is the app's decision,
   within the identity contract in `USAGE.md`.
2. **A new step 1, before any markup in a new app.** The agent writes a design brief into the
   consuming project's `DESIGN.md`, then `app.identity.css`, then sets the axes on `<html>`. Leaving
   every axis at its default is allowed, and the brief has to say why. The brief template ships in
   `USAGE.md`:

   ```markdown
   ## Design brief
   - Who uses this, and the one task they do most:
   - Density: comfortable | compact, and why
   - Mood, in three words (not "clean", "modern" or "intuitive"):
   - Axes: data-primary=… data-neutral=… data-style=… default theme=…
   - Type: display / body / mono, and why they suit these users
   - Shape and depth: radius scale, shadow scale
   - Screens and their archetype (USAGE.md, "Composition"):
   - One thing this app has that a default Freeday app does not:
   ```

3. **Composition rules** join the non-negotiables. Pick each screen's archetype from the table
   before writing markup. Do not open every screen with a stats row. Do not make a page a grid of
   identical cards (`USAGE.md` §3 already says this for elevation; the rule now names it as a
   composition failure too). An app with only a few destinations uses the horizontal `.fdy-nav` in
   the app bar instead of a sidebar.

The existing steps and non-negotiables otherwise stay as they are.

### D6. The archetype table ships

The 15-archetype table moves from `reference/README.md` into a new `USAGE.md` section,
"Composition: pick the screen's shape first". `reference/README.md` keeps the provenance rows and
links to the new section. `docs/agent-onboarding.md` line 165 currently links agents to the
`reference/` copy on GitHub; it points at the shipped `USAGE.md` instead. `test/docs.test.mjs`
already checks the classes named in `reference/README.md`; that check moves with the table.

## 3. Neutral ramp values

`grey` and `stone` keep slate's lightness at every shade, so every contrast ratio the gate measures
for slate moves by at most a few hundredths. Method: convert each slate shade to OKLCH, keep `L`,
set `C = 0` for `grey`, and for `stone` set hue 70 with `C = min(0.85 × C_slate, 0.020)`. The values
are computed once by a script and committed as literals; the build does no OKLCH maths.

| Shade | slate | grey | stone (candidate) |
|---|---|---|---|
| 0 | `#ffffff` | `#ffffff` | `#ffffff` |
| 50 | `#f7f8fa` | `#f8f8f8` | `#f9f8f6` |
| 100 | `#eef0f4` | `#f0f0f0` | `#f2efed` |
| 200 | `#e0e3ea` | `#e3e3e3` | `#e7e2dd` |
| 300 | `#cbd0da` | `#d0d0d0` | `#d5cfc7` |
| 400 | `#99a1b3` | `#a1a1a1` | `#a99f94` |
| 450 | `#798295` | `#828282` | `#8a8075` |
| 500 | `#6b7488` | `#747474` | `#7c7268` |
| 600 | `#4d5568` | `#555555` | `#5d5449` |
| 700 | `#3a4152` | `#414141` | `#484036` |
| 800 | `#262b38` | `#2b2b2b` | `#322a21` |
| 900 | `#171b26` | `#1b1b1b` | `#211a12` |
| 950 | `#0e111a` | `#111111` | `#161009` |

Relative luminance of every candidate is within 1.5% of the slate shade it replaces. The `stone`
dark end (800 to 950) reads brown rather than warm grey at this chroma. It is reviewed in the
playground in dark mode before the values freeze, and its chroma may be lowered for those shades.
The gate decides whether any value ships; the eye decides only between values that pass.

## 4. Order of work

1. Add the `grey` and `stone` Tier-1 ramps (§3), with a `$comment` that records the method.
2. Add the `neutral` alias ramp and rewrite every `{slate.N}` reference outside Tier 1 to it (D2).
   Rebuild; the baseline test must show no change.
3. Move the slate-assuming literals (D3): stripe into `$neutrals`, glass dark onto the triple,
   `noir` onto the alias.
4. Add `$neutrals` and `buildNeutralsCss`, including per-neutral flattening and the extended guard.
5. Extend `test/contrast.test.mjs` (§5).
6. Scoping (D4): the browser test, then the corrected wording in `docs/index.html` and
   `tokens/build.mjs`.
7. Docs (§6), each prose change through `/humanizer:humanizer`.
8. Release 3.21.0 (§7).

## 5. Verification

- **Baseline.** `test/baseline.test.mjs`: with no `data-neutral`, every token resolves to its
  3.20.0 value in both themes, both densities and both styles.
- **Contrast.** `test/contrast.test.mjs` runs every existing semantic, tone and glass pair under each
  neutral in both themes, and every primary palette under each neutral in both themes (18 × 3 × 2 =
  108 palette runs). The glass alpha floors (.82 light, .90 dark) are re-measured under `grey` and
  `stone`; if one fails, the neutral's ramp is adjusted, not the alpha.
- **Emission.** Every neutral emits a non-empty block, and no `{slate.N}` reference remains outside
  Tier 1 and the `slate` entry of `$neutrals`. The second check is a grep over `tokens.json` and
  catches the next token someone adds with a hard slate reference.
- **Flattening.** For `stone` in dark mode, `--tone-1-bg` differs from slate's, and equals the blend
  computed over stone's surface.
- **Scoping.** A browser test pins D4's table for `data-primary` and `data-neutral`.
- **Docs.** `test/docs.test.mjs` checks that the `USAGE.md` sections "App identity" and
  "Composition" exist, that the onboarding block links to them, and that every class in the moved
  archetype table exists.

## 6. Documentation impact

| File | Change |
|---|---|
| `USAGE.md` | New "App identity" section: the D1 contract, the template, the brief. New "Composition" section: the archetype table and the composition rules. `data-neutral` added to theme §5b, with the D4 nesting contract. |
| `docs/agent-onboarding.md` | D5: new opening, new step 1, composition rules, reworded non-negotiable 1, link fix at line 165. |
| `COMPONENTS.md` | `data-neutral` wherever the theming attributes are listed. |
| `docs/getting-started.md` | The font clause becomes a pointer to "App identity". |
| `docs/index.html` | Neutral switcher beside the primary switcher; corrected nesting claim. |
| `reference/README.md` | Table replaced by a link to `USAGE.md`. |
| `CLAUDE.md` | Theming section lists the fifth axis; the `reference/` paragraph says the table moved. |
| `CHANGELOG.md`, `HANDOFF.md`, `NEXT-UP.md` | Release entry; current state; B and C recorded as the next candidates with this spec as their trigger. |

The owner's personal `freeday` skill (`~/.claude/skills/freeday/SKILL.md`, outside this repo) should
point at the new step 1 once 3.21.0 is published. That edit is not part of this spec's commit.

## 7. Versioning

Minor: **3.21.0**. One new attribute, two new ramps, one new alias ramp, and no value changes
without the attribute. The D4 correction changes documentation of existing behaviour, not the
behaviour.

## 8. Not in this spec

- Identity presets (sub-project B). Their working list, for the record: `inbox` (mail client,
  master-detail), `feed` (social feed), `thread` (single-column threads, monochrome), `ledger`
  (dense accounting dashboard), `workspace` (notes and documents), `board` (kanban). Presets take
  design decisions from well-known products and none of their names, logos or brand colours.
- The MCP server (sub-project C), including `check_identity`.
- Custom hex neutrals or primaries. Every colour stays behind a gated axis.
- An app-owned type size scale.
- A bare nested `data-primary` or `data-neutral` without `data-theme` (D4).

## 9. Questions put to the owner, and the answers

1. Name of the hueless neutral. **Answered 2026-11-20: `grey`.**
2. The four-scope shadow template in D1 is verbose. The alternative was new owned tokens per shadow
   (`--app-shadow-1-light` and so on) read by the kit, which would change the kit's own shadow
   tokens. **Answered 2026-11-20: keep the template.**
