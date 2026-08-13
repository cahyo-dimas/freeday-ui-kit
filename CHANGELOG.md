# Changelog

Semua perubahan penting dicatat di sini. Format longgar mengikuti
[Keep a Changelog](https://keepachangelog.com/); tiap versi = git tag.

## [1.24.0] — 2026-08-13
Improvement note #41: the upload row had no "chosen, not yet sent" state, so every consumer-driven
integration showed a transfer that had not started.
### Fixed
- **A dropped file now rests until the consumer starts the transfer.** `handleFiles` called
  `row.uploading()` unconditionally — and *before* dispatching `fdy-upload-add`, so a consumer could
  not pre-empt it. Between the drop and the app's own submit button (which may be a minute, while the
  user fills in the rest of the form) the row claimed to be uploading, with a progress bar that never
  moved. A user watching that reasonably concludes the upload has hung and reports a bug against a
  transfer that was never started. The state machine was missing its start state: `done()` claims
  success, `fail()` claims an error, and `uploading()` was where it already was.
  The demo path is unchanged — with `data-fdy-upload-simulate` the kit *is* performing a transfer, so
  showing one stays correct. That attribute already marks the only place the old default was right,
  which is why this changes the default rather than adding an opt-in: making correct integrations opt
  in to correctness is backwards.
- **`fdy-upload-add` no longer depends on rendering a row.** The guard was `if (!list || !fileList)
  return;`, so a dropzone with no file list lost the event that tells the app a file arrived —
  "bring your own row" silently cost you the notification. Rendering and announcing are now separate:
  no list means no row is attached, and the event still fires with a working `detail.row`.
  Deliberately **no new attribute** for this. The reporter proposed `data-rows="off"`; `list` is used
  in exactly two places, so decoupling covers the same case without growing the API surface, and no
  page can be relying on "no event".
### Added
- **`row.ready()`** — the rest state, and the way back to it (a failed attempt the user will retry).
  It reuses the existing `dropProgress()`, so the bar is removed exactly as `done()`/`fail()` do it.
### Docs
- **`COMPONENTS.md` documents the row state machine at all.** `uploading()` / `setProgress()` /
  `done()` / `fail()` had **zero** mentions anywhere in the shipped docs — a consumer holding
  `detail.row` had no supported way to know they existed, which is a fair part of why the old default
  went unquestioned. The section now carries the state table, a worked example, the
  bring-your-own-row position, and `data-fdy-upload-simulate` marked demo-only.
  Two corrections to the report while transcribing it: the function is `handleFiles` (not `addFiles`)
  and the attribute is `data-fdy-upload-simulate` (not `data-simulate`) — the latter matters, since
  documenting the wrong name would have consumers set an attribute that does nothing.
### Added — guards
- **`browser/upload-states.mjs`** — drops a real `File` and asserts the rest state shows no progress
  bar, that `uploading()` → `setProgress()` → `done()` still chains, that the simulate path is
  untouched, and that a listless dropzone still dispatches. Mutation-checked on both halves.
  The fixture wraps the listless dropzone in its own container **on purpose**: with no
  `data-filelist` the enhancer falls back to `parentNode.querySelector('.fdy-filelist')`, so a bare
  dropzone sharing a parent with another list adopts it — the first version of this guard was
  testing nothing, and the mutation run is what exposed that.

## [1.23.0] — 2026-08-13
Consumption round 6 (`improvement-notes/006`). The reporter filed two of the three as **their own**
bugs rather than the kit's — and they were right about the code, but in both cases the kit had a way
to make the mistake impossible and had not taken it. Those are the two most valuable findings here.
### Fixed
- **`initAll(ctx)` now enhances `ctx` itself, not just its descendants.** `querySelectorAll` never
  matches its own root, so a framework ref placed **on** the widget — `<div ref="menu" data-fdy-menu>`,
  which is the ordinary shape when a component's root element *is* the widget — meant the one element
  that needed enhancing was the only one that could not be found. It failed with **no error, no
  warning, and a UI that looked finished**: the markup rendered and simply never opened. Measured
  before the fix: `data-fdy-menu-ready` stayed `null` and `aria-expanded` stayed `"false"` while
  `initAll` was present and callable the whole time; `initAll(parent)` worked. One `matches()` line
  per selector, in **all 21 enhancers** (`drawer` and `cfl` needed their inline trigger callbacks
  hoisted first). Init was already idempotent via each widget's `-ready` flag, so a root that is also
  matched by the descendant query costs nothing. `useFreeday` (Vue/React) and `FreedayBlazor.initAll`
  delegate to these, so they inherit the fix with no change of their own.
- **The stepper connector no longer draws through the markers when `__btn` is omitted.** The lift now
  lives on `.fdy-step__marker` — the part that must always exist — instead of only on
  `.fdy-step__btn`. The connector is `position:absolute; z-index:0`, and a positioned box paints
  *after* in-flow inline content in the same stacking context, so a marker that was merely inline got
  painted over: not for lack of a z-index, but for lack of being positioned at all. An
  indicator-only stepper (no navigation, so no button) is a reasonable thing to write and it produced
  a visible defect in shipped UI. Measured: hit-testing the marker's centre returned the connector's
  own `.fdy-step` before, the marker after. `__btn` keeps its z-index for the navigable case.
### Added
- **`.fdy-avatar--xs`** (1.5rem, `--text-xs`) — an avatar inside a control had nothing to reach for:
  `.fdy-btn--sm` is `calc(var(--control-h) - var(--space-2))` = **2rem**, exactly `--avatar--sm`'s
  size, so the monogram filled a small button edge to edge and the ghost border crossed the circle
  (measured: trigger 32px tall, avatar 32×32). 1.5rem inside 2rem leaves the ~4px the kit's other
  controls give their icons. The report suggested `--text-2xs`; that token does not exist — `--text-xs`
  is the smallest the kit has, and inventing a type step for one avatar size is not worth it.
### Added — guards
- **`browser/root-init.mjs`** — mounts a widget *after* load, initialises it through its own root, and
  drives a **real click** to prove it opens; repeated for a second enhancer so the fix reads as the
  shared pattern rather than a one-off. Mutation-checked on both. Being marked `-ready` is explicitly
  not accepted as passing: an early version of this check reported success against markup the enhancer
  had actually bailed on.
### Docs
- `COMPONENTS.md`: `initAll(root)` documents that the root may be the widget itself; the stepper
  section states that `__btn` is **optional** and shows the read-only indicator markup (the parts list
  never said which parts were optional); avatar gains its size table with the in-control guidance.
- Both `useFreeday` docstrings now show the ref-on-the-widget shape alongside the wrapping one.

## [1.22.0] — 2026-08-12
Two bodies of work. **(a)** three more findings from consumption round 5 — the report grew §5-§7
after 1.21.0 was cut; **(b)** a **routing** failure found in the same adopted project, which had been
built on raw markup + enhancers inside a framework that has typed wrappers because nothing in the
package ever told it otherwise. (b) was prepared as 1.21.1 and folded in here rather than shipped as
a separate patch minutes earlier.
### Added — from consumption round 5 (§5, §6)
- **`.fdy-nav--horizontal`** — the same navigation links laid out as a **row**, for a top-nav
  application that puts its primary nav in `.fdy-appbar` / `.fdy-app__topbar` and has no sidebar.
  Deliberately a modifier, not a new block: the item, its states and `aria-current="page"` are
  unchanged. On `.fdy-appbar--primary` the links go on-colour automatically (full on-colour ink in
  every state; the current page is carried by the background wash plus the semibold weight the base
  rule already applies, so no dimmed variant trades away the bar's guaranteed contrast).
  Reported as "there is no horizontal navigation component": `.fdy-nav` was the sidebar's vertical
  menu and `.fdy-appbar` had `__brand`/`__spacer`/`__actions` but nothing to put *links* in — so a
  top-nav app had a component for the bar and none for what the bar is mostly made of.
- **`.fdy-tabs__tab` also honours `aria-current="page"`**, so the tab *look* legitimately serves
  **routed** sub-navigation (`/settings/profile` · `/settings/billing`) built from real links. A link
  cannot be `aria-selected` — that is invalid ARIA on an anchor — so the app that borrowed the class
  had to restate the active style for a second attribute. Keep `role="tab"` + `freeday-tabs.js` for
  **in-page** tabs, where the roving-tabindex / one-panel-per-tab contract is real.
- **Pressed state for toggle buttons** — `aria-pressed="true"` now styles: soft primary fill + strong
  ink on `--ghost`/`--text`, an inverted-gradient sunken look on the solid button, and the same
  treatment in the danger hue. No new class or markup contract, since `aria-pressed` is already the
  correct attribute — and it is what turns `.fdy-btn-group` from a joined row into a **complete**
  segmented control. Previously "which one am I on" was left to each app to hand-tint, which is a
  colour decision the kit should own.
  *Found while building it:* one shared `.fdy-btn[aria-pressed="true"]` rule **cannot** work. A
  gradient is a background-**image**, so the `background` shorthand resets `background-color` to
  transparent — at equal specificity the later rule won and the ghost segment lost its fill entirely.
  Each fill variant now defines its own pressed look. The CSS read correctly in the file; only a real
  engine showed it, which is why the new guard lives in `browser/`.
### Fixed — from consumption round 5 (§7)
- **Hard rule 1 in `COMPONENTS.md` now records its one exception.** The rule says a modifier is
  always written beside its block class, but `.fdy-input-group__addon--icon` is standalone by design
  — adding the base `__addon` gives a search glyph the grey fill and divider of a `Rp` / `%` prefix.
  An agent following the rule literally produced the wrong control; one following the CSS comment
  broke the stated rule. The exception is now written down, and it is the only one.
### Fixed — the package now routes by stack
- **The paste-block in `docs/agent-onboarding.md` never mentioned the adapters.** That block is the
  only text that lands in a consuming project's agent instructions, so it is the only text an agent
  re-reads on every task — and it opened with "a CSS kit + enhancers, **not a component framework**",
  which actively steers a Vue/React project away from the typed components. It now opens with a
  **step 0 routing table** (Vue → `/vue` · React → `/react` · Blazor → RCL · everything else → raw
  markup), names the ten wrapped components, and states the failure mode: the raw path renders
  correctly the first time and then silently stops hydrating.
- **`COMPONENTS.md` flags the wrapper at each of the ten sections**, so the choice is visible at the
  point of use rather than only on an onboarding page read once — with each component's *real*
  binding (`v-model` / `value`+`onChange` / `@bind-Value` for the six value-bound ones; `open`+`close`
  for modal and drawer; data props for chart; `columns`+`rows`+events for table). Hard rule 7 states
  it up front.
- **Both READMEs lead with the routing table**, above the first import block. Previously the first
  runnable snippet was the vanilla one and the adapter table sat ~130 lines below it.
- **`docs/getting-started.md`** core concept 2 ("the enhancer is the source of truth") is now scoped
  to the raw path, and notes that Vue/React re-implement the ten natively while Blazor wraps the
  enhancer over interop.
### Notes
- Root cause was structural, not editorial: at **v1.18.0** `docs/getting-started.md` — the only
  per-stack router the kit had — was **not in `files`**, so `npm i` delivered a README whose
  "Starting a project? per stack" link pointed at a path that does not exist inside `node_modules`.
  `adapters/` *was* shipped, so the wrappers sat in the install, unused, with nothing pointing at
  them. v1.20.0 started shipping the docs; this release makes them route.

## [1.21.0] — 2026-08-12
Fifth round of real-app consumption feedback, written while that app adopted 1.20.0. Two findings —
and a **withdrawal**: the reporter retracted 1.20's rejected §A themselves after isolating the real
mechanism, which turned out to be a genuine kit bug hiding behind it. Both halves of that rejection
reproduce here, so the rejection stands and the withdrawal is recorded rather than re-litigated.
### Fixed
- **Hidden labels could scroll the whole page.** `.fdy-visually-hidden` is `position:absolute`, and
  `clip` hides *painting*, not *layout*. With no positioned ancestor its containing block is the
  document, and `overflow` clips only what is contained inside the overflow box — so a hidden label in
  a horizontally scrolling table (the kit's own recommended way to name an icon button) parks at its
  static position and drags the document sideways. Measured in Chrome: **1351px** of phantom page
  scroll from 11 spans in one table; `overflow-x:hidden` on the scroller, the shell, `body` and `html`
  each changed it by **0px**; removing the spans took it to 0. Every clipping/scrolling container that
  holds consumer markup now declares `position:relative` — `.fdy-table-scroll`, `.fdy-table-wrap`,
  `.fdy-list`, `.fdy-card`, `.fdy-tabs__list`, `.fdy-carousel__viewport`, `.fdy-accordion` — each
  measured to take its own case to 0 with the scroller still scrolling internally. The rest are
  already inside something the kit positions (`<dialog>`, the sticky sidebar, a fixed popover) and are
  listed with that reason in the new test.
  **`.fdy-accordion` is the one to note:** it was contained only by its panel's reveal *animation*
  (a transform makes a containing block), and that animation sits behind
  `prefers-reduced-motion: no-preference` — so the bug was reachable **only** by readers who asked for
  reduced motion. Measured with the animation off: 2906px → 0.
  *Possible migration:* if you absolutely positioned something inside a card, list or table scroller
  and relied on it escaping, it now anchors to that container. Anchoring is the reason for the change.
- **`--button` rows and cards ignored `:disabled`.** `.fdy-list__row--button` adopts the UA button box
  but not its disabled state, so a row disabled mid-flight kept its hover tint and pointer cursor — a
  control answering the pointer while refusing input. `:disabled` and `[aria-disabled="true"]` now dim
  it and withdraw hover, for `.fdy-list__row--button`, `.fdy-list__row--interactive`,
  `.fdy-card--button` and `.fdy-card--interactive`. The report suggested `cursor:default`; the kit uses
  `opacity:.5` + `cursor:not-allowed` on every other disabled control, and consistency wins.
### Changed
- **`data-theme` is no longer root-scoped** — the same move density made in 1.20.0, and for the same
  reason. The two *explicit* selectors are now bare `[data-theme="dark"]` / `[data-theme="light"]`, so
  a `<section data-theme="dark">` inverts that region and **every component inside it follows** —
  card surfaces, inputs, and text roles like `.fdy-title-page` that set `color: var(--color-text)`
  explicitly and therefore never saw a consumer's hand-rolled override. A dark brand panel beside a
  light sign-in form is an ordinary layout; it should not cost a re-colouring pass. Setting the
  attribute on `<html>` is unchanged, and a `[data-theme="light"]` island nested inside a dark region
  wins in turn.
  **The system default stays root-scoped, deliberately** — the report asked for "the two generated
  selectors", but there are three. Un-rooting `@media (prefers-color-scheme: dark) { :root:not(...) }`
  would make it match every element that does not itself carry `data-theme="light"`, including the
  *children* of a light island, dragging them back to dark. Measured: with the un-rooted variant that
  island renders light ink on a light surface; root-scoped, it stays correct.
### Added — guards
- **`test/css.test.mjs`** — the containment invariant, CI-gated: a rule that declares `overflow` must
  also be positioned, or be listed with the ancestor that already contains it. Single-line truncation
  (`text-overflow:ellipsis` on a label) is excluded by shape, not by name, so new truncating labels
  don't accumulate in an allowlist. A new clipping container fails the test until someone decides
  which case it is.
- **`browser/layout.mjs`** — the same bug end-to-end in real Chrome (`npm run test:browser`): ten
  hidden labels in a wide table, asserting the page cannot scroll horizontally *and* that the scroller
  still scrolls. A static test cannot see this failure; only a layout engine can. Both guards
  mutation-checked — reverting any single `position:relative` fails them.
- **`browser/state.mjs`** — pressed toggles and nav orientation in a real engine: the pressed ghost
  segment must keep a flat background-colour (the mutation that reproduces the shorthand bug fails
  it), the solid toggle must read as inset, `--horizontal` must actually be a row with the current
  link marked, on-colour nav ink must stay on-colour in both states, and a routed tab must take its
  underline from `aria-current`. Mutation-checked against all three fixes.
- **`browser/theme.mjs`** — subtree theming end-to-end: a `.fdy-title-page` and a `.fdy-card` inside
  `<section data-theme="dark">` take the dark tokens, a nested light island goes back, and
  `data-theme` on `<html>` still themes everything. `test/build.test.mjs` guards the selector shape
  (not root-scoped, media block still is, and the block order the cascade depends on); this guards the
  behaviour that shape exists for. Mutation-checked: re-rooting the selectors fails it.
### Notes
- Not adopted from the report, deliberately: `.fdy-datatable`, `.fdy-modal__body`, `.fdy-drawer__body`
  were listed as needing the same fix. Measured: they do not escape — `<dialog>` is `position:fixed`
  and is already their containing block, and the datatable's own scrolling child now carries it. They
  are in the test's allowlist with that reason instead of carrying a declaration that does nothing.

## [1.20.0] — 2026-08-12
Two bodies of work in one release (1.19.0 was prepared but never committed, tagged or published, so
it is folded in here rather than left as a phantom version):
**(a)** make the kit consumable by an **AI coding agent** in a new or migrating project, and clean the
repo to production level; **(b)** act on the fourth round of real-app consumption feedback — five
confirmed gaps, one rejected premise, and one documentation bug of our own that chasing it exposed.
### Added — from consumption round 4
- **`.fdy-list` / `.fdy-list__row` — the flat row container** (`src/components/list.css`). One bordered
  surface, `--color-border-muted` hairline dividers, **no shadow**; `--interactive` for hover, and
  `--button` for when the row *is* the control (UA box reset without losing the list surface), plus
  `__main` / `__title` / `__meta` / `__aside` internals. `USAGE.md` §3 has always said list rows should
  be flat, but the only container the kit shipped was `.fdy-card` — which carries `--shadow-lift`, a
  real 34px lift, so a responsive table that becomes a list below `md` had to choose between ten
  floating cards or a hand-built box that needs a colour and escapes the token system.
- **`FdyTable`: controlled client-side page index.** `pageIndex` + `update:pageIndex` (Vue) /
  `pageIndex` + `onPageIndexChange` (React) / `PageIndex` + `PageIndexChanged` (Blazor). The table
  still filters/sorts/paginates; only *which page* moves to the parent. This is what makes the
  `process` event from 1.18 pay off on a **responsive** screen: the pager renders inside
  `.fdy-datatable`, so a screen that hides the table below `md` loses it — and in client mode the index
  was a private ref with no prop, no event and no `goTo`. The two available options were "lose
  pagination on mobile" or "own the page index in server mode", where `process` hands back exactly the
  array you passed in. One index can now also span several tables, which is what a grouped list needs.
  Reported after a real rebuild where `process` deleted, by measurement, zero lines.
- **`breakpoints.nav` (721)** in `tokens/breakpoints.mjs` + its type. `.fdy-app` switches the sidebar
  between off-canvas drawer and static column at 721px — a number that was in `app-shell.css` and
  nowhere else, so every consumer of the shell hand-mirrored it. Getting it wrong is not cosmetic:
  aligning to `md` (960) leaves 721–959px with a static sidebar that the script still treats as an
  overlay, so opening the nav makes the page `inert` around a user with no way back out. A new test
  asserts `nav` equals the CSS's `min-width` and that the `max-width` query is `nav - 1`, so the two
  cannot drift.
- **Blazor `FdyTable` gained `Process`** (+ the `FdyTableProcess<TRow>` record) — 1.18 added the
  `process` event to Vue and React only, which left Blazor unable to drive a card list from the
  processed set at all.
- **Browser guards for the controlled page index**, Vue and React, in `browser/adapter.mjs`: a table
  whose pager lives *outside* the component, asserting both directions (parent → rows, and internal
  pager → parent event). Mutation-checked: reverting the component to its private index fails them.
### Changed — from consumption round 4
- **`data-density="compact"` is no longer root-scoped.** The generated selector was
  `:root[data-density="compact"]`; it is now a bare `[data-density="compact"]`. These are inheriting
  custom properties, so density can be set on a route wrapper or a single section — which is how it is
  actually decided (per screen), not on `<html>` for the whole app. Setting it on the root still works
  identically. A build test now asserts the selector is not root-scoped.
### Fixed — from consumption round 4
- **`USAGE.md` §3 misdescribed the kit's own elevation scale** — our bug, found while checking the
  report. It prescribed `--shadow-1` for "a card" and `--shadow-4` for "modal / drawer", but `.fdy-card`
  uses `--shadow-lift` (≈6× heavier than `--shadow-1`) and `.fdy-modal` uses `--shadow-lift-hover`;
  `--shadow-1` is what the *data containers* use. §3 now carries the real component→token map, names
  the two shadow families, and points rows at `.fdy-list`. Exactly the drift the repo's own invariant
  warns about: docs restating a scale the components don't follow.
- **`.fdy-toolbar` vs `.fdy-filterbar` is now documented.** `.fdy-toolbar` is `align-items:center`
  (right for bare controls); a `.fdy-field` with a *visible* label sits half a label-height low in it.
  Labelled fields belong in `.fdy-filterbar` (`align-items:flex-end` — which is why 1.11.2 had to
  arbitrate the composed case). The difference existed but was written down nowhere, so the wrong
  choice was only visible once rendered. Documented in `USAGE.md` §7 and `COMPONENTS.md`; no CSS
  changed, so no existing screen shifts.
### Notes — one report item rejected
- **"`.fdy-page-section` and `.fdy-table-scroll` do not compose" does not reproduce, and the proposed
  `min-width:0` fix is a no-op.** Measured on `docs/reference-screen.html` (the same
  section → datatable → scroller chain) with the table forced to 1400px in a 688px column: page
  overflow **0px**, the datatable held its column, the scroller scrolled internally — and adding
  `min-width:0` changed nothing. Two mechanisms explain it: `.fdy-page-section` is flex **column**, so
  `min-width:auto` (a main-axis rule) cannot cause horizontal growth; and `.fdy-table-scroll` has
  `overflow-x:auto`, which gives it an automatic minimum size of **0**, so no ancestor flex can stretch
  it. The kit also already sets `min-width:0` at the one row-flex boundary it owns
  (`.fdy-app__content`). The 129px overflow the reporter measured is real but originates in their own
  wrapper chain; to locate it, walk the datatable's ancestors at the failing width and find the first
  with `scrollWidth > clientWidth`. Third round in a row where a proposed fix would have changed
  nothing — the premise gets verified before the patch, every time.
### Added
- **`COMPONENTS.md` — the complete public class surface in one flat file.** Every component with its
  block/element/modifier classes, a minimal markup skeleton, its enhancer hook and its a11y contract,
  plus the full enhancer table (markup hook → script → global → events). The gap it closes: 425
  `.fdy-*` classes exist in `src/components/`, but only ~33 appeared as literal strings anywhere in
  the shipped docs — the rest lived in a 2,552-line HTML page and in the CSS source, neither of which
  an agent (or a hurried human) reads.
- **`docs/agent-onboarding.md`** — the entry point for an agent working in a *consuming* project: a
  paste-ready block for that project's `CLAUDE.md`/`AGENTS.md`, what ships in the package and which
  question each file answers, the order to build a new screen in, a **migration mapping table**
  (Bootstrap / MudBlazor / utility-class conventions → Freeday) with a safe conversion order, and a
  pre-completion verification checklist.
- **`docs/reference-screen.html`** — one complete business screen assembled the intended way:
  `.fdy-app` → `.fdy-page` → `.fdy-page__header` → `.fdy-stats` → sections holding a chart and a
  full data table, plus a native-`<dialog>` modal, theme/density toggles and the shell's nav-toggle
  wiring. v1.18.0 shipped the composition primitives but nothing demonstrated them end-to-end.
- **`test/docs.test.mjs` — drift guard for the agent-facing docs.** Every fully-written `.fdy-*`
  class named in `COMPONENTS.md`, `USAGE.md`, `docs/agent-onboarding.md` and
  `docs/reference-screen.html` must exist in the kit (CSS selectors ∪ classes the enhancers
  query/set), and every stylesheet in `src/components/` must be represented in `COMPONENTS.md`. An
  API doc that names a class the CSS never defines is worse than an omission: it invites markup that
  silently does nothing.
- **`reference/` — the two source assets moved out of the repo root** (`git mv`, so history follows):
  `Foundation Design System.html` → `reference/foundation-design-system.html`, and
  `auth_web_ui_layout_patterns.png` → `reference/layout-patterns.png` (the `auth_` prefix was
  misleading — the sheet is about app layout archetypes, not authentication). Neither was ever in the
  tarball and neither is now; the folder name states that. `reference/README.md` carries their
  provenance plus a **15 archetypes → Freeday primitives** table that names, per archetype, what the
  kit covers and which shapes it has **no** component for (kanban columns, calendar month grid, chat
  bubbles, canvas) — so those get built as layout instead of as invented `fdy-` classes. The drift
  guard checks this file too.
### Removed
- **`src/*.js` no longer ships.** All 24 enhancers in `src/` were **byte-identical** to their `dist/`
  copies, and no `exports` path points into `src/` — so a bundler-based consumer could never import
  them. `files` now lists `src/base.css` + `src/components` (kept: per-component CSS is genuinely
  easier to read than the 117 kB bundle, and `docs/agent-onboarding.md` points agents at it).
  **−25 files, −196 kB unpacked** per install (the compressed tarball barely moves — identical files
  deflate to almost nothing — but the install footprint and "what am I even looking at" do).
- **4 completed SDD implementation plans + 1 superseded spec deleted** (`docs/superpowers/plans/*`,
  `specs/2026-07-22-…-polish-design.md`, **−1452 lines**). Cited by nobody, served publicly by Pages,
  and describing work that shipped months of releases ago — `CHANGELOG.md` plus git history already
  record it. Only the canonical design spec remains.
- **`NEXT-UP.md`: 421 → ~125 lines.** Held 15 `Update …` release-log blocks (v1.8.0–v1.18.0), three
  2026-07-27 post-mortems of resolved items, and a frozen "current condition" snapshot still claiming
  `main` = **v1.7.0** with `npm test` 9/9. A stale snapshot is worse than no snapshot. What's left is
  purely forward-looking: the demand-driven backlog, the deliberate YAGNI list, two durable invariants,
  and the release runbook.
- **`HANDOFF.md`: 134 → 85 lines.** Its "where we are" section was 90 lines re-narrating every release
  back to v1.3.1 — a third copy of the changelog. Now: current state, then a pointer.
- `src/components/.gitkeep`, in a directory holding 47 stylesheets.
### Fixed
- **`CLAUDE.md`'s roadmap said "v0.1 (sekarang, token-first)"** at v1.19.0, and listed datepicker,
  data grid, filter bar, pagination, states and wizard as *future* work — all shipped long ago. It is
  the first file every agent session reads, so it was the most expensive stale text in the repo.
  Replaced with the actual status (feature-complete, demand-driven) plus a real structure map that
  distinguishes authored `src/` from generated `dist/`, and names `freeday.bundle.css` as the file to link.
- **The release runbook listed version-reference locations from memory, and was wrong** — it named
  `examples/*/README.md` (no version in them) and claimed `docs/getting-started.md` has 4 (it has 1).
  Replaced the hand-maintained list with the command that derives it:
  `git grep -n '<old-version>' -- . | grep -v CHANGELOG`.
- Stale counts trued up: `node --test` 20/20 → **28/28**, "46 komponen" → 47 stylesheets (44 components
  + composition/breakpoints primitives), and the "one-off harness in the session scratchpad" note now
  points at the permanent `browser/` harness.
- **`CLAUDE.md` claimed the Foundation artifact has base64-embedded fonts that can be re-extracted.**
  It does not: its `@font-face` rules point at dead UUID resources left over from the tool that
  exported it, there is no `data:…;base64` font anywhere in the file, and it renders via the Google
  Fonts CDN it preconnects to. Corrected, so no future session goes looking for fonts that aren't there.
- **`docs/getting-started.md` §5 pointed consumers at `Foundation Design System.html` for component
  markup** — a file that is not in the npm package, which became a dangling reference the moment this
  release started shipping that doc. Now points at `COMPONENTS.md` and `reference-screen.html`.
- **`docs/getting-started.md`'s app-shell snippet was structurally wrong** — and it is the first thing
  a consumer copies. It showed `__topbar` as a direct child *before* `__sidebar`, put `__brand` inside
  the topbar, and nested `__content` *inside* `__main`. `.fdy-app` is a flex **row** of
  `[__sidebar | __content]`, `__content` is the column holding `__topbar` + `__main` (it gives the
  sticky topbar a tall containing block), and `__brand` belongs in the sidebar. Copying the old
  snippet rendered the topbar *below* the content, off-screen. Corrected, and the correct nesting is
  now stated in `COMPONENTS.md` and `USAGE.md` too. Caught by driving
  `docs/reference-screen.html` in real Chrome: the nav toggle sat at y≈1021 in a 900px viewport.
- Same file: "compose the screen inside `__content`" → **`__main`** (which is the padded area).
### Changed
- **`files` now ships the docs an agent needs**: `COMPONENTS.md`, `docs/getting-started.md`,
  `docs/integrations.md`, `docs/agent-onboarding.md`, `docs/reference-screen.html` — listed
  **file-by-file, not as `"docs"`**, so the internal planning docs under `docs/superpowers/` stay out
  of the tarball. (`files` does not honour `.gitignore`; whitelisting a directory ships whatever sits
  inside it — the v1.16.0 `bin/obj` lesson.) Tarball 263.6 kB → 297.9 kB, 177 → 182 files.
  The `examples/` apps are deliberately **not** shipped (127 MB of `node_modules` + 208 MB of .NET
  `bin/obj` live under them); the repo link in `docs/agent-onboarding.md` covers that need.
### Notes
- Documenting the surface surfaced one inconsistency, recorded rather than patched (this release
  touches no CSS): **`.fdy-pagination` has no CSS rule** — the block class on the `<nav>` is a naming
  hook only, its `__list`/`__link`/`__ellipsis` elements carry all the styling, and the data table
  targets `data-fdy-table-pagination`. `COMPONENTS.md` says so, and the drift guard lists it as a
  known structural hook.

## [1.18.0] — 2026-08-11
### Fixed
- **`FdyModal` / `FdyDrawer` (Vue) were non-dismissible when `dismissible` was omitted — an
  accessibility defect.** Vue's boolean-cast delivers an omitted Boolean prop as `false`, not
  `undefined`, so the defensive `props.dismissible !== false` evaluated to `false`: no Escape, no
  backdrop close, and (modal) no close button rendered — the opposite of the documented
  `dismissible: true` default. Both now use `withDefaults(…, { dismissible: true })`. React was
  unaffected (it leaves omitted props `undefined`); `FdyCombo`/`FdyDatepicker` use `=== true`, which
  is correct for an intended-`false` default.
- **`.fdy-card--interactive` hover transform now respects reduced motion** — the `-3px` lift is dropped
  under `prefers-reduced-motion` (the shadow still signals the affordance).
### Added
- **Page-composition primitives + type roles (`src/components/composition.css`).** `.fdy-page`,
  `.fdy-page__header`, `.fdy-page-section`, `.fdy-toolbar`, `.fdy-stats`/`.fdy-stat` (a KPI tile that is
  deliberately *not* a card, so a metric strip doesn't become an identical-card grid), and three title
  roles `.fdy-title-page` / `-section` / `-card` (+ `.fdy-eyebrow`, `.fdy-text-muted`/`-caption`). They
  encode *how a page is assembled* so independently-built screens cohere.
- **`USAGE.md` — the usage doctrine.** Which token/role/shadow to use when: type roles, spacing rhythm,
  elevation, one-primary-per-screen, semantic-vs-categorical colour, density, and the shell-down
  composition order. The line where a component library becomes a design system.
- **General categorical palette `--tone-1`…`--tone-8`** (a chart-neutral alias of the validated,
  theme-aware `--chart-1`…`8`) + **`.fdy-chip--tone-N`** to match `.fdy-avatar--tone-N` — non-semantic
  category colours (chips, tags, legends), WCAG AA in light & dark (gated).
- **`FdyTable` surfaces its processed rows** — a `process` event (Vue) / `onProcess` callback (React),
  `{ rows, total }`, in **both** client and server modes — so the same filtered/sorted/paged set can
  drive a responsive card list, a selection summary, or CSV export without re-deriving the pipeline.
- **`./table-model` export.** The pure `filterRows`/`sortRows`/`paginate`/`cellValue`/… functions
  (`adapters/core/table-model.js`) are now reachable as `@cahyo-dimas/freeday/table-model`, so a consumer
  can pre-compute exactly what `FdyTable` does instead of re-deriving it and risking drift.
### Changed
- **`data-density="compact"` now steps the mid-range spacing scale** (`--space-3`…`--space-6`) as well as
  `--control-h`, so Freeday components — and a utility theme built on `var(--space-N)` — actually densify;
  previously it changed only control height.
- **Docs:** getting-started leads with the `.fdy-app` shell + a loud "load the fonts yourself" step (the
  package names Sora / IBM Plex Sans / JetBrains Mono but bundles none); README links `USAGE.md`.

Additive except the two bug fixes (which restore documented behaviour). Gate: `node --test` 22/22 ·
`typecheck:react` 0 · `test:browser` 6/6 · new CSS browser-verified in real Chrome. From real-app
consumption feedback (three instalments).

## [1.17.0] — 2026-08-11
### Added
- **Avatar identity tones (`--tone-1`…`--tone-8`).** Decorative tints (from the categorical chart
  palette) with a theme-aware, text-leaning foreground, so same-initial avatars — common where many
  names share a prefix — stay distinguishable. Verified WCAG **AA** (≥4.5:1) in light **and** dark,
  guarded by `test/contrast.test.mjs` (which gained a `color-mix()` evaluator). Hash a stable index
  off the full name, not the initials.
- **Size-matched skeletons (`.fdy-skeleton--avatar` + `--avatar-sm`/`--avatar-lg`).** Reserve the exact
  `.fdy-avatar` box (2 / 2.5 / 3.5rem) so data landing causes no layout shift (a bare `--circle` has no
  dimensions of its own).
- **`.fdy-card--button`.** When the whole card *is* the control — a real `<button>` picker row, so it is
  keyboard-reachable and announced — this resets the UA button box **without** stripping the card's own
  surface/border.
- **`.fdy-list-reset`.** Opt-in list reset for consumers who pair Freeday with a utility framework run
  preflight-off (`base.css` is intentionally a *light* reset — it does not strip `ul`/`ol`/`p` margins).
- **Toast `key` + `Freeday.dismiss()`.** `toast({ …, key })` replaces an existing same-key toast in
  place instead of stacking a duplicate (a burst of identical failures shows one, refreshed);
  `Freeday.dismiss(node | key)` closes one early. `toast()` already returned the element — both are now
  in the `window.Freeday` type declarations.
### Docs
- State the scope boundary (components + tokens, **not** layout; pair with a utility framework run
  preflight-off) in the README and getting-started; document that `--space-*`/`--radius-*` are public
  tokens to build a utility theme on, and that `data-density` only re-scales control height.
- Input docs now lead with `aria-invalid="true"` as the canonical accessible-field pattern (it does
  both the visual state and the one screen readers act on); `.fdy-input--error` is the fallback.

Additive; no breaking changes. Gate: `node --test` 22/22 (incl. avatar-tone contrast, both themes) ·
`typecheck:react` 0 · new CSS/JS browser-verified in real Chrome. From real-app consumption feedback.

## [1.16.0] — 2026-08-11
### Added
- **Native Blazor component library (`adapters/blazor/`) — first release, 10/10 parity.** A Razor
  Class Library (`Freeday.Blazor`, net8.0) so Blazor consumers get typed `<FdyX>` components with
  `@bind`, instead of hand-writing `fdy-*` markup + JS interop. Ten components at parity with the
  Vue/React adapters: `FdyModal`, `FdyDrawer`, `FdyCombo<TValue>`, `FdyDatepicker`, `FdyAutocomplete`,
  `FdyCascade`, `FdyDateRange`, `FdyCfl<TRow>`, `FdyChart`, and `FdyTable<TRow>`. Two patterns:
  *wrapper-over-enhancer* (hydrate the vanilla enhancer once, `ShouldRender() => false` so Blazor
  never fights the enhancer-owned DOM, push external value imperatively) and *controlled*
  (`FdyModal`/`FdyDrawer`/`FdyCfl` render their own DOM; only the `<dialog>` show/close/Esc/backdrop
  go through interop). Shared CRTP base `FreedayComponentBase<TSelf>` types the `DotNetObjectReference`
  so `[JSInvokable]` dispatch resolves. Consumed via `<ProjectReference>`; the host loads
  `dist/freeday.js` + `adapters/blazor/freeday-blazor.js` as `<script>`s.
- **`FdyTable<TRow>`** is a full controlled data table — client mode (sort + four column-filter types
  + pagination over `Rows`) and server mode (set `Page` → the headers/filters/pager only raise
  `SortChanged`/`FiltersChanged`/`PageChanged` intent), plus row activation, expandable detail rows,
  cell templates, and loading/empty states. Its sort/filter/paginate logic is `TableModel` — a pure
  C# port of `adapters/core/table-model.js`.
- **`freeday-blazor.js` bridge**: `chartUpdate` (repaint a chart from its data-* attributes) and a
  generic `onOutside` light-dismiss primitive (outside-pointer / Esc).
- **`src/freeday-select.js`** gained an additive `setValue` (silent programmatic select) so a Blazor
  `@bind-Value` can push an external combo value without the enhancer echoing an `fdy-change` back.

## [1.15.0] — 2026-08-10
### Added
- **Type declarations for every export (#40).** Only `./vue` and `./react` shipped a `types`
  condition; the other eight exports had none. A TypeScript consumer's two side-effect imports —
  `import '@cahyo-dimas/freeday/css'` and `import '@cahyo-dimas/freeday'` — plus `./enhancers/*` and
  `./breakpoints` therefore failed to resolve (TS 5 leaves them untyped / `implicitly any`; TS 6 makes
  it a hard `noUncheckedSideEffectImports` error), and `window.Freeday` was reconstructed by hand in
  every consumer. Now every export names a `types` condition: `dist/asset.d.ts` (a one-line stub for the
  side-effect-only CSS/enhancer imports), `tokens/breakpoints.d.ts` (the breakpoint scale), and
  `dist/freeday.d.ts` — which declares the `window.Freeday` global from the source: `toast(opts?)` with
  all-optional `variant` / `title` / `message` / `timeout`, returning the toast `HTMLElement` (looser and
  more correct than the guesses consumers had been copying). `files` now also ships
  `tokens/breakpoints.d.ts`. Runtime unchanged; purely additive.

## [1.14.0] — 2026-08-01
### Added
- **Read-only state across the form controls (#39).** `input` / `textarea` gain a `[readonly]` rule —
  full-contrast text on a muted surface with a softened border and no focus-ring escalation, distinct
  from `:disabled` (which dims the value to placeholder-grey and drops it from tab order). A new
  `readonly` prop lands on all six controlled select-type adapters — `FdyCombo`, `FdyCascade`,
  `FdyDatepicker`, `FdyDateRange`, `FdyAutocomplete`, `FdyCfl` (Vue + React): the control stays focusable
  and shows its value with `aria-readonly="true"` but can't be opened or changed (`FdyDatepicker`'s clear
  button is suppressed too). Read-only ≠ disabled — it keeps tab order, full contrast, and stays
  selectable / copyable / submittable, so a real value the user may not edit reads as data, not an empty
  placeholder. Verified in-browser (readonly `opacity:1` vs disabled `0.5`; text at full `--color-text`).
- **Interaction-state coverage completed.** Added the missing `disabled` state to `timepicker`, `rating`
  (`.fdy-rating--disabled`), `tree` (`[aria-disabled]` rows), `tabs`, `file-upload`
  (`[aria-disabled]` / `.is-disabled`), and `datepicker`; and the missing `invalid` state to `rating`
  (`.fdy-rating--error`). The vanilla datetime composer now reflects `data-fdy-disabled` /
  `data-fdy-invalid` from its wrapper onto **both** child pickers so a datetime reads as one control
  (applied on a macrotask, so it lands after both child triggers are built — a microtask would run
  before the later-registered timepicker enhancer). All additive; no breaking changes.

## [1.13.1] — 2026-08-01
### Fixed
- **`FdyCombo` can be selected with the mouse again (#38).** Clicking an option did nothing — the
  listbox closed and no `update:modelValue` fired (keyboard select still worked, which is why a
  keyboard-only smoke test missed it). The option `<li>` isn't focusable, so a `mousedown` moved focus
  off the combobox button; the root's `focusout` handler then closed the list — removing the `<li>` —
  *before* `mouseup`, so the browser never generated a `click` and `choose()` was never reached. Added
  `@mousedown.prevent` (Vue) / `onMouseDown` `preventDefault` (React) on the option so focus stays on the
  button and the click lands — the same pattern the sibling `FdyDatepicker` / `FdyAutocomplete` (and the
  vanilla `freeday-select.js`, fixed in v1.6.1) already use. Both adapters; no API change; keyboard and
  hover paths untouched. Verified with trusted CDP mouse events (a synthetic `dispatchEvent` won't
  reproduce it — untrusted events run no default action, so focus never moves).

## [1.13.0] — 2026-07-30
### Added
- **`FdyDatepicker` clear affordance — an optional date can now be unset (#37A).** A new `clearable`
  prop renders a small × button in the trigger (overlaid in the calendar-icon slot) whenever a date is
  set, emitting `''` (`update:modelValue` + `change` in Vue, `onChange('')` in React) to return to
  empty — closing a functional regression vs the native `<input type="date">`, which offered a clear
  control. Off by default; both adapters. Verified in-browser: the × is right-aligned in the icon slot,
  vertically centred, hides the calendar icon while shown, and never overlaps the value text (even a
  long, ellipsised one).
- **`FdyDatepicker` month-nav labels are now overridable (#37B).** The previous/next-month `aria-label`s
  were hardcoded, leaking to every screen-reader user with no way to change them; added
  `prevMonthLabel` / `nextMonthLabel` props (plus `clearLabel` for the new × button). Month and weekday
  names already localise via `Intl` + the `locale` prop.
### Changed
- **`FdyDatepicker` default UI strings are now English** (`Select date` placeholder, `Previous month` /
  `Next month` nav labels) instead of Indonesian, matching the kit's English-first public docs. Pass
  `placeholder` / `prevMonthLabel` / `nextMonthLabel` for other languages. Scope is the Vue + React
  `FdyDatepicker` adapters only — the vanilla `freeday-datepicker.js` enhancer (used by the Indonesian
  docs demos) keeps its Indonesian defaults.

## [1.12.0] — 2026-07-29
### Added
- **Chart colour overrides can now name a categorical palette slot (#36).** `data-fdy-colors` (and the
  `<FdyChart colors>` prop) previously resolved every name through the semantic tier
  (`var(--color-<name>)`), so an override could only reach `primary`/`info`/`accent`/… — never the
  validated categorical palette `--chart-1..8`. An app that needs stable *per-category* colours (rather
  than per-array-index) had to override, and overriding then dropped each series onto the nearest
  semantic hue — e.g. a three-way split landing on three neighbouring blues: contrast-passing but
  unreadable as a comparison. `colorVar` now maps a name of the form `chart-1`..`chart-8` to
  `var(--chart-N)`, so an override can pin a series to the validated palette
  (`colors={['chart-1','chart-2','chart-3']}`). Backward compatible — no semantic token name starts
  with `chart-`, so semantic overrides are unchanged; the single-series `data-fdy-color` / `color`
  accepts the `chart-N` form too. Verified in-browser: explicit `chart-1..3` now render the exact
  fixed-order palette (blue/orange/green) and equal the default, while `success,warning,danger` still
  resolve to their semantic tokens. (`--chart-1..8` are public tokens in `dist/freeday.tokens.css`, so
  matching swatches/bars elsewhere can reference `var(--chart-N)` directly — no adapter export needed.)

## [1.11.2] — 2026-07-28
### Fixed
- **A filter bar docked in a table toolbar no longer loses its alignment (#35).** `.fdy-filterbar`
  (`align-items:flex-end`, for labelled fields) and `.fdy-table-toolbar` (`align-items:center`, for
  bare buttons) are both single-class rules of equal specificity, so composing them on one element
  (`<div class="fdy-table-toolbar fdy-filterbar">`) let whichever came later in the bundle win — the
  toolbar — centring every control and floating the trailing actions ~13px above the inputs beside
  them. Added a `.fdy-table-toolbar.fdy-filterbar` rule (specificity 0,2,0) that settles it toward the
  filterbar's `flex-end`. Additive — only affects elements carrying both classes; standalone toolbars
  and filterbars are untouched. Verified in-browser: the composed bar's controls now share one
  baseline (computed `align-items: flex-end`).

## [1.11.1] — 2026-07-28
### Fixed
- **Tall modals now scroll their body instead of clipping the footer (#34).** `.fdy-modal` had a
  `max-height` + `overflow:hidden` but never established a flex context, so its three children laid out
  as blocks: the body's height was its own content height (nothing for `overflow:auto` to scroll), and
  the dialog's cap clipped whatever stuck out — including `.fdy-modal__footer` and its submit button, on
  a short viewport (a form you could fill but not save). Gave the modal the column-flex treatment the
  sibling `.fdy-drawer` already uses: `display:flex` on `.fdy-modal[open]`, `flex-direction:column` on
  the base, `flex:none` on header/footer, and `flex:1;min-height:0` on the body. Modals that already fit
  are unchanged. Verified in-browser (body scrolls, footer stays inside) including the `.fdy-modal--cfl`
  picker — no regression.

## [1.11.0] — 2026-07-28
Follow-ups from the doc-ai-automation migration (improvement notes #31–#33). Additive / corrective.

### Fixed
- **Badges no longer wrap and break the pill (#31).** `.fdy-badge` had `line-height:1` but no
  `white-space`, so a two-word label (e.g. "Needs review") wrapped and collided with the pill padding,
  turning the capsule into a cramped lozenge. Added `white-space:nowrap` — matching the sibling
  `.fdy-badge-ov`, which already had it. A too-narrow badge now overflows its column (which
  `.fdy-table-scroll` already handles) instead of wrapping.
- **Donut chart honours `legend="none"` (#33).** `freeday-chart.js` read `data-fdy-legend` only in the
  cartesian renderer; the donut appended its legend unconditionally, so `<FdyChart type="donut"
  legend="none">` still printed the built-in legend even when the caller supplied its own. Gated the
  donut legend on the same attribute (`auto` still shows it — a donut is unreadable without labels).

### Added
- **`.fdy-filterbar--actions-inline` modifier (#32).** Opt-in: sits the trailing actions inline after
  the last field instead of at the far edge, so a wrapped bar reads as attached to its filters. Also
  **documented** the filterbar's wrap behaviour: a wrapped bar breaks flex lines on each item's
  *flex-basis* (the grow field's `flex:1 1 16rem` reserves 16rem), not its rendered width — so the
  grow basis decides the wrap point; to avoid stranded actions, tune the `--w-grow` basis or drop a
  field. (The note's margin-swap proposal to un-strand the actions was **tested in-browser and does not
  work** — margins don't change flex line-breaking — so only the modifier + docs were taken.)

## [1.10.0] — 2026-07-28
Follow-ups from the doc-ai-automation migration (improvement notes #27–#30). Additive / corrective;
no breaking changes.

### Fixed
- **`<fieldset class="fdy-field">` no longer leaks native browser chrome (#27).** The kit shipped no
  `fieldset` reset, so a grouped field (a radio/checkbox group with a `<legend>`) showed the UA groove
  border, extra padding, and `min-inline-size:min-content` — the last of which also blocked the
  filterbar column widths from shrinking it. Added a scoped `fieldset.fdy-field` reset so it lays out
  identically to the `<div>` form.
- **Chart x-axis: the last label no longer collides with its neighbour (#29).** `freeday-chart.js`
  force-drew the final label with no spacing check, so on a dense axis (e.g. 24 hourly points) the
  last two labels fused. It now estimates the widest label instead of assuming a fixed 40px slot, and
  drops the penultimate label when the forced-last one would overlap it. Visual only; sparse axes
  render identically.

### Added
- **`FdyTable` expandable detail rows (#30).** A `row-detail` slot (Vue) / `renderRowDetail` prop
  (React) renders a full-width row beneath any expanded row, driven by a **controlled** `expandedKeys`
  (matches the sort/filter/page contract; pairs with `row-activate` as the toggle). Adds a
  `.fdy-table__detailrow` class (muted panel, no hover tint). Removes the last interaction that kept a
  table hand-rolled.
- **`.fdy-field--w-2xl` (25rem) filterbar column (#28).** Wide enough for a two-picker date range, so
  it need not burn the single `--w-grow` slot. The date-range pickers also gained a `min-width` (7rem)
  so a squeezed range compresses and wraps instead of clipping the date (was `min-width:0`).

## [1.9.0] — 2026-07-28
Follow-ups to 1.8.0's `FdyTable` (improvement notes #25/#26). Additive — the #25 change **widens** a
generic bound, so every call site that compiled before still compiles.

### Fixed
- **`FdyTable` now accepts `interface`-typed rows.** The row generic was constrained to
  `Record<string, unknown>`, to which a TypeScript `interface` is never assignable (interfaces get no
  implicit index signature) — so a normally-typed DTO array failed to compile and `FdyTable` was
  effectively unusable in a strict-TS app. Widened the bound to `object` in both adapters; the row type
  now **infers** correctly (`cell-*` slots / `renderCell` are properly typed) and no cast is pushed
  onto consumers. The component never indexes rows directly — all access goes through the
  already-unconstrained core, which is unchanged.

### Added
- **`FdyTable` row activation (opt-in).** `rowActivatable` makes rows focusable and emits
  `row-activate` (Vue) / calls `onRowActivate` (React) on click, or Enter/Space while the row itself is
  focused — a control inside a cell keeps its own event (the `target !== currentTarget` guard). Adds a
  `rowClass(row)` hook for per-row state (e.g. a selected row) and a `.fdy-table__row--activatable`
  class (pointer + `:focus-visible` ring; hover tint is already inherited from the base row rule).
  Replaces the hand-rolled `<tr tabindex="0" @click @keydown>` + duplicated row CSS consumers were
  each re-writing.

## [1.8.0] — 2026-07-28
Release **1.8 — framework-safe data table, modal/drawer wrappers, and a monospace utility**.
Non-breaking, purely additive. No existing selector, markup, or enhancer changed.

### Added
- **`FdyTable` (Vue + React) — a controlled data table.** Reads `rows` as the source of truth on
  every render, so it is safe over a `v-for` / `.map()` bound to reactive data — unlike the
  `freeday-table.js` enhancer, which snapshots the DOM and corrupts a framework list on the first
  refetch. Two modes: **client** (component sorts/filters, and paginates when `pageSize` is set,
  over the full `rows`) and **server** (`page` prop present → `rows` render as given and the
  headers/filters/pager only emit `update:sort` / `update:filters` / `update:page`). Type-aware
  column filters (**text / enum / number / date**) in a top-layer popover, sort toggles, and a
  page-window pager — all over the existing `.fdy-table*` / `.fdy-filter*` / `.fdy-pagination__*`
  classes. Column options: `sortable`, `filter`, `align`, `mono`, `sortType`, `value`, `options`.
  Sort/filter/paginate logic lives in a shared, framework-agnostic core (`adapters/core/table-model.js`)
  covered by `node --test` (`test/table-model.test.mjs`).
- **`FdyModal` + `FdyDrawer` (Vue + React) — controlled `<dialog>` wrappers.** Reconcile a reactive
  `open` boolean with the native `<dialog>`'s method-driven open/close: guarded
  `showModal()`/`close()`, `@cancel`/`onCancel` + `preventDefault` so Esc routes through app state,
  and backdrop-click via `event.target === dialogEl`. `open` + `close` event/`onClose`, `title`,
  `size`/`side`, `dismissible` (default true), and `footer`. No new modal CSS.
- **`.fdy-mono` utility.** Alignment-neutral monospace (data font + tabular figures) for identifier /
  code / IP / timestamp cells or inline spans — the piece that previously only existed welded into
  the right-aligned `.fdy-table__num`. `FdyTable` applies it for any `mono: true` column.
- **`.fdy-drawer__footer`** — a bottom action bar for drawers (mirrors `.fdy-modal__footer`).

## [1.7.1] — 2026-07-27
Docs & distribution patch. **No component/code changes** — `dist/`, `src/`, `adapters/`, and
`tokens/` are byte-identical to 1.7.0.

### Changed
- **Distributed on public npm as `@cahyo-dimas/freeday`.** Install with `npm i @cahyo-dimas/freeday`
  — `npm ci` now works in CI without auth or an SSH key (the old `git+https` workaround is gone).
  Releases publish via GitHub Actions **OIDC Trusted Publishing** (no tokens).
- **Docs are now English-first** — `README.md`, `docs/getting-started.md`, `docs/integrations.md`,
  and the example READMEs. `docs/index.html` stays Indonesian for now.

### Added
- **`README.id.md`** (Bahasa Indonesia) with a language-toggle row on both READMEs; now shipped in
  the published package.

## [1.7.0] — 2026-07-24
Rilis **1.7 — tree checkbox, form-grid, & tiga section docs full-width**. Non-breaking, aditif.

### Added
- **Tree checkbox (cascading) — `freeday-tree.js` + `.fdy-tree--checkbox`.** Varian tree yang
  bisa dipilih: centang cabang → semua anak ikut; sebagian anak → cabang jadi native
  `:indeterminate`. Checkbox = `<input class="fdy-checkbox">` native (Space toggle, nama lewat
  `aria-label`); klik checkbox `stopPropagation` sehingga memilih **tak pernah** membuka/menutup
  cabang, sedangkan teks summary tetap toggle `<details>`. Opt-in via `data-fdy-tree`; init
  post-order menghitung state cabang dari leaf yang sudah tercentang saat load. Zero-dependency,
  `window.FreedayTree`. Tree dasar tetap tanpa JS.
- **`.fdy-form-grid` — layout header/dokumen.** Pelengkap dua-dimensi dari stack `.fdy-field`
  satu kolom dan baris `.fdy-filterbar`: field tersusun di kolom yang rapi (`auto-fit`, reflow ke
  satu kolom di layar sempit); `.fdy-field--full` membentang penuh (mis. alamat). Zero JS — murni
  layout di atas `.fdy-field`.
- **File upload — layout melebar.** Modifier `.fdy-dropzone--row` (ikon di samping teks, bukan
  bertumpuk) dan `.fdy-filelist--grid` (baris file berdampingan di layar lebar).

### Changed
- **Docs — tiga section jadi full-width & selaras.** Tree (kini menampilkan varian dasar +
  checkbox berdampingan), Form (validasi inline + contoh **header + detail**: `.fdy-form-grid` +
  tabel item), dan File upload semuanya melebar mengisi kolom konten agar lebar semua section rata.
  Terverifikasi lewat gestur mouse asli (headless CDP `Input.dispatchMouseEvent`): cascade
  centang/indeterminate, checkbox tak melipat cabang, teks summary tetap toggle.

## [1.6.2] — 2026-07-24
Rilis **patch — lisensi**. Tak ada perubahan kode.

### Changed
- **Lisensi jadi [MIT](LICENSE)** (`Copyright (c) 2026 Cahyo D. Kurnianto`). Sebelumnya
  `"license": "UNLICENSED"` tanpa file `LICENSE` — di repo publik itu berarti *all rights
  reserved*, jadi tak ada yang boleh memakainya secara legal. Sekarang bebas dipakai/ubah/
  distribusi asal menyertakan copyright. `package.json`/`package-lock.json` → `"MIT"`, tambah
  file `LICENSE`, catat di README + footer docs. `"private": true` dipertahankan (pengaman
  anti-`npm publish`, tak terkait lisensi).

## [1.6.1] — 2026-07-24
Rilis **patch — perbaikan bug pemilihan combo dengan mouse**. Non-breaking.

### Fixed
- **`freeday-select.js` (combo/select vanilla) — memilih opsi dengan mouse tidak berfungsi.**
  Menekan (mousedown) sebuah opsi mem-blur tombol combo; handler `focusout` lalu memanggil
  `close()` yang menyembunyikan listbox **sebelum** event `click` opsi sempat menjalankan
  `choose()` — sehingga pilihan hilang dan nilai tak berubah (hanya terlihat dengan mouse asli;
  navigasi keyboard tak terpengaruh). Perbaikan: `preventDefault` pada `mousedown` listbox agar
  tombol tetap fokus, jadi `click` mendarat normal. Terverifikasi lewat gestur mouse asli
  (headless CDP `Input.dispatchMouseEvent`) pada playground docs dan section Select. Memengaruhi
  konsumen vanilla `freeday/js`; adapter Vue/React punya implementasi sendiri dan tak terdampak.

## [1.6.0] — 2026-07-24
Rilis **1.6 — wrapper input ekstra (Vue + React) + filter-bar**. Non-breaking, aditif.

### Added
- **`FdyDateRange` (Vue + React)** — rentang tanggal terkontrol `{start, end}` yang menyusun dua
  `FdyDatepicker` di atas layout `.fdy-daterange` yang sudah ada (akhir tak bisa mendahului awal,
  lewat min/max saling terkait). `v-model` di Vue, `value`/`onChange` di React. Tanpa CSS baru.
- **`FdyAutocomplete` (Vue + React)** — editable combobox WAI-ARIA APG terkontrol, port dari
  enhancer `freeday-autocomplete.js` di atas CSS `.fdy-autocomplete` yang sama: filter saat
  mengetik (substring case-insensitive pada query ter-trim), ↑/↓ dengan wrap, Enter commit,
  Esc/Tab/klik-luar menutup, `aria-activedescendant` + empty state, dropdown top-layer via
  Popover API. `onSelect`/`select` hanya saat commit — terpisah dari perubahan ketikan, jadi
  options yang sudah difilter server bisa dilempar masuk apa adanya.
- **`FdyCascade` (Vue + React)** — picker hierarkis drill-down terkontrol, port dari enhancer
  `freeday-cascade.js` di atas CSS `.fdy-cascade` yang sama: satu level sekaligus, branch masuk,
  kontrol back naik, leaf memilih (value = value leaf, tampilan = path penuh), buka ulang di level
  terpilih. Keyboard: Up/Down/Home/End, ArrowRight/Enter/Space aktifkan, ArrowLeft/Backspace naik,
  Esc tutup; `aria-activedescendant` + crumb live. Model data = **pohon `CascadeNode` bertipe**,
  menggantikan `<ul>` bersarang tersembunyi milik enhancer.
- **`.fdy-filterbar`** — layout primitive untuk baris filter yang konsisten, di atas `.fdy-field`:
  ritme lebar kolom (`--w-sm` / default / `--w-lg` / `--w-xl`), satu field `--w-grow` menyerap sisa
  ruang, `__actions` menempel di ujung sejajar kontrol, wrap rapi di layar sempit. Nol JS.
  Menutup gap "filter row ragged" dari adoption backlog #11.

### Changed
- Contoh `react-faktur` kini menggerakkan **Kategori** lewat `FdyCascade` — menghapus jembatan
  event `fdy-cascade-change` manual; ditambah field Periode (`FdyDateRange`) & Kota (`FdyAutocomplete`).
- Contoh `vue-faktur` mendapat demo Vue-native untuk ketiga komponen baru.

Dengan rilis ini adapter **Vue dan React simetris penuh** — tujuh komponen controlled typed yang
sama di kedua sisi: `FdyCombo` · `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` ·
`FdyCascade` · `FdyCfl` · `FdyChart`.

## [1.5.0] — 2026-07-24
Rilis **1.5 — React adapter parity**. Non-breaking, aditif.
### Added
- **React adapter parity** — komponen controlled typed `FdyCombo` / `FdyDatepicker` / `FdyCfl` /
  `FdyChart` + `usePopover`, di atas CSS kit yang sama (aksesibilitas WAI-ARIA APG, dropdown
  top-layer lewat Popover API). Aplikasi React tak lagi butuh fallback `<select>`/`<input
  type="date">` native. Dikonsumsi lewat `freeday/react`; Vite men-transpile source component
  langsung tanpa config tambahan, konsumen Next.js mungkin butuh
  `transpilePackages: ['freeday']`.

## [1.4.1] — 2026-07-23
Rilis **1.4.1 — patch**. Dropdown tak lagi ter-clip di dalam card / scroll container.
### Fixed
- **Dropdown lepas dari clipping ancestor** (`.fdy-card{overflow:hidden}`, scroll container, atau
  ancestor ber-`transform`). Semua dropdown `position:absolute` — **combo/select, datepicker,
  cascade, autocomplete, timepicker, menu** — kini di-render di **top layer** lewat native
  **Popover API** (`popover="manual"`) dan diposisikan `fixed` ke trigger (flip ke atas bila
  sempit di bawah, lebar mengikuti trigger, reposisi saat scroll/resize). Panel tetap DOM child
  komponennya, jadi focus, outside-click, dan ARIA tak berubah. Berlaku untuk enhancer vanilla
  **dan** komponen Vue `FdyCombo`/`FdyDatepicker`. `FdyCfl` sudah aman (berbasis `<dialog>`).
  Degradasi mulus ke perilaku lama pada browser tanpa Popover API. Non-breaking, tanpa perubahan API.
### Internal
- Helper baru `src/freeday-popover.js` (`window.FreedayPopover`) + composable `usePopover` di
  `freeday/vue` (internal, tak diekspor). Panel dropdown kini set `color:var(--color-text)` eksplisit
  (UA `[popover]` default-nya `CanvasText`).

## [1.4.0] — 2026-07-23
Rilis **1.4 — motion & native charts**. Dua fitur besar (gerak enter/exit lintas komponen +
chart native yang cukup untuk mem-pensiun-kan Chart.js) plus satu fix layout. Non-breaking.

### Added
- **Chart native — parity untuk drop Chart.js.** Tipe baru **`line`** & **`area`** dan **`bar`
  multi-seri + `data-fdy-stacked`**, semuanya dengan **sumbu ber-tema** (y-gridline + tick,
  x-label autoskip, baseline nol) dari `--chart-grid`/`--chart-tick`. Data multi-seri lewat
  **`data-series`** (JSON `[{label,values}]`); `data-values` tetap jadi shortcut seri-tunggal.
  **`data-fdy-format="number|percent|currency"`** memformat tick + tooltip; **legenda otomatis**
  untuk ≥2 seri (`data-fdy-legend="auto|always|none"`); hover band per-kategori. Warna dari token
  → **chart re-warna otomatis saat `data-theme` berubah** (tak perlu observer/re-paint kanvas).
- **`FreedayChart.update(el)`** — render ulang idempoten saat data berubah (auto-init tetap sekali).
- **`freeday/vue` → `<FdyChart>`** — wrapper reaktif & typed di atas renderer (re-render on prop
  change): `type` · `series`/`values` · `labels` · `format` · `stacked` · `legend` · `colors`/`color`
  · `center`; `aria-label` fallthrough. Tipe `FdyChartSeries` diekspor. Diverifikasi `vue-tsc` + `vite build`.

### Changed
- **Motion pass — gerak yang bermakna, semua hormati `prefers-reduced-motion`.**
  - **Drawer & Modal** kini beranimasi **masuk _dan_ keluar** (slide / fade-scale + backdrop blur)
    via `@starting-style` + `allow-discrete` pada `<dialog>` native — sebelumnya hanya masuk.
  - **Sidebar app-shell** collapse/expand desktop kini **meluncur** (animasi `width`) — sebelumnya
    `display:none` (snap). Mobile (off-canvas) tak berubah.
  - **Accordion** & **Tabs** me-reveal konten (fade + rise) saat dibuka/diganti.
  - **Baris tabel** transisi `background` halus saat hover.
- **`.fdy-daterange` responsif** — dua picker kini boleh menyusut (`min-width:0`) & wrap, jadi tak
  lagi overflow di row/HP < ~23rem; di lebar cukup tetap hug ~23rem seperti sebelumnya.

### Migrasi konsumen (opsional, aman)
1. Bump pin: `npm i github:cahyo-dimas/freeday-ui-kit#v1.4.0`, lalu rebuild.
2. **Motion & daterange:** otomatis, tanpa perubahan kode.
3. **Drop Chart.js (opsional):** ganti wrapper chart lokal dengan `<FdyChart type="line" :series>`
   (atau bentuk `data-fdy-chart`), hapus folder wrapper chart lokal, dan buang `chart.js` dari
   `package.json`. Machinery tema chart (probe warna + observer) tak lagi perlu — token yang urus.

## [1.3.1] — 2026-07-23
Rilis **1.3.1 — patch**. Buang rail aksen "eyebrow" di state aktif/terpilih.
### Removed
- **Rail aksen 3px pada state aktif/terpilih** (`box-shadow:inset 3px 0 0 var(--color-primary)`)
  dihapus dari nav app-shell (`[aria-current="page"]`), opsi cascade & autocomplete
  (`[aria-selected="true"]`), dan baris tabel terpilih. State terpilih tetap jelas & aksesibel
  lewat background `--color-primary-soft` + teks `--color-primary-strong` + semibold (tabel:
  soft-bg satu baris penuh). Murni visual, non-breaking; kontras tetap **9/9**.
### Kept
- Indikator fungsional yang **beda motif** sengaja dipertahankan: rail fokus keyboard CFL
  (`:focus-visible`, wajib a11y — pembeda fokus vs terpilih), underline tab aktif, checkmark
  combo, ring highlight combo.

## [1.3.0] — 2026-07-23
Rilis **1.3 — accent Azure**. Warna sekunder/aksen berubah dari **teal → biru Microsoft Azure**.
### Changed
- **Accent: teal → sky / Azure blue** — `--color-accent` kini `#0078d4` (light) / `#47a1e6` (dark),
  menggantikan teal `#0d9488`. Ramp primitif `teal` diganti `sky` (biru Azure muda);
  `--color-accent-hover` & `--color-on-accent` ikut disesuaikan (on-accent dark `#06233f` agar
  kontras di atas accent biru-muda dark). Semua konsumen `--color-accent` ikut otomatis: varian
  opt-in `.fdy-fab--accent`/`.fdy-slider--accent`/`.fdy-badge-ov--accent`, chrome docs, swatch
  identitas. Identitas kit kini **Azure** (primary biru-deep + accent biru-muda) — teal dibuang.
  Kontras WCAG tetap **9/9** (accent/surface + on-accent/accent lolos light & dark). Non-breaking
  (nilai token berubah; nama token/kelas/API tetap).

## [1.2.2] — 2026-07-23
Rilis **1.2.2 — patch**. Polish app-shell + koreksi warna indikator aktif/terpilih.
### Fixed
- **Brand link-safe (#17)** — `.fdy-app__brand` kini set `text-decoration:none`; saat brand
  dijadikan link "logo → home", judul/subjudul tak lagi ber-underline default browser.
- **Indikator aktif/terpilih: teal → primary (#18 + extend)** — bar/underline/check pada state
  aktif/terpilih sebelumnya pakai `--color-accent` (teal), yang **clash** dengan bg
  `--color-primary-soft` + teks `--color-primary-strong` pada palet re-theme (accent ≠ primary).
  Kini semua cue "you-are-here / terpilih" seragam di keluarga **primary**: item nav, underline
  tab, rail baris tabel, opsi combo/cascade/autocomplete. Varian aksen opt-in
  (`.fdy-fab--accent`, `.fdy-badge-ov--accent`, `.fdy-slider--accent`) tak berubah. Membalik
  bagian "teal sebagai aksen fungsional" dari v1.1.0. Murni CSS, backward-compatible.

## [1.2.1] — 2026-07-23
Rilis **1.2.1 — patch**. Perbaikan CSS ikon depan `.fdy-input-group`.
### Fixed
- **Ikon depan input-group tak ke-center + gap** — `.fdy-input-group__addon--icon` dipakai
  standalone tapi tak set `display`/`align-items`, jadi `<svg>`-nya nempel ke atas kotak flex
  yang ter-stretch (ikon melayang tinggi); dan padding-kiri ikon menumpuk dengan padding-kiri
  `.fdy-input` → gap lebar. Kini `--icon` self-contained (`inline-flex` + center, meniru
  `.fdy-input-group__btn`) dan `.fdy-input` setelah ikon memangkas padding-kirinya. Murni CSS,
  backward-compatible. Kena semua field search/find (topbar search, filter tabel, dialog CFL, dst).

## [1.2.0] — 2026-07-23
Rilis **1.2 — Vue input wrappers (native reimpl)**. Komponen Vue idiomatik dengan `v-model`
nyata di atas class CSS kit, supaya form Vue tak perlu fallback ke `<select>`/`<input type=date>`
native. **Non-breaking**: murni tambahan (file `.vue` + export baru); enhancer, `useFreeday`,
dan semua class/token lama tak berubah. `vue` tetap peerDependency opsional.
### Added
- **`FdyCombo`** (`import { FdyCombo } from 'freeday/vue'`) — combobox select-only WAI-ARIA APG
  dengan `v-model` (generic `T extends string`), keyboard penuh (↑↓/Home/End/Enter/Esc/typeahead)
  + outside-click; props `options`/`placeholder`/`disabled`/`invalid`/`describedby`/`ariaLabelledby`.
- **`FdyDatepicker`** — kalender native di atas `datepicker.css`; `v-model` string ISO
  `YYYY-MM-DD`, `min`/`max`, `locale` (Intl), keyboard grid penuh, `invalid`/`ariaLabelledby`.
- **`FdyCfl`** — choose-from-list **controlled + async**: `v-model:Row|null` +
  `fetchPage(query,page) => Promise<{rows,hasMore}>`, `columns`/`display`/`rowKey`. `<dialog>`
  native, search debounced, state loading/empty/error(+retry), pagination append, cache opsional,
  guard respons out-of-order. Ini kontrak integrasi field lookup (map nilai → master data server).
- **Error-state kit** — varian `--error`/`[aria-invalid]` ditambah ke `combo`/`cascade`/
  `datepicker`/`timepicker`, dan `input-group :has()` diperluas menangkap error kontrol — jadi
  validasi vanilla (`freeday-form`) **dan** prop `invalid` wrapper Vue sama-sama ber-styling.
  (Field CFL = `.fdy-input`+input-group, jadi error-nya via `aria-invalid` pada input, bukan
  kelas `.fdy-cfl--error`.)
### Notes
- Komponen Vue di-ship sebagai `.vue` mentah (bundler konsumen yang meng-compile); type-check
  butuh `vue-tsc`/Volar, bukan `tsc` polos. Install: `npm i github:cahyo-dimas/freeday-ui-kit#v1.2.0`.
- QA interaksi runtime (klik/keyboard di browser) = tanggung jawab konsumen; komponen
  terverifikasi type-check + build (`vue-tsc --noEmit` + `vite build`) + review kode.
- Follow-up diketahui (warisan datepicker, non-blocking): grid `role="grid"` datar tanpa `row`;
  hari fokus-awal yang ter-`min`/`max`-disable bisa bikin grid tak ter-fokus keyboard di config tepi.

## [1.1.0] — 2026-07-23
Rilis **1.1 — "Precision" visual polish + pengerasan adopsi**. Dua bagian: **(1) penyegaran
visual** token-driven — radius lebih tajam, elevation overlay lebih tegas, hierarki tipografi
heading lebih jelas, teal (`--color-accent`) sebagai indikator fungsional non-teks untuk state
aktif/terpilih; **(2) pengerasan adopsi** dari pemakaian project nyata — palet chart tervalidasi,
ukuran modal, nav statis, brand shell, export breakpoint, drawer `initAll`, dan tokenisasi kontrol.
**Non-breaking**: tak ada rename kelas/token/API (`fdy-` prefix, `--color-*`,
`window.Freeday*` tetap stabil). **AA-gated**: `npm test` tetap hijau (9/9), termasuk 6
assertion kontras baru yang menjaga teal-on-surface ≥3:1 di light & dark.
### Changed
- **Radius ramp lebih tajam** — skala dirapatkan ke `3/4/6/10/14/999px` (dari nilai lama yang
  lebih membulat), kesan lebih presisi di semua kontrol & container.
- **Motion lebih responsif** — durasi dasar `--dur-base` 200ms→180ms, `--dur-slow` 320ms→280ms.
- **Elevation overlay dijatah ulang** — bayangan `--shadow-3` (menu/dropdown/popover) dan
  `--shadow-4` (modal) kini lebih tajam & lebih hadir secara visual; bayangan resting
  (kartu, tombol) tidak berubah.
- **Hierarki heading "Precision"** — `h1`–`h4` kini memakai `--font-display` (Sora) / 700 /
  `--tracking-tighter` (token baru, -0.03em) / `--leading-snug`; ukuran font tidak berubah.
- **State interaksi disatukan** — hover/active/disabled/focus-visible dirapikan lintas
  input/combo/cascade/chip/pagination/selection; memperbaiki bug nyata di mana
  `.fdy-chip--filter` tidak punya focus ring sama sekali.
- **`.fdy-table-scroll` scroll tanpa syarat** — tak lagi hanya berlaku di dalam `.fdy-datatable`
  (`.fdy-table-wrap` untuk shell berbingkai, `.fdy-table-scroll` untuk scroll polos standalone).
- **`selection.css` di-tokenkan** — nilai mentah (`#fff` thumb switch, inset `rgba`, dimensi
  `1.15`/`2.4`/`1.35rem`) → token (`--color-switch-thumb`, `--color-shadow-inset`, `--control-box`,
  `--control-switch-w/-h`). Nol perubahan visual.
- **Default warna seri donut** — saat `data-fdy-colors` lebih pendek dari jumlah seri, celah kini
  diisi `--chart-N` fixed-order (bukan cycle palet semantik lama). Non-breaking.
### Added
- **Teal sebagai aksen fungsional** — `--color-accent` dipakai sebagai indikator non-teks
  untuk state aktif/terpilih: item nav aktif, underline tab aktif, baris tabel terpilih,
  opsi combo/cascade/autocomplete terpilih. Bukan dekorasi — murni penanda status.
- **Token baru** `--tracking-tighter` (-0.03em) untuk heading Sora.
- **6 assertion kontras WCAG (`AA_UI`, 3:1)** baru di `test/contrast.test.mjs` yang menjaga
  teal-on-surface di light & dark tetap lolos ambang kontrol non-teks.
- **Palet chart kategorikal** — token `--chart-1..8` (+ `--chart-grid`/`--chart-tick`), 8 warna
  colorblind-safe **tervalidasi** (validator dataviz, light & dark di surface Freeday: dark
  all-pass, light lolos + relief rule). Donut menggambar seri **fixed-order** (tanpa cycle).
  Token chart sengaja di luar `contrast.test.mjs` (a11y via validator palet + legend/label).
- **Modal size** — `.fdy-modal--sm/--md/--lg/--wide` (24/32/48/60rem, responsif, anti-overflow).
- **`.fdy-nav--flat`** — varian nav grup statis (tanpa caret / garis antar-grup / affordance
  collapse) + dukung markup non-`<details>` yang benar-benar tak bisa dilipat.
- **Brand shell berstruktur** — `.fdy-app__brand-mark`/`-title`/`-subtitle` (ikon + 2 baris di
  header shell); pemakaian teks satu-baris tetap jalan.
- **`FreedayDrawer.initAll`** — drawer kini ter-hydrate `useFreeday` di subtree Vue/React.
- **Export skala breakpoint** — `freeday/breakpoints` (`{ sm:600, md:960, lg:1280, xl:1920 }`)
  untuk `matchMedia` / menyelaraskan `@media` app ke skala kit.
- **Docs** — contoh **product-appbar** siap-copas (breadcrumb + input-group search + menu);
  install `git+https` untuk CI (repo privat tanpa SSH key); klarifikasi `.fdy-btn` = primary,
  `.fdy-table-wrap`, dan density `--control-h` untuk komponen custom.

## [1.0.0] — 2026-07-22
Rilis **1.0 — project-ready**, sekaligus **rebrand ke Freeday**. Definisi v1.0 terpenuhi:
kontras WCAG AA lolos audit otomatis · installable via git · integrasi Vue/React/Blazor
terbukti di contoh faktur yang jalan · docs adopsi lengkap.
### Changed
- **Rebrand Foundry → Freeday.** Nama paket `freeday`; export
  `freeday/css | /vue | /react | /blazor | /tokens | /enhancers/*`; API JS
  `window.Freeday*` / `Freeday.toast()` / hook `useFreeday`; artefak dist `freeday.*` + `freeday-*.js`.
  Prefix kelas/token **`fdy-` dipertahankan** (backronym FreeDaY) sehingga markup konsumen
  **tidak** breaking. Repo: `github:cahyo-dimas/freeday-ui-kit`. Filosofi: *"lebih banyak free day
  buat dev karena UI kit-nya sudah siap pakai"*.
- Install: `npm i github:cahyo-dimas/freeday-ui-kit#v1.0.0`.
### Docs
- Root redirect `index.html` → `docs/` untuk GitHub Pages (URL bersih `/freeday-ui-kit/`).

## [0.9.6] — 2026-07-22
### Docs
- **Whole-app language toggle (ID ⇄ EN)** — the topbar toggle now switches the entire docs,
  not just the landing: topbar, sidebar labels + group headers, every section heading, and
  every description. Keyed by section id / nav href, round-trips cleanly. (In-demo sample
  labels stay as illustrative content.)
- **Proper state icons** — the empty / error state cards use duotone SVG icons instead of
  emoji (🗂️/⚠️).
- Hero CTA spacing loosened (removed a stale `.doc-hero p` rule that zeroed the gap).
### Changed
- **Icons stay single-tone** — reverted the date/time picker glyphs to minimalist single-tone
  (duotone is reserved for the larger illustrative icons — states — and the theme toggle).

## [0.9.5] — 2026-07-22
### Added
- **Two-tone (duotone) control icons** — the date/time picker triggers (and the datetime
  composer that reuses them) now render with a low-opacity fill behind the stroke, matching the
  sun/moon theme toggle. A coherent duotone treatment for the control-glyph family.
### Docs
- **Landing language toggle (ID ⇄ EN)** — a topbar button swaps the landing copy (hero, stats,
  framework-integration, footer) between Indonesian and English via `[data-i18n]`; inline
  markup (bold/code) is preserved. Version references synced to v0.9.5.

## [0.9.4] — 2026-07-22
### Added
- **Sidebar-menu component** — `.fdy-nav` (App shell) now supports per-node `.fdy-nav__icon`
  and `.fdy-nav__badge` (count), collapsible sections `.fdy-nav__group`/`.fdy-nav__grouplabel`,
  and nested items `.fdy-nav__tree` + `.fdy-nav__sub` (native `<details>`, zero-JS). Any node
  can be icon+text, text-only, or badged. New "Sidebar menu" docs section.
- **Responsive App shell** — on mobile (≤720px) the sidebar becomes an **off-canvas drawer**
  opened by the topbar toggle, with a `.fdy-app__backdrop`; on desktop the toggle collapses it.
### Changed
- **Brand ↔ topbar aligned** — `.fdy-app__brand` is now the same height as the topbar
  (`--space-16`) so the logo and page title sit on the same line. `.fdy-app__title` truncates
  instead of forcing overflow.
### Fixed
- **Awkward Indonesian copy** — dropzone “Jatuhkan …” → “Seret berkas ke sini …”.
### Docs
- Theme toggle is now a two-tone **sun/moon icon** button. Clearer **notification badge** demo
  (bell + count) explaining the overlay badge works on any element. Responsive fixes so nothing
  overflows down to 320px.

## [0.9.3] — 2026-07-22
### Added
- **Chart hover (Chart.js-style)** — bar & donut charts now show an interactive tooltip that
  follows the cursor (`label: value`, donut adds `(%)`). Bars dim while one is hovered (the
  hovered bar stays lit); donut gains a transparent SVG sector per slice that pops on hover.
### Changed
- **App shell**: the brand is now a fixed header (only the nav scrolls, so the logo never
  scrolls away). New `.fdy-app__navtoggle` (hamburger) + `.fdy-app--nav-collapsed` to
  collapse/hide the sidebar. Roomier `--space-8` main padding.
### Fixed
- **Anchor buttons underlined** — `.fdy-btn` now sets `text-decoration:none`, so links styled
  as buttons (e.g. hero CTAs) no longer show an underline.
### Docs
- Nav categories are collapsible `<details>` groups with chevrons (PrimeVue-style); more
  section whitespace; topbar hamburger to collapse the sidebar.

## [0.9.2] — 2026-07-22
### Fixed
- **Hover kontrol form tak terlihat** — sejak border resting jadi `--color-control-border`
  (slate-500) untuk a11y, hover yang menuju `--color-text-subtle` (juga slate-500) tak berubah.
  Semua kontrol (input, textarea, combo, cascade, time/date picker, input-group, dropzone) kini
  hover ke `--color-text-muted` (slate-600) → menggelap terlihat.
- **Split button rusak saat hover** — `translateY(-1px)` per-tombol mengangkat satu paruh saja
  sehingga jahitan tak sejajar. Kini `.fdy-btn-split` menjadi satu unit: tiap paruh tak
  mengangkat/berbayang sendiri; split terangkat & berbayang sebagai satu kesatuan, plus garis
  pemisah tipis antar paruh.

## [0.9.1] — 2026-07-22
### Added
- **Adapter React** (`freeday/react`) — hook `useFreeday(rootRef?)` yang meng-*hydrate* enhancer
  di subtree pada mount + tiap commit (idempotent). Tipe `event.detail` di
  `adapters/react/index.d.ts`. Contoh jalan `examples/react-faktur/` (Vite + React 19 + TS).
- **Interop Blazor** (`freeday/blazor`, `adapters/blazor/freeday-blazor.js`) — script klasik yang
  mendaftarkan `window.FreedayBlazor` dengan `initAll` / `on` / `off` / `toast` / `toggleTheme`.
  `on(el, event, dotNetRef, method)` meneruskan detail (JSON-safe) ke method `[JSInvokable]` C#.
  Contoh jalan `examples/blazor-faktur/` (Blazor WASM, .NET 10, code-behind `.razor` + `.razor.cs`).
- Ketiga adapter (Vue/React/Blazor) diverifikasi headless dengan layar faktur yang sama:
  hydrate markup framework, validasi men-gate submit, event → state framework, tema light/dark.
### Changed
- `package.json`: export `./react` + `./blazor`, `react` peerDependency opsional (`>=18`).
  `version` 0.9.0 → 0.9.1.

## [0.9.0] — 2026-07-22
### Added
- **Adapter Vue 3** (`freeday/vue`) — composable `useFreeday(rootRef?)` yang meng-*hydrate*
  semua enhancer di subtree komponen saat mount + tiap update (idempotent). Tipis: enhancer
  tetap sumber kebenaran, event `fdy-*` mengalir lewat `v-on` native. Tipe `event.detail`
  disertakan (`FdyCascadeChangeDetail`, dst) di `adapters/vue/index.d.ts`.
- **Contoh jalan** `examples/vue-faktur/` — layar faktur nyata (Vite + Vue 3 + TS) yang memakai
  form validation + mask + cascade + datepicker + combo + table via adapter. `npm install &&
  npm run dev`. Membuktikan kontrak integrasi end-to-end (diverifikasi headless: hydrate,
  validasi men-gate submit, event → state Vue, tema light/dark).
### Changed
- `package.json`: export `./vue`, `adapters/` masuk `files`, `vue` sebagai peerDependency
  opsional (`^3.4.0`). `version` 0.8.1 → 0.9.0.

## [0.8.1] — 2026-07-22
### Added
- **Form validation** (`freeday-form.js`, `[data-fdy-validate]`) — Constraint Validation
  API di-wire ke error inline aksesibel: `aria-invalid` + pesan ter-`aria-describedby`,
  fokus ke field invalid pertama saat submit, re-validasi live tiap blur/input. Pesan
  custom `data-fdy-msg-*`, cocok antar-field `data-fdy-match`. Event `fdy-form-invalid`/
  `fdy-form-valid`, `window.FreedayForm`.
- **Password reveal + input mask** (`freeday-mask.js`) — `[data-fdy-password]` tambah
  toggle tampil/sembunyi (memakai ulang chrome tombol input-group); `[data-fdy-mask]`
  format saat mengetik (`#` digit, `A` huruf, `*` alnum, sisanya literal), raw value di
  `dataset.fdyRaw` + event `fdy-mask`. `window.FreedayMask`.
- **Cascade select** (`cascade.css` + `freeday-cascade.js`, `[data-fdy-cascade]`) —
  pemilih hierarki drill-down dari `<ul>` bersarang; cabang membuka level berikut, daun
  memilih (nilai = jalur lengkap), back/crumb + keyboard penuh. Event `fdy-cascade-change`,
  `window.FreedayCascade`.
- **Chip choice/filter** (`chip.css` + `freeday-chip.js`) — chip interaktif
  (`fdy-chip--choice` / `fdy-chip--filter`, `<button aria-pressed>`) dalam grup
  `[data-fdy-chips]` (`data-single` = pilih-satu), plus wiring hapus untuk
  `.fdy-chip__remove`. Event `fdy-chip-change` / `fdy-chip-remove`, `window.FreedayChip`.
### Changed
- `.fdy-input`/`.fdy-textarea` kini juga menampilkan border error lewat
  `aria-invalid="true"` (bukan cuma kelas `--error`), jadi enhancer cukup toggle satu
  atribut aksesibel.

## [0.8.0] — 2026-07-22
### Added
- **Installable sebagai paket GitHub.** `npm i github:cahyo-dimas/freeday-ui-kit#v0.8.0`.
  `package.json` kini punya `exports`, `files`, `sideEffects`. Jalur import:
  `freeday/css` (token+komponen), `freeday` (semua enhancer), `freeday/tokens`,
  `freeday/css/components`, `freeday/enhancers/<nama>`.
- `dist/freeday.bundle.css` — token + komponen dalam satu file (satu import, anti-footgun
  "lupa token").
- Skrip rilis: lifecycle `version` build-ulang + `git add dist`; `prepack` build-ulang.
### Changed
- `version` 0.1.0 → 0.8.0 (mulai semver bersih; komponen baru berikutnya = rilis minor 0.8.x).

## [0.7.0] — 2026-07-22
### Added
- **Time picker** (`freeday-timepicker.js`, `[data-fdy-timepicker]`) — trigger + popup daftar
  waktu (listbox WAI-ARIA), 24 jam, `data-step`/`data-min`/`data-max`, keyboard penuh.
- **Datetime picker** (`freeday-datetime.js`, `[data-fdy-datetimepicker]`) — komposisi date +
  time, satu event `fdy-datetime-change` (`YYYY-MM-DDTHH:MM`).
- **Konvensi varian ikon**: `data-fdy-no-icon` / `<template data-fdy-icon>` di date/time/datetime
  picker; `fdy-combo--no-icon` + `.fdy-combo__icon` di select; contoh ikon depan di input-group.
- Test regresi kontras WCAG (`test/contrast.test.mjs`) — audit graf token (light + dark),
  composite fill `-soft`, tegakkan 4.5:1 teks / 3:1 batas kontrol.
### Fixed
- **A11y (WCAG 1.4.11 & AA):** border kontrol form 1.55:1 → token `--color-control-border`
  (≥3:1); badge danger/info gelap di surface-3 → ramp baru red-300/blue-300; `text-subtle`
  sebagai teks nyata (header hari kalender, timestamp) → `text-muted`.
- **App-shell scroll:** header sticky via natural-scroll (sidebar + topbar `position:sticky`),
  mengganti pendekatan `--fill` yang menyisakan area putih saat scroll ke bawah.
- **Cross-browser:** `-webkit-backdrop-filter` untuk Safari; floor browser didokumentasikan
  (`color-mix()` → Chrome 111 / Safari 16.4 / Firefox 113).

## [0.6.0] dan sebelumnya
Lihat git tag `v0.2`…`v0.6`. Ringkas: pipeline token (`tokens.json` → CSS) + theming 3-sumbu,
app-shell/table/modal, 40+ komponen (form, feedback, navigasi, data, chart), enhancer JS
0-dependency, docs demo-site.
