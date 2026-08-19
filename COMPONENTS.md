# Freeday — Component reference

The complete public class surface, in one flat file. Written to be read start-to-finish by a
person **or an AI coding agent** that has to produce correct Freeday markup without opening the
live docs.

- **Which class exists** and what its modifiers are → here.
- **Which class to reach for, and when** → [`USAGE.md`](USAGE.md) (the doctrine: type roles,
  spacing rhythm, elevation, one primary per screen).
- **How to install / import per stack** → [`docs/getting-started.md`](docs/getting-started.md).
- **A whole screen assembled** → [`docs/reference-screen.html`](docs/reference-screen.html).

## Hard rules (these are not style preferences)

1. **Prefix is `fdy-`, pattern is compact BEM**: block `fdy-card`, element `fdy-card__title`,
   modifier `fdy-card--elevated`. A modifier is **always** written alongside its block class:
   `class="fdy-btn fdy-btn--ghost"`, never `fdy-btn--ghost` alone.
   **One documented exception:** `.fdy-input-group__addon--icon` is **standalone** — it is a
   borderless leading glyph, and adding the base `.fdy-input-group__addon` would give it the grey
   fill and divider of a `Rp` / `%` prefix, which is not what a search icon is. Written
   `class="fdy-input-group__addon--icon"`, alone. It is the only one; everywhere else the rule holds.
2. **Never invent a class.** If it is not in this file, it does not exist. Freeday has no
   `fdy-grid`, no `fdy-flex`, no `fdy-mt-4`, no `fdy-primary`.
3. **Never write a raw hex or px value** in app CSS. Use the tokens — `var(--color-primary)`,
   `var(--space-4)`, `var(--radius-md)`, `var(--shadow-1)`, `var(--dur-2)`. Spacing is a 4px scale
   (`--space-0`…`--space-24`); a loose value breaks density switching.
4. **Freeday owns components + tokens, not layout.** The only layout it ships is the shell
   (`.fdy-app`), the composition primitives below, and `.fdy-hidden`/`.fdy-visually-hidden`.
   Grids, stacks and one-off gaps come from your own layout layer (a utility framework run
   **utilities-only, preflight off**, with its theme defined in terms of `var(--space-N)`).
5. **`aria-invalid="true"` is the canonical error state** on form controls — it drives the visual
   state *and* the screen-reader state. Pair it with `aria-describedby` → the `id` of a
   `.fdy-help.fdy-help--error`. The `--error` class modifiers exist only for the case where the
   invalid state does not belong to the control itself.
6. **Interactive components need their enhancer script.** Static ones (button, card, badge, table,
   alert, breadcrumb, timeline, accordion, tree-without-cascade…) are CSS-only.
7. **On Vue, React or Blazor, ten components have a typed wrapper — use it.** `FdyCombo` ·
   `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` · `FdyCascade` · `FdyCfl` · `FdyChart` ·
   `FdyTable` · `FdyModal` · `FdyDrawer`, from `@cahyo-dimas/freeday/vue`, `/react`, or the
   `Freeday.Blazor` RCL. Each is flagged at its own section below. Hand-writing their raw markup in
   those stacks *looks* right — the enhancer initialises once and the first render is correct — then
   breaks quietly: later-rendered DOM is never hydrated and the widget's state sits in the DOM
   instead of your framework's. Everything else is the same markup everywhere; hydrate the other
   interactive components with `useFreeday` (Vue/React) or `FreedayBlazor.initAll` (Blazor).

### Containment — why the kit's containers are `position:relative`

`.fdy-visually-hidden` is `position:absolute`, and `clip` hides **painting**, not **layout**. An
absolutely positioned box resolves against its nearest *positioned* ancestor, and `overflow` clips
only what is contained that way — so in an unpositioned scroller, a hidden label parks at its static
position (possibly thousands of px to the right) and drags the **whole document** sideways. It is
invisible in the DOM and immune to `overflow-x: hidden` on every wrapper.

Every kit container that clips or scrolls therefore declares `position: relative` —
`.fdy-table-scroll`, `.fdy-table-wrap`, `.fdy-list`, `.fdy-card`, `.fdy-tabs__list`,
`.fdy-carousel__viewport`, `.fdy-accordion` (the rest are already inside a positioned ancestor).
Two consequences for you:

- **Do the same in your own scrollers.** A container with `overflow` that holds arbitrary markup
  needs `position: relative`, or the hidden labels *you* write will escape it.
- **Diagnose it correctly.** `document.documentElement.scrollWidth` sees the escaped box;
  `document.body.scrollWidth` does not. The honest check is `window.scrollTo(9999, 0)` then reading
  `window.scrollX`.

## Enhancers — hook, script, global, events

Every enhancer is zero-dependency, auto-initialises once on `DOMContentLoaded`, and is idempotent:
re-hydrate SPA-rendered DOM with `window.Freeday<X>.initAll(root)`. **`root` may be the widget
itself or an ancestor of it** — both work, so a framework ref placed directly on the enhanced
element is fine. Events are bubbling
`CustomEvent`s; the payload is in `event.detail`.

| Markup hook | Script | Global | Emits |
|---|---|---|---|
| `data-fdy-combo` | `freeday-select.js` | `FreedayCombo` | `fdy-change` |
| `data-fdy-autocomplete` | `freeday-autocomplete.js` | `FreedayAutocomplete` | `fdy-autocomplete-select` |
| `data-fdy-cascade` | `freeday-cascade.js` | `FreedayCascade` | `fdy-cascade-change` |
| `data-fdy-cfl` | `freeday-cfl.js` | `FreedayCfl` | `fdy-cfl-select` |
| `data-fdy-datepicker`, `data-fdy-daterange` | `freeday-datepicker.js` | `FreedayDatepicker` | `fdy-datepicker-change` |
| `data-fdy-timepicker` | `freeday-timepicker.js` | `FreedayTimepicker` | `fdy-time-select` |
| `data-fdy-datetimepicker` | `freeday-datetime.js` | `FreedayDatetime` | `fdy-datetime-change` |
| `data-fdy-table` | `freeday-table.js` | `FreedayTable` | `fdy-table-change` |
| `data-fdy-dropzone` | `freeday-upload.js` | `FreedayUpload` | `fdy-upload-add`, `fdy-upload-remove` |
| `data-fdy-validate` | `freeday-form.js` | `FreedayForm` | `fdy-form-valid`, `fdy-form-invalid` |
| `data-fdy-mask`, `data-fdy-password` | `freeday-mask.js` | `FreedayMask` | `fdy-mask` |
| `data-fdy-chips` | `freeday-chip.js` | `FreedayChip` | `fdy-chip-change`, `fdy-chip-remove` |
| `data-fdy-stepper` | `freeday-stepper.js` | `FreedayStepper` | `fdy-step-change`, `fdy-step-finish` |
| `data-fdy-carousel` | `freeday-carousel.js` | `FreedayCarousel` | `fdy-carousel-change` |
| `data-fdy-menu` | `freeday-menu.js` | `FreedayMenu` | — |
| `data-fdy-tabs` | `freeday-tabs.js` | `FreedayTabs` | — |
| `data-fdy-tree` | `freeday-tree.js` | `FreedayTree` | — |
| `data-fdy-rating` | `freeday-rating.js` | `FreedayRating` | — (native `change`) |
| `data-fdy-slider` | `freeday-slider.js` | `FreedaySlider` | — (native `input`) |
| `data-fdy-number` | `freeday-number.js` | `FreedayNumber` | — (native `input`, `change`) |
| `data-fdy-drawer="id"` | `freeday-drawer.js` | `FreedayDrawer` | — |
| `data-fdy-chart="type"` | `freeday-chart.js` | `FreedayChart` | — (`.update(el)` to repaint) |
| — (imperative) | `freeday-toast.js` | `Freeday.toast()` / `Freeday.dismiss()` | — |
| — (stamps `<html data-breakpoint>`) | `freeday-breakpoint.js` | `FreedayBreakpoint` | `fdy-breakpoint-change` |
| — (internal positioning) | `freeday-popover.js` | `FreedayPopover` | — |

**Shared conventions across the select-type widgets** (combo, cascade, datepicker, daterange,
timepicker, autocomplete, cfl): `data-value` seeds the value, `data-placeholder` the empty text,
`data-label` the accessible name, `data-fdy-disabled` / `data-fdy-readonly` / `data-fdy-invalid`
the states, `data-fdy-no-icon` drops the trailing icon, and a `<template data-fdy-icon>` child
replaces it. `readonly` is **not** `disabled`: full contrast, still focusable and copyable, opening
is a no-op.

**State classes** the enhancers set (read them, don't hand-author them): `is-active`,
`is-complete`, `is-open`, `is-selected`, `is-highlighted`, `is-filled`, `is-today`, `is-dragover`,
`is-leaving`, `is-error`, `is-disabled`, `is-hidden`, `is-visible`, `is-outside`.

---

# Shell & composition

## App shell — `.fdy-app`
The frame every application lives in. Do not hand-roll one from flexbox: the responsive sidebar,
off-canvas drawer and backdrop are built in.

- Parts: `__sidebar` `__brand` (`__brand-mark` `__brand-text` `__brand-title` `__brand-subtitle`)
  `__content` `__topbar` `__navtoggle` `__title` `__main` `__backdrop`
- Modifiers: `--nav-open` (mobile drawer open, ≤720px) · `--nav-collapsed` (collapse to zero width,
  ≥721px) · `--static` (embed the shell in a page instead of filling the viewport)
- Also: `.fdy-skip` — the skip-to-content link, first child of the shell.
- JS: none. Toggle `--nav-collapsed` (≥721px) or `--nav-open` (≤720px) on the root from
  `__navtoggle`'s click; clear `--nav-open` when `__backdrop` is clicked.

**The nesting is fixed, not free-form:** `.fdy-app` is a flex **row** of `[__sidebar | __content]`,
and `__content` is the column holding `__topbar` + `__main` — it exists to give the sticky topbar a
tall containing block. The brand goes in the **sidebar** (sized to match the topbar height), and
`__main` already carries the page padding, so don't wrap your screen in another padded box.

```html
<div class="fdy-app">
  <a class="fdy-skip" href="#main">Skip to content</a>

  <aside class="fdy-app__sidebar">
    <a class="fdy-app__brand" href="/">
      <span class="fdy-app__brand-mark"><!--logo--></span>
      <span class="fdy-app__brand-text"><span class="fdy-app__brand-title">Acme</span></span>
    </a>
    <nav class="fdy-nav"><!--nav items--></nav>
  </aside>

  <div class="fdy-app__content">
    <header class="fdy-app__topbar">
      <button class="fdy-app__navtoggle" type="button" aria-label="Toggle navigation"><!--svg--></button>
      <h1 class="fdy-app__title">Invoices</h1><!-- auto-spacer: pushes what follows right -->
      <!-- topbar actions -->
    </header>
    <main class="fdy-app__main" id="main"><!-- .fdy-page goes here --></main>
  </div>

  <div class="fdy-app__backdrop"></div>
</div>
```

## Page composition — `.fdy-page`
Vertical section rhythm (`--space-8` between children). Assemble every screen from these; they
carry the doctrine in markup.

- `.fdy-page` — the screen body
- `.fdy-page__header` — `.fdy-page__heading` (eyebrow + page title + `.fdy-page__desc`) on the
  left, `.fdy-page__actions` (**one** primary button) on the right
- `.fdy-page-section` — a region: `.fdy-page-section__head` + body, `--space-4` rhythm
- `.fdy-toolbar` — a horizontal control row; `__spacer` (flex filler), `__search` (capped width).
  It is `align-items:center`, so it is for **bare** controls. A `.fdy-field` with a *visible* label
  sits half a label-height low in it — labelled fields belong in `.fdy-filterbar`
  (`align-items:flex-end`). In a toolbar, hide the label with `.fdy-visually-hidden`.
- `.fdy-stats` — a KPI grid of `.fdy-stat` (`__label` `__value` `__meta`). Deliberately **not**
  cards. `.fdy-stats--boxed` for one shared surface with dividers.

```html
<div class="fdy-page">
  <header class="fdy-page__header">
    <div class="fdy-page__heading">
      <p class="fdy-eyebrow">Sales</p>
      <h1 class="fdy-title-page">Invoices</h1>
      <p class="fdy-page__desc">Every invoice issued this period.</p>
    </div>
    <div class="fdy-page__actions"><button class="fdy-btn">New invoice</button></div>
  </header>

  <section class="fdy-page-section">
    <div class="fdy-stats">
      <div class="fdy-stat">
        <span class="fdy-stat__label">Outstanding</span>
        <span class="fdy-stat__value">1,240<small> M</small></span>
        <span class="fdy-stat__meta">12 invoices</span>
      </div>
    </div>
  </section>

  <section class="fdy-page-section">
    <div class="fdy-page-section__head">
      <h2 class="fdy-title-section">All invoices</h2>
      <div class="fdy-toolbar"><!-- filters, actions --></div>
    </div>
    <!-- component: table, cards, chart… -->
  </section>
</div>
```

## Type roles & text
One role per level of hierarchy — never re-use a card title for a page title.

| Class | Element | Use |
|---|---|---|
| `.fdy-eyebrow` | `<p>` | Small uppercase label above a title. Optional. |
| `.fdy-title-page` | `<h1>` | One per screen. |
| `.fdy-title-section` | `<h2>` | A region inside the page. |
| `.fdy-title-card` | `<h3>` | A title inside a card or row (`.fdy-card__title` is equivalent). |
| `.fdy-text-muted` · `.fdy-text-subtle` | any | Secondary / tertiary text colour. |
| `.fdy-text-caption` | `<p>` | Small muted text: timestamps, help. |
| `.fdy-text-success` · `.fdy-text-warning` · `.fdy-text-danger` | any | Inline text that carries **state** — a sentence, not a status. Use when a badge is wrong (it is prose) and an alert is wrong (it is one line inside a row): "Amount changed from X to Y", "No approver assigned". **Do not stack two colour roles** (`.fdy-help.fdy-text-warning`): both are single classes, so the one that happens to come later in the stylesheet wins — put the state class on its own element, and use `.fdy-help--error` for help text. |
| `.fdy-icon` | `<svg>` or a wrapper | Icon box: `1em` square, `flex:none`, so the glyph tracks the text beside it at every scale. The kit ships no paths — bring your own, use the box. |
| `.fdy-mono` | any | Tabular/monospace data (codes, amounts, ids). |

## Utilities
`.fdy-hidden` · `.fdy-visually-hidden` (screen-reader-only) · `.fdy-list-reset` (strip native
bullets/indent from a semantic list — needed when your utility framework's preflight is off) ·
`.fdy-divider` (+`--vertical`) · `.fdy-kbd`.

Responsive display: `.fdy-hide-below-sm|md|lg` · `.fdy-hide-above-sm|md|lg`.
Breakpoints (min-width): `sm` 600 · `md` 960 · `lg` 1280 · `xl` 1920 — importable as
`import { breakpoints } from '@cahyo-dimas/freeday/breakpoints'`.

**`breakpoints.nav` (721) is separate and is the one the shell uses.** `.fdy-app` switches the
sidebar from off-canvas drawer to static column at 721px, *not* at `md`. Any `matchMedia` guard or
utility variant that has to agree with the shell must use `nav`; using `md` leaves 721–959px broken
(sidebar already static while your script still treats it as an overlay).

Density: `data-density="compact"` works on `<html>` **or any wrapper** — the selector is a bare
`[data-density="compact"]` over inheriting custom properties, so one screen can be dense while the
rest of the app is not. `data-density="comfortable"` is a real rule too, so the reverse also works:
a compact root with one region opted back out (shared chrome that must match a sibling product).

---

# Actions

## Button — `.fdy-btn`
**The base class is already the primary action** — there is no `--primary`. Use it once per screen.

- Modifiers: `--ghost` `--danger` `--text` `--icon` (square, icon-only) `--sm` `--lg`
- Parts: `.fdy-btn__icon` (wraps the `<svg>`) · `.fdy-btn-group` (segmented row, `role="group"` +
  `aria-label`)
- **Toggle / segmented:** `aria-pressed="true"` gives a real pressed state (soft primary fill on
  `--ghost`/`--text`, an inset-sunk gradient on the solid button). No extra class — `aria-pressed`
  is already the right attribute, and it is what turns `.fdy-btn-group` from a joined row into a
  complete segmented control.
- A11y: `--icon` **requires** `aria-label`. Use `<button type="button">` unless it submits.

```html
<button class="fdy-btn"><span class="fdy-btn__icon"><!--svg--></span>Save</button>
<button class="fdy-btn fdy-btn--ghost">Cancel</button>
<button class="fdy-btn fdy-btn--ghost fdy-btn--icon" type="button" aria-label="Settings">
  <span class="fdy-btn__icon"><!--svg--></span>
</button>
```

**Quiet destructive:** combine `--danger` with `--ghost` or `--text`. The ground stays quiet and only
the ink turns red — `.fdy-menu__item--danger` has always worked this way. Use it whenever Delete
shares a screen with the one primary action; a solid Delete beside Save is a second primary in all
but name.

## FAB — `.fdy-fab`
Floating circular action. Modifiers: `--sm` `--accent` `--danger` `--extended` (pill with a label).
Always `aria-label` unless `--extended` carries visible text.

## Menu & split button — `.fdy-menu`
WAI-ARIA APG menu-button. Keyboard ↑/↓/Home/End/Esc handled by the enhancer.

- Wrapper: `.fdy-menu-wrap` (or `.fdy-btn-split` for a split button, with
  `.fdy-btn-split__toggle` as the second button) + `data-fdy-menu`
- List: `.fdy-menu` (`--end` aligns right), items `.fdy-menu__item` (`--danger`), separator
  `<hr class="fdy-menu__sep">`
- A11y: trigger gets `aria-haspopup="menu"` + `aria-expanded="false"`; `<ul role="menu" hidden>`;
  each `<li role="none">` wraps a `<button role="menuitem">`.

```html
<div class="fdy-menu-wrap" data-fdy-menu>
  <button class="fdy-btn fdy-btn--ghost" aria-haspopup="menu" aria-expanded="false">Actions</button>
  <ul class="fdy-menu" role="menu" hidden>
    <li role="none"><button class="fdy-menu__item" role="menuitem">Edit</button></li>
    <li role="none"><hr class="fdy-menu__sep"></li>
    <li role="none"><button class="fdy-menu__item fdy-menu__item--danger" role="menuitem">Delete</button></li>
  </ul>
</div>
```

---

# Forms

## Field, label, input — `.fdy-field`
The field wrapper owns the vertical rhythm; `<label class="fdy-field">` when it wraps a single
native control, otherwise a `<div>` + explicitly associated label.

- `.fdy-field` (+ `--full` inside `.fdy-form-grid`; widths `--w-sm` `--w-lg` `--w-xl` `--w-2xl`
  `--w-grow` inside `.fdy-filterbar`)
- `.fdy-label` (+`--required`) · `.fdy-input` (+`--error`) · `.fdy-textarea` · `.fdy-help` (+`--error`)

**Grouped controls are a `<fieldset>`, not a new block.** Put `.fdy-field` on the fieldset and
`.fdy-label` on the legend — the kit already resets the UA border/padding and supplies the spacing:

```html
<fieldset class="fdy-field">
  <legend class="fdy-label">Working week</legend>
  <label class="fdy-check"><input type="checkbox"> Monday</label>
  <label class="fdy-check"><input type="checkbox"> Tuesday</label>
</fieldset>
```

**`.fdy-label--required` marks the label, not the accessibility tree.** The control already carries
`required`; the asterisk is painted through `::after` with CSS alt text, so a screen reader never
reads "star" after the label — something a `<span>` you have to remember to mark `aria-hidden`
cannot guarantee.
- `[readonly]` is styled on input/textarea: full contrast, focusable, copyable.

```html
<label class="fdy-field">
  <span class="fdy-label">Customer</span>
  <input class="fdy-input" aria-describedby="cust-help">
  <span class="fdy-help" id="cust-help">As printed on the document.</span>
</label>

<label class="fdy-field">
  <span class="fdy-label">Email</span>
  <input class="fdy-input" aria-invalid="true" aria-describedby="email-err">
  <span class="fdy-help fdy-help--error" id="email-err">Not a valid email address.</span>
</label>
```

**Which `type` does `.fdy-input` cover?** Every text-like type — `text` `email` `password` `tel`
`url` `search` `number` — themes identically. Two carry a native widget the kit does *not* override:

| Type | What the UA still draws | What to do |
|---|---|---|
| `search` | WebKit's clear (×) button, in OS colours | **Left alone on purpose** — it is the only way to empty the field. Want it themed? Drop the type back to `text` and add a `.fdy-input-group__btn` that clears. |
| `date` `time` `datetime-local` | the picker indicator glyph, and the whole native picker | Use `.fdy-datepicker` / `.fdy-timepicker` / `.fdy-datetimepicker` instead — the kit ships its own. |

`number` used to be a third: the UA spin buttons are unthemeable, so `.fdy-input[type="number"]`
now hides them and `[data-fdy-number]` below gives the affordance back.

## Input group — `.fdy-input-group`
Prefix/suffix addons around an input: text (`Rp`, `%`), a decorative icon
(`__addon--icon`), or an action button (`__btn`).

- `.fdy-input-group` · `__addon` (+`--icon`) · `__btn`

```html
<div class="fdy-input-group">
  <span class="fdy-input-group__addon">Rp</span>
  <input class="fdy-input" inputmode="numeric" aria-label="Amount">
</div>
```

## Number field — `[data-fdy-number]`
A number input with its increment/decrement affordance back, after `.fdy-input` removed the
browser's own. **Not a new block** — it is an `.fdy-input-group` with two `__btn`s, so it inherits
the shared border, focus ring and error promotion. Needs `freeday-number.js`.

```html
<div class="fdy-input-group" data-fdy-number>
  <button type="button" class="fdy-input-group__btn" data-fdy-number-step="-1"
          tabindex="-1" aria-label="Kurangi">−</button>
  <input class="fdy-input" type="number" min="0" max="10" step="1" value="1" aria-label="Konfirmasi">
  <button type="button" class="fdy-input-group__btn" data-fdy-number-step="1"
          tabindex="-1" aria-label="Tambah">+</button>
</div>
```

- **No custom event.** Stepping fires native bubbling `input` + `change` on the input, so `v-model`,
  `onChange` and `@bind` work with no adapter — the input stays the source of truth.
- `min` / `max` / `step` live on the **input**; the buttons never do the arithmetic themselves
  (`stepUp()`/`stepDown()` clamp for free) and go `disabled` at a bound, on a `disabled`/`readonly`
  field, and when `step="any"` (a stepper cannot express "no defined increment").
- The buttons are **not tab stops** (`tabindex="-1"`): the input is already focusable and ↑/↓
  already step it, so extra stops would cost every keyboard user and buy nothing. Keep the
  `aria-label` — pointer and browse-mode users still get a named control.
- `type="button"` is required. Inside a `<form>`, a bare `<button>` submits it.

## Checkbox · radio · switch
Native inputs, styled. `.fdy-check` · `.fdy-radio` · `.fdy-switch` on the wrapping `<label>`;
`.fdy-checkbox` on a bare `<input type="checkbox">` used inside tables/trees.

```html
<label class="fdy-check"><input type="checkbox" checked> Email me a copy</label>
<label class="fdy-switch"><input type="checkbox"> Enable notifications</label>
```

## Select / combobox — `.fdy-combo`
> **Typed wrapper: `<FdyCombo>`** — Vue (`v-model`) · React (`value`/`onChange`) · Blazor (`@bind-Value`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Fully styleable dropdown, APG combobox+listbox. Needs `freeday-select.js`.

- `.fdy-combo` (+`--error`, `--no-icon`) · `__button` `__value` (+`--placeholder`) `__listbox`
  `__option` `__check` `__icon` (custom trailing icon, with `--no-icon`)

```html
<div class="fdy-field">
  <span class="fdy-label" id="st-l">Status</span>
  <div class="fdy-combo" data-fdy-combo data-value="pending">
    <button type="button" class="fdy-combo__button" role="combobox" aria-haspopup="listbox"
            aria-expanded="false" aria-labelledby="st-l st-v">
      <span class="fdy-combo__value" id="st-v">Pending</span>
    </button>
    <ul class="fdy-combo__listbox" role="listbox" aria-labelledby="st-l" hidden>
      <li class="fdy-combo__option" role="option" data-value="paid" aria-selected="false"><span class="fdy-combo__check"></span>Paid</li>
      <li class="fdy-combo__option" role="option" data-value="pending" aria-selected="true"><span class="fdy-combo__check"></span>Pending</li>
    </ul>
  </div>
</div>
```

**The selected tick is CSS.** `.fdy-combo__check` is an empty box in the markup; the glyph is painted
by the stylesheet on `[aria-selected="true"]` with alt text, so it never enters the accessibility
tree. That keeps an option's accessible name **identical whether or not it is selected** — the state
is carried by `aria-selected` alone, announced once, and `getByRole('option', { name: 'August' })`
keeps matching after selection. Do not put a glyph in that span.

## Autocomplete — `.fdy-autocomplete`
> **Typed wrapper: `<FdyAutocomplete>`** — Vue (`v-model`) · React (`value`/`onChange`) · Blazor (`@bind-Value`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Editable combobox that filters as you type. Needs `freeday-autocomplete.js`.

- `.fdy-autocomplete` · `__listbox` `__option` `__empty`
- The `<input>` carries `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`,
  `aria-controls` → the listbox `id`, `autocomplete="off"`.

## Cascade select — `.fdy-cascade`
> **Typed wrapper: `<FdyCascade>`** — Vue (`v-model`) · React (`value`/`onChange`) · Blazor (`@bind-Value`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Hierarchical drill-down. The data model is a **nested `<ul>`** inside the wrapper: an `<li>` with a
child `<ul>` is a branch, one without is a leaf. Needs `freeday-cascade.js`.

- `.fdy-cascade` (+`--error`) · `__trigger` `__value` (+`--placeholder`) `__panel` `__head`
  `__back` `__crumb` `__list` `__opt` `__opt-label` `__opt-arrow`
- Author only the wrapper + nested list; the enhancer builds the trigger and panel.

```html
<div data-fdy-cascade data-label="Category" data-placeholder="Pick a category">
  <ul>
    <li data-value="electronics">Electronics
      <ul><li data-value="phones">Phones</li><li data-value="laptops">Laptops</li></ul>
    </li>
    <li data-value="other">Other</li>
  </ul>
</div>
```

## Choose-from-list (CFL) — `data-fdy-cfl`
> **Typed wrapper: `<FdyCfl>`** — Vue (`v-model`) · React (`value`/`onChange`) · Blazor (`@bind-Value`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

A read-only field backed by master data: the button opens a searchable dialog, the picked row fills
the field. The value is always **chosen, never typed**. Needs `freeday-cfl.js`.

- Field: `.fdy-input-group` + `data-fdy-cfl="<dialog id>"`, `data-fdy-cfl-display="code"`,
  `data-fdy-cfl-summary="{n} selected"` (multi)
- Dialog: `<dialog class="fdy-modal fdy-modal--cfl">` + `data-fdy-cfl-multiple` for multi-select
- Inside: `.fdy-cfl__search` `__results` `__row` `__check` `__empty` `__count` `__actions`
- Hooks: `data-fdy-cfl-search` (the search input), `data-fdy-cfl-empty`, `data-fdy-cfl-count`,
  `data-fdy-cfl-confirm` (multi only), `data-fdy-cfl-trigger`, `data-fdy-cfl-open`
- Rows are server state — in a real app drive them from a controlled fetch, not a global store.

```html
<div class="fdy-field">
  <span class="fdy-label" id="c-l">Customer code</span>
  <div class="fdy-input-group" data-fdy-cfl="dlg-cust" data-fdy-cfl-display="code">
    <input class="fdy-input" aria-labelledby="c-l" placeholder="Pick a customer…" readonly>
    <button class="fdy-input-group__btn" type="button" aria-haspopup="dialog" aria-label="Pick a customer"><!--svg--></button>
  </div>
</div>

<dialog class="fdy-modal fdy-modal--cfl" id="dlg-cust" aria-labelledby="dlg-cust-t">
  <div class="fdy-modal__header">
    <h3 class="fdy-modal__title" id="dlg-cust-t">Pick a customer</h3>
    <button class="fdy-modal__close" aria-label="Close" data-close>&times;</button>
  </div>
  <div class="fdy-modal__body">
    <div class="fdy-cfl__search">
      <div class="fdy-input-group">
        <span class="fdy-input-group__addon fdy-input-group__addon--icon"><!--svg--></span>
        <input class="fdy-input" type="search" aria-label="Search customers" data-fdy-cfl-search>
      </div>
    </div>
    <div class="fdy-cfl__results">
      <table class="fdy-table">
        <thead><tr><th scope="col">Code</th><th scope="col">Name</th></tr></thead>
        <tbody>
          <tr class="fdy-cfl__row" data-code="C-1001" data-name="Acme Ltd"><td>C-1001</td><td>Acme Ltd</td></tr>
        </tbody>
      </table>
      <p class="fdy-cfl__empty" data-fdy-cfl-empty hidden>No match.</p>
    </div>
  </div>
  <div class="fdy-modal__footer">
    <span class="fdy-cfl__count">Click a row to pick</span>
    <div class="fdy-cfl__actions"><button class="fdy-btn fdy-btn--ghost" type="button" data-close>Close</button></div>
  </div>
</dialog>
```

**`clearable` makes the value removable.** Without it a choose-from-list can be set but never unset,
which breaks every *optional* foreign key — the value type already allows null, only the component
could not produce it. With it, a clear button appears beside the trigger whenever a row is picked
and the field is editable; it emits `null` (Vue `update:modelValue`/`change`, React `onChange`,
Blazor `ValueChanged`) and returns focus to the trigger. It is a second `.fdy-input-group__btn`, not
a new class.

## Date picker — `data-fdy-datepicker`
> **Typed wrapper: `<FdyDatepicker>`** — Vue (`v-model`) · React (`value`/`onChange`) · Blazor (`@bind-Value`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Input-styled trigger + calendar popover. Needs `freeday-datepicker.js`. **Author an empty `<div>`**
— the enhancer builds everything.

- `.fdy-datepicker` (+`--error`) · `__trigger` `__value` (+`--placeholder`) `__icon` `__clear`
  `__panel`; calendar internals `.fdy-cal__head` `__nav` `__title` `__grid` (+`--months` `--years`)
  `__dow` `__day` `__month` `__year`
- Range: wrap two pickers in `.fdy-daterange` + `data-fdy-daterange` (`role="group"`), children
  get `data-role="from"` / `"to"`; separator `.fdy-daterange__sep`. The end can't precede the start.
  **Typed wrapper: `<FdyDateRange>`** (Vue/React/Blazor) — use it in those stacks.
**Getting to a distant date.** The title is a **button**, and it drills up one level each press:
day grid → 12-cell month grid (`.fdy-cal__grid--months` of `.fdy-cal__month`) → 12-cell year grid
(`.fdy-cal__grid--years` of `.fdy-cal__year`). The arrows follow the level shown — months, then
years, then pages of twelve years. Picking a year drops to that year's months, picking a month
drops to its days: every level above the day grid is **navigation**, so nothing is committed until a
day is selected. From the year grid the title steps back down to months.

Year pages are **aligned**, not centred on the year in view — 2016–2027, then 2028–2039 — so the
pages tile and a given year always sits in the same place. From August 2026 to March 2022 that is 7
clicks; walking month by month is 53. To 1998 it is 8; walking is 336.

Keyboard, in the day grid: arrows move a day, `Home`/`End` the week, `PageUp`/`PageDown` a month,
and **`Shift`+`PageUp`/`PageDown` a year** (WAI-ARIA APG). The month grid mirrors it: arrows ±1/±3
months, `Home`/`End` January/December, `PageUp`/`PageDown` a year, `Enter`/`Space` to choose. The
year grid likewise: arrows ±1/±3 years, `Home`/`End` the ends of the page, `PageUp`/`PageDown` a
page of twelve.

- Attributes: `data-value="YYYY-MM-DD"`, `data-placeholder`, `data-label`, `data-fdy-no-icon`

```html
<div class="fdy-field">
  <span class="fdy-label">Invoice date</span>
  <div data-fdy-datepicker data-value="2026-07-21" data-label="Invoice date"></div>
</div>

<div class="fdy-daterange" data-fdy-daterange role="group" aria-label="Reporting period">
  <div data-fdy-datepicker data-role="from" data-placeholder="From" data-label="Start date"></div>
  <span class="fdy-daterange__sep" aria-hidden="true">–</span>
  <div data-fdy-datepicker data-role="to" data-placeholder="To" data-label="End date"></div>
</div>
```

## Time picker — `data-fdy-timepicker`
24-hour `HH:MM` listbox. `data-step` (minutes, default 30), `data-min`, `data-max`. Needs
`freeday-timepicker.js`. Classes: `.fdy-timepicker` (+`--error`) · `__trigger` `__value`
(+`--placeholder`) `__icon` `__panel` `__opt`.

## Datetime picker — `data-fdy-datetimepicker`
A **composition** of the two above, not a monolith: nest one datepicker and one timepicker inside
the wrapper. `freeday-datetime.js` joins them and emits one `fdy-datetime-change` with
`YYYY-MM-DDTHH:MM`. Class `.fdy-datetimepicker`.

## File upload — `.fdy-dropzone`
Click/Enter opens the file dialog; drop works too. Needs `freeday-upload.js`.

- `.fdy-dropzone` (+`--row`) · `__icon` `__text` `__title` `__hint`; contains a hidden
  `<input type="file">`
- List: `.fdy-filelist` (+`--grid`) of `.fdy-file` (+`--success`, `--error`) · `__icon` `__meta`
  `__name` `__sub` `__progress` `__remove`
- Attributes: `data-max-size` (bytes), `data-filelist="#id"`, `data-fdy-upload-simulate` (demo only
  — the kit fakes a transfer to `done()`; never set it in an app)
- A11y: the dropzone is `role="button" tabindex="0"` + `aria-label`.

**Both events fire on the dropzone** — `fdy-upload-add` *and* `fdy-upload-remove`. One listener, one
element. (The file list may be anywhere in the document; nothing is dispatched on the row, because a
row in a sibling list would never bubble through the zone.)

**The row is yours to drive.** `fdy-upload-add` carries `detail.row`, a small state machine over the
rendered `.fdy-file`. A dropped file **rests** — it shows its size and nothing else — until you say a
transfer started; the kit never claims one it is not performing.

| `detail.row` | State it renders |
|---|---|
| *(initial)* | **rest** — chosen, not sent. Size only, no progress bar. |
| `.uploading()` | in flight — adds the progress bar |
| `.setProgress(pct)` | moves the bar (0–100) |
| `.waiting(label)` | **sent, waiting on the server** — indeterminate bar, no `aria-valuenow`; `label` is yours (default *Menunggu server…*) |
| `.done()` | success — drops the bar, `.fdy-file--success` |
| `.fail(msg)` | error — drops the bar, `.fdy-file--error`, `msg` replaces the sub-line |
| `.ready()` | back to **rest** (e.g. after a failed attempt the user will retry) |
| `.el` | the row element |

**If your request outlives the transfer, drive `waiting()`.** Server-side work after the last byte —
OCR, extraction, virus scanning, transcoding — is not uploading, and `setProgress(100)` left standing
is read as a hang. `waiting()` is the state for it: the label says what the server is doing, and the
bar stops claiming a percentage it no longer has.

```js
zone.addEventListener('fdy-upload-add', (e) => {
  if (e.detail.rejected) return;              // the kit already rendered the reason
  const { file, row } = e.detail;             // row is at rest — nothing is in flight yet
  submitBtn.onclick = async () => {
    row.uploading();
    await send(file, (pct) => row.setProgress(pct));
    row.waiting('Membaca dokumen…');            // bytes gone, server still working
    await serverFinished();
    row.done();
  };
});
zone.addEventListener('fdy-upload-remove', (e) => forget(e.detail.file));   // same element
```

**Bring your own row:** omit the file list entirely (no `data-filelist`, and no `.fdy-filelist`
sibling) and the enhancer renders nothing while still dispatching `fdy-upload-add` — `detail.row`
still works, its element simply isn't attached. Note the fallback when `data-filelist` is absent is
`parentNode.querySelector('.fdy-filelist')`, so a bare dropzone will adopt a list that happens to
share its parent; give the dropzone its own container if you mean "no list".

## Form validation — `data-fdy-validate`
Native Constraint Validation wired to accessible inline errors: `aria-invalid` +
`aria-describedby`, focus to the first invalid field on submit, live re-validation on
blur/input. Needs `freeday-form.js`.

- Per-control messages: `data-fdy-msg-required`, `-type`, `-minlength`, `-min`, `-mismatch`, …
- Cross-field: `data-fdy-match="#otherFieldId"`
- Emits `fdy-form-valid` / `fdy-form-invalid`.

## Password & mask
`data-fdy-password` on `<input type="password">` adds a reveal toggle (reusing the input-group
button chrome). `data-fdy-mask="####-####"` formats while typing: `#` digit, `A` letter, `*`
alphanumeric, anything else is a literal. Needs `freeday-mask.js`.

## Form grid — `.fdy-form-grid`
Responsive two-column document header. Children are `.fdy-field`; `.fdy-field--full` spans both.

## Filter bar — `.fdy-filterbar`
A consistent filter row of `.fdy-field`s with a width rhythm (`--w-sm` · default · `--w-lg` ·
`--w-xl` · `--w-2xl`), one `--w-grow` field (usually search) absorbing the slack, and
`.fdy-filterbar__actions` pinned at the end. A control with **no label of its own** (a
`.fdy-check`, `.fdy-switch`, `.fdy-radio`, or a lone `.fdy-btn`) is given `--control-h` so it
centres on the input line instead of hanging below it — the bar aligns `flex-end` to line up
labelled fields, which would otherwise drop a 20px checkbox below a 32px input's centre.
`--actions-inline` keeps the actions on the control
line. Zero JS. Composes with `.fdy-table-toolbar` on a shared baseline.

## Slider — `.fdy-slider`
Native `<input type="range">` themed via `accent-color`; `freeday-slider.js` only mirrors the value
into an `<output>`. Modifiers `--accent` `--danger`. Wrapper `.fdy-slider-field` + `__head`,
value `.fdy-slider__value` (`data-fdy-prefix` / `data-fdy-suffix`), scale `.fdy-slider__scale`.

## Rating — `.fdy-rating`
A native radio group (arrow keys, form-associated). Filled vs empty differ by **fill, not colour
alone**. Modifiers `--sm` `--readonly` `--disabled` `--error`; star `.fdy-rating__star`. Read-only
variant is `role="img"` + `aria-label`; each interactive star needs a `.fdy-visually-hidden` label.

## Stepper / wizard — `.fdy-stepper`
Linear multi-step flow: marker → check, one panel at a time, back/next. Needs
`freeday-stepper.js`.

- `.fdy-stepper` (`<ol>`) of `.fdy-step` (`is-active` / `is-complete` set by JS) ·
  `.fdy-step__btn` `__marker` `__label`
- `.fdy-step-panels` wrapping one `.fdy-step-panel` per step (`hidden` on the inactive ones)
- `.fdy-step-nav` with `data-fdy-step-prev` / `data-fdy-step-next` buttons

---

# Data

**`__btn` is optional.** For a **read-only indicator** put `__marker` + `__label` straight in the
`<li>`; for a **navigable** stepper wrap them in `<button class="fdy-step__btn">` (add `disabled`
for a step that is not reachable yet). Both render identically — the marker carries its own lift
over the connector line, so omitting `__btn` cannot make the connector draw through the numbers.

```html
<ol class="fdy-stepper">
  <li class="fdy-step is-complete"><span class="fdy-step__marker">1</span><span class="fdy-step__label">Email</span></li>
  <li class="fdy-step is-active"><span class="fdy-step__marker">2</span><span class="fdy-step__label">Verify</span></li>
</ol>
```

## Table — `.fdy-table`
Semantic static table. Wrap in `.fdy-table-wrap` (bordered surface) or `.fdy-table-scroll`
(horizontal scroll). Always a `<caption>` (use `.fdy-visually-hidden` if it shouldn't show) and
`<th scope="col">`. Numeric cells get `.fdy-table__num` (right-aligned, tabular).

```html
<div class="fdy-table-wrap">
  <table class="fdy-table">
    <caption>Recent invoices</caption>
    <thead><tr><th scope="col">Invoice</th><th scope="col" class="fdy-table__num">Amount</th></tr></thead>
    <tbody>
      <tr><td>INV-1042</td><td class="fdy-table__num">1,240,000</td></tr>
    </tbody>
  </table>
</div>
```

**Frozen axes — `.fdy-table--sticky`.** For a grid read against two axes at once (a rate
matrix, a timetable) or a wide one whose identity columns must stay visible. `.fdy-table--sticky`
is the enabler: it separates the borders, because a collapsed border belongs to the table rather
than the cell and scrolls out from under whatever you froze. Then ask for the axes you have:

- **Header row** — add `.fdy-table--sticky-head`, and put `.fdy-table-scroll--frozen` on the
  wrapper (it scrolls both ways and is the scrollport the freeze resolves against; size it with
  `--fdy-table-frozen-h`, default `30rem`). It is a separate modifier because a table that only
  freezes columns scrolls with the **page**, and `top:0` against the page sticks the header under
  the viewport edge — over the app's own top bar.
- **Columns** — put `.fdy-table__freeze` on **every cell of the column, header included**, and give
  each frozen column its own `--fdy-freeze-left`: `0` for the first, then the summed widths of the
  frozen columns to its left. Mark the last one `.fdy-table__freeze--edge` so the reader can see
  where the frozen block ends. One frozen column needs no variable at all.

The offsets are the caller's job because they depend on rendered column widths, which CSS cannot
sum — measure them once after render (and on resize) and set the variable.

```html
<div class="fdy-table-scroll fdy-table-scroll--frozen" style="--fdy-table-frozen-h:26rem">
  <table class="fdy-table fdy-table--sticky fdy-table--sticky-head">
    <caption class="fdy-visually-hidden">Exchange rates, August 2026</caption>
    <thead><tr>
      <th scope="col" class="fdy-table__freeze fdy-table__freeze--edge">Date</th>
      <th scope="col" class="fdy-table__num">USD</th>
    </tr></thead>
    <tbody>
      <tr>
        <th scope="row" class="fdy-table__freeze fdy-table__freeze--edge">1 Aug</th>
        <td class="fdy-table__num">16,240</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Data table — `.fdy-datatable`
> **Typed wrapper: `<FdyTable>`** — controlled: `columns` + `rows`, with sort/filter/page events (`update:pageIndex` · `onPageIndexChange` · `PageIndexChanged`) and `process` for driving a card list off the same processed set. The markup below is the raw enhancer path.

The interactive table: global search, sort, per-column filters, row selection + bulk bar,
pagination. Needs `freeday-table.js`. Wrap the whole thing in `.fdy-datatable` + `data-fdy-table`
(`data-page-size="N"`).

- Toolbar: `.fdy-table-toolbar` · `__search` `__spacer` `__count` (hooks `data-fdy-table-search`,
  `data-fdy-table-count`)
- Bulk bar: `.fdy-table-bulkbar` · `__count` `__spacer` `__actions` (hooks `data-fdy-table-bulk`,
  `data-fdy-table-bulk-count`, `data-fdy-table-bulk-clear`)
- Header cells: `<button class="fdy-table__sortbtn" data-fdy-sort>` (`data-fdy-sort="number"` for
  numeric); `data-fdy-filter="text|enum|number"` on the `<th>` adds the funnel
  (`.fdy-table__filterbtn` / `__filterwrap` → panel `.fdy-filter` · `__title` `__list` `__check`
  `__range` `__foot`)
- Selection: `.fdy-table__selcol` cells with `data-fdy-select-all` / `data-fdy-row-select`
- Rows: `.fdy-table__row--activatable` (clickable rows), `.fdy-table__detailrow` (expandable
  detail), `.fdy-table__state` (in-table empty/loading row)
- Footer: `.fdy-table-footer` · `__info` (`data-fdy-table-info`) + optional `__size` (a label and a
  rows-per-page control) + `<nav class="fdy-pagination" data-fdy-table-pagination>`. The typed
  wrappers render `FdyCombo` there — **never a native `<select>`**, whose open list is an OS menu no
  stylesheet reaches. In the raw path the control is app-authored markup (its options *are* the
  offer) carrying `data-fdy-table-page-size`; the enhancer only wires it, and listens for both
  `change` and the `fdy-change` a `.fdy-combo` emits, so either kind works.
- Sort values: put the raw value in `data-sort-value` when the cell text is formatted.
- **Language caveat:** every user-visible string the **vanilla enhancers** write is Indonesian by
  default — the table's footer and bulk count (`Menampilkan 1–5 dari 7`, `N dipilih`), its pager and
  filter UI (`Sebelumnya`, `Berikutnya`, `Filter kolom`, `Berisi teks`, `Reset`, `Tutup`), and the
  same elsewhere (`Format tidak valid.`, `Tampilkan kata sandi`, `Menunggu server…`). The
  Vue/React/Blazor components are English throughout, so **an English app should use the typed
  wrapper**.
- **Overriding an enhancer's strings.** Each enhancer keeps its strings in one `TEXT` table and
  reads them through `textOf()`, so any of them can be replaced per element with
  **`data-fdy-text-<key>`** — no forking, and no rendering the nodes yourself:

  ```html
  <div data-fdy-table
       data-fdy-text-info="Showing {from}–{to} of {total}"
       data-fdy-text-selected="{n} selected"
       data-fdy-text-filter="Column filter">…</div>
  ```

  `{n}`, `{from}`, `{to}`, `{total}`, `{name}`, `{max}` and `{label}` are substituted where the
  string supports them. Validation messages take the same shape on the `<form>`
  (`data-fdy-text-required`, `data-fdy-text-type`, …), narrower than the per-field
  `data-fdy-msg-<alias>` that still wins. `Freeday.toast()` takes `closeLabel` in its options
  object. `npm test` asserts no enhancer string is written outside its `TEXT` table, so a new one
  arrives overridable or not at all.

**Testing note:** a column's filter button and the dialog it opens deliberately share one
accessible name (`Filter <column>`) — a dialog named after its trigger is the normal pattern. In a
Playwright/Testing-Library suite that means `getByLabel('Filter Name')` resolves to two elements;
reach for `getByRole('button', { name: 'Filter Name' })` instead.

**Rows per page.** Pass `pageSizes` (Vue/React `:page-sizes="[10, 20, 50]"`, Blazor
`PageSizes="…"`) and the footer grows a rows-per-page control between the range and the pager.
Omit it for none — unchanged default. Picking a size keeps the reader on the row they were looking
at rather than dropping them on page 1.

- **server mode** — reported through `update:page` / `onPageChange` / `PageChanged`, the same event
  as a page click, carrying the new `size`. Read `size` to tell the two apart.
- **client mode** — the table applies it itself, so the control works with nothing wired, and also
  emits `update:pageSize` / `onPageSizeChange` / `PageSizeChanged` for a caller that wants to
  persist the choice. Changing the `pageSize` prop wins back.

A footer with a size control stays visible on a single page — otherwise picking "100" on a
ninety-row list would remove the only way back to twenty.

**Typed wrapper: `<FdyTableFooter>`** — the footer alone (`page` in, `update:page` /
`onPageChange` / `PageChanged` out), for the one shape that cannot use the table's own: a
**responsive** list, where a `.fdy-datatable` at `lg` and a `.fdy-list` below it are two renderings
of one page of rows. A footer inside the table is inside the half a phone hides, so those screens
render it once, outside both, with `pager={false}` on the table.

**Who draws the pager.** The table renders its own footer (range + pager) whenever there is more
than one page. Two ways to take it over:

- **client mode** — pass `pageIndex` (with `pageSize`, without `page`) and drive it yourself;
- **either mode** — pass `pager={false}` (Vue `:pager="false"`, Blazor `Pager="false"`) and render
  your own control. In server mode this is the only way: the app already owns the page there, and
  was still being handed a second control. The typical shape is a responsive list — a table at `lg`,
  `.fdy-list` below it — where one pager has to serve both views so they cannot disagree.

Do not hide the footer with CSS. `display:none` works, but it reaches into a component's internals
and breaks the moment the class changes.

## Pagination — `.fdy-pagination`
The block class on the `<nav>` is a **structural hook only** — it carries no rule of its own; the
`__list` / `__link` / `__ellipsis` elements do all the styling, and the data table targets
`data-fdy-table-pagination`. Keep it on the wrapper anyway, for consistency with the rest of the kit.

`<nav class="fdy-pagination" aria-label="Pagination">` → `<ul class="fdy-pagination__list">`;
each item is a `.fdy-pagination__link` (`<button>` when navigable, `<span aria-current="page">`
for the current page, `<span aria-disabled="true">` for a dead arrow) and
`.fdy-pagination__ellipsis` for the gap.

## States — `.fdy-state`
Empty / error placeholder for a data area. `--danger` for failures. Parts: `__icon`
(`aria-hidden="true"`) `__title` `__text` `__actions`. Put it inside the card or table area it
replaces.

## Charts — `data-fdy-chart`
> **Typed wrapper: `<FdyChart>`** — data props in all three (`type` + `values` / `series`); it repaints on data change, so `FreedayChart.update(el)` is only for the raw path below.

Pure SVG/CSS, no dependency, re-colours with the theme. Needs `freeday-chart.js`; call
`FreedayChart.update(el)` after changing data (or use `FdyChart` in Vue/React/Blazor).

- Types: `sparkline` `bar` `line` `area` `donut`
- Roots: `.fdy-sparkline` · `.fdy-bars` · `.fdy-donut` · `.fdy-chart-xy` (built for line/area/bar)
- Data: `data-values="1,2,3"` (single series) or `data-series='[{"label":"A","values":[…]}]'`
  (multi), `data-labels="Jan,Feb"`, `data-fdy-stacked`, `data-fdy-center` (donut)
- Colour: `data-fdy-color="primary"` or `data-fdy-colors="success,warning,danger"` — semantic token
  names **or** `chart-1`…`chart-8` slots to pin a category's colour. Multi-series defaults to the
  validated categorical palette `--chart-1`…`--chart-8`.
- Format: `data-fdy-format="number|percent|currency"`; legend `data-fdy-legend` (`none` to drop);
  axes `data-fdy-axes`
- A11y: every chart is `role="img"` + `aria-label`, with a `<table>` fallback inside the element.
- Internal parts (set by JS, useful for overrides): `.fdy-chart__legend` (+`--row`) `__swatch`
  `__tip`; `.fdy-bars__col` `__bar` `__track` `__label` `__val`; `.fdy-chart-xy__plot` `__grid`
  `__tick` `__xlabel` `__line` `__area` `__bar` `__dot` `__band`; `.fdy-donut__ring` `__seg`
  `__center` `__hit`; `.fdy-sparkline__line` `__area` `__dot`.

## Tree view — `.fdy-tree`
Native `<details>` hierarchy — zero JS for expand/collapse. `.fdy-tree__branch` on `<details>`,
`.fdy-tree__leaf` on a leaf `<li>`, plus `__chevron` and `__icon` svgs inside `<summary>`.
`.fdy-tree--checkbox` + `data-fdy-tree` (needs `freeday-tree.js`) adds cascading selection:
`.fdy-tree__check` on each `<input class="fdy-checkbox">`; checking a branch checks its children,
a partial set makes the branch indeterminate. Checking never toggles expansion.

## List (flat rows) — `.fdy-list`
The **flat** row container: one bordered surface, hairline dividers, **no shadow**. This is what a
responsive `.fdy-datatable` should become below `md` — not a stack of `.fdy-card`s, which carries
`--shadow-lift` and turns ten rows into ten floating objects.

- `.fdy-list` on a `<ul>`/`<ol>` (list-style is reset for you) or a `<div>`
- `.fdy-list__row` — one row; `--interactive` for hover feedback, `--button` when the row **is** the
  control (render it as a real `<button>`/`<a>`; the UA box is reset without losing the list surface)
- Row internals: `.fdy-list__main` (truncating stack) → `.fdy-list__title` + `.fdy-list__meta`, and
  `.fdy-list__aside` pinned right
- **Disabled** — `disabled` on the `<button>` (or `aria-disabled="true"` when the row is an `<a>`/
  `<div>`) dims the row and withdraws the hover tint and the pointer cursor, same as every other
  control in the kit. Do not hand-roll it: an undimmed row that still lights up under the pointer
  reads as clickable while it is refusing input.
- Not `.fdy-list-reset` — that utility only strips UA bullets/indent from a semantic list.

```html
<ul class="fdy-list">
  <li>
    <button type="button" class="fdy-list__row fdy-list__row--button">
      <span class="fdy-list__main">
        <span class="fdy-list__title">Northwind Trading</span>
        <span class="fdy-list__meta">INV-2042 · due 12 Jul <span class="fdy-badge fdy-badge--warning">Overdue</span></span>
      </span>
      <span class="fdy-list__aside fdy-mono">290,000</span>
    </button>
  </li>
</ul>
```

## Description list — `.fdy-dl`
Key–value detail view: `<dl class="fdy-dl">` with `<dt>`/`<dd>` pairs. `--rows` for a row-per-pair
layout.

---

# Feedback

## Alert — `.fdy-alert`
Inline message. Modifiers `--info` `--success` `--warning` `--danger`. Parts `__icon` `__body`
`__title` `__text` `__close`. The danger variant takes `role="alert"`.

```html
<div class="fdy-alert fdy-alert--danger" role="alert">
  <div class="fdy-alert__body">
    <span class="fdy-alert__title">Failed</span>
    <span class="fdy-alert__text">Connection to the server was lost.</span>
  </div>
  <button class="fdy-alert__close" type="button" aria-label="Dismiss">&times;</button>
</div>
```

## Toast — `Freeday.toast()`
Transient notification in a live region. Imperative only:

```js
const node = Freeday.toast({ variant: 'success', title: 'Saved', message: 'INV-1042 saved.' })
Freeday.toast({ variant: 'danger', title: 'Failed', message: '…', key: 'net-fail' }) // same key replaces
Freeday.dismiss('net-fail')  // or Freeday.dismiss(node)
```
Every field is optional; it returns the toast element. Classes (rendered for you):
`.fdy-toast-region`, `.fdy-toast` (+`--info` `--success` `--warning` `--danger`) · `__accent`
`__body` `__title` `__text` `__close`.

## Tooltip — `.fdy-tooltip`
Hover/focus only, never the sole carrier of information. Wrap in `.fdy-tooltip-wrap`; the trigger
gets `aria-describedby` → the `.fdy-tooltip[role="tooltip"]` `id`.

## Progress & spinner
`.fdy-progress` + `.fdy-progress__bar` (set `style="width:N%"`); `--indeterminate` for unknown
duration. `role="progressbar"` with `aria-valuenow/min/max` (omit `valuenow` when indeterminate).
`.fdy-spinner` (+`--sm` `--lg`) with `role="status"` + `aria-label`.

## Skeleton — `.fdy-skeleton`
Size-matched placeholders so nothing shifts when data lands: `--title` `--text` `--circle`
`--avatar` (+`--avatar-sm` `--avatar-lg`, exactly `.fdy-avatar`'s box).

---

# Navigation

## Nav (menu) — `.fdy-nav`
Navigation links — **vertical by default** (the app shell sidebar), horizontal with `--horizontal`. Items are `<a class="fdy-nav__item">` with
`__icon` / `__label` / `__badge`; the current one gets `aria-current="page"`.
`--flat` drops the surface. Nested groups are native `<details>`:

- `.fdy-nav__tree` + `<summary class="fdy-nav__item">` + `.fdy-nav__caret` → children in
  `.fdy-nav__sub`
- `.fdy-nav__group` + `<summary class="fdy-nav__grouplabel">` → a collapsible section
- **`--horizontal`** lays the same links out as a row, for a **top-nav application** (primary
  navigation in `.fdy-appbar` or `.fdy-app__topbar`, no sidebar). Same item, same states, same
  `aria-current="page"`; the row scrolls if it runs out of width. On `.fdy-appbar--primary` the
  links go on-colour automatically.

```html
<header class="fdy-appbar">
  <a class="fdy-appbar__brand" href="/">Acme</a>
  <nav class="fdy-nav fdy-nav--horizontal" aria-label="Main">
    <a class="fdy-nav__item" href="/invoices" aria-current="page">Invoices</a>
    <a class="fdy-nav__item" href="/customers">Customers</a>
  </nav>
  <span class="fdy-appbar__spacer"></span>
  <div class="fdy-appbar__actions"><!-- buttons --></div>
</header>
```

> **Which one for navigation?** A nav link is a link marked `aria-current="page"` — never
> `aria-selected` (invalid ARIA on an anchor) and never `role="tab"`. Use `.fdy-nav--horizontal`
> for an application's **primary** navigation. For **routed sub-navigation** that should look like
> tabs (`/settings/profile` · `/settings/billing`), put `.fdy-tabs__list` / `.fdy-tabs__tab` on
> plain `<a>`s — those classes honour `aria-current="page"` too — and do **not** add the tab roles
> or `freeday-tabs.js`, which promise a keyboard contract routes do not have.

## App bar — `.fdy-appbar`
Standalone top bar (distinct from the shell's `.fdy-app__topbar`). Modifiers `--sticky`
`--elevated` `--dense` `--primary` (on-colour controls). Parts `__brand` `__spacer` `__actions`.
It ships **no link class of its own** — put `<nav class="fdy-nav fdy-nav--horizontal">` in it
for primary navigation (see Nav above).

## Breadcrumb — `.fdy-breadcrumb`
`<nav class="fdy-breadcrumb" aria-label="Breadcrumb">` → `<ol class="fdy-breadcrumb__list">` with
`.fdy-breadcrumb__item` (last one `aria-current="page"`, no link), `.fdy-breadcrumb__link`, and
`.fdy-breadcrumb__sep` marked `aria-hidden="true"`.

## Tabs — `.fdy-tabs`
APG tabs: ←/→, Home/End, roving tabindex. Needs `freeday-tabs.js`.
`.fdy-tabs__tab` marks its active state from **`aria-selected="true"` or `aria-current="page"`**,
so the same look serves routed sub-navigation built from plain links — see the note under Nav.

```html
<div class="fdy-tabs" data-fdy-tabs>
  <div class="fdy-tabs__list" role="tablist" aria-label="Invoice detail">
    <button class="fdy-tabs__tab" role="tab" id="t-1" aria-controls="p-1" aria-selected="true">Summary</button>
    <button class="fdy-tabs__tab" role="tab" id="t-2" aria-controls="p-2" aria-selected="false" tabindex="-1">Items</button>
  </div>
  <div class="fdy-tabs__panel" role="tabpanel" id="p-1" aria-labelledby="t-1" tabindex="0">…</div>
  <div class="fdy-tabs__panel" role="tabpanel" id="p-2" aria-labelledby="t-2" tabindex="0" hidden>…</div>
</div>
```

---

# Overlays

## Modal — `.fdy-modal`
> **Typed wrapper: `<FdyModal>`** — Vue (`:open` + `@close`) · React (`open` + `onClose`) · Blazor (`@bind-Open`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Native `<dialog>`: focus trap, Esc and backdrop come from the browser. Sizes `--sm` `--md` `--lg`
`--wide`; `--cfl` for the choose-from-list dialog. Parts `__header` `__title` `__body` `__footer`
`__close`. The body scrolls; the footer never clips. `aria-labelledby` → the title's `id`;
`data-close` on any button that should close it.

## Drawer — `.fdy-drawer`
> **Typed wrapper: `<FdyDrawer>`** — Vue (`:open` + `@close`) · React (`open` + `onClose`) · Blazor (`@bind-Open`). In those stacks use the wrapper; the markup below is for stacks without an adapter (and is what the wrapper renders).

Temporary side panel on native `<dialog>` — left by default, `--right` to flip. Parts `__header`
`__title` `__body` `__footer` `__close`. Open it from any
`<button data-fdy-drawer="<dialog id>">`. Needs `freeday-drawer.js`.

## Accordion — `.fdy-accordion`
Native `<details>`, zero JS: `.fdy-accordion__item` on each `<details>`, content in
`.fdy-accordion__panel`, the trigger is the `<summary>`.

## Carousel — `.fdy-carousel`
Scroll-snap slides + arrows + dots; optional `data-fdy-autoplay` (pauses on hover/focus). Needs
`freeday-carousel.js`. Parts `__viewport` `__slide` `__arrow` (+`--prev` `--next`) `__dot` `__dots`.
Root is `role="region" aria-roledescription="carousel"` + `aria-label` + `tabindex="0"`; each slide
is `role="group" aria-roledescription="slide"`.

---

# Display

## Card — `.fdy-card`
Parts `__body` `__title` `__desc` `__footer`. Modifiers:

- `--elevated` — raise it (use sparingly; most surfaces are flat)
- `--interactive` — cursor + hover-lift for a card that *has* a click handler. **Presentational
  only:** it is the one affordance in the kit whose correctness lives outside it — the CSS cannot
  know whether a handler exists, so the modifier without a control (a card that looks clickable and
  swallows every click) and a control without the modifier both fail silently. Pair it with a real
  control — normally the stretched target below.
- `--button` — for a card that **is** the control: render it as `<button>` and add this to reset
  the UA button box **without** losing the card surface/border
- `.fdy-card--button` never replaces keyboard semantics — a clickable card must be a real
  `<button>` or `<a>`.
- **Disabled** — `disabled` (or `aria-disabled="true"`) dims the card and withdraws the pointer
  cursor and the `--interactive` hover-lift.
- The card is `position:relative`, so a badge or ribbon you absolutely position inside it anchors
  to the card. That is also what keeps hidden labels inside it from escaping — see *Containment*.

### One card, one primary action, one escape hatch

A card with **two** actions cannot be `--button`: interactive content nested in a `<button>` is
invalid HTML. Give the primary control `.fdy-btn--stretch` — its hit area covers the whole card,
while it stays a real `<button>`/`<a>` with real keyboard semantics.

```html
<article class="fdy-card fdy-card--interactive">
  <div class="fdy-card__body">
    <h3 class="fdy-card__title">Workspace Alpha</h3>
    <p class="fdy-card__desc">12 members · 4 boards</p>
  </div>
  <div class="fdy-card__footer">
    <button class="fdy-btn fdy-btn--text" type="button">Details</button>   <!-- escape hatch -->
    <button class="fdy-btn fdy-btn--stretch" type="button">Open workspace Alpha</button>
  </div>
</article>
```

- **The escape hatch needs nothing.** Every focusable element in a card that holds a stretched
  target is raised above the overlay automatically — forgetting a `z-index` here fails silently, and
  a silent failure is what this pattern exists to remove. The `position` that raising needs is only a
  **default** (zero-specificity), so a control you pin yourself — a corner dismiss, a favourite star —
  keeps its own `position:absolute` and is raised anyway.
- **Name the stretched button for what the whole card does** ("Open workspace Alpha", not "Open").
  Its label is the accessible name of the entire hit area.
- **Do not add `.fdy-btn--stretch` to more than one control per card** — the last one wins the
  overlap, and which one that is depends on source order.
- Text under the overlay is no longer selectable; that is the cost of the pattern, not a bug.
- **Cards and list rows.** The overlay anchors to the nearest *positioned* ancestor, and both hosts
  supply one: `.fdy-card` always, `.fdy-list__row` when it contains a stretched target. Everything
  above applies to a row unchanged — same markup, same automatic raise. In any *other* container,
  make the element `position:relative` yourself, or the overlay resolves against whatever is
  positioned further up (in a list that used to be `.fdy-list` itself, so every row's target covered
  the whole list and the last one in the DOM won — a click on row one opened row two).
  A row whose *whole* surface is one control is still better as `.fdy-list__row--button`.
- `.fdy-btn` nudges itself on `:hover`/`:active`, and a transformed element becomes the containing
  block for its own absolutely positioned descendants — so a hand-rolled `::after{inset:0}` overlay
  **re-anchors to the button mid-gesture** and the click never lands. `--stretch` neutralises those
  transforms and moves the press feedback to the card. This is why the pattern is shipped rather
  than documented.

## Badge — `.fdy-badge`
Inline status pill: `--success` `--warning` `--danger` `--info` `--outline`. Never colour-only —
the text carries the meaning.

**Notification badge is the overlay variant**, not a separate component: wrap anything in
`.fdy-badge-wrap` and add `.fdy-badge-ov` (`--primary` `--danger` `--accent` `--info` `--success`
`--warning`, `--dot` for a bare dot, `--top-left` / `--bottom-right` / `--bottom-left` to move it).
Put the count in the wrapper's `aria-label` and mark the overlay `aria-hidden="true"`.

## Avatar — `.fdy-avatar`
Initials or image. Sizes `--sm` / default / `--lg`; `.fdy-avatar-group` stacks them (label the
group). `--tone-1`…`--tone-8` are decorative tints (WCAG AA in both themes) to distinguish
same-initial avatars — hash the index off the **full** name, not the initials.

Sizes: `--xs` 1.5rem · *(base)* 2.5rem · `--sm` 2rem · `--lg` 3.5rem. Use **`--xs` inside a control**
— `.fdy-btn--sm` is itself 2rem tall, so an `--sm` avatar fills a small button edge to edge and the
ghost border cuts across the circle.

## Chip — `.fdy-chip`
Three roles inside a `.fdy-chips` row:

- **static / removable** — `<span class="fdy-chip">`, `--primary` for an active filter, with
  `.fdy-chip__remove` (`aria-label` says what it removes)
- **choice** — `<button class="fdy-chip fdy-chip--choice" aria-pressed>` toggle
- **filter** — `--filter`, same but with a `.fdy-chip__check` mark

Interactive chips are managed by `freeday-chip.js`: wrap the row in `data-fdy-chips` (+
`data-single` for pick-one, `data-label` for the group name), give each `data-value`.
`--tone-1`…`--tone-8` for non-semantic category colours.

## Timeline — `.fdy-timeline`
Vertical event feed, pure CSS. `<ol class="fdy-timeline">` of `.fdy-timeline__item` (`--muted`
`--success` `--warning` `--danger`) with `__marker` `__time` `__title` `__text`. Status is carried
by the accompanying text, not the marker colour alone.

---

*Anything not listed here is not part of the public surface. If a screen needs a primitive that
isn't in this file, it probably belongs in the kit — open an issue instead of re-inventing it
locally.*
