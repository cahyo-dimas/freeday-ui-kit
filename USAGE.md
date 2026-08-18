# Freeday — Usage doctrine

Freeday ships tokens and components. This file ships the **decisions** — which token to use when,
how a page is assembled, what earns emphasis. A component library enforces consistent *values*; a
design system also enforces consistent *decisions*. Skim this once before building a screen; it is
what makes screens built by different people (or different sessions) look like one product.

The rules are opinionated on purpose. When one conflicts with a real need, break it deliberately —
but start here, not from a blank page.

---

## 1. Type roles — three title levels, not eleven

Do **not** reuse `.fdy-card__title` for a page title. Collapsing page/section/card into one style is
the single biggest cause of "flat grey mush". Pick the role, not the size:

| Role | Class | When |
|---|---|---|
| Eyebrow | `.fdy-eyebrow` | A small uppercase label above a page/section title. Optional. |
| Page title | `.fdy-title-page` | One per screen. The `<h1>`. |
| Section title | `.fdy-title-section` | A region within the page (`<h2>`). |
| Card / row title | `.fdy-title-card` (or `.fdy-card__title`) | A title inside a card or list row (`<h3>`). |
| Body | *(default)* | Running text. |
| Muted / caption | `.fdy-text-muted`, `.fdy-text-caption` | Secondary text, timestamps, help. |

Everything else is body. If you reach for a fourth title size, you probably need a section, not a
font size.


## Borders: two roles, two contrast contracts

`--color-border` (and `-muted` / `-strong`) is **decoration** — a card edge, a table rule, a
separator. Nothing in WCAG requires it to be visible, and it is deliberately faint (≈1.3:1).

`--color-control-border` is the **boundary of a control** — input, textarea, checkbox, radio,
switch, dropzone. WCAG 1.4.11 requires 3:1 against every surface it can sit on, so it is
necessarily darker than a card edge; that difference is the contract, not an inconsistency.

It is tuned to clear that floor with margin (≈3.4–3.9 depending on surface) rather than to be as
dark as it can be: a boundary that reads as loud as body text makes a form feel heavier than it is.
Do not "harmonise" a control border down to `--color-border` — that drops a required 3:1 boundary to
1.3:1.

## 2. Spacing rhythm — three gaps, always from the scale

Never a loose value; always `var(--space-N)` (a 4px scale). Three rhythms carry most layouts, and the
composition primitives apply them for you:

- **Between page sections:** `--space-8` — `.fdy-page` sets this gap between its children.
- **Within a group** (heading ↔ its body, cards in a list): `--space-4` — `.fdy-page-section` sets it.
- **Inside a control/card** (label ↔ input, icon ↔ text): `--space-2` / `--space-3`.

Reserve `--space-1` for hairline pairs and `--space-10`+ for deliberate breathing room (a hero, an
empty state). Don't scatter `--space-6` everywhere — a page with one gap value has no rhythm.

## 3. Elevation — most surfaces are flat

Shadow is a signal, not decoration. There are two families, and the difference matters:

| Level | Token | What actually uses it |
|---|---|---|
| Flat | *(none)* | Page sections, `.fdy-page`, the app shell, `.fdy-toolbar` |
| Hairline | `--shadow-1` | Bordered data containers: `.fdy-list`, `.fdy-table-wrap`, `.fdy-datatable`, `.fdy-stats--boxed` |
| Raised | `--shadow-2` | `.fdy-tooltip`, `.fdy-appbar--elevated` |
| Floating | `--shadow-3` | Things that float over the page: `.fdy-menu`, `.fdy-filter`, `.fdy-toast`, `.fdy-fab` |
| Overlay | `--shadow-4` | `.fdy-drawer` |
| **Lift** | `--shadow-lift` / `--shadow-lift-hover` | **`.fdy-card`** (and `--elevated` / `--interactive:hover`), `.fdy-modal` |

**`.fdy-card` is a lifted surface, not a hairline one** — `--shadow-lift` is a real 34px lift, ~6×
heavier than `--shadow-1`. That is the whole point of a card, and it is also why a *stack* of them
reads wrong: a list of ten cards is ten objects floating off the page. For rows, use the flat
container **`.fdy-list` / `.fdy-list__row`** (hairline border, `--color-border-muted` dividers, no
shadow). Reach for `.fdy-card` when something genuinely is one pickable object.

If every box on the screen has the same card shadow, none of them read as special — that's the
"identical card grid" failure. Prefer flat sections with **one** raised element that matters.

## 4. Emphasis — exactly one primary per screen

`.fdy-btn` is *already* the primary action (there is no `--primary` modifier). Use it **once** per
screen — the one thing you want the user to do. Everything else is `--ghost` or `--text`. Two primary
buttons on a screen means neither is. The same rule governs colour fills and `--shadow`: one focal
point, everything around it quiet.

## 5. Colour — semantic is reserved; categorical is `--tone`

- **Accent** (`--color-primary`, and `--color-accent` sparingly): interactive + brand. This is your
  one accent hue.
- **Semantic is reserved** and is *not* your accent: `--color-success` = good only, `--color-warning`
  = caution only, `--color-danger` = destructive/error only. Never decorative. Encode state in a pill
  or chip, not just colour.
- **Categorical** (`--tone-1` … `--tone-8`, the general alias of the validated chart palette): N
  visually-distinct **non-semantic** colours — avatar tones, category chips, tags, legend swatches.
  Use the modifiers `.fdy-avatar--tone-N` / `.fdy-chip--tone-N` (both stay WCAG AA in light & dark),
  and hash a stable index off the full string so the same category always gets the same colour.
- **Surfaces:** most backgrounds are `--color-surface`; `--color-surface-2`/`-3` for a recessed area;
  `--color-primary-soft` only when you want a tinted callout, not as a default panel colour.

## 5b. Theme — global by default, per-subtree when a region is inverted

`data-theme="light|dark"` redefines the semantic tokens. Set it on `<html>` and it themes the app;
that is the normal case and nothing about it has changed.

**It is also per-subtree.** The two explicit selectors are bare `[data-theme="dark"]` /
`[data-theme="light"]`, and semantic tokens are inheriting custom properties — so a
`<section data-theme="dark">` inverts that region and **every Freeday component inside it follows**:
card surfaces, inputs, buttons, and text roles like `.fdy-title-page` that set
`color: var(--color-text)` explicitly. A dark brand panel beside a light sign-in form needs no
per-element re-colouring, and a `[data-theme="light"]` island nested back inside a dark region wins
in turn.

Do **not** invert a region by hand with `--color-inverse-*` plus `color-mix`. That pair is right for
a one-off band of your own markup, but it stops scaling the moment the region contains a real
component — anything that sets its own colour from a token never sees your override, and you end up
restating colours per element.

The **system** default (`@media (prefers-color-scheme: dark)`) stays root-scoped on purpose: that
rule is about the document, and un-rooting it would re-darken the children of a light island.

## 6. Density — `compact` for data-dense screens

`data-density="compact"` tightens control height **and** the mid-range spacing scale
(`--space-3`…`--space-6` step down a notch), so cards, toolbars and tables get denser. Use it on
table-heavy back-office screens; leave `comfortable` (the default) for forms.

**It is per-subtree, not only global.** The selector is a bare `[data-density="compact"]` and these
are inheriting custom properties, so the attribute works on `<html>` *or* on any wrapper — a route
container, a single `<section>`. An app whose two list screens are dense and whose three form screens
are not should scope it per screen rather than densifying everything. Set it at one level per screen,
never per component.

## 6b. Navigation: one component, two orientations — and never a tab role

A navigation link is an `<a class="fdy-nav__item">` marked **`aria-current="page"`**. That does not
change with the layout:

- **Sidebar app** — `.fdy-nav` inside `.fdy-app__sidebar` (the default).
- **Top-nav app** — `.fdy-nav.fdy-nav--horizontal` inside `.fdy-appbar` or `.fdy-app__topbar`, with
  no sidebar. Same items, same states; on `.fdy-appbar--primary` the links go on-colour for you.
- **Routed sub-navigation that should look like tabs** (`/settings/profile` · `/settings/billing`) —
  put `.fdy-tabs__list` / `.fdy-tabs__tab` on plain `<a>`s. Those classes honour `aria-current="page"`
  as well as `aria-selected="true"` precisely for this. Do **not** add `role="tab"`/`role="tablist"`
  or `freeday-tabs.js`: those promise a roving-tabindex, arrow-key, one-panel-per-tab contract that
  route links do not honour, and `aria-selected` is invalid ARIA on an anchor in the first place.

Reserve the full `.fdy-tabs` component (with its roles and its enhancer) for **in-page** tabs, where
nothing navigates.

**Toggles:** a button that is on/off carries `aria-pressed`, and the kit styles it — soft primary
fill on `--ghost`/`--text`, a sunken gradient on the solid button. A `.fdy-btn-group` of `--ghost`
buttons with exactly one `aria-pressed="true"` **is** the segmented control; don't hand-tint it.

## 7. Assemble the page from the frame down

1. **Shell:** every application starts inside **`.fdy-app`** — a flex row of `__sidebar` (with
   `__brand` + `.fdy-nav`) and `__content` (which holds `__topbar` + `__main`, plus `__navtoggle`
   and `__backdrop`). The nesting is fixed; don't hand-roll a shell from flexbox — the toggle and
   backdrop plumbing are already there. Skeleton: `COMPONENTS.md` §App shell; a working screen:
   `docs/reference-screen.html`.
2. **Page:** wrap the screen body in **`.fdy-page`** (vertical section rhythm), opening with a
   **`.fdy-page__header`** (eyebrow + `.fdy-title-page` + `.fdy-page__desc` on the left, the one
   primary action on the right).
3. **Sections:** each region is a **`.fdy-page-section`** (a `.fdy-title-section` + optional
   `.fdy-toolbar`, then its body).
   **Toolbar or filter bar — pick by whether the fields carry visible labels.** `.fdy-toolbar` is
   `align-items:center`, right for bare controls (buttons, a search box, chips); put a labelled
   `.fdy-field` in it and that field sits half a label-height low against its neighbours. Fields
   with visible labels belong in **`.fdy-filterbar`**, which is `align-items:flex-end` for exactly
   this reason (and has the width rhythm `--w-sm`…`--w-grow`). In a toolbar, label fields with
   `.fdy-visually-hidden` or a placeholder.
4. **KPIs:** a **`.fdy-stats`** grid of **`.fdy-stat`** tiles — deliberately *not* cards, so a metric
   strip doesn't become an identical-card grid. Wrap in `.fdy-stats--boxed` for one shared strip.
5. **Content:** components (`.fdy-card`, `.fdy-datatable`, `.fdy-chart`, …) go inside sections.

Freeday deliberately owns **components + tokens, not layout**. Everything above is layout in the kit's
own language; for the rest (grids, one-off spacing), pair a utility framework run **utilities-only,
preflight-off** — and build its theme on `var(--space-N)` so the two systems agree. See
`docs/getting-started.md` §Core concepts.

---

*Layout classes here live in `src/components/composition.css`. If a screen needs a primitive that
isn't here, it probably belongs here — open an issue rather than re-inventing it per screen.*
