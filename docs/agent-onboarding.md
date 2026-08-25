# Freeday — AI agent onboarding

For **a coding agent working in a project that consumes Freeday** (Claude Code, Codex, Cursor,
Copilot…). No model has Freeday in its training data, so an agent that is merely told "use Freeday"
will invent class names or silently fall back to Bootstrap/Tailwind conventions. This file is the
fix: paste the block below into the consuming project's agent instruction file, once.

> Working on **the kit itself**, not a consuming app? That's [`../CLAUDE.md`](../CLAUDE.md) — this
> file is about *using* the published package.

---

## 1. Paste this into your project's agent instructions

Into `CLAUDE.md` (Claude Code) / `AGENTS.md` (Codex, others) / `.github/copilot-instructions.md` at
the **root of the consuming project**:

```markdown
## UI: Freeday design system (@cahyo-dimas/freeday)

All UI in this project is built from Freeday: a **token-driven CSS kit** (`fdy-*` classes on plain
markup) with **typed components for Vue, React and Blazor** layered on top. Most of the kit is
markup + classes; ten interactive components also ship a typed wrapper, and in those three stacks
the wrapper is the correct way to use them.

**0. First decide which entry point this project uses. This is not an optimisation — get it wrong
and the code looks correct and fails later.**

| This project's stack | Import the ten components from | Binding |
|---|---|---|
| Vue 3 | `@cahyo-dimas/freeday/vue` | `v-model` |
| React 18/19 | `@cahyo-dimas/freeday/react` | `value` + `onChange` |
| Blazor (net8.0) | `@using Freeday.Blazor` (RCL) | `@bind-Value` |
| Static HTML, Svelte, server-rendered templates… | no wrapper — raw markup + the enhancer script | `fdy-*` DOM events |

The ten: **FdyCombo · FdyDatepicker · FdyDateRange · FdyAutocomplete · FdyCascade · FdyCfl ·
FdyChart · FdyTable · FdyModal · FdyDrawer**. In Vue/React/Blazor, **never hand-write the raw
markup + enhancer for these ten.** The raw path *appears* to work — the enhancer auto-initialises
once on `DOMContentLoaded` and the first render is correct — then fails quietly: DOM your framework
renders later is never hydrated, and the widget's state lives in the DOM instead of in your
framework's state.

Everything else is the same in every stack: plain `fdy-*` markup (button, card, badge, alert,
table markup, layout…). For the *other* interactive components (chips, stepper, input mask, file
upload, tree, tabs, menu, rating, slider, form validation, carousel, timepicker) there is no
wrapper — use the raw markup and hydrate it:

- **Vue / React** — `useFreeday(rootRef)` from the same import path, plus `import '@cahyo-dimas/freeday'`
  once at app entry to register the enhancers. (The eleven typed components do **not** need this: they
  are native Vue/React implementations of the same markup, not wrappers over the enhancer.)
- **Blazor** — `FreedayBlazor.initAll` interop. (Here the typed components *are* thin wrappers over
  the enhancers, so the enhancer script is always required.)

**Before writing or editing any markup/CSS, read these (they ship inside the package):**
- `node_modules/@cahyo-dimas/freeday/COMPONENTS.md` — every class that exists, with minimal markup
  skeletons, enhancer hooks and the a11y contract per component. **The class list is closed:
  if a class is not in that file, it does not exist — do not invent one.**
- `node_modules/@cahyo-dimas/freeday/USAGE.md` — the doctrine: which token/role/shadow to use when.
- `node_modules/@cahyo-dimas/freeday/docs/reference-screen.html` — one complete screen, assembled
  the intended way. Copy this structure for a new screen.

**Non-negotiables:**
1. No raw hex or px in app CSS. Use tokens: `var(--color-primary)`, `var(--space-4)` (4px scale),
   `var(--radius-md)`, `var(--shadow-1)`, `var(--dur-2)`.
2. Components only touch semantic tokens (`--color-*`) — never the primitive ramp (`--azure-600`).
3. `.fdy-btn` is already the primary action (there is no `--primary`). One per screen; everything
   else is `--ghost` or `--text`.
4. Three title roles only: `.fdy-title-page` (one `<h1>`) / `.fdy-title-section` / `.fdy-title-card`.
   Never reuse a card title as a page title.
5. Assemble from the frame down: `.fdy-app` → `.fdy-page` → `.fdy-page-section` → components.
6. Form errors: `aria-invalid="true"` + `aria-describedby` → a `.fdy-help.fdy-help--error`.
   Icon-only buttons need `aria-label`. Status is never colour-only.
7. Interactive components need their enhancer script loaded (see the table in COMPONENTS.md); in an
   SPA, re-hydrate dynamic DOM with `useFreeday` / `FreedayBlazor.initAll`. This applies to the
   components **without** a typed wrapper — for the ten in step 0, use the wrapper instead.
8. Freeday owns components + tokens, **not layout**. Grids/stacks/one-off gaps come from our own
   layout layer — build its theme on `var(--space-N)` so both systems stay in step.
```

Adjust the paths if the package lives somewhere else (a workspace, a vendored copy, `wwwroot/` for
Blazor). Then verify the agent can actually read those files — an agent that can't open
`node_modules` will keep guessing.

## 2. What ships in the package

| File | What it answers |
|---|---|
| `COMPONENTS.md` | The complete class surface — what exists, its modifiers, minimal markup, a11y. |
| `USAGE.md` | The doctrine — which token/role/shadow/emphasis to use when. |
| `docs/getting-started.md` | Install + import + theme, per stack (Static HTML · Vue · React · Blazor). |
| `docs/integrations.md` | How to bridge third-party libraries (validation, charts, dates, i18n…). |
| `docs/reference-screen.html` | A full screen assembled from the shell down. Open it in a browser. |
| `docs/agent-onboarding.md` | This file. |
| `CHANGELOG.md` | **What changed between the version this project had and the one it has now** — read it after every upgrade; each entry says what broke, what is new, and why. |
| `dist/` | Built CSS + enhancers. **`freeday.bundle.css` = tokens + components** (what `@cahyo-dimas/freeday/css` resolves to); `freeday.css` is components **only**, `freeday.tokens.css` tokens only — linking `freeday.css` alone leaves every `var(--…)` unresolved. Plus `freeday-*.js` and the `.d.ts` files. |
| `src/components/*.css` | The authoritative source for every class, when a doc is ambiguous. |
| `tokens/tokens.json` | Every token in W3C DTCG format — machine-readable. |
| `adapters/vue` · `adapters/react` · `adapters/blazor` | Typed wrappers, 10 components each. |

The live docs (with an interactive playground) are at
<https://cahyo-dimas.github.io/freeday-ui-kit/>, and the repo — including three complete example
apps under `examples/` (Vue, React, Blazor) that are **not** in the npm tarball — is at
<https://github.com/cahyo-dimas/freeday-ui-kit>.

### After an upgrade, read the changelog first

`npm i @cahyo-dimas/freeday@latest` does not tell you what you gained. Read
`node_modules/@cahyo-dimas/freeday/CHANGELOG.md` down to the version this project was on before —
it is written for exactly this moment, and it is the difference between adopting a new affordance
and re-implementing it locally.

Recent additions most likely to replace something an app hand-rolled (all detailed in
`COMPONENTS.md`):

| Reach for | Instead of |
|---|---|
| `.fdy-btn--stretch` | a hand-rolled overlay to make a card or list row clickable |
| `[data-fdy-number]` | a bare `<input type="number">` with the browser's own spin buttons |
| `clearable` on `FdyCfl` / `FdyDatepicker` | a value that can be set but never unset |
| `row.waiting(label)` on an upload row | a second status line saying the server is still working |
| `.fdy-label--required` | a `<span>` asterisk you have to remember to `aria-hidden` |
| `.fdy-text-warning` / `-danger` / `-success` | a caption class on a line that should stand out |
| `.fdy-icon` | your own `width:1em;height:1em` rule, once per project |
| `data-density="comfortable"` | restating the default spacing tokens on a wrapper |
| `pageSizes` on `FdyTable` | a rows-per-page control bolted above the table, away from the pager |
| `FdyTableFooter` | rebuilding the range + pager to add a size control, on a responsive list |
| the calendar's month grid (press the title) | clicking "previous month" thirty times |

## 3. Starting a new screen

The order matters; skipping to components is what produces flat, identical-card screens.

0. **Pick the screen shape first.** Which archetype is this — dashboard, master-detail, kanban,
   wizard, POS…? The repo's
   [`reference/README.md`](https://github.com/cahyo-dimas/freeday-ui-kit/blob/main/reference/README.md)
   maps 15 archetypes to the exact primitives that compose each one, and says plainly which shapes
   the kit has **no** component for (kanban columns, calendar month grid, chat bubbles, canvas) so
   you build the frame instead of inventing a class. Not in the npm package — read it on GitHub.
1. **Shell** — is `.fdy-app` already in place (usually once, in the app layout)? If not, copy it
   from `docs/getting-started.md` §The app shell.
2. **Theme** — `data-theme="light|dark"` + `data-density="comfortable|compact"`, normally on
   `<html>`, set once at the root. Use `compact` for table-heavy back-office screens. Both attributes
   also work on **any ancestor**: `<section data-theme="dark">` inverts that region and every
   component inside it follows, so never hand-colour an inverted panel.
3. **Fonts** — the package ships **no** `@font-face`. Load Sora / IBM Plex Sans / JetBrains Mono
   yourself, or override `--font-display`/`--font-body`/`--font-mono`. Skipping this reads as
   "unfinished design", not "missing dependency".
4. **Page frame** — `.fdy-page` + `.fdy-page__header` (eyebrow + `.fdy-title-page` + desc on the
   left, **one** primary action on the right).
5. **Sections** — one `.fdy-page-section` per region, each with a `.fdy-title-section`.
6. **Components** — from `COMPONENTS.md`, inside the sections.
7. **Verify** — the checklist in §5.

## 4. Migrating an existing UI to Freeday

Migration is a **class-and-structure swap**, not a rewrite. Keep the app's DOM semantics; replace
the styling layer. Rough equivalents — always confirm the target class in `COMPONENTS.md`, and note
that Freeday deliberately has **no** layout/spacing utilities, so grid/flex/margin classes stay with
your own layout layer:

| Coming from | Freeday |
|---|---|
| `btn btn-primary` / `MudButton Variant=Filled` | `fdy-btn` |
| `btn btn-secondary` / `btn-outline-*` | `fdy-btn fdy-btn--ghost` |
| `btn btn-danger` | `fdy-btn fdy-btn--danger` |
| `btn btn-link` | `fdy-btn fdy-btn--text` |
| `btn-sm` / `btn-lg` | `fdy-btn--sm` / `fdy-btn--lg` |
| `form-control` / `MudTextField` | `fdy-field` + `fdy-label` + `fdy-input` |
| `form-select` / `<select>` / `MudSelect` | `fdy-combo` + `data-fdy-combo` (+ `freeday-select.js`) |
| `invalid-feedback` / `is-invalid` | `aria-invalid="true"` + `fdy-help fdy-help--error` |
| `input-group` / `input-group-text` | `fdy-input-group` + `__addon` / `__btn` |
| `form-check` / `form-switch` | `fdy-check` / `fdy-radio` / `fdy-switch` |
| `card` / `card-body` / `card-title` | `fdy-card` / `__body` / `__title` |
| `table table-striped` / `MudTable` | `fdy-table` in `fdy-table-wrap`; interactive → `fdy-datatable` |
| `badge bg-success` / `MudChip` (status) | `fdy-badge fdy-badge--success` |
| `alert alert-danger` | `fdy-alert fdy-alert--danger` + `role="alert"` |
| `modal` / `MudDialog` | `<dialog class="fdy-modal">` (native — drop the JS backdrop plumbing) |
| `offcanvas` / `MudDrawer` | `<dialog class="fdy-drawer">` + `data-fdy-drawer` |
| `nav nav-tabs` | `fdy-tabs` + `data-fdy-tabs` |
| `breadcrumb` / `pagination` | `fdy-breadcrumb` / `fdy-pagination` (same `<nav><ol>` structure) |
| `spinner-border` / `progress` | `fdy-spinner` / `fdy-progress` + `__bar` |
| `toast` container + JS | `Freeday.toast({…})` — imperative, no markup to author |
| `text-muted` | `fdy-text-muted` |
| `d-none` / `visually-hidden` | `fdy-hidden` / `fdy-visually-hidden` |
| `container` / `row` / `col-*` / `mb-3` / `gap-2` | **stays yours** — Freeday ships no layout utilities |

Order of work that avoids a half-migrated mess:

1. Load Freeday's CSS and **turn off the old framework's reset/preflight** — `base.css` is the
   reset now. Two resets fighting is the usual source of "everything looks slightly off".
2. Shell + theme attributes first, so tokens resolve everywhere.
3. Then screen by screen: page frame → sections → controls. Convert a whole screen at a time;
   half-converted screens can't be reviewed visually.
4. Delete the old framework's CSS only when no screen references it, then grep for leftover class
   prefixes.
5. Replace hand-rolled modal/drawer/dropdown JS with the native-`<dialog>` components and the
   enhancers — that is usually where the most code disappears.

## 5. Verification checklist (before claiming a screen is done)

- Every `fdy-*` class used appears in `COMPONENTS.md`. Grep the diff for `fdy-` and check.
- No raw hex/rgb/px in the diff's CSS. Grep for `#` and `px`.
- Exactly one `.fdy-btn` without a variant modifier on the screen; one `.fdy-title-page`.
- Toggle `data-theme="dark"` on `<html>` — nothing becomes unreadable, no hard-coded white/black.
- Toggle `data-density="compact"` — the layout still holds.
- Keyboard: Tab reaches every control, focus is always visible, Esc closes overlays.
- Form errors carry `aria-invalid` + a linked message; icon-only buttons have `aria-label`.
- The interactive components on the screen have their enhancer loaded, and SPA-rendered DOM is
  re-hydrated.
