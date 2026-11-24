# Freeday — Usage doctrine

Freeday ships tokens and components. This file ships the **decisions**: which token to use when,
how a page is assembled, what earns emphasis. A component library enforces consistent *values*; a
design system also enforces consistent *decisions*. Skim this once before building a screen; it is
what makes screens built by different people (or different sessions) look like one product.

The rules are opinionated on purpose. When one conflicts with a real need, break it deliberately, and
but start here, not from a blank page.

---

## 0. App identity: what the app decides

Freeday supplies components and tokens. How an app looks is the app's decision, made inside the
contract below. An app that changes nothing looks like the kit's docs page. That suits the docs
page and wastes the decision everywhere else.

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

Everything else is outside the kit's guarantee. You may override it, and some apps need to, but the
contrast gate and the kit's own tests no longer cover what you change: check the contrast yourself
and write down why in `DESIGN.md`. Take a sanctioned route first when one exists. Colour reaches an
app through the attributes, including `data-primary-fill="deep"` for a white label on a darker fill.
Control size has `data-density="touch"` for 44px targets. Spacing (`--space-*`) carries density, and
the type size scale (`--text-*`, `--leading-*`) sets control heights and table density, so a screen
that wants big type uses `var(--text-xl)` and up in its own content. `--radius-full`, `--bw` and the
focus ring are accessibility contracts, and no reason in `DESIGN.md` makes overriding them safe.

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

Decide before the first screen. A new app starts with a short brief in its own `DESIGN.md`,
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

## 1. Type roles: three title levels, not eleven

Do **not** reuse `.fdy-card__title` for a page title. Collapsing page/section/card into one style is
the single biggest cause of "flat grey mush". Pick the role, not the size:

| Role | Class | When |
|---|---|---|
| Eyebrow | `.fdy-eyebrow` | A small uppercase label above a page/section title. Optional. |
| Page title | `.fdy-title-page` | One per screen. The `<h1>` on a standalone page; `<h2>` inside `.fdy-app`, whose `.fdy-app__title` is already the `<h1>` and names the current page. |
| Section title | `.fdy-title-section` | A region within the page (`<h2>`). |
| Card / row title | `.fdy-title-card` (or `.fdy-card__title`) | A title inside a card or list row (`<h3>`). |
| Body | *(default)* | Running text. |
| Muted / caption | `.fdy-text-muted`, `.fdy-text-caption` | Secondary text, timestamps, help. |
| Subtle | `.fdy-text-subtle` | The faintest ink. Placeholders and decoration — chevrons, separators, out-of-month days. **Read the contract below before using it for a sentence.** |

Everything else is body. If you reach for a fourth title size, you probably need a section, not a
font size.

**`--color-text-subtle` is not a third body-text tier, and dark is where that bites.** It clears AA
on `--color-surface` in both themes (light 4.69:1, dark 4.88:1) — which is what `.fdy-input` and
`.fdy-textarea` paint, so a placeholder is safe. It clears AA on **nothing else**, in either theme:
`--color-surface-3` reads 4.11:1 in light and 3.66:1 in dark. Nor will it ever: reaching 4.5 there
needs a tone within a hair of `--color-text-muted`, and a subtle that equals muted is not a tier. So a small uppercase
label, a card's second line, or anything a reader must actually read on a raised or tinted surface
takes `--color-text-muted`. `test/contrast.test.mjs` holds both halves of that split, which is why
the ramp cannot quietly drift into either mistake.


## Borders: two roles, two contrast contracts

`--color-border` (and `-muted` / `-strong`) is **decoration**: a card edge, a table rule, a
separator. Nothing in WCAG requires it to be visible, and it is deliberately faint (≈1.3:1).

`--color-control-border` is the **boundary of a control**: input, textarea, checkbox, radio,
switch, dropzone. WCAG 1.4.11 requires 3:1 against every surface it can sit on, so it is
necessarily darker than a card edge; that difference is the contract, not an inconsistency.

It is tuned to clear that floor with margin (≈3.4–3.9 depending on surface) rather than to be as
dark as it can be: a boundary that reads as loud as body text makes a form feel heavier than it is.
Do not "harmonise" a control border down to `--color-border`. That drops a required 3:1 boundary to
1.3:1.

## 2. Spacing rhythm: three gaps, always from the scale

Never a loose value; always `var(--space-N)` (a 4px scale). Three rhythms carry most layouts, and the
composition primitives apply them for you:

- **Between page sections:** `--space-8`, which `.fdy-page` sets between its children.
- **Within a group** (heading ↔ its body, cards in a list): `--space-4`, which `.fdy-page-section` sets.
- **Inside a control/card** (label ↔ input, icon ↔ text): `--space-2` / `--space-3`.

Reserve `--space-1` for hairline pairs and `--space-10`+ for deliberate breathing room (a hero, an
empty state). Don't scatter `--space-6` everywhere. A page with one gap value has no rhythm.

## 3. Elevation: most surfaces are flat

Shadow is a signal, not decoration. There are two families, and the difference matters:

| Level | Token | What actually uses it |
|---|---|---|
| Flat | *(none)* | Page sections, `.fdy-page`, the app shell, `.fdy-toolbar` |
| Hairline | `--shadow-1` | Bordered data containers: `.fdy-list`, `.fdy-table-wrap`, `.fdy-datatable`, `.fdy-stats--boxed` |
| Raised | `--shadow-2` | `.fdy-tooltip`, `.fdy-appbar--elevated` |
| Floating | `--shadow-3` | Things that float over the page: `.fdy-menu`, `.fdy-filter`, `.fdy-toast`, `.fdy-fab` |
| Overlay | `--shadow-4` | `.fdy-drawer` |
| **Lift** | `--shadow-lift` / `--shadow-lift-hover` | **`.fdy-card`** (and `--elevated` / `--interactive:hover`), `.fdy-modal`, `.fdy-busy__panel` |

**`.fdy-card` is a lifted surface, not a hairline one.** `--shadow-lift` is a real 34px lift, ~6×
heavier than `--shadow-1`. That is the whole point of a card, and it is also why a *stack* of them
reads wrong: a list of ten cards is ten objects floating off the page. For rows, use the flat
container **`.fdy-list` / `.fdy-list__row`** (hairline border, `--color-border-muted` dividers, no
shadow). Reach for `.fdy-card` when something genuinely is one pickable object.

If every box on the screen has the same card shadow, none of them read as special. That's the
"identical card grid" failure. Prefer flat sections with **one** raised element that matters.

## 4. Emphasis: exactly one primary per screen

`.fdy-btn` is *already* the primary action (there is no `--primary` modifier). Use it **once** per
screen: the one thing you want the user to do. Everything else is `--ghost` or `--text`. Two primary
buttons on a screen means neither is. The same rule governs colour fills and `--shadow`: one focal
point, everything around it quiet.

## 5. Colour: semantic is reserved; categorical is `--tone`

- **Accent** (`--color-primary`, and `--color-accent` sparingly): interactive + brand. This is your
  one accent hue.
- **Semantic is reserved** and is *not* your accent: `--color-success` = good only, `--color-warning`
  = caution only, `--color-danger` = destructive/error only. Never decorative. Encode state in a pill
  or chip, not just colour.
- **Categorical** (`--tone-1` … `--tone-8`, the general alias of the validated chart palette): N
  visually-distinct **non-semantic** colours: avatar tones, category chips, tags, legend swatches.
  Use the modifiers `.fdy-avatar--tone-N` / `.fdy-chip--tone-N` (both stay WCAG AA in light & dark),
  and hash a stable index off the full string so the same category always gets the same colour.
- **Surfaces:** most backgrounds are `--color-surface`; `--color-surface-2`/`-3` for a recessed area;
  `--color-primary-soft` only when you want a tinted callout, not as a default panel colour.

### Putting an alpha on a role: use the channel triple, not `color-mix()`

Every role you are likely to fade has a companion triple, so a 26% primary wash is:

```css
background: rgba(var(--color-primary-rgb), .26);
```

Reach for `color-mix(in srgb, var(--color-primary) 26%, transparent)` instead and you get the same
colour on your machine and a missing one on an older iPhone, with **no way to put a fallback under
it.** A declaration that mentions a custom property is assumed valid when the stylesheet is parsed
and is only checked later, when the variable is substituted; if `color-mix()` is unknown at that
point the declaration is thrown away *there*, and the browser does not go back to the static line
you wrote above it. The property takes its initial value instead, which for `border-color` means
`currentColor`: a thick black outline. Safari learned `color-mix()` in 16.2, so every phone that
stopped at iOS 15 sees that.

The triples are generated from the tokens they are named after, in all 18 palettes and both themes,
so they follow a re-brand on their own. The ones that ship: `--color-primary-rgb`,
`--color-on-primary-rgb`, `--color-danger-rgb`, `--color-danger-btn-rgb`, `--color-success-rgb`,
`--color-warning-rgb`, `--color-info-rgb`, `--color-surface-rgb` and `--color-inverse-text-rgb`.
If you need one the kit does not publish, ask for it rather than hard-coding channels.

### Tinting one role over another: the colour is already a token

A triple puts an alpha on **one** role. It cannot say "18% of this tone over the surface", because
the result depends on two roles and on the theme. Those blends are computed when the kit is built
and published as flat tokens, so you never write the mix at all:

```css
background: var(--tone-3-bg);      /* 18% of --tone-3 over --color-surface  */
color: var(--tone-3-ink);          /* 50% of --tone-3 toward --color-text    */
border-color: var(--tone-3-border);/* 30% of --tone-3 over --color-border    */
```

`--tone-N-bg` / `-ink` / `-border` / `-border-soft` exist for all eight tones in both themes, and are
exactly what `.fdy-avatar--tone-N`, `.fdy-badge--tone-N` and `.fdy-chip--tone-N` paint — the
`-ink` on the `-bg` is the pair the WCAG gate measures, so a custom element built from the same two
tokens inherits that guarantee. `--color-danger-border` (40% of danger over the border) is the same
idea for a row that failed. If you need a blend the kit does not publish, ask for it: it belongs in
`tokens/tokens.json`, where the build can resolve it down both themes, not in a component.

## 5b. Theme: global by default, per-subtree when a region is inverted

`data-theme="light|dark"` redefines the semantic tokens. Set it on `<html>` and it themes the app;
that is the normal case and nothing about it has changed.

**It is also per-subtree.** The two explicit selectors are bare `[data-theme="dark"]` /
`[data-theme="light"]`, and semantic tokens are inheriting custom properties, so a
`<section data-theme="dark">` inverts that region and **every Freeday component inside it follows**:
card surfaces, inputs, buttons, and text roles like `.fdy-title-page` that set
`color: var(--color-text)` explicitly. A dark brand panel beside a light sign-in form needs no
per-element re-colouring, and a `[data-theme="light"]` island nested back inside a dark region wins
in turn.

Do **not** invert a region by hand with `--color-inverse-*` plus `color-mix`. That pair is right for
a one-off band of your own markup, but it stops scaling the moment the region contains a real
component. Anything that sets its own colour from a token never sees your override, and you end up
restating colours per element.

The **system** default (`@media (prefers-color-scheme: dark)`) stays root-scoped on purpose: that
rule is about the document, and un-rooting it would re-darken the children of a light island.

`data-primary`, `data-neutral` and `data-primary-fill="deep"` follow the same selectors, with one difference. They re-point
an alias ramp, and the semantic tokens resolve that ramp where they are declared: on `<html>`, or
on an element that carries `data-theme`. So put them on `<html>`. To re-brand or re-tint a single
region, put the axis on that region together with `data-theme`. Never put any of them on a bare
wrapper. A palette moves the label ink (`--color-on-primary`) but not the fill, so
orange, amber, lime, green, emerald, teal and cyan leave dark ink on the azure fill (2.87:1 for orange); a neutral moves
the tone inks, borders, stripe and danger border but not the surfaces. A bare `deep` wrapper applies
its light values in every theme, so under any dark theme (an ancestor's or the OS's) its fill and
strong ink are wrong: on teal, a 700 fill and 800 strong ink on the dark surface measure about 2.5:1.
An inverted island inside an app with a non-default look must repeat `data-primary`, `data-neutral`
and `data-primary-fill` beside its `data-theme`; a deep island that leaves out `data-primary` inherits
the page palette's ink, and teal gets white on its 500 fill.
Otherwise the island keeps the app's fill but takes the default label ink, and white labels on
those fills drop to between 2:1 and 3.8:1 (lime 1.98:1 and orange 2.80:1 in a dark island).

## 6. Density: `compact` for data-dense screens

`data-density="compact"` tightens control height **and** the mid-range spacing scale
(`--space-3`…`--space-6` step down a notch), so cards, toolbars and tables get denser. Use it on
table-heavy back-office screens; leave `comfortable` (the default) for forms.

**It is per-subtree, not only global.** The selector is a bare `[data-density="compact"]` and these
are inheriting custom properties, so the attribute works on `<html>` *or* on any wrapper: a route
container, a single `<section>`. An app whose two list screens are dense and whose three form screens
are not should scope it per screen rather than densifying everything. Set it at one level per screen,
never per component.

**And it goes both ways.** `data-density="comfortable"` is a real rule, not just the absence of
`compact`, so an app that is dense *at the root* can opt one region back out: a header, a toolbar,
a footer shared with a sibling product that has to line up pixel for pixel. Inheritance only runs
downhill; without that rule a compact root left every subtree compact and a `comfortable` wrapper
changed nothing. Do not restate the five values by hand: that copy goes stale the moment the kit
retunes a step.

**`touch` is for apps used on the move.** `data-density="touch"` sets the control height to 2.75rem
(44px), the smallest target a thumb or a gloved finger hits reliably. It changes only the control
height, so spacing stays whatever the surrounding density gives. Use it for a whole app used standing
up (a guard's phone, a warehouse scanner) or for one shell of a mixed app, and avoid `.fdy-btn--sm`
there: it is 36px under `touch`. A `touch` region nested inside a compact one keeps compact spacing;
to get touch with comfortable spacing there, put `touch` on a comfortable ancestor (or nest
`comfortable` first). `comfortable` resets `touch` the way it resets `compact`.

## 6b. Navigation: one component, two orientations, and never a tab role

A navigation link is an `<a class="fdy-nav__item">` marked **`aria-current="page"`**. That does not
change with the layout:

- **Sidebar app:** `.fdy-nav` inside `.fdy-app__sidebar` (the default).
- **Top-nav app:** `.fdy-nav.fdy-nav--horizontal` inside `.fdy-appbar` or `.fdy-app__topbar`, with
  no sidebar. Same items, same states; on `.fdy-appbar--primary` the links go on-colour for you.
- **Routed sub-navigation that should look like tabs** (`/settings/profile` · `/settings/billing`):
  put `.fdy-tabs__list` / `.fdy-tabs__tab` on plain `<a>`s. Those classes honour `aria-current="page"`
  as well as `aria-selected="true"` precisely for this. Do **not** add `role="tab"`/`role="tablist"`
  or `freeday-tabs.js`: those promise a roving-tabindex, arrow-key, one-panel-per-tab contract that
  route links do not honour, and `aria-selected` is invalid ARIA on an anchor in the first place.

Reserve the full `.fdy-tabs` component (with its roles and its enhancer) for **in-page** tabs, where
nothing navigates.

**Toggles:** a button that is on/off carries `aria-pressed`, and the kit styles it: soft primary
fill on `--ghost`/`--text`, a sunken gradient on the solid button. A `.fdy-btn-group` of `--ghost`
buttons with exactly one `aria-pressed="true"` **is** the segmented control; don't hand-tint it.

## 7. Assemble the page from the frame down

1. **Shell:** every application starts inside **`.fdy-app`**, a flex row of `__sidebar` (with
   `__brand` + `.fdy-nav`) and `__content` (which holds `__topbar` + `__main`, plus `__navtoggle`
   and `__backdrop`). The nesting is fixed; don't hand-roll a shell from flexbox. **Take the
   behaviour too:** `<FdyAppShell>` in Vue/React/Blazor, or `data-fdy-app` plus
   `freeday-app-shell.js` in plain markup. Until 1.53.0 the kit shipped the classes and left every
   consumer to write the toggle, Escape, focus trap, focus restore and `inert` themselves, and the
   two copies in this repo's own docs had already drifted apart; a nav panel you cannot escape from
   with the keyboard is the usual result. Skeleton: `COMPONENTS.md` §App shell; a working screen:
   `docs/reference-screen.html`.
2. **Page:** wrap the screen body in **`.fdy-page`** (vertical section rhythm), opening with a
   **`.fdy-page__header`** (eyebrow + `.fdy-title-page` + `.fdy-page__desc` on the left, the one
   primary action on the right).
3. **Sections:** each region is a **`.fdy-page-section`** (a `.fdy-title-section` + optional
   `.fdy-toolbar`, then its body).
   **Toolbar or filter bar? Pick by whether the fields carry visible labels.** `.fdy-toolbar` is
   `align-items:center`, right for bare controls (buttons, a search box, chips); put a labelled
   `.fdy-field` in it and that field sits half a label-height low against its neighbours. Fields
   with visible labels belong in **`.fdy-filterbar`**, which is `align-items:flex-end` for exactly
   this reason (and has the width rhythm `--w-sm`…`--w-grow`). In a toolbar, label fields with
   `.fdy-visually-hidden` or a placeholder.
4. **KPIs:** a **`.fdy-stats`** grid of **`.fdy-stat`** tiles, deliberately *not* cards, so a metric
   strip doesn't become an identical-card grid. Wrap in `.fdy-stats--boxed` for one shared strip.
5. **Content:** components (`.fdy-card`, `.fdy-datatable`, `.fdy-chart`, …) go inside sections.

Freeday deliberately owns **components + tokens, not layout**. Everything above is layout in the kit's
own language; for the rest (grids, one-off spacing), pair a utility framework run **utilities-only,
preflight-off**, and build its theme on `var(--space-N)` so the two systems agree. See
`docs/getting-started.md` §Core concepts.

*Layout classes here live in `src/components/composition.css`. If a screen needs a primitive that
isn't here, it probably belongs here. Open an issue rather than re-inventing it per screen.*

## 7b. Composition: pick the screen's shape first

Decide what kind of screen this is before reaching for components. Freeday owns components and
tokens, not layout, so for most shapes the frame is yours and the kit fills it. This table splits
the work for 15 common web-app archetypes:

| # | Archetype | Freeday gives you | You build |
|---|---|---|---|
| 1 | **Dashboard / admin** | `.fdy-app` · `.fdy-page` · `.fdy-stats`/`.fdy-stat` · `.fdy-card` · `data-fdy-chart` · `.fdy-datatable` | nothing, fully covered; see [`docs/reference-screen.html`](docs/reference-screen.html) |
| 2 | **Master-detail** | list = `.fdy-datatable` + `.fdy-table__row--activatable`; detail = `.fdy-card` + `.fdy-dl` + `.fdy-tabs`; narrow screens = `.fdy-drawer` | the two-pane split |
| 3 | **Kanban board** | cards = `.fdy-card--interactive` / `--button`; labels = `.fdy-chip--tone-N`; counts = `.fdy-badge` | the column grid **and** drag-and-drop (no DnD in the kit) |
| 4 | **Feed / timeline** | `.fdy-timeline` (event feed) · `.fdy-card` (items) · `.fdy-avatar` · `.fdy-skeleton` while loading | the column widths |
| 5 | **Chat / messaging** | conversation list = `.fdy-nav`; unread = `.fdy-badge-ov`; composer = `.fdy-textarea` + `.fdy-btn`; `.fdy-avatar` | the bubbles and the scroll-to-bottom behaviour |
| 6 | **Canvas / whiteboard** | chrome only: `.fdy-appbar` · `.fdy-btn-group` · `.fdy-fab` · `.fdy-menu` · `.fdy-tooltip` | the canvas itself |
| 7 | **Calendar / scheduler** | range filter = `.fdy-daterange`; events = `.fdy-chip` / `.fdy-badge`; day detail = `.fdy-drawer` | the month grid: there is **no** calendar-view component (`.fdy-cal__grid` / `.fdy-cal__day` are datepicker internals, not public layout) |
| 8 | **Document editor** | `.fdy-app` shell · outline = `.fdy-tree` · `.fdy-toolbar` + `.fdy-btn-group` · `.fdy-kbd` for shortcuts | the editing surface |
| 9 | **Media / streaming** | tiles = `.fdy-card` · rails = `.fdy-carousel` · `.fdy-skeleton` · playback = `.fdy-progress` | the poster grid |
| 10 | **E-commerce account** | `.fdy-page-section` · `.fdy-dl` · orders = `.fdy-table` · status = `.fdy-badge` · `.fdy-accordion` | nothing much, mostly covered |
| 11 | **Analytics / BI** | `.fdy-stats` · `data-fdy-chart` (sparkline/bar/line/area/donut, palette `--chart-1`…`8`) · `.fdy-filterbar` · `.fdy-daterange` | the tile grid |
| 12 | **Point of sale** | `.fdy-app--nav-collapsed` for screen space · product tiles = `.fdy-card--button` · cart = `.fdy-table` + `.fdy-table__num` · totals = `.fdy-stat` · `.fdy-fab` to pay · `data-density="compact"` | the two-column till layout |
| 13 | **Wizard / multi-step** | `.fdy-stepper` · `.fdy-step-panels` · `.fdy-step-nav` · `.fdy-form-grid` | nothing, fully covered |
| 14 | **File manager** | folders = `.fdy-tree` · upload = `.fdy-dropzone` + `.fdy-filelist` + `.fdy-file` · actions = `.fdy-menu` · `.fdy-breadcrumb` | the icon grid |
| 15 | **Community / forum** | threads = `.fdy-card` · `.fdy-avatar--tone-N` · tags = `.fdy-chip` · `.fdy-pagination` · replies = `.fdy-timeline` | the thread list layout |

If a shape needs something the kit has no component for, build the shape and fill it with kit
components. Never invent an `fdy-` class for it; the complete list is `COMPONENTS.md`.

Three habits make every app look like the same template, so avoid them:

- **A stats row on top of every screen.** `.fdy-stats` belongs on a screen whose job is the
  numbers. On a list or a form it pushes the work below the fold.
- **A page that is a grid of identical cards.** See §3: one raised element that matters, the rest
  flat.
- **A sidebar for a handful of destinations.** An app with only a few places to go reads better
  with `.fdy-nav.fdy-nav--horizontal` in the app bar (§6b), and gets the width back.

## 8. Mobile: the phone is its own layout

A phone gets its own layout. Most of these rules already live in COMPONENTS.md; they are collected
here because apps miss them.

- **Navigation.** A bottom nav (`.fdy-bottomnav`) carries three to five destinations, chosen by role.
  Everything else goes behind an account or "More" item. Labels are required.
- **Lists, not tables.** Below `md`, a table becomes a `.fdy-list` (COMPONENTS.md, List). A row is
  one tap target that opens its detail. Row actions move into a `.fdy-menu` behind a "..." button or
  onto the detail screen; a column of stacked buttons makes one row as tall as the screen.
- **The primary action stays in reach.** Put it in `.fdy-actionbar`, which stays on screen as
  the page scrolls. A `.fdy-fab--extended` works too, but the app positions it (above `--fdy-bottomnav-h`
  when there is a bottom nav); the kit does not.
- **One frame.** The page header is not wrapped in a card on a phone, because the screen already is
  the frame.
- **Drop the views a phone cannot use.** A list/box/grid switch shows only list (and box, if it
  reads) below `md`.
- **Say where the user is.** A multi-tenant app (several sites, clusters or companies) shows the
  current one as a chip in the topbar, with the switch beside it.
- **Size targets for the way the app is held.** An app used standing up or on the move sets
  `data-density="touch"` (§6), per app or per shell.

---
