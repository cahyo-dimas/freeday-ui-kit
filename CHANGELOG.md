# Changelog

Semua perubahan penting dicatat di sini. Format longgar mengikuti
[Keep a Changelog](https://keepachangelog.com/); tiap versi = git tag.

## [2.0.0] - 2026-08-25
### Changed: BREAKING
- **The vanilla enhancers now write English by default** (`NEXT-UP.md` #6, owner's decision). Every
  user-facing string they render, 39 of them across 9 enhancers, was Indonesian while the typed
  wrappers were English, so an app that touched both paths read as two products. A Blazor app
  touches both **by construction**: `FreedayBlazor.initAll` runs every enhancer. The report that
  opened this was an English back-office finding `aria-label="Filter kolom"` on its own table.
  Examples: `Menampilkan 1–5 dari 7` → `Showing 1–5 of 7`, `{n} dipilih` → `{n} selected`,
  `Sebelumnya`/`Berikutnya` → `Previous`/`Next`, `Wajib diisi.` → `Required.`,
  `Tampilkan kata sandi` → `Show password`, `Menunggu server…` → `Waiting for the server…`.
- **The datepicker's locale fallback follows.** `document.documentElement.lang || 'id'` is now
  `|| 'en'`. This is the string nobody would have found by grepping for prose: it decides month and
  weekday names through `Intl`, so leaving it would have produced English labels around Indonesian
  months, which is the mixed interface this release exists to remove. The page's own `lang` still
  wins, which makes `<html lang="id">` the whole migration for dates.
- **Migrating an Indonesian app** costs no fork: every string was already overridable per element
  with `data-fdy-text-<key>` (kebab-cased), and `data-fdy-msg-*` for validation messages. That hatch
  shipped in 1.39.0, so the half of `NEXT-UP.md` #6 written as "build an override hook" was already
  done, and only the default was ever in question. `COMPONENTS.md` §Language documents it.
- **Called 2.0.0 rather than 1.55.0 on purpose.** No API changed, but every raw-path screen renders
  different words, and a major version is the only signal npm gives a consumer that an upgrade needs
  looking at. Hiding that behind a minor is the same class of quiet mismatch the last four releases
  have been about.
### Added: guards
- The English guard now covers `src/freeday-*.js`, not just the typed adapters, so the promise is
  enforced on every path instead of stated on one. Verified by reverting a single string: it fails.
- **And a word list is not enough, which this release proved twice.** The list missed `Lanjut` and
  `Selesai` in the stepper and `Mengunggah…` in upload, and its own comment already warned that
  `pencarian` hides behind `\bcari\b`. So the complete vocabulary is now pinned: all 39 strings,
  asserted whole, so changing one has to be deliberate and visible in a diff.
- `browser/text-override.mjs` and `browser/upload-states.mjs` assert the new defaults. The override
  half is untouched and still passes, because it is the migration path and had to keep working in the
  same breath as the change that makes it necessary.
### Added: guards
- **The Blazor stack had no behavioural gate at all, and now has one.** Its only check was
  `dotnet build`, which is compilation, across twelve typed components, and `NEXT-UP.md` #5 described a
  manual runtime verification via `drive-*.mjs` + CDP that does not exist in the repository. That
  gap mattered most for the component added the same night: `FdyAppShell` reconciles a nullable
  two-way binding against a JS enhancer, which is precisely the kind of logic a compiler cannot see.
  `test/blazor/` (bUnit + xunit, 7 tests) renders the components for real: who wins on hydrate when
  the caller binds a value versus leaves it null, what the enhancer's `fdy-app-nav` event does to
  the binding, and that the two do not chase each other. Verified by sabotage: removing the echo
  guard fails one test, breaking the hydrate push fails another, one each.
- It is wired into `npm run test:blazor` and into `ci.yml`, so it runs where releases are made
  rather than where someone remembers. Deliberately placed OUTSIDE `adapters/`, which `package.json`
  ships as a whole directory, and a test project has no business in a consumer's `node_modules`.

### Fixed: the kit's own docs
- **The docs site shipped the wrong version number for three releases.** `docs/index.html` said
  `v1.51.0` in its eyebrow and footer through 1.52.0, 1.52.1 and 1.53.0, and
  `docs/getting-started.md` told readers to install `^1.34.0`, eighteen releases stale. `NEXT-UP.md`
  already carried the right instruction (don't work from a memorised list, `git grep` the old
  version) and it was still missed every time, because a runbook step is something a person has to
  remember. The stamps are correct now and a test asserts them against `package.json`, so the next
  miss fails the suite instead of reaching the live site.
- **`HANDOFF.md` was 419 lines of per-version history under a header saying "this is not a
  changelog"**, a duplicate of `CHANGELOG.md` that stopped being updated twenty releases before
  2.0.0. It is a snapshot again: what the kit is now, what the guards cover, how a release goes out,
  and what is known-unfinished. The same cleanup was done once before, in v1.20.0, for the same
  reason: a stale snapshot is worse than none.
### Known
- `docs/index.html` is Indonesian prose with its own ID→EN toggle for authored demo chrome, and that
  toggle does not reach enhancer-rendered strings. In Indonesian mode the demos now show English
  widget text. Left as-is deliberately: the page's job is to show what the kit actually does, and
  putting `data-fdy-text-*` on all 42 enhancer instances would hide the default it documents.

## [1.54.0] - 2026-08-25
### Added
- **`<FdyAppShell>` makes the shell the eleventh typed component**, in Vue, React and Blazor
  (`NEXT-UP.md` #8, stage 2). One model: `navOpen` means *the nav is visible to the reader*, and the
  kit owns the mapping: above the nav breakpoint a hidden nav is `--nav-collapsed`, below it a
  visible nav is `--nav-open`. An app never reasons about the viewport to answer a question about
  its own UI. Vue `v-model:navOpen` · React `navOpen`/`onNavOpenChange` · Blazor `@bind-NavOpen`.
- **The prop is optional in all three, and that is the design.** Unbound, the shell starts from the
  viewport: a column on a wide screen, hidden on a narrow one. A caller cannot express that as a
  single initial value before it knows the viewport, so `undefined` (Vue/React) and `null` (Blazor)
  mean "you decide". Bound, the caller wins and is pushed down on mount.
- **`adapters/core/app-shell.js`** (+ `.d.ts`) holds the Tab trap, `inert` bookkeeping and focus restore
  shared by the Vue and React wrappers, following `adapters/core/table-model.js`. `NAV_QUERY` is
  built from `tokens/breakpoints.mjs` rather than repeating `721`, so the JS and `app-shell.css`
  cannot drift. Blazor does not use it: `freeday-blazor.js` says the enhancers stay the source of
  truth, so the Blazor shell renders `data-fdy-app` and BINDS to `freeday-app-shell.js`. Two
  implementations, not four, and a guard holds them to one contract.
- **`fdy-app-nav`:** the enhancer now emits a bubbling CustomEvent (`detail {visible}`) on every
  real change, and takes `FreedayAppShell.setVisible(root, visible)` / `isVisible(root)` from
  outside. That is what the Blazor binding rides on, and what any vanilla app persisting a collapsed
  preference needed. The event fires for viewport-driven changes too, since narrowing hides a nav that
  was a visible column, and a bound value that stayed `true` would describe a panel nobody can see.
  Setting what is already set announces nothing, so a bound host cannot loop on its own echo.
### Docs
- `COMPONENTS.md` §App shell carries the typed-wrapper line and the `navOpen` contract; `USAGE.md`
  now tells you to take the behaviour, not just the frame. The parity claim moves from 10/10 to
  11/11 in `README.md`, `README.id.md`, `CLAUDE.md`, `docs/agent-onboarding.md` and `NEXT-UP.md`.
- `NEXT-UP.md` #8 is struck through rather than deleted, and its number kept: the CHANGELOG, the
  design spec and two guard headers already say "NEXT-UP #8", so renumbering the rows under it would
  quietly break references that are already written down.
### Added: guards
- `browser/adapter.mjs` runs one description of the shell contract against BOTH typed stacks:
  viewport default, focus into the panel, the Tab cycle, Escape returning focus, `inert`, and a nav
  link closing the overlay. Verified by sabotage: with `applyShellState` and the focus calls stubbed
  out, React fails three of three and Vue two of three, the third being the sidebar click path the
  sabotage did not touch.
- `browser/app-shell.mjs` gains the host-binding pair (`fdy-app-nav` ordering, `setVisible` doing the
  whole job and staying silent on a no-op) and the path only Blazor takes: a shell that does not
  exist at `DOMContentLoaded`, hydrated afterwards by handing `initAll` the component's own root,
  which is the element itself and not a descendant of it.
- `dotnet build` on the Blazor RCL is clean (0 warnings, 0 errors).

## [1.53.0] - 2026-08-24
### Added
- **`freeday-app-shell.js`: the shell finally ships its own behaviour** (`NEXT-UP.md` #8, reported
  twice). `.fdy-app` shipped `__navtoggle`, `__backdrop` and the `--nav-open` / `--nav-collapsed`
  classes with **zero JS**, and `COMPONENTS.md` told every consumer to wire it in two sentences that
  never mentioned Escape, focus, `inert` or focus restore. Follow that exactly and you get an
  off-canvas overlay that cannot be closed from the keyboard and lets Tab wander behind the
  backdrop. Opt in with `data-fdy-app`; the markup is otherwise untouched, so an existing shell
  gains the behaviour by adding one attribute and deleting its own copy.
  Owned now: the toggle in both modes, Escape, backdrop click, closing when a `.fdy-nav__item` is
  followed, focus into the panel and back to `__navtoggle` on close, `inert` on `__content` while
  the overlay is open, and a Tab trap inside the panel.
### Fixed
- **A hidden nav was still a tabbable nav**, in both modes and from the beginning. Collapsed at
  ≥721px is `width:0;overflow:hidden`; off-canvas at ≤720px is `translateX(-100%)`. Both hide the
  panel from the eye and neither hides it from the keyboard, so a nav nobody could see still
  swallowed every Tab on the way into the page. `__sidebar` is now `inert` whenever the nav is not
  visible, one rule for both modes rather than two patches.
- **Crossing the breakpoint with the overlay open stranded the page.** Widening the window left
  `--nav-open` set and `__content` `inert`, so the page underneath could never be clicked or read
  again, the same failure that produced `breakpoints.nav` in v1.20.0. The enhancer clears the
  overlay state on the media-query change, and deliberately does *not* move focus while doing it: a
  resize is not a user asking to go somewhere.
### Changed
- **`docs/index.html` and `docs/reference-screen.html` stopped hand-rolling it**, which is the
  proof rather than a tidy-up. The two copies had drifted: `index.html` handled Escape and
  close-on-nav-click, `reference-screen.html` handled neither, and *neither* trapped focus, marked
  the content `inert`, or restored focus. Two versions in one repository disagreeing is the whole
  argument for the kit owning this.
### Added: guards
- `browser/app-shell.mjs` (5 tests), each verified to fail with the enhancer switched off: collapse
  and its `inert` at ≥721px, the overlay and its `inert` at ≤720px, focus entering the panel and
  cycling inside it under **trusted** Tab presses, Escape returning focus to the toggle, backdrop
  and nav-item dismissal, and the breakpoint crossing. One of the five originally passed against a
  shell with no behaviour at all, because the nav never opened, so "it is closed" was true and
  meaningless. It now asserts it opened first.
- `setViewport()` in the browser harness (`Emulation.setDeviceMetricsOverride`). A responsive
  contract cannot be tested at a fixed window size, and the moment a layout *crosses* a breakpoint
  is exactly where its state gets stranded.

## [1.52.1] - 2026-08-24
### Docs
- **1.51.1's close-watcher caveat named the wrong condition** (#048). It said a `showModal()` with
  no transient activation ("from a timer, or after an `await` that outlived the click") has its
  close watcher grouped with the dialog below, so one Escape closes both. A consumer audited three
  call sites of exactly that shape and could not reproduce it. They were right, and the reason is
  that the line is **sticky** activation, not transient: grouping needs a page that has received no
  user input *at all*. Six seconds after a single click, with transient activation long expired and
  `navigator.userActivation.isActive === false`, two stacked overlays are still independent. So the
  grouping is reachable in a test harness and nowhere else, which is exactly where the kit met it.
- **What the advice was protecting was real, but it is a different failure.** Open either overlay
  from script and the second one's `cancel` event arrives **non-cancelable**: Escape still closes
  only the topmost, but `preventDefault()` on it is ignored, so an "unsaved changes, stay open" guard
  on that dialog silently stops working. Only when both overlays are opened by a real gesture is that
  veto available. The Modal entry now says this instead.
- The note also proposed documenting that the typed wrappers' `@cancel.prevent` makes them immune to
  the grouping. **Measured, they are not.** In a page with no activation the `cancel` event is not
  cancelable at all, so preventing it does nothing and both dialogs close regardless. That claim is
  not in the docs, and this is why.
### Added: guards
- `browser/overlay-stack.mjs` gains the whole matrix as one assertion: four ways to open two
  overlays × what one Escape leaves open × whether it could be refused, so a row changing is
  reported as news about the browser rather than a regression in the kit. Verified identical on
  Chromium 133 (the suite's engine) and Chrome 151.
- The fixture records each `cancel` event's `cancelable` flag; nothing prevents it, so the older
  tests measure what they always did.

### Fixed: the kit's own suite
- **The browser guards did not run where the releases are made.** CI ran the 59 unit tests and
  published; the 58 browser tests across 18 specs (pixel paint order for stacked overlays, chart
  accessible subtrees, the user-activation matrix above) ran only when someone remembered to run
  them locally. Automating the release through OIDC in 1.52.0 removed the someone. `ci.yml` now runs
  both suites on every push and is *called* by `publish.yml` (`needs: test`), so the step list that
  guards a release cannot drift from the one that runs during development, and a tag with red guards
  never reaches npm.
- **A job that merely ran the command would have been green while running nothing.** Every browser
  spec skips itself when no Chrome is found, and a skipped suite still exits 0. So the job checks
  the binary before it starts and then parses its own summary, failing on any skip. "The job was
  green" and "the guards ran" were separate facts, and only one of them was enforceable. Both
  demonstrated on real runs: the assertion green at 58/0, and a deliberately broken `CHROME_BIN`
  red.
- **The harness can now drive any installed Chrome.** `chrome-headless-shell` is headless by
  construction; an ordinary Chrome binary is not and, on a machine with no display, looks for one
  and dies. It now gets `--headless=new` (and `--no-sandbox` only under `CI`), which is what lets
  `CHROME_BIN=<some other Chrome>` compare engines, the manoeuvre that settled #048. CI runs the
  runner's Chrome stable, local runs Chromium 133, so both engines `COMPONENTS.md` names are
  genuinely exercised.
- Spec: `docs/superpowers/specs/2026-08-24-browser-guards-in-ci-design.md`. No shipped file changed:
  `browser/` and `.github/` are not in the published tarball, so there is no release for this.

## [1.52.0] - 2026-08-24
### Fixed
- **A chart's legend, bar values and donut centre were exposed to assistive tech after all** (#047).
  `COMPONENTS.md` explained the a11y contract with the ARIA spec, where `role="img"` is *Children
  Presentational*, therefore "rendered bar values, axis ticks and legends are not exposed". Measured
  against Chrome's accessibility tree, that is not what happens: a donut kept `list` → three
  `listitem` → `StaticText "posted — 76%"` and its centre total `1687`, the legacy `.fdy-bars` kept
  every value and label (`12`, `Jan`, `30`, `Feb`…), and a two-series cartesian kept its legend, all
  live and none ignored. What actually protected the advice was only that AT treats a *named*
  `role="img"` as a leaf and does not descend; the docs presented a habit as a guarantee. Axis ticks
  were the one true claim, and for an unstated reason: the renderer already sets `aria-hidden` on the
  `<svg>` itself.
  `ensureImg()` now marks the rendered children `aria-hidden="true"`, so the author's `aria-label`
  really is the entire text alternative and cannot be double-announced by an AT that does descend.
  Nothing is removed and nothing moves: the legend and the centre are still in the DOM and still
  painted.
- **The hiding requires a name.** A chart with no `aria-label`/`aria-labelledby` keeps its contents
  exposed: pruning the subtree of an unlabelled chart would leave an image with no name *and* no
  text, which is worse than the leak and harder for the author to notice. An element whose author
  set some other `role` is left alone entirely.
### Docs
- The Charts a11y bullet now describes the kit instead of the spec: what is hidden, that `role="img"`
  alone would not have hidden it, and what happens when the label is missing.
### Added: guards
- `browser/chart-a11y.mjs` (5 tests) over donut, legacy bars and cartesian: the accessible subtree
  exposes no text of its own, the author label survives as the name, the legend is still rendered and
  visible (hidden, not deleted), and an unlabelled chart still reads. The first three were verified to
  fail against 1.51.1.
- `axSubtree()` in the browser harness reports every AX node under an element, ignored ones included. The
  DOM cannot answer this class of question: `aria-hidden` changes no markup, so a `querySelector`
  assert passes identically before and after the fix. Same reason the 1.51.0 scaling bug needed a
  real measurement rather than a source read.

## [1.51.1] - 2026-08-24
### Docs
- **`COMPONENTS.md` never said whether two overlays may be open at once** (#046). Modal and Drawer
  were documented in isolation, so "can a confirm modal open over an open drawer?" had no answer in
  the file, and the built CSS does not answer it either: the only overlay `z-index` in the bundle
  belongs to the toast region. Both entries now state the rule, because both components are
  `<dialog>` opened with `showModal()` and therefore enter the **top layer**, where paint order is
  the order they were opened: the later modal is above the drawer with no `z-index` from either,
  Escape closes the topmost first (so cancelling returns to the still-open drawer), and closing them
  out of order leaves the survivor painted and dismissible.
- **The one caveat is the browser's, and it is now written down**: open each overlay from the
  gesture that asked for it. A `showModal()` with no user activation, from a timer or after an
  `await` that outlived the click, has its close watcher GROUPED with the dialog below it, and a
  single Escape then closes both. Measured, not assumed: two untrusted `.click()` opens, one Escape,
  both dialogs shut.
### Added: guards
- `browser/overlay-stack.mjs` (3 tests) proves that paragraph instead of restating it, the #041
  lesson applied to a documentation change. Paint order is asserted in **pixels** at the overlap of
  the two, because a modal dialog makes the rest of the document inert and `elementFromPoint` will
  name the dialog whatever is really on top; the overlays are opened with **trusted** clicks, or the
  close-watcher grouping above would fail the Escape assertion for a reason that is not the kit's.
- **`pressKey` in the browser harness sent every key but Tab with virtual-key code 0**, delivered
  to the page but not acted on by the browser: Escape reached a `keydown` listener yet never closed
  a native `<dialog>`. A dismissal guard written with it would have passed for the wrong reason and
  reported a broken kit as fine. It now carries the real `windowsVirtualKeyCode` /
  `nativeVirtualKeyCode` for the keys the suite presses.

## [1.51.0] - 2026-08-21
### Fixed
- **A cartesian chart's axis text and dots grew with the container** (#042). `renderCartesian` built
  a fixed `viewBox="0 0 320 180"` and let `.fdy-chart-xy__plot` stretch it to `width:100%`, so every
  size the renderer expressed in user units was multiplied by `plotWidth / 320`. `font-size:9px` on
  a tick is not nine screen pixels at any width but 320px: measured on a real console it rendered
  13px at a 350px plot and **81px at a 2232px** one, making the chart's smallest, most secondary
  text the largest type on the page. `r="2.2"` did the same to the dots: 4.8px across at 350px,
  30.7px at 2232px. The chart now measures `__plot` and sizes the `viewBox` to it in CSS pixels, so
  one user unit is one pixel and every declared size means what it says at every width; a
  `ResizeObserver` repaints it when the box changes (a collapsing sidebar moves a plot ~300px at a
  fixed viewport, so this is the common case, not an edge case). A chart that measures 0, whether detached
  or inside `display:none`, falls back to the old box and repaints when it is laid out.
- **A currency y-axis was clipped by a gutter sized for a percent one** (#042). `PL` was a constant
  38 user units, which was ~4 characters at one scale and something else at every other. It is now
  derived from the widest formatted tick the axis will actually draw, capped at 35% of the plot.
### Changed
- **Axis type is a real CSS size**, set by `--fdy-chart-tick-size` on `.fdy-chart-xy` (default
  `var(--text-xs)`). `font-size` moved off `.fdy-chart-xy__tick` / `__xlabel` onto
  `.fdy-chart-xy__plot`, which the SVG text inherits, so one computed read gives the renderer the real
  pixel size it needs for the y-gutter and for the x-label autoskip, so an override flows to the
  text *and* to the geometry around it. Before this, chart text could not be restyled at all: any
  value set was multiplied by a scale the consumer could not see or compute.
  The dot radius went 2.2 → 3 and the bar corner 1.5 → 2, both retuned against a 1:1 scale.
### Docs
- **`COMPONENTS.md` claimed a `<table>` fallback that no rendered chart has** (#041). It said every
  chart is `role="img"` + `aria-label` "with a `<table>` fallback inside the element"; the renderer
  builds no table and wipes the element on every render path. Worse, `role="img"` makes descendants
  presentational, so the bar values, ticks and legend the renderer *does* draw are not exposed
  either, so the author's `aria-label` is the entire text alternative, and the docs now say so and ask
  for one that carries the numbers. The four dead fallback tables in `docs/index.html` and
  `docs/reference-screen.html`, which no reader has ever reached, are gone with it.
- **The kit's own chart sizing is written down** (#041): `.fdy-chart-xy__plot` is
  `aspect-ratio:16/9` + `min-height:8rem`, `.fdy-bars` a fixed `9rem`, `.fdy-sparkline` an
  inline-block `8rem × 2.25rem`, with the note to override those rather than the chart root, since
  a root `height` fights `aspect-ratio` instead of setting it.
### Added: guards
- **`browser/chart-scale.mjs`** measures the axis label box and dot diameter at plot widths of
  350 / 696 / 1400 / 2232px and must not vary by more than a pixel, must stay smaller than body
  text, and the `viewBox` must equal the measured plot. A second spec widens a container and asserts
  the repaint. This class of bug is invisible to a source read: `font-size:9px` and `r="2.2"` look
  like correct sizes, and the one thing in the plot that *was* protected,
  `vector-effect:non-scaling-stroke` on the line, is what made the other three look protected too.
  Only a real layout tells them apart.

## [1.50.0] - 2026-08-20
### Fixed
- **A toast raised from inside a modal was painted behind it** (#027). `.fdy-toast-region` carried
  `z-index: 200`, which can never win: `.fdy-modal` is a native `<dialog>` opened with `showModal()`
  and therefore lives in the **top layer**, above the whole z-index universe. An error raised by an
  action taken inside a dialog was dimmed by that dialog's backdrop and mostly hidden under the
  dialog, so the reader saw a confirmation still asking a question they had already answered, and
  no reason why. The region is now `popover="manual"` and `freeday-toast.js` calls `showPopover()`
  as each toast lands (per toast, not once, because the top layer is ordered by when you joined, so a
  dialog opened after the last toast would otherwise sit above it). Guarded: where `showPopover` is
  unavailable or throws, the region stays exactly what it was.
- **A checkbox shrank when its label was long** (#027). `.fdy-check` is an inline-flex row and its
  box declared a width, but a flex item with a width is still shrinkable, so a label that wrapped
  to three lines squeezed the box from 18px to 13px while leaving it 18px tall. A group of five
  rendered three different sizes, none of them square. `flex: none` on `.fdy-check input`,
  `.fdy-radio input`, the `.fdy-switch` track and the standalone `.fdy-checkbox`. All four are
  flex children somewhere in the kit.
### Added: guards
- **`pixelAt(x, y)` in `browser/harness.mjs`** takes a 1×1 `Page.captureScreenshot`, decoded in-process.
  Stacking above a modal cannot be asserted with `elementFromPoint`: a modal dialog makes the rest
  of the document inert, so a hit test outside it returns the dialog whatever the paint order is,
  reporting a working fix as broken. The new guard measures the colour actually composited at the
  toast's centre. It waits for both fade-ins to finish first, since a screenshot taken mid-animation
  returns a blend of the two elements and flakes in both directions.
- **Selection controls are asserted square and equal** across a group whose labels run one to three
  lines, so a box that shrank in both axes cannot pass a width-only comparison. All four controls
  the fix touched are measured, each in the container it actually ships in: the standalone
  `.fdy-checkbox` inside `.fdy-filter__check`, the flex row all three typed adapters render in a
  filter popover and a CFL option list, and the switch track against a switch of its own, since it
  is the one control that is not square. The first version of this guard held the standalone
  checkbox in a plain block, where it cannot shrink at all, so removing `flex: none` from the one
  box every adapter puts on screen left it passing.

## [1.49.0] - 2026-08-20
### Added
- **`FdyTableColumn.labelHidden`** (#026). A column of row CONTROLS, an edit button or a row menu,
  could be named or quiet, not both: `label` renders as bare text in the `<th>`, so a designer who
  does not want a word above a column of icons was left with an empty header, which assistive tech
  announces as nothing. With `labelHidden: true` the label renders inside `.fdy-visually-hidden`:
  the cell looks empty and the column is still named. The label keeps naming the column's filter
  popover and sort button, so it stays meaningful either way.
  Contract and ALL THREE typed adapters: Vue, React and Blazor. Each renders its own header, so
  each spends the flag itself; Blazor takes `LabelHidden` on `FdyTableColumn<TRow>`.
### Added: guards
- **The column contract now has to reach all three adapters** (#026). Vue and React consume
  `table-model.d.ts` and TypeScript keeps them honest, but Blazor RE-DECLARES the column in C#, a
  hand copy and the surface that can fall behind silently. A test asserts every contract property
  exists on Blazor's `FdyTableColumn<TRow>`; coverage, not equality, so it needs no exemption list.
- **A hidden label is clipped, not dropped**, asserted in a real browser for both JS adapters
  (`browser/adapter.mjs`), because the claim is about computed geometry: a span carrying the class
  with no CSS behind it passes any string match and still prints the word.

## [1.48.1] - 2026-08-20
### Fixed
- **A date column sorted correctly and filtered nothing** (#025). `FdyTable`'s client-mode date
  filter read a cell with `dateOnly`, which **sliced** the string, while its date SORT reads the same
  cell with `toTime`, which **parses**. A date column normally renders a formatted date, which is
  what `value` is for, so `"18 Mar 2024"` sliced to `"18 Mar 202"` and compared as text against an
  ISO bound: every row failed, silently. The working sort is what made the broken filter look
  trustworthy.
- **A `Date` cell was read as its UTC day, not the reader's** (#025). `toISOString()` east of
  Greenwich turns local midnight into the previous day, so at UTC+7 filtering from the 18th dropped
  a row dated the 18th.
- Text that is not a date now yields `''` and is EXCLUDED by an active date filter, rather than
  slicing to something that compares as less than every bound and matching everything.
### Added: guards
- Three tests in `test/table-model.test.mjs`, each verified to fail against the old body: a
  formatted `value`, a `Date` cell at a positive UTC offset, and unparseable text. The existing date
  test only ever filtered a column with no accessor holding an already-ISO string, which is the one
  shape neither bug can affect.

## [1.48.0] - 2026-08-20
### Reverted
- **1.47.0's readonly focus ring (#024) is withdrawn.** The report was measured wrong. The control in
  question, a `CflField`'s readonly display input, sits inside `.fdy-input-group`, and
  `.fdy-input-group:focus-within` already carries the border and the 3px ring for the WHOLE control;
  `.fdy-input-group .fdy-input:focus` clears the inner input deliberately so the two do not nest. The
  audit measured the INPUT, found no shadow on it, and concluded there was no focus indicator.
  Measured on the group, focus shows `--color-primary` at full strength: 6.56:1. 1.47.0 therefore
  painted a muted ring INSIDE the blue one, which is a regression rather than a fix.
### Added: guards
- `test/css.test.mjs` pins the arrangement, the group rings and the inner input does not, so the next
  reader finds the answer instead of repeating the conclusion.

## [1.46.0] - 2026-08-19
The docs site catches up with the components, and writing it out as a consumer found a defect in
#016's own contract.
### Fixed
- **`data-fdy-text-*` could not be written the way HTML allows** (#023). The keys in each enhancer's
  `TEXT` table are camelCase, and `textOf` looked up `'data-fdy-text-' + key`, but **HTML lowercases
  attribute names**, so `data-fdy-text-filterText` becomes `...filtertext` while
  `data-fdy-text-filter-text`, the spelling anybody would actually reach for, is a DIFFERENT
  attribute the enhancer never read. It failed silently, which is the only way an override can fail.
  The key is kebab-cased for the lookup now; the run-together spelling still resolves, so markup
  written against 1.39.0 keeps working. Nine enhancers.
  It survived #016's own guard because all seven overrides that guard asserts use **single-word**
  keys, which have no case to lose, so the guard was not wrong but unrepresentative. The spec now
  overrides `filterText`, reached by clicking a column filter open. Mutation-tested.
### Docs
- **`docs/index.html` was nine releases behind.** It stated v1.34.0 and demoed none of what landed
  after it. Brought level with the components, as live demos rather than a feature list, because
  that is what the rest of the page is:
  - **New section, Tabel beku.** `.fdy-table--sticky` / `--sticky-head`, `.fdy-table__freeze` +
    `--fdy-freeze-left`, `.fdy-table-scroll--frozen` + `--fdy-table-frozen-h` (1.35.0, 1.37.0), with
    a rate matrix you can actually scroll on both axes, and the reason the two axes are separate
    modifiers.
  - **New section, Teks enhancer (i18n).** The `data-fdy-text-*` contract (1.39.0), demoed as the
    same data table rendered entirely in English, the demo that found #023.
  - **Badge tone scale** `--tone-1`…`--tone-8` (1.44.0), with the distinction the note drew: semantic
    variants state a judgement, tones distinguish without implying one.
  - **Date picker** now states the days → months → years drill (1.36.0); **Choose-from-list** states
    `multiple` for the typed wrappers, not only the enhancer's `data-fdy-cfl-multiple` (1.42.0).
- Verified in a browser rather than by reading the markup: the i18n demo renders `Showing 1–3 of 5`
  and a `Previous` pager, and the frozen table computes `border-collapse:separate` with
  `position:sticky` cells.

## [1.45.0] - 2026-08-19
Two defects in 1.42.0's multi-select CFL, found by the app that asked for it (IDU_EMATE_APPL_WEB, #022).
### Fixed
- **The row tick rendered as the browser's checkbox, not the kit's** (#022), in all three adapters.
  They shipped `class="fdy-check"` on a bare `<input>`; that class styles a wrapping `<label>` and
  its `input` DESCENDANT, so on the input itself it applied `inline-flex` and a cursor and nothing
  else, leaving a raw UA control in the middle of a styled dialog. `COMPONENTS.md` already said which class
  a bare input in a table takes: `.fdy-checkbox`. Every behavioural assertion in `browser/cfl-multi`
  passed while it was wrong, because none of them looked at the rendering.
- **`aria-selected` broke `vue-tsc` in consuming apps** (#022). `String(isPicked(row))` widens to
  `string`, and Vue types the attribute as `Booleanish`, so a strict app type-checking the kit's own
  `.vue` source failed on a file it does not own. Now `'true' : 'false'`.
### Added: guards
- `browser/cfl-multi.mjs` asserts the tick's computed `appearance` is `none`, which is the tell that
  the kit painted the box rather than the UA. Mutation-tested.

## [1.44.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #021).
### Added
- **`--tone-1`…`--tone-8` on `.fdy-badge`** give a status vocabulary larger than the semantic palette.
  `.fdy-avatar--tone-*` and `.fdy-chip--tone-*` already carried the categorical scale; the badge,
  which is the component that actually renders status, did not. The reporting app's document lists
  carry **ten distinct statuses in one column**: Draft, Submitted, Approved, Completed, Settled,
  Closed, Transferred, InDeclaration, Open, Rejected, against five modifiers, so Approved, Closed
  and Completed came out the same green and Draft, InDeclaration and Transferred the same grey.
  Semantics still come first: a state that IS good, bad or waiting takes `--success` / `--danger` /
  `--warning`, and these are for the rest. Same `--tone-*` tokens and the same 18%/50% mix as the
  other two, so the existing contrast test already measures them.
### Added: guards
- `test/css.test.mjs` asserts all eight bind their own token (a gap silently reuses a colour) and
  that the mix stays identical to the avatar's and the chip's, so one contrast test covers the three,
  so a badge that drifted to its own ratio would be gated by a test measuring something else.
  `test/contrast.test.mjs` renamed from "avatar tones" to "categorical tones" to say so.

## [1.43.0] - 2026-08-19
Three crowding reports from one settlement screen (IDU_EMATE_APPL_WEB, #020). All three measured in
Chromium rather than read off the CSS, since each is a layout outcome invisible in the stylesheet.
### Fixed
- **A control in a table column collapsed** (#020). `.fdy-input` is `width:100%`, which in an
  auto-layout table contributes **no intrinsic width**: the column shrank to its header text and took
  the control with it. A NOTE box measured **36px**, too narrow to read what you typed into it.
  Controls that are direct children of a `td` now keep a `7rem` floor (112px measured). Per-control
  rather than per-column, because the table cannot know which columns hold controls. `width:100%` was
  never wrong; it is only in a table that 100% of nothing is nothing.
- **A stat value wrapped between the currency and the number** (#020). `.fdy-stat__value` is
  `--text-3xl`; `IDR 300,000.00` needs **224px** at that size and `.fdy-stats` tracks are
  `minmax(11rem,1fr)`, so a three-across row at 660px gave it ~205px and it broke onto two lines.
  It now shrinks **only when its own column cannot hold it**: a 205px track renders 22.7px on one
  line, a 420px track still renders exactly 31px. Shrinking the token instead would have taken 31px
  from every consumer to fix a column that was 19px short. Scoped to a stat inside `.fdy-stats`,
  where the width comes from the grid track: `container-type:inline-size` on a standalone
  `.fdy-stat` would stop it sizing to its own content, and the unconditional rule stays as the
  fallback where `@container` is missing.
- **`.fdy-filelist` claimed space above itself and none below** (#020), so the "Add files" button
  every upload UI puts after it sat flush against the last row, a measured **0px**. Symmetric now,
  with `:last-child` dropping the bottom margin so nothing pays for room it does not need.
### Added: guards
- `browser/crowding.mjs` measures all three. The stat case asserts **both** directions: one line
  when narrow, still exactly `31px` when wide, because a fix that quietly shrank every dashboard
  would pass a "does it wrap?" test.

## [1.42.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #019), and a string the #009 guard could not see.
### Added
- **`multiple` on the typed `FdyCfl`** (Vue · React · Blazor). The enhancer has offered
  `data-fdy-cfl-multiple` since it shipped and `COMPONENTS.md` documented it; all three wrappers were
  single-valued **at the type level**, so there was nothing to widen from the outside. An app that
  started on the enhancer and later adopted the wrapper silently lost a capability, which is the
  actual defect, more than the missing feature. The settlement screen that reported it gathers six or
  eight approved claims onto one document and was doing six open→search→click cycles.
  Rows tick instead of committing, the footer counts them, and **Confirm** commits the set. Vue and
  React widen their model to `Row[] | null`; Blazor takes `Values` / `ValuesChanged` instead, because
  a nullable union is not a C# shape. New strings: `selectedText` (`{n} selected`), `confirmText`,
  `hintText`, the last one making the single-mode footer overridable too, which it never was.
### Notes on the shape of the fix
- **The ticks are component state, not the model.** Closing without Confirm has to leave the caller's
  value exactly as it was, so the dialog seeds its ticks from the bound value on every open. Binding
  them straight to the model would make Cancel a lie.
- **The field states `{n} selected`.** `display()` takes ONE row: naming one of six would be wrong and
  naming all six does not fit a 22rem control.
- **Blazor gained a modal footer**, which it never had, while Vue and React both commit from one.
- The tick checkbox is `aria-hidden` and inert. `.fdy-cfl__check input` is already
  `pointer-events:none` in the kit's CSS, so the row owns the click and a handler on the box would
  have been unreachable code; `aria-selected` on the row is what carries the state.
### Fixed
- **`FdyCfl`'s second retry button said `Coba lagi`** (Vue · React). The error state inside the
  results branch had a hard-coded Indonesian literal while the button two states above it correctly
  read `retryText ?? 'Try again'`, so the component both had the prop and ignored it. #009's guard
  missed it because **neither `coba` nor `lagi` is in its word list**, which is #015's lesson landing
  a third time: a word list is a floor, not a ceiling. Both now read `retryText`.
### Added: guards
- **The multi flow is driven by real clicks, in both adapters** (#019). `browser/cfl-multi.mjs`
  asserts that a click ticks rather than commits, that the dialog stays open, that `aria-selected`
  and the footer count follow, that a second click unticks, that Confirm hands back an **array** in
  order, and that closing without Confirm discards the ticks *and* does not remember them on re-open.
  Vue and React run the same script, so a divergence between the two fails here instead of in an app.
  A typecheck cannot tell you whether a mode ever renders. Mutation-tested: committing
  `picked[0]` instead of the array fails it by name.

## [1.41.0] - 2026-08-19
One note from the account app (IDU_EMATE_ACCT_WEB, #018), the first raised from that repo.
### Fixed
- **`.fdy-input-group` rendered 1px shorter than every control beside it** (#018). The group
  declares a `1.5px` border and its inner input subtracted `3px` to compensate, so the border box
  should land on `--control-h`. **At `devicePixelRatio: 1` the engine resolves each 1.5px border to
  1px**, the compensation over-subtracts, and a search field beside a button measured 39px against
  40px. At dpr 2 the halves survive and the arithmetic is right, which is why it shipped: it is
  invisible on a retina display and visible on every 1× monitor.
  The group now states `height: var(--control-h)` (it is already `border-box`) and the input
  `height: auto; align-self: stretch`. The group is `align-items: stretch` already, so the input and
  the addons fill whatever the border leaves, at any border width, any rounding, and under
  `data-density="compact"` without a second `calc` to keep in step. The defect was not the number;
  it was compensating in one rule for a value declared in another.
### Added: guards
- **Control heights are measured in a real browser** (#018). No stylesheet assertion could have
  caught this: the CSS reads as correct arithmetic, and the value it is correct about is one the
  engine rounds. `browser/control-heights.mjs` measures `.fdy-input-group` against `.fdy-btn`,
  `.fdy-input` and `.fdy-combo` with `getBoundingClientRect`, at both densities. Written **failing
  first** against 1.40.0, it reproduced 39 vs 40 before the fix landed.
- The note's own sweep is recorded: `calc(var(--control-h)` has five uses in `src/`, and the four in
  `button.css` step a control deliberately by a spacing token. This was the last compensation of its
  kind.

## [1.40.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #017).
### Fixed
- **A picker inside a `.fdy-field` now fills it.** `.fdy-field`, `.fdy-combo` and
  `.fdy-input-group` all cap at 22rem; `.fdy-datepicker` capped at 14rem and `.fdy-timepicker`
  at 11rem. In a two-column form grid that left a **224px** date box beside a **319px** combo,
  measured rather than eyeballed, and the row read as ragged with no fix available to the consuming
  app, because the cap sits on the component. `.fdy-field > .fdy-datepicker` / `> .fdy-timepicker`
  / `> .fdy-daterange` drop the cap; a picker standing on its own keeps its narrower width, which
  is right for a short value.

### Added: guards
- **The enhancer string contract is asserted in a real browser** (#016). 1.39.0 moved every
  user-facing string in **nine** enhancers into a `TEXT` table read through `textOf()`, and only
  **one of the nine**, upload, had any browser coverage at all. The node guard proves the
  literals *sit* in the table; it reads the source as text and cannot prove the wiring *runs*, so a
  `zone` out of scope or a `getAttribute` on a non-element would have thrown at init with all 51
  node tests still green. `browser/text-override.mjs` initialises table, stepper, mask, carousel,
  cascade, form and toast on real markup and asserts **both halves**: the documented Indonesian
  default still renders, and `data-fdy-text-*` wins. The default is a contract too: an enhancer
  that quietly turned English would be a breaking change wearing a bugfix's clothes.
  Mutation-tested: making `textOf()` ignore the attribute fails it by name and value.

## [1.39.0] - 2026-08-19
The sweep #013 §2 filed and #015 restated: the vanilla enhancers' strings are reachable now.
### Added
- **Every enhancer string is overridable with `data-fdy-text-<key>`** (#016). The defaults stay
  Indonesian, which is documented and deliberate for the raw path, and changing it would break
  every app that adopted it, but they were also *unreachable*, and that is the half that was
  wrong. A Blazor app meets these enhancers through `FreedayBlazor.initAll`, which runs every one
  of them, while COMPONENTS.md promises Blazor is English throughout; both promises can only hold
  if the default stays and the string can be changed. Each enhancer now keeps its strings in one
  `TEXT` table read through `textOf()`. `{n}`, `{from}`, `{to}`, `{total}`, `{name}`, `{max}` and
  `{label}` are substituted where the string supports them. Validation messages take the same shape
  on the `<form>`, narrower than the per-field `data-fdy-msg-<alias>` that still wins;
  `Freeday.toast()` takes `closeLabel`.
- **34 strings across 9 files**, not the 19 across 7 a word-list scan had counted: `carousel`
  (`Slide {n}`), `cascade` (`Kembali satu tingkat`), `mask` (`Tampilkan kata sandi`), `stepper`
  (`Selesai` / `Lanjut`) and four upload status strings were all invisible to it. #015 had just
  finished making this point about `\bcari\b` and `pencarian`; the recount was found by scanning
  by SINK: what lands in a `textContent`, an `aria-label`, a `title` or a `placeholder`, which
  cannot be fooled by an affix.
### Fixed
- **Blazor's `FdyCascade` rendered Indonesian** (#016). `Label` and `Placeholder` were `string?`
  with no default, so an app that did not set them emitted `data-label=""` and the enhancer fell
  back to `Pilih` / `Pilih…`. Vue and React have defaulted to `Select` / `Select…` since #015:
  same drift as #009 and #015, third time, and the parameter existing is what made it invisible.
  They are non-nullable with English defaults now, and `BackLabel` / `SubmenuLabel` reach the two
  strings the enhancer builds itself, which had no route from .NET at all.
- **`Freeday.toast()` from Blazor labelled its close button `Tutup`.** `FreedayBlazor.toast` now
  defaults `closeLabel` to `Close`, in the bridge rather than the enhancer, so a hand-written page still
  gets the documented Indonesian.
### Added: guards
- **An enhancer string is overridable, not hard-coded** (#016). `npm test` asserts that a literal
  reaching a `textContent`, `aria-label`, `title` or `placeholder` lives in that file's `TEXT`
  table. Scoped by SINK rather than by a word list, deliberately: a second word list would have the
  same hole one affix over, and this one is also blind to no language. Mutation-tested: putting
  `'Tutup'` back into the toast fails it by file and line.

## [1.38.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #015).
### Fixed
- **`FdyCfl`'s trigger said `"Buka pencarian"`** (Vue · React), the accessible name of the button
  that opens the picker, and so the first thing a screen-reader user meets on every
  choose-from-list. #009 replaced twelve strings around it and missed this one. It takes an
  `openLabel` prop defaulting to `'Open search'` now. Blazor was not Indonesian but was using
  `SearchPlaceholder` as that button's `aria-label`, a placeholder doing a label's job, and now
  takes the same `OpenLabel`, so all four stacks name the control identically.
- **`FdyCascade`'s up-one-level button said `"Kembali satu tingkat"`** (Vue · React), new
  `backLabel`, default `'Back one level'`.
### Changed
- **The language guard now lists derived forms, not just roots.** `\bcari\b` cannot match
  *pen·cari·an*, and `kembali` was never listed. Indonesian derives by affix, so a whole-word list
  misses most of the UI vocabulary. Widening it is what surfaced the `FdyCascade` string nobody had
  reported.

### Fixed: the test suite
- **`rules()` read only the last line of a selector**, so a rule written across several lines was
  reported under a fragment of its own name and every guard in `test/css.test.mjs` was blind to it
  (#014). A guard that matches nothing PASSES, which is the worst way for a test to fail: it
  surfaced only because the first draft of the filter-bar rule happened to be wrapped. The helper
  now strips comments from the whole source first (a comment quoting CSS carries braces, and those
  would split a rule in half) and reads the selector whole. Asserted directly rather than left to
  the CSS staying one-rule-per-line: that is a convention, and this is the thing that would quietly
  stop enforcing it. Mutation-tested: restoring the last-line read fails the new test by name.

## [1.37.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #014).
### Added
- **`.fdy-table__freeze` + `--fdy-freeze-left`** freeze **any number** of columns, not just the
  first. 1.35.0 froze `tbody th` at a hard-coded `left:0`, which suits a rate matrix's single row
  header and cannot express a wide table with two identity columns: they all landed on 0 and
  stacked. Mark every cell of a frozen column and give that column its offset; the offsets belong
  to the caller because they are sums of *rendered* widths, which CSS cannot compute.
  `.fdy-table__freeze--edge` marks where the frozen block ends.
- **A bare control in a `.fdy-filterbar` gets `--control-h`.** The bar aligns `flex-end` so
  labelled fields line up on their inputs; a `.fdy-check` / `.fdy-switch` / `.fdy-radio` / lone
  `.fdy-btn` has no label row, so flex-end left it sitting below the input's centre line. Now its
  box ends where an input's box ends and the control centres on that line.
### Changed
- **BREAKING (from 1.35.0): the header freeze moved to `.fdy-table--sticky-head`.** Freezing a row
  needs a vertical scrollport; a table that only freezes columns scrolls with the **page**, where
  `top:0` sticks the header under the viewport edge, over the consuming app's own top bar.
  `.fdy-table--sticky` is now the enabler (separate borders) and each axis is asked for
  explicitly. `tbody th` no longer freezes implicitly; use `.fdy-table__freeze`. 1.35.0 and 1.36.0
  are unpublished, so no released version carried the old contract.

## [1.36.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #013).
### Added
- **A year grid in the calendar** (vanilla · Vue · React · Blazor). 1.32.0's month grid killed
  one-click-per-month and left one-click-per-year behind it: the month grid's arrows step a year
  each, so 2026 → 1998 was **28 clicks**. The title now drills twice, days → months → years, with
  the arrows following the level shown, and picking a year drops to that year's months. Every level
  above the day grid stays **navigation**: nothing is committed until a day is picked. Year pages
  are aligned (2016–2027, 2028–2039) rather than centred on the year in view, so the pages tile
  instead of sliding over each other. New classes `.fdy-cal__grid--years` / `.fdy-cal__year`; new
  aria-label props `chooseYearLabel`, `prevYearsLabel`, `nextYearsLabel`.
### Changed
- **The month grid's title now drills UP to years rather than back down to days.** Getting back to
  days is what picking a month already does. Nothing in the kit's own tests or in a consuming app's
  helpers clicked the title from the month grid, so this is not expected to be breaking.
### Fixed
- **`freeday-datepicker.js` spoke Indonesian to the user.** Its placeholder and every nav
  `aria-label` were Indonesian, and because `FdyDatepicker.razor` delegates to the vanilla
  enhancer, **every Blazor app inherited them**, while #009's language guard, which scans
  `adapters/` only, passed. The datepicker is English now. The rest of `src/` is NOT audited: see
  improvement note #013 §2, which lists the enhancers still affected.

## [1.35.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #012).
### Added
- **`.fdy-table--sticky` + `.fdy-table-scroll--frozen`** freeze a table on one axis or both, for
  a grid read against two axes at once (a rate matrix, a timetable). This is a kit class rather
  than four lines in an app because `position:sticky` on its own produces a **visibly broken**
  table: `.fdy-table` collapses its borders, a collapsed border is painted by the table rather than
  by either cell, and so a frozen cell scrolls out from under its own rule, and the frozen column
  arrives with nothing separating it from the data. The modifier separates the borders and puts
  each one back on the cell that sticks. `<thead>` freezes at the top, `<th scope="row">` at the
  left, the first header cell is the corner, and the row header paints the **body** surface so a
  hovered row stays one band across the freeze line. `.fdy-table-scroll--frozen` is the scrollport
  the freeze resolves against (the base `.fdy-table-scroll` scrolls one axis, so `top:0` never
  engages); size it with `--fdy-table-frozen-h`, default `30rem`.

## [1.34.0] - 2026-08-19
One note from the back-office app (IDU_EMATE_APPL_WEB, #008), and the second half of #005 it
finally makes answerable.
### Added
- **`pageSizes` on `FdyTable`** (Vue · React · Blazor) and `data-fdy-table-page-size` for the
  enhancer. The footer stated the range and moved the page and stopped there, with no control for **how
  many rows a page holds**, which is the first thing anybody changes on a ninety-row list. The three
  numbers are one object: the component already receives `index`, `size` and `total`, rendered two
  of them, and left the third to the caller, so the caller withheld the whole footer with
  `pager={false}` and rebuilt all three to add the one. Give it `pageSizes` and it grows the control
  between the range and the pager. Server mode reports the pick through the existing
  `update:page` / `onPageChange` / `PageChanged`, carrying a new `size`; client mode applies it
  itself (so it works with nothing wired) and also emits `update:pageSize` / `onPageSizeChange` /
  `PageSizeChanged` for a caller that wants to persist it.
- **`FdyTableFooter`** (Vue · React · Blazor) is the footer as a component of its own. This is the
  half of #005 that `pager={false}` could only get out of the way: a **responsive** list renders one
  page of rows twice, a `.fdy-datatable` at `lg` and a `.fdy-list` below it, and a footer that lives
  inside the table lives inside the half a phone hides. Those screens took the footer over and
  re-implemented it. Now they render the kit's, once, outside both. `FdyTable` uses the same
  component internally, so there is one footer in the kit and not two that drift.
- **`pageIndexForSize(pageIndex, oldSize, newSize)`** in the shared table model. Resizing the page
  has two obvious answers and both are wrong: back to page 1 throws away the reader's place, and
  keeping the same index can land past the end (page 5 of 5 at twenty rows is page 2 of 2 at fifty).
  Anchoring on the first visible row always resolves, and it is what the reader expects: the row
  they were looking at is still on screen.
### Notes on the shape of the fix
- **A footer with a size control stays visible on a single page.** The old rule withheld the whole
  band whenever `totalPages === 1`, which would have made "100 rows" on a ninety-row list a one-way
  door: the control that got you there disappears with the pager. Visibility is now "there is a
  pager **or** there is a size control", and it lives in `FdyTableFooter` — one decision, four
  stacks.
- **No wrapper element.** `.fdy-table-footer__size` takes `margin-left:auto`, so the size control and
  the pager travel together on the right while the range stays left. The footer's DOM is byte-
  identical for every table that does not offer one.
- **`.fdy-combo`, not a native `<select>`.** The first cut of this shipped a native one, reasoning
  that three one-word options do not need a custom listbox. They do: an OS menu is unthemeable, and
  on macOS it drops a dark grey panel into a light page — which is the reason `FdyCombo` exists, and
  its own source header says so. Caught by a consuming app in a screenshot within the hour, before
  the release reached npm. The raw path still accepts either: the enhancer listens for `change` *and*
  for the `fdy-change` a `.fdy-combo` emits.
### Added: guards
- `pageIndexForSize` is unit-tested at the boundaries (first page, both directions, same-size no-op,
  a negative index, a zero size).
- The control is measured in a real browser, on two tables sharing one page state, **driven by real
  clicks on the popup** rather than a synthetic `change`: the server-mode pick must reach the caller
  **with the right index** (page 3 of five-row pages → page 2 of ten), and the client-mode table —
  deliberately wired to nothing — must still grow to 25 rows, because a control that only reports is
  a control that lies. Opening the popup is the half that would have caught the native `<select>`.
### Fixed
- **The typed `FdyCfl` dialog was Indonesian end to end, in every stack but Blazor** (#009).
  COMPONENTS.md promises the Vue/React/Blazor components are English throughout — that is the line an
  English app adopts the wrappers on — and the CFL broke it in **twelve strings** (`Pilih data`,
  `Tutup`, `Cari…`, `Memuat…`, `Coba lagi`, `Tidak ada hasil.`, `Hasil pencarian`, `Muat lebih
  banyak`, `Klik baris untuk memilih`) with **not one prop reaching any of them**. Blazor already had
  the whole set as English-defaulted parameters, so Vue and React now take the same props with the
  same defaults: a parity gap closing, not a translation being chosen. `FdyCascade` (`Pilih` /
  `Pilih…`) and `FdyAutocomplete` (`Tak ada hasil.`) get English defaults too; both were already
  overridable. The enhancers keep their Indonesian — documented, deliberate, a separate decision
  (NEXT-UP #6).

- **A guard for each.** The paragraph margins are checked against the classes the DOCS show on a
  `<p>`, so a new one is covered by documenting it — the step nobody skips. The grid ordering is
  asserted as an ORDER, because a specificity bug is invisible in either rule and only their sequence
  shows it. Both mutation-tested.
- **A guard for it.** `npm test` scans every string literal in `adapters/{vue,react,blazor}` for
  twenty unambiguous Indonesian words. One of the twelve was found by looking at a screen; the other
  eleven by the sweep that one prompted — reading finds the instance, only a mechanical check finds
  the class. Matched by word rather than by a list of components, so a new adapter is covered the day
  it lands.

- **`.fdy-eyebrow` and `.fdy-cfl__empty` never cleared the UA's `<p>` margin** (#010). Every other
  class the kit documents on a paragraph sets `margin:0`; these two did not, so a browser's 1em
  landed as spacing nobody wrote — 12px above the eyebrow and 12px below it. A consuming app reported
  it as two complaints ("the gap from the category to the top bar is too big" and "the gap between
  the title and the record value is too loose"); they were one missing declaration, and it made the
  top of every page 44px against 32px at the sides.
- **The footer's rows control was 4px taller than every other control** (#010). It carried
  `height:2.25rem` to match the pager links beside it, which made the one combobox in a compact app
  disagree with every input and combo on the page. A pager link is a nav button; the thing a
  combobox has to agree with is the form controls, so the height goes back to `--control-h`.
- **`.fdy-list__title` did not set its own type** (#010). The class carries weight, colour and
  truncation but inherited font-size and family, so on the `<span>` the docs show it is 16px body
  text and on an `<h3>` — a legitimate element for a row that names a record — the UA's 1.17em and
  base.css's display-font rule made it 18.7px Sora. A phone row's name then shouted over its meta,
  and a long one wrapped to two lines instead of ellipsising. A class that names a role owns the type
  for that role.
- **Seven more title classes let the element decide their type** (#011). The fix above was written
  for one class; asserting it as an invariant found the rest. `.fdy-alert__title`,
  `.fdy-dropzone__title` and `.fdy-toast__title` stated no `font-size` and no `margin`;
  `.fdy-state__title`, `.fdy-cal__title`, `.fdy-app__brand-title` and `.fdy-app__brand-subtitle`
  stated no `margin`. On the elements the docs show, all eight rendered correctly and always had —
  a `<span>` brings no margin and no size of its own. On a heading, which is the honest markup for
  an empty state's title or a row that names a record, the UA supplied `1.17em`, `bold` and `1em 0`
  and the kit's type scale simply did not apply. `font-size:inherit` is the fix where the class had
  no size of its own: it is what the documented span already did, and on a heading it declines the
  UA's `em` instead of inheriting it. **No rendering changes for markup that follows the docs.**
### Added: guards
- **A title class must render the same whatever element carries it** (#011). `npm test` asserts
  `margin`, `font-size` and `font-weight` on every `.fdy-*title` rule that sets type and is not a
  flex/grid box. This is #010's guard with the right invariant: that one checks the classes the docs
  show on a `<p>`, so it could only ever see the documented element, and the kit does not own that
  choice — heading level is the consuming app's semantics. Scoped to title roles deliberately:
  asserted over every class that sets type it fails 53 times on `.fdy-btn--sm`, `.fdy-avatar--xs`
  and friends, and a guard that loud is one somebody silences. It found the eighth class after the
  fix list had been written by eye. Mutation-tested.
- **The month grid rendered seven months across** (#010). `.fdy-cal__grid--months` sets three
  columns and `.fdy-cal__grid` sets seven; both sit on the same element and weigh the same, so
  source order decides — and the modifier was declared *before* the base it modifies, with a comment
  directly above it describing the 3×4 layout it was failing to produce. Moved after. Neither rule is
  wrong on its own, which is why reading them found nothing.

### Fixed: the kit's own suite
- `browser/fixtures/theme-subtree.html` had no explicit theme on `<html>`, so its "light app" probe
  fell to `prefers-color-scheme`. On a machine in dark mode both probes read the dark ink and the
  test failed claiming `data-theme` had gone back to being root-scoped. Pinned; the subtree
  behaviour under test is unchanged.

## [1.33.0] - 2026-08-18
Three notes from the back-office app, four findings, all four executed.
### Added
- **`pager={false}` on `FdyTable`** (Vue · React · Blazor). Server mode rendered its own footer
  unconditionally: `hasPager` was `pageSize > 0 && totalPages > 1` with no way in, so a responsive
  list — a table at `lg`, `.fdy-list` below it, one pager serving both so the views cannot disagree —
  showed the kit's footer *and* the app's, stacked, on every list with more than one page. The only
  workaround was `display:none` on `.fdy-table-footer`, an app reaching into a component's internals.
  Client mode already had its hatch (`pageIndex`); this gives server mode one, and in server mode it
  is the honest shape — the app owns the page there anyway, it was simply being handed a second
  control.
- **`usePopover` is exported from the Vue adapter.** Every kit dropdown uses it to escape an
  ancestor's overflow clip (`.fdy-card` is `overflow:hidden`, so a panel inside one is cut at the
  card's edge), and a consuming app that had to build a control the kit does not ship had to
  re-implement it — ~70 lines, from the kit's own description, that will not improve when the kit's
  positioning does. *Correction to the report: React has exported it all along; only Vue was missing
  it. Blazor has no composable layer — its panels go through the JS bridge.*
- **Quiet destructive buttons.** `--danger` was the solid treatment and nothing else, so
  `fdy-btn--ghost fdy-btn--danger` — which every reader parses as "quiet destructive" — rendered a
  second SOLID button. That is a hierarchy defect: the base class is already the one primary per
  screen, and a solid Delete beside Save is a second primary in all but name.
  `.fdy-menu__item--danger` has always modelled the quiet form; it now reaches `.fdy-btn`.
### Fixed
- **`.fdy-eyebrow` and `.fdy-nav__grouplabel` spend a text ink.** Both set type in
  `--color-text-subtle`, which is gated at 3.0 *by design* (placeholders, separators, decorative
  glyphs) and measures 4.41:1 — axe reports it as a serious `color-contrast` failure. Identical to
  `.fdy-stat__label` in 1.30.0, one release earlier: same ink, same 4.41, same argument.
  The nav group label is the one the report did not know about — the sweep it asked for found it,
  and that rule was *already* brightening to `--color-text-muted` on hover, which is the CSS
  admitting its resting state was too faint.
### Notes on the shape of the fix
- The report proposed scoping the solid danger with `:not(.fdy-btn--ghost):not(.fdy-btn--text)`.
  Shipped without it: the pairing rules are more specific and come later, so they already win —
  the `:not()` would be a second mechanism expressing the same intent, and the mutation run proved
  it changed nothing.
- **A regression written and caught inside this change:** Vue casts an omitted Boolean prop to
  `false`, not `undefined`, so `props.pager !== false` withheld the footer from every table that
  never mentions `pager`. The existing controlled-`pageIndex` guard failed within seconds. `pager`
  now goes through `withDefaults`, the same trap `FdyModal`'s `dismissible` hit in v1.18.0.
### Added: guards
- **The prose-ink invariant** note 007 asked for: any rule that sets a `font-size` *and* spends
  `--color-text-subtle` is typesetting prose in an ink gated for decoration, and fails. Matched by
  shape, not by a list of names, so the third instance cannot arrive the way the second did. Two
  documented exemptions carry their reason.
- `pager={false}` is measured in a real browser with two tables sharing one server page state: the
  footer must be **absent from the DOM**, not hidden (a visually hidden pager is still a tab stop
  and still announced), and the other table's pager must still work.
- Quiet destructive is measured as a rendered `background-image`, the same reason the `aria-pressed`
  fills are: a gradient is a background-*image*, so the CSS reads fine either way and only the engine
  shows which treatment won.

## [1.32.1] - 2026-08-18
Docs only. Asked by a consumer: *"if I upgrade, will the agent in my project know what it gained?"*
The answer was no, and two reasons why.
### Fixed
- **`docs/agent-onboarding.md` never mentioned the changelog.** It is the file a consuming agent
  reads first, and it listed everything in the package except the one file that says what changed
  between the version the project had and the one it now has. It now points at
  `node_modules/@cahyo-dimas/freeday/CHANGELOG.md` explicitly, plus a short *reach for this instead
  of hand-rolling that* table covering the last nine releases — the additions most likely to replace
  something an app already worked around.
- **Three classes existed only in shorthand** in `COMPONENTS.md` — `.fdy-label--required`,
  `.fdy-cal__month` and `.fdy-cal__grid--months` were written as `(+--required)` and `__month`, so
  the full name appeared **zero** times and a grep for the class found nothing. The drift guard
  cannot see this either: it verifies fully-written names and skips shorthand by design, so a class
  introduced only in shorthand is invisible to both the reader and the test.

## [1.32.0] - 2026-08-18
Improvement note 004, both halves: a calendar you could not steer, and a check mark that talked.
### Added
- **The calendar title is a control.** It was a `<div>` — the only thing naming the month, and not
  clickable — so the only pointer route to another month was one click per month: August 2026 to
  March 2022 is **53 clicks**. `Shift`+`PageUp` already jumped a year (APG, correct) but had no
  affordance whatsoever; the reporting repo's own Playwright helper clicked "previous month"
  **twenty-four times** and shipped, which is the strongest possible evidence that nobody finds a
  shortcut nothing mentions.
  Pressing the title now drills to a 12-cell month grid where the arrows step **years**. Same
  journey: **7 clicks**. Picking a month is navigation, not selection — the day grid comes back with
  the roving cell clamped into the new month and nothing is committed until a day is chosen.
  Shipped in the vanilla enhancer, Vue and React; `FdyDateRange` composes the picker in both
  adapters and the Blazor `FdyDatepicker` wraps the enhancer, so all of them inherit it.
  New classes: `.fdy-cal__grid--months`, `.fdy-cal__month`. The month grid mirrors the day grid's
  keyboard contract (arrows ±1/±3, Home/End, PageUp/PageDown a year, Enter/Space to choose), and
  `COMPONENTS.md` now states the `Shift`+`PageUp` shortcut it never mentioned.
### Fixed
- **A combo option's accessible name no longer changes when it is selected.** The tick lived inside
  `role="option"` as text, so the selected option announced `✓August` while every other announced
  `August`: the state was read twice — once as `aria-selected`, once as decoration — and
  `getByRole('option', { name: 'August' })` stopped matching the one option that was selected. The
  glyph is now painted by CSS with alt text (`content:"✓" / ""`), the same technique
  `.fdy-label--required` uses. The conditional disappears from all four stacks, and the vanilla
  enhancer's `optionLabel` loses the sibling-walk it needed to skip a glyph.
### Notes on the shape of the fix
- **A bug written and caught inside this change:** swapping the calendar head with `v-if`/`v-else`
  destroys the very button the user just pressed, focus falls to `<body>`, and the panel's own
  `focusout` handler closes it mid-navigation. The head is now one element set whose labels and
  handlers switch, and `focusout` ignores a **null** `relatedTarget` — focus lost because an element
  was removed is not focus leaving the control, and a pointer that really lands outside is handled
  by the mousedown path.
- The report's `aria-hidden` suggestion would also have worked; CSS alt text was chosen because it
  removes the conditional from four implementations instead of adding an attribute to each.
### Added: guards
- `browser/harness.mjs` gains **`axName(selector)`** — the accessible name as the *engine* computes
  it (CDP `Accessibility.getPartialAXTree`). This mattered immediately: the first version of the
  name invariant read `textContent`, which never contains CSS generated content, so it passed with
  the tick back in the accessibility tree. With `axName`, that mutation reports `"✓ Badge"`.
- Real-click drill specs for the vanilla enhancer, Vue and React: the title is a `<button>`, drilling
  shows 12 months and moves focus into the grid, the arrows step years, and picking a month commits
  nothing.

## [1.31.0] - 2026-08-18
Improvement note 002: density was a one-way door.
### Added
- **`[data-density="comfortable"]` is now a real rule.** The kit shipped only the `compact` block,
  and its own comment promised per-subtree density — true in one direction only. These are
  inheriting custom properties, so once `<html>` is compact *every* subtree is compact and a
  `comfortable` wrapper matched nothing at all. An app that is dense overall (a back office where
  most screens are data grids) could not opt its shared chrome back out: measured against a sibling
  product, the logo sat 12px from the edge instead of 16 and the avatar 12 instead of 20 — four
  pixels in two places, from `--space-4` and `--control-h`, which reads as sloppiness rather than as
  a token. The workaround, restating the five defaults on a local class, is exactly the copy that
  goes stale when the kit retunes a step.
  Note the kit's own README has been telling people to write `data-density="comfortable"` on `<html>`
  since long before a rule existed for it — harmless there, because it matched the defaults by
  accident, and broken the moment anyone needed it on a wrapper.
### Notes on the shape of the fix
- The five values are **derived from the tokens' own defaults** at build time, not written out a
  second time. Same key set by construction, so a token that gains a `$compact` value automatically
  gains its way back out, and a retuned default can never leave the two blocks disagreeing. The
  report's hand-written block was correct in all five values — this only removes the chance for it
  to stop being correct.
### Added: guards
- `test/build.test.mjs` asserts the two density blocks cover the *same* tokens, that every
  comfortable value equals the `:root` default, and that none of them equals its compact counterpart
  (a block that resets nothing is as green as one that works).
- `browser/theme.mjs` measures it in a real engine: a compact root, a `comfortable` island that
  returns to a 40px control and `--space-4: 1rem`, and a `compact` island nested back inside that —
  because the point of the rule is the box that comes out, not the declaration going in.

## [1.30.0] - 2026-08-18
Note 008 (adopting 1.29.0) plus a direct design report: *"the input border looks too dark next to the
card and button-group borders."*
### Fixed
- **The dark theme's contrast has not actually been tested since v1.21.0.** `contrast.test.mjs` looked
  for `:root[data-theme="dark"]`; un-rooting the theme selectors in 1.21.0 changed the emitted
  selector to `[data-theme="dark"]`, so the regex matched nothing, `dark` fell back to the **light**
  values, and every `WCAG contrast — DARK` assertion re-tested the light theme under a dark label —
  54 declarations ignored, all green. Fixed, and the scope now has a guard of its own: a dark scope
  that parses to nothing, or that resolves to the light surface, fails loudly. *No latent dark-theme
  failures were hiding behind it — the theme passes on its own merits.*
- **`--color-control-border` retuned** to a new ramp step `--slate-450` (`#798295`). It was
  `--slate-500`, the same ink as `--color-text-subtle`: a control **boundary** carrying text-level
  contrast (4.69:1 on surface where WCAG 1.4.11 asks 3:1), which is what makes a form look heavier
  than the cards around it. Now ≈3.9/3.6/3.4 across the three light surfaces. The same step
  *strengthens* the dark theme, which was sitting at **3.02:1** on `surface-3` — 0.02 above the
  floor, and unguarded because of the bug above; it is now 3.66:1.
- **`.fdy-stat__label` uses `--color-text-muted`.** It spent `--color-text-subtle`, which is gated at
  3.0 *on purpose* (placeholders, dividers, decorative glyphs) and measures 4.41:1 on `surface-2` —
  under AA for text, on the only thing naming the number above it. Reported in 006 §6 and still
  carried by the app at 1.29.0.
### Added
- **`.fdy-btn--stretch` now works in a `.fdy-list__row`** (note 008 §1). The pattern existed for
  "one card, one primary action, one escape hatch" and had no equivalent for the same sentence with
  *row* in it — an app rendering both grid and list from one component had to hand-roll the row half.
  The row anchors the overlay itself, opt-in through `:has(.fdy-btn--stretch)` so a plain row is
  untouched and nothing an app pinned inside one starts resolving against a new containing block.
  Measured before the fix: **every** row's overlay covered the whole list and the last one in the DOM
  won, so a click on row one opened row two — under row one's name.
### Notes on the shape of the fix
- **Note 008 §2 is not reproducible** and no code shipped for it. With a positive control to prove
  the measurement works (pointing at the card body *does* put the stretched target in `:hover`),
  pointing at the escape hatch leaves it at rest: the hover chain is `HTML > BODY > card > footer >
  hatch`, and the stretched button is a sibling, not an ancestor. The `pointer-events:none` rule the
  report carries fixes something the kit's own composition does not do.
- The report's contrast figures (4.41 / 4.69) were re-derived from the 1.29 ramp and are exact.
### Added: guards
- `contrast.test.mjs`: the control border is now asserted on **all three** surfaces (`surface-3` was
  missing, and it is the worst case that pinned the dark theme to the floor) and at **3.25**, not
  3.0 — a boundary that clears the floor by 0.02 has no headroom, and the margin is what catches a
  revert to the old ink.
- `css.test.mjs`: a stat label must spend a *text* ink, and a list row hosting a stretched target
  must anchor it — both are class↔token pairings that every token-level assertion passes straight
  through.
- `browser/card-stretch.mjs`: the list case, asserting **row one** (the point that hides the bug is
  row two, which passes even when the overlay belongs to another row).

## [1.29.0] - 2026-08-18
Improvement note 001 from a second consuming app (a 40-screen back office). Eight findings; six
executed, one already documented, one left as an owner decision.
### Added
- **`clearable` on `FdyCfl`** (Vue · React · Blazor). The value type already said `Row | null`, but
  the emit was `Row` only — a choose-from-list could be **set and never unset**, which breaks every
  *optional* foreign key (a device with no project, an expense with no workflow, a top-level record
  with no parent). A user who picked the wrong row had to reload the form. The clear control is a
  second `.fdy-input-group__btn`, emits `null`, returns focus to the trigger, and never touches the
  dialog.
- **`.fdy-label--required`** — the marker is painted through `::after` with **CSS alt text**
  (`content:"*" / ""`), so the glyph appears and the accessibility tree gets nothing. The control
  already carries `required`; a `<span>` an app has to remember to mark `aria-hidden` can be
  forgotten, this cannot.
- **`.fdy-icon`** — a `1em` square, `flex:none` box for the icons the kit deliberately does not
  ship. Every icon slot it *does* ship (`.fdy-btn__icon`, `.fdy-nav__icon`, `.fdy-state__icon`)
  already assumed something sensible inside; a standalone icon had no contract.
- **`.fdy-text-success` · `.fdy-text-warning` · `.fdy-text-danger`** — the kit had three
  *de-emphasis* text roles and no *state* role, so a consequential sentence ("Amount changed from X
  to Y", "No approver assigned") had to fall back to `.fdy-text-caption`, which de-emphasises
  exactly the line that should stand out. A badge is wrong (prose, not a status) and an alert is
  wrong (a block, not one line in a row).
### Fixed
- **`.fdy-menu__item:focus-visible` gets a real ring.** It marked focus with the same fill as
  `:hover`, and `freeday-menu.js` moves real DOM focus — so arrowing through a menu was invisible,
  and hover and focus were identical to everyone else. `.fdy-nav__item`, in the same kit, has always
  done it correctly. Reported by two different apps before it was fixed.
- **A grouped `<fieldset>` now has its spacing.** `fieldset.fdy-field` already reset the UA border,
  but the **rendered legend is laid out outside the flex flow**, so `gap` never reached it —
  measured 0px between legend and first control. One declaration on the reset the kit already
  ships, not a new block; `COMPONENTS.md` documents the compose (`.fdy-field` on the fieldset,
  `.fdy-label` on the legend), which is what was actually missing.
### Notes on the shape of the fix
- **§7 (an Indonesian `aria-label`) is not what it looked like.** The report assumed the rest of the
  kit's output is English; it is not — *every* user-visible string the vanilla enhancers write is
  Indonesian (`Sebelumnya`, `Berikutnya`, `Berisi teks`, `Reset`, `Tutup`, `Menampilkan …`,
  `Bulan berikutnya`, `Format tidak valid.`). Translating one would **create** the mixed interface
  the note objects to. The real choice — an override hook, or switching the defaults and breaking
  every Indonesian consumer — is recorded in `NEXT-UP.md` #6 with its trigger; `COMPONENTS.md` now
  states the caveat in full and points English apps at the typed wrappers.
- **§8 needed no code**, only the line it asked for: the filter button and its dialog share an
  accessible name on purpose, so a test suite wants `getByRole`, not `getByLabel`.
- Two traps found by measuring rather than reading: `.fdy-icon` as a bare inline element **ignored
  `width` entirely** (it does not apply to non-replaced inline boxes) and rendered 936px wide until
  it got a `display`; and stacking two colour roles (`.fdy-help.fdy-text-warning`) silently loses to
  whichever rule the bundle happens to emit later — documented, and the docs page no longer does it.
### Added: guards
- Adapter specs for `clearable` in both Vue and React (real clicks: emits `null`, empties the field,
  the control disappears with the value it cleared, focus lands on the trigger, dialog stays shut).
- CSS gate: menu focus must render as more than the hover fill; the required marker must keep its
  alt text; `.fdy-icon` must keep a display that accepts a width; the state roles must spend the
  exact inks the contrast gate proves readable — that last one closes the seam between the two test
  files, where a class could drift to a weaker token while every token assertion stayed green.
- `contrast.test.mjs` now also asserts the state inks on **plain** surfaces, not just over their own
  `-soft` fills.

## [1.28.0] - 2026-08-18
Improvement note 007, written while fixing a workspace picker whose cards showed a pointer cursor
and swallowed every click.
### Added
- **`.fdy-btn--stretch`** — the pattern for **one card, one primary action, one escape hatch**, which
  the kit had no shape for: `--button` is a card that *is* one control, `--interactive` a card that
  merely *has* one, and a card with two actions can be neither (interactive content nested in a
  `<button>` is invalid HTML). The primary control keeps its real `<button>`/`<a>` semantics and
  spreads its hit area over the card with a pseudo-element.
  This is shipped rather than documented because it **cannot be hand-rolled on a `.fdy-btn`**: the
  button nudges itself with a transform on `:hover`/`:active`, a transformed element becomes the
  containing block for its own absolutely positioned descendants, and the overlay therefore
  re-anchors from the card to the button's own box mid-gesture. `mousedown` lands on the button,
  `mouseup` somewhere else, and the browser fires `click` on their common ancestor — the button never
  gets one. The symptom is identical to the bug being fixed.
  The report found this on `--text`/`--ghost`, which break on press. The kit's **base** rule is
  `.fdy-btn:hover{transform:translateY(-1px)}`, so the default and `--danger` fills break one step
  earlier, on hover: neutralising only `:active` — the obvious half-fix — still leaks.
- **Escape hatches are raised automatically.** Every focusable element in a card holding a stretched
  target sits above the overlay without markup or CSS from the consumer, because forgetting a
  `z-index` here fails silently — the control looks and hovers exactly as before and simply never
  receives the click.
### Fixed
- `--interactive` is now documented as **presentational**: the only affordance in the kit whose
  correctness lives outside it. The CSS cannot know whether a handler exists, so the modifier without
  a control and a control without the modifier both fail silently. It now points at the shape that
  makes the promise true.
### Notes on the shape of the fix
- **Raising the escape hatch must not outweigh the app.** The first version declared
  `position:relative` at normal specificity and *measurably* dragged an absolutely positioned corner
  dismiss button back into the flow — a control the app had pinned itself, moved by the kit, with no
  error. `z-index` still wins, but the `position` it needs is now a zero-specificity `:where()`
  default that any app rule beats. The two rules must stay split; the gate asserts it.
- **Cards only.** The overlay anchors to the nearest *positioned* ancestor. `.fdy-list__row` is not
  positioned (`.fdy-list` is), so a stretched target in a list row would cover the whole list —
  documented, with `.fdy-list__row--button` as the answer for clickable rows.
### Added: guards
- `browser/card-stretch.mjs` drives real presses: the target receives clicks from anywhere on the
  card, the click is dispatched **on the button** rather than on a common ancestor, the secondary
  action and an inline link keep their own clicks, and an app-pinned control keeps its own
  `position`. A synthetic `.click()` never enters `:active` and passes against the broken CSS, which
  is why this spec is worth its weight.
- `test/css.test.mjs` guards all of it at the CI gate. Mutation-checked against six defects,
  including both of the ones written during this change.

## [1.27.0] - 2026-08-14
Improvement note #44, found while building a settings screen whose only numeric field looked like it
belonged to a different application.
### Fixed
- **`.fdy-input[type="number"]` no longer shows the user agent's spin buttons.** They are OS widgets
  in OS colours that no theme reaches, so on a dark surface they read as a light-grey artefact glued
  to an otherwise themed field — the one unthemed control on a page where everything else is themed
  to the last pixel. Both halves ship, because they cover different engines: `appearance: textfield`
  (Firefox) and `::-webkit-outer/inner-spin-button { appearance: none }` (Blink/WebKit).
### Added
- **`[data-fdy-number]` + `freeday-number.js`** — the increment affordance back on the kit's terms,
  since hiding the native buttons removes it. **Not a new block:** it is an `.fdy-input-group` with
  two `__btn`s, so it inherits the shared border, `:focus-within` ring and `:has()` error promotion
  that already existed. The reported `.fdy-number` block would have duplicated all of it.
  - **No custom event.** Stepping dispatches native bubbling `input` + `change` on the input, so
    `v-model` / `onChange` / `@bind` work with no adapter and no new API — the input stays the source
    of truth. That is also why this needs no typed wrapper in any of the four stacks.
  - `min`/`max`/`step` live on the input and the buttons never redo the arithmetic (`stepUp()`/
    `stepDown()` clamp for free). They go `disabled` at a bound, on a `disabled`/`readonly` field,
    and when `step="any"` — which has no defined increment and makes `stepUp()` throw, so a stepper
    cannot honestly express it.
  - A `MutationObserver` watches `disabled`/`readonly`/`min`/`max`/`step`: a framework changes those
    without firing an event, and a button that still looks enabled while doing nothing is the exact
    lie this state machine exists to prevent. (First observer in the kit — the alternative was a
    button whose appearance silently drifts from its behaviour.)
  - The buttons are **not tab stops** (`tabindex="-1"`): the input is already focusable and ↑/↓
    already step it, so two extra stops per field cost every keyboard user and buy nothing. They keep
    an `aria-label`, and `type="button"` so they cannot submit their form.
- `.fdy-input-group__btn` gains a **leading-position** rule (divider on the correct side when the
  button comes first) and a **`:disabled`** state — dim + `not-allowed`, with `:hover` withdrawn,
  because a disabled button still matches `:hover`.
- `COMPONENTS.md` now answers **which `type` `.fdy-input` covers**, which is the question that would
  have prevented this note: every text-like type themes identically, and the two that keep a native
  widget are named with what to do about each.
### Notes on the shape of the fix
- **`type="search"` deliberately left alone.** Its WebKit clear (×) button is unthemed too — and it
  is on the kit's own docs pages, 10 of them — but it is the only way to empty the field. Stripping
  it removes function, not chrome; the number arrows only removed a mouse-only increment that ↑/↓
  still provides. `type="date"`/`time` likewise keep their picker indicator; the kit ships its own
  datepicker/timepicker and the docs now say to use those instead.
- **Why this was never caught:** `type="number"` appears **zero** times across `docs/index.html`,
  `docs/reference-screen.html` and `examples/` (against `search` ×10, `text` ×12, `date` ×4). The kit
  never used the input it shipped. The docs page now carries a real number field, in the input-group
  section where it belongs.
### Added: guards
- `test/css.test.mjs` asserts both engine halves survive (each is invisible in review and each brings
  the artefact back on one engine only), and states in-file why `search`/`date` are excluded.
- `browser/number.mjs` drives real clicks and a real Tab: stepping fires native `input` + `change`,
  bounds disable the right button, a disabled button changes nothing, `readonly` and `step="any"`
  are inert without throwing, and Tab skips the buttons. Mutation-checked against five defects.
- `browser/harness.mjs` gains `pressKey` — tab order only moves for a trusted key, so the claim is
  measured rather than read off an attribute.

## [1.26.0] - 2026-08-14
Improvement note #43, found while chasing a "the upload is stuck" report on a 626 KB PDF: the
transfer took about a second, the server then spent nearly a minute reading the document.
### Added
- **`row.waiting(label)`** — the state between `setProgress` and `done`: the bytes are gone, the
  server has not answered. The row's only long-running state was named after the *transfer*, so it
  kept saying "Mengunggah…" for the whole minute of server-side work — and `setProgress(100)` made it
  worse, because a full bar that then sits still is the most convincing "hung" signal a UI can
  produce. There was no way out within the row's API: `done()` claims success, `fail()` claims an
  error, `ready()` walks backwards. Consumers were rendering a second status line outside the row and
  leaving the row to contradict it.
  The bar goes **indeterminate** and drops `aria-valuenow` — a progressbar with no value is exactly
  what ARIA calls indeterminate, which is the contract `COMPONENTS.md` already stated for
  `.fdy-progress`. The label is the consumer's, because only they know what the server is doing
  (`Membaca PDF…`, `Memindai…`); it falls back to `Menunggu server…`.
- `COMPONENTS.md` gains the state in the row table plus the sentence that would have saved the
  round-trip: **if your request outlives the transfer, drive `waiting()`**.
### Notes on the shape of the fix
- The report's patch would have shipped the symptom it set out to remove. It put the modifier on the
  **bar** (`.fdy-progress--indeterminate` styles `.fdy-progress__bar`, so it belongs on the
  container — on the bar it matches nothing) and then set an inline `width:100%`, which beats the
  modifier's own width anyway. Both mistakes render a full, frozen bar. The note also hedged that
  `.fdy-progress--indeterminate` might not exist; it has all along.
- **Leaving the state needs more care than entering it.** `.fdy-progress__bar` is a plain block div:
  with no width it fills its track. So `uploading()`/`setProgress()` restore an explicit width when
  they clear the modifier, or a retried row paints a *full* bar while meaning 0%. `done()`, `fail()`
  and `ready()` need no counterpart — they drop the progress element outright, modifier and all
  (contrary to the note, which expected a line in each).
- **No `.fdy-file--waiting` class.** `uploading` has none either; only `--success`/`--error` do,
  because they carry colour. A documented class with no rule is markup that looks like it does
  something.
- Under `prefers-reduced-motion: reduce` the kit's indeterminate treatment is a dimmed **full** bar
  (no animation left to carry the meaning) — pre-existing behaviour for every indeterminate progress,
  not introduced here. For those users the honest signal is the label, not the bar.
### Added: guards
- `browser/upload-states.mjs` gains a third spec, measuring what the **engine renders** rather than
  what the source declares: both ways to get this wrong are invisible in a code read. Mutation-checked
  against five defects, including the report's own two — modifier-on-bar, inline `width:100%`, no
  width restored on return, `aria-valuenow` kept, and label ignored.

## [1.25.0] - 2026-08-13
Improvement note #42, found while adopting 1.24.0 — the other half of the same integration.
### Fixed
- **`fdy-upload-remove` now fires on the dropzone**, the same element as `fdy-upload-add`. It was
  dispatched on the *row*, which lives in the file list — and the kit's own markup contract puts that
  list as a **sibling** of the dropzone, so the event never bubbled through the zone. A consumer
  following the documentation got `add` and never got `remove`: no error, right event name, right
  element, and the other event on that element working. Their state kept a file the user had already
  taken away.
  The kit's own header comment was the source of the mistake — it said both events are emitted "on the
  dropzone" while the code dispatched one of them somewhere else. It now states the target for each,
  and why (a row in a sibling list can never reach the zone). `COMPONENTS.md` says it once beside the
  row state table, with the removal listener in the worked example.
### Notes on the shape of the fix
- The report proposed dispatching on **both** the row and the zone, for backward compatibility. Not
  taken, and the guard proves why: when the file list is **nested inside** the dropzone — which
  `data-filelist` permits — the row already bubbles through the zone, so a second dispatch makes a
  plain zone listener fire **twice** per removal. Firing on both also leaves the pair asymmetric (one
  `add`, two `remove`s for anyone delegating on a common ancestor), which is the same class of silent
  bug this note is about. One canonical target is the honest fix.
- Dispatching on the zone also fixes the **listless** case from 1.24.0: a row that was never attached
  to the document bubbles to nothing at all, so its × was previously unobservable.
- *Migration:* a consumer that worked around the old behaviour by listening on the file list must
  move that listener to the dropzone. That position was never documented — it was the bug.
### Added: guards
- `browser/upload-states.mjs` gains a second spec: removal fires on the dropzone **exactly once**, in
  both layouts (list as sibling, list nested inside the zone), and delegation on a shared ancestor
  sees no duplicates. Mutation-checked against *both* rejected designs — reverting to the row target
  fails it, and so does the report's dispatch-on-both.

## [1.24.0] - 2026-08-13
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
### Added: guards
- **`browser/upload-states.mjs`** — drops a real `File` and asserts the rest state shows no progress
  bar, that `uploading()` → `setProgress()` → `done()` still chains, that the simulate path is
  untouched, and that a listless dropzone still dispatches. Mutation-checked on both halves.
  The fixture wraps the listless dropzone in its own container **on purpose**: with no
  `data-filelist` the enhancer falls back to `parentNode.querySelector('.fdy-filelist')`, so a bare
  dropzone sharing a parent with another list adopts it — the first version of this guard was
  testing nothing, and the mutation run is what exposed that.

## [1.23.0] - 2026-08-13
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
### Added: guards
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

## [1.22.0] - 2026-08-12
Two bodies of work. **(a)** three more findings from consumption round 5 — the report grew §5-§7
after 1.21.0 was cut; **(b)** a **routing** failure found in the same adopted project, which had been
built on raw markup + enhancers inside a framework that has typed wrappers because nothing in the
package ever told it otherwise. (b) was prepared as 1.21.1 and folded in here rather than shipped as
a separate patch minutes earlier.
### Added: from consumption round 5 (§5, §6)
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
### Fixed: from consumption round 5 (§7)
- **Hard rule 1 in `COMPONENTS.md` now records its one exception.** The rule says a modifier is
  always written beside its block class, but `.fdy-input-group__addon--icon` is standalone by design
  — adding the base `__addon` gives a search glyph the grey fill and divider of a `Rp` / `%` prefix.
  An agent following the rule literally produced the wrong control; one following the CSS comment
  broke the stated rule. The exception is now written down, and it is the only one.
### Fixed: the package now routes by stack
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

## [1.21.0] - 2026-08-12
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
### Added: guards
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

## [1.20.0] - 2026-08-12
Two bodies of work in one release (1.19.0 was prepared but never committed, tagged or published, so
it is folded in here rather than left as a phantom version):
**(a)** make the kit consumable by an **AI coding agent** in a new or migrating project, and clean the
repo to production level; **(b)** act on the fourth round of real-app consumption feedback — five
confirmed gaps, one rejected premise, and one documentation bug of our own that chasing it exposed.
### Added: from consumption round 4
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
### Changed: from consumption round 4
- **`data-density="compact"` is no longer root-scoped.** The generated selector was
  `:root[data-density="compact"]`; it is now a bare `[data-density="compact"]`. These are inheriting
  custom properties, so density can be set on a route wrapper or a single section — which is how it is
  actually decided (per screen), not on `<html>` for the whole app. Setting it on the root still works
  identically. A build test now asserts the selector is not root-scoped.
### Fixed: from consumption round 4
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
### Notes: one report item rejected
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

## [1.18.0] - 2026-08-11
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

## [1.17.0] - 2026-08-11
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

## [1.16.0] - 2026-08-11
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

## [1.15.0] - 2026-08-10
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

## [1.14.0] - 2026-08-01
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

## [1.13.1] - 2026-08-01
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

## [1.13.0] - 2026-07-30
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

## [1.12.0] - 2026-07-29
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

## [1.11.2] - 2026-07-28
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

## [1.11.1] - 2026-07-28
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

## [1.11.0] - 2026-07-28
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

## [1.10.0] - 2026-07-28
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

## [1.9.0] - 2026-07-28
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

## [1.8.0] - 2026-07-28
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

## [1.7.1] - 2026-07-27
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

## [1.7.0] - 2026-07-24
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

## [1.6.2] - 2026-07-24
Rilis **patch — lisensi**. Tak ada perubahan kode.

### Changed
- **Lisensi jadi [MIT](LICENSE)** (`Copyright (c) 2026 Cahyo D. Kurnianto`). Sebelumnya
  `"license": "UNLICENSED"` tanpa file `LICENSE` — di repo publik itu berarti *all rights
  reserved*, jadi tak ada yang boleh memakainya secara legal. Sekarang bebas dipakai/ubah/
  distribusi asal menyertakan copyright. `package.json`/`package-lock.json` → `"MIT"`, tambah
  file `LICENSE`, catat di README + footer docs. `"private": true` dipertahankan (pengaman
  anti-`npm publish`, tak terkait lisensi).

## [1.6.1] - 2026-07-24
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

## [1.6.0] - 2026-07-24
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

## [1.5.0] - 2026-07-24
Rilis **1.5 — React adapter parity**. Non-breaking, aditif.
### Added
- **React adapter parity** — komponen controlled typed `FdyCombo` / `FdyDatepicker` / `FdyCfl` /
  `FdyChart` + `usePopover`, di atas CSS kit yang sama (aksesibilitas WAI-ARIA APG, dropdown
  top-layer lewat Popover API). Aplikasi React tak lagi butuh fallback `<select>`/`<input
  type="date">` native. Dikonsumsi lewat `freeday/react`; Vite men-transpile source component
  langsung tanpa config tambahan, konsumen Next.js mungkin butuh
  `transpilePackages: ['freeday']`.

## [1.4.1] - 2026-07-23
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

## [1.4.0] - 2026-07-23
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

## [1.3.1] - 2026-07-23
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

## [1.3.0] - 2026-07-23
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

## [1.2.2] - 2026-07-23
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

## [1.2.1] - 2026-07-23
Rilis **1.2.1 — patch**. Perbaikan CSS ikon depan `.fdy-input-group`.
### Fixed
- **Ikon depan input-group tak ke-center + gap** — `.fdy-input-group__addon--icon` dipakai
  standalone tapi tak set `display`/`align-items`, jadi `<svg>`-nya nempel ke atas kotak flex
  yang ter-stretch (ikon melayang tinggi); dan padding-kiri ikon menumpuk dengan padding-kiri
  `.fdy-input` → gap lebar. Kini `--icon` self-contained (`inline-flex` + center, meniru
  `.fdy-input-group__btn`) dan `.fdy-input` setelah ikon memangkas padding-kirinya. Murni CSS,
  backward-compatible. Kena semua field search/find (topbar search, filter tabel, dialog CFL, dst).

## [1.2.0] - 2026-07-23
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

## [1.1.0] - 2026-07-23
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

## [1.0.0] - 2026-07-22
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

## [0.9.6] - 2026-07-22
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

## [0.9.5] - 2026-07-22
### Added
- **Two-tone (duotone) control icons** — the date/time picker triggers (and the datetime
  composer that reuses them) now render with a low-opacity fill behind the stroke, matching the
  sun/moon theme toggle. A coherent duotone treatment for the control-glyph family.
### Docs
- **Landing language toggle (ID ⇄ EN)** — a topbar button swaps the landing copy (hero, stats,
  framework-integration, footer) between Indonesian and English via `[data-i18n]`; inline
  markup (bold/code) is preserved. Version references synced to v0.9.5.

## [0.9.4] - 2026-07-22
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

## [0.9.3] - 2026-07-22
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

## [0.9.2] - 2026-07-22
### Fixed
- **Hover kontrol form tak terlihat** — sejak border resting jadi `--color-control-border`
  (slate-500) untuk a11y, hover yang menuju `--color-text-subtle` (juga slate-500) tak berubah.
  Semua kontrol (input, textarea, combo, cascade, time/date picker, input-group, dropzone) kini
  hover ke `--color-text-muted` (slate-600) → menggelap terlihat.
- **Split button rusak saat hover** — `translateY(-1px)` per-tombol mengangkat satu paruh saja
  sehingga jahitan tak sejajar. Kini `.fdy-btn-split` menjadi satu unit: tiap paruh tak
  mengangkat/berbayang sendiri; split terangkat & berbayang sebagai satu kesatuan, plus garis
  pemisah tipis antar paruh.

## [0.9.1] - 2026-07-22
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

## [0.9.0] - 2026-07-22
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

## [0.8.1] - 2026-07-22
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

## [0.8.0] - 2026-07-22
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

## [0.7.0] - 2026-07-22
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
