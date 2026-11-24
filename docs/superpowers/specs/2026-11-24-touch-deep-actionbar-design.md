# Freeday: Touch density, deep primary fill, action bar, and the mobile doctrine (Design Spec)

- **Status:** Approved 2026-11-24.
- **Date:** 2026-11-24
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 3.21.0. Target release: **3.22.0**.
- **Scope:** tokens, build, one component stylesheet, tests, docs. No enhancer changes, no adapter
  changes (the new component is CSS only).
- **Sub-project B1 of two.** B2 (identity presets `ledger`, `inbox`, `thread`, `field`, each with a
  desktop and a mobile reference screen) gets its own spec and builds on this release.

---

## 1. Problem

3.21.0 gave an app a contract for its look. The first real app measured against it, Ronda (a
neighbourhood-security PWA on Freeday 3.20.0, `Portofolio/keamanan-cluster`), breaks the contract in
two places, and in both the need is real:

1. **`--control-h: 2.75rem`** in `src/styles/app.css`. Guards use the app standing up, sometimes
   with gloves; 44px is the target they hit reliably. The contract locks `--control-*`, and the
   density axis offers only `comfortable` (40px) and `compact` (32px).
2. **`:root[data-primary='teal'] { --color-primary: var(--primary-700); … --color-on-primary:
   var(--slate-0) }`**. Ronda wants white labels on a deeper teal (5.5:1). The kit's `teal` palette
   uses dark ink on teal-600 instead. Both pass AA; the difference is a design choice the contract
   has no sanctioned way to make.

Ronda's mobile screens also show that the kit's mobile rules exist but are not found. Its list
screens render the desktop table on a phone, with three stacked action buttons per row; its bottom
nav carries six items; the page header sits inside a card; the primary action sits mid-page and
scrolls away; a List/Box/Grid switch is offered on a 390px screen. COMPONENTS.md already says the
bottom nav holds three to five items and that a table becomes a `.fdy-list` below `md`. Those rules
live in a 170 KB reference that agents skim, and nothing in USAGE.md collects them.

One pattern Ronda needs has no component: a bar of actions pinned to the bottom of a phone screen
(its sign-in button; the approve/reject pair B2's `inbox` preset will need).

## 2. Decisions

### D1. `data-density="touch"`

A third value on the existing density axis.

- It sets **`--control-h: 2.75rem`** (44px) and nothing else. Spacing stays at the comfortable
  values: touch means bigger targets, not a looser layout.
- Tokens carry it as `$touch`, beside `$compact`. The build emits `[data-density="touch"]` from every
  token with a `$touch` value, the same way it emits `[data-density="compact"]`.
- `[data-density="comfortable"]` must reset **every key either `compact` or `touch` sets**, so a
  comfortable region inside a touch root (or a compact one) really returns to the defaults. Today the
  comfortable block is derived from the compact keys only; it becomes the union.
- Scoping is the existing density scoping: the selector is bare, so the attribute works on `<html>`
  or on any ancestor (density, unlike the palette axes, re-declares the tokens components read
  directly, so a nested value takes effect). Ronda can set `touch` on the POS shell and keep the
  admin screens `comfortable`.
- `.fdy-btn--sm` stays `calc(var(--control-h) - var(--space-2))`, which is 36px under `touch`. The
  docs say to avoid `--sm` on a touch screen rather than special-casing it in CSS.

### D2. `data-primary-fill="deep"`

A sub-axis of the primary palette, for any of the 18 palettes and the default.

- **Light theme only.** It re-points these semantic tokens one step deeper:

  | Token | Standard | Deep |
  |---|---|---|
  | `--color-primary` | `{primary.600}` | `{primary.700}` |
  | `--color-primary-hover` | `{primary.700}` | `{primary.800}` |
  | `--color-primary-active` | `{primary.800}` | `{primary.800}` |
  | `--color-primary-strong` | `{primary.700}` | `{primary.800}` |
  | `--color-primary-rgb` | `{primary.600.rgb}` | `{primary.700.rgb}` |
  | `--focus-ring` | `{primary.600}` | `{primary.700}` |
  | `--color-on-primary` (+ `-rgb`) | palette `on` | palette `onDeep` |

  `--color-primary-soft` and `--color-primary-border` (the wash and its edge) do not change. Active
  stays at 800 because the alias ramp has no 900, and adding one to all 19 palette blocks for a
  pressed state is not worth it; hover and active share a shade, as in Ronda.
- **`onDeep`** is a new field on every `$primaries` entry: the label ink on the deep fill, measured,
  not guessed. White where white clears 4.5:1 on the 700 shade; dark ink (`{neutral.950}`) where it
  does not. The contrast gate asserts every value.
- **Dark theme is unchanged.** Dark fills use shades 500/400/300, already lighter than the surface
  needs; a deeper fill there lowers fill-against-surface contrast. The build therefore emits dark
  re-asserts so a `deep` root in dark mode shows the palette's normal dark values.
- **Scoping** follows the palette axis exactly (D4 of the 3.21.0 spec): set it on `<html>`, or on a
  region together with `data-theme` (and `data-primary` if the region needs one).
- **Emission.** Per palette (and the default azure, matched by `[data-primary-fill="deep"]` without a
  palette): a light block at specificity above the palette's own block, its `[data-theme="dark"]`
  twin and system-dark media twin restating the palette's dark values for the same keys, and a
  `[data-theme="light"]` re-assert. The plan fixes the exact selectors; the contrast gate and a
  browser test fix the behaviour.

### D3. `.fdy-actionbar`

A bar of one to three actions pinned to the bottom of the screen on a phone.

- Markup: `<div class="fdy-actionbar">` holding `.fdy-btn` elements, placed as the last child of the
  page content. Buttons share the width (`flex: 1`); the primary action is the last one, nearest the
  thumb.
- `position: sticky; bottom: 0` with the raised surface, a top hairline, and
  `padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px))`.
- Inside `.fdy-app--has-bottomnav` at `max-width: 720px` it sits above the bottom nav:
  `bottom: var(--fdy-bottomnav-h)` and no safe-area padding (the nav already carries it).
- **New component token `--fdy-bottomnav-h`**, the bottom nav's own height
  (`calc(2.75rem + 2 * var(--space-2) + var(--bw))` plus the safe-area inset where the nav adds it).
  Today that height is only implied by the nav's padding; the action bar needs to read it, so it
  becomes one stated value that both the bar's offset and the content's bottom reservation use.
- When both a bottom nav and an action bar are present, `.fdy-app__main` reserves room for both, so
  the last row of content is never under the bar.
- Not a landmark and no ARIA of its own: it is a row of buttons. Each button keeps its own name.
- CSS only, so no Vue/React/Blazor wrapper (the kit's parity rule covers interactive components).
- Named `.fdy-actionbar`, one word, like the kit's other bars (`.fdy-appbar`, `.fdy-filterbar`,
  `.fdy-bottomnav`), in `src/components/actionbar.css`.

### D4. Documentation

1. **USAGE.md §8 "Mobile: the phone is its own layout"**, a short section that collects the rules
   agents miss, each pointing at its COMPONENTS.md section:
   - Bottom nav carries three to five destinations by role; the rest goes behind a "More" or
     account item. Labels are mandatory.
   - Below `md`, a table becomes a `.fdy-list`. A row is one tap target that opens its detail; row
     actions move to a `.fdy-menu` ("…") or onto the detail screen. Never a column of stacked
     buttons.
   - The screen's primary action lives in `.fdy-actionbar` or `.fdy-fab--extended`, not in the page
     body where it scrolls away.
   - The page header is not wrapped in a card on a phone: one frame, not two.
   - View switchers (list/box/grid) drop the modes a phone cannot use below `md`.
   - A multi-tenant app shows the current context (site, cluster, company) as a chip in the topbar,
     with the switch next to it.
   - Apps used standing up or on the move set `data-density="touch"`, per app or per screen.
2. **USAGE.md §0** rewording: the "Locked" list becomes **"Outside the kit's guarantee"**. An app
   may override those tokens; the contrast gate then no longer covers it, so the app checks contrast
   itself and records the reason in `DESIGN.md`. The sanctioned routes (the `data-*` axes, now
   including `touch` and `deep`) come first.
3. **COMPONENTS.md**: `data-density="touch"`, `data-primary-fill="deep"` (with the `onDeep` result per
   palette, as the palette section already lists its exceptions), and a `.fdy-actionbar` section.
4. **docs/agent-onboarding.md**: the new-app step mentions §8 for phone screens; non-negotiable 1
   points at "outside the guarantee" instead of "locked".
5. **docs/index.html**: `touch` in the density switcher, a `deep` toggle beside the palette
   switcher, and an action bar demo.
6. **CHANGELOG 3.22.0** carries an upgrade note for Ronda-style apps: drop a hand-set
   `--control-h: 2.75rem` for `data-density="touch"`, and a hand-set deeper primary for
   `data-primary-fill="deep"`.

## 3. Verification

- **Snapshot:** without `touch` or `deep`, every value is the 3.21.0 value. Capture a new fixture
  from 3.21.0 before any change (`test/fixtures/tokens-3.21.0.json`), the way 3.21.0 did.
- **Build tests:** `[data-density="touch"]` sets exactly `--control-h`; `[data-density="comfortable"]`
  resets the union of compact and touch keys; every palette emits a deep block; `onDeep` is present
  on every `$primaries` entry.
- **Contrast gate:** for every palette (and the default) × neutral (slate, grey, stone), light theme
  with `deep`: the label on the fill (4.5:1), the fill against the surface (3:1), primary-strong as
  ink on the three surfaces (the existing thresholds), the focus ring (3:1), primary-strong on the
  soft wash. Dark theme with `deep` equals dark without it (asserted, not assumed).
- **Browser tests:** `browser/control-heights.mjs` measures 44px controls under `touch` and the
  return to 40px in a comfortable island; a new `browser/actionbar.mjs` at a phone viewport checks
  that the bar sits above the bottom nav and that the last list row can scroll clear of both; a
  deep assertion (light fill is the 700 shade, dark fill unchanged) joins `browser/axis-nesting.mjs`
  or its own file.
- **Docs tests:** §8 exists and is linked from the onboarding block; every class it names exists.

## 4. Not in this spec

- The identity presets (B2).
- Changes to Ronda's own screens. They happen in its repository after 3.22.0 is published; this
  spec only gives it the routes and the doctrine.
- A `--primary-900` alias shade, a deep variant for the dark theme, or app-chosen fill shades.
- A bottom sheet component. `.fdy-drawer` and `FdyModal` cover today's needs; a sheet waits for a
  real request.
- Automatic `touch` from `(pointer: coarse)`. The app decides; a desktop admin and a guard's phone
  can share one codebase and want different answers.

## 5. Versioning

Minor, **3.22.0**: two new attribute values, one new component, one new component token, one new
field on `$primaries`. No existing value changes without the new attributes.

## 6. Decided during planning and execution

- The OS-dark palette fix joined B1. Seven palettes whose label ink is dark in both themes (orange,
  amber, lime, green, emerald, teal, cyan) showed white on the 500 fill whenever the OS was dark,
  even with `data-theme="dark"`. Measured before the fix: 2.80, 2.15, 1.98, 2.28, 2.54, 2.49 and 2.43 to 1.
- No new fixture. The 3.20.0 fixture already pins the default, and 3.21.0 changed no default value.
- Every palette block also carries `--primary-700-rgb` (noir's dark twins restate it), added for the deep
  fill. The owner edited `test/token-snapshot.test.mjs` to allow exactly that one added key in the
  per-palette diffs.
- Per-palette `[data-primary=X][data-primary-fill="deep"]` blocks carry only the ink and exist only where
  a palette's `onDeep` differs from the default. None does today. Dark twins exist for the dark-ink
  palettes. The generic deep system-dark twin is redundant and kept as defence.
- `onDeep` measured white for all 18 palettes; the lowest is lime at 4.99:1.
- Deep on a region needs `data-theme` on the same element. A bare subtree half-applies, and under OS dark
  it gets the 700 fill.
- `--fdy-bottomnav-h` is declared on `.fdy-app--has-bottomnav`, and the bottom nav takes its height from
  it. The nav was 61.39px and is now exactly 61px, because an item's icon and label were 0.39px taller
  than 44px.
- A sticky action bar needs no extra bottom reservation, since it keeps its place in flow. As the last
  child of `.fdy-app__main` it cancels main's bottom padding with a negative margin per context (desktop
  `space-8`, 720px and below `space-5`, nav shell `calc(var(--fdy-bottomnav-h) - var(--space-20))`).
- Below 720px the bar spans the screen edge to edge with `margin-inline: calc(-1 * var(--space-5))`, at
  the same depths as the bottom margin. Inset by main's padding, it left a 20px strip of scrolling
  content on each side. Owner's choice, 2026-11-24.
- `touch` sets only `--control-h`; inside a compact region it keeps compact spacing.
