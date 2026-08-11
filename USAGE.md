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

## 2. Spacing rhythm — three gaps, always from the scale

Never a loose value; always `var(--space-N)` (a 4px scale). Three rhythms carry most layouts, and the
composition primitives apply them for you:

- **Between page sections:** `--space-8` — `.fdy-page` sets this gap between its children.
- **Within a group** (heading ↔ its body, cards in a list): `--space-4` — `.fdy-page-section` sets it.
- **Inside a control/card** (label ↔ input, icon ↔ text): `--space-2` / `--space-3`.

Reserve `--space-1` for hairline pairs and `--space-10`+ for deliberate breathing room (a hero, an
empty state). Don't scatter `--space-6` everywhere — a page with one gap value has no rhythm.

## 3. Elevation — most surfaces are flat

Shadow is a signal, not decoration. Spend it sparingly:

- **Flat** (no shadow, border only, or nothing): the default. Page sections, list rows, the app shell.
- **`--shadow-1`:** a card that is a distinct object you could pick up — a workspace tile, a panel.
- **`--shadow-2`/`3`:** something that *floats over* the page — a popover, menu, or dropdown.
- **`--shadow-4`:** a modal / drawer overlay only.

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

## 6. Density — `compact` for data-dense screens

`data-density="compact"` on `<html>` tightens control height **and** the mid-range spacing scale
(`--space-3`…`--space-6` step down a notch), so cards, toolbars and tables get denser. Use it on
table-heavy back-office screens; leave `comfortable` (the default) for forms and marketing-adjacent
pages. Set it once at the app root, not per component.

## 7. Assemble the page from the frame down

1. **Shell:** every application starts inside **`.fdy-app`** (`__topbar`, `__sidebar`, `__main`,
   `__content`, `__navtoggle`, `__backdrop`). Don't hand-roll a shell from flexbox — the toggle and
   backdrop plumbing are already there. See `docs/getting-started.md`.
2. **Page:** wrap the screen body in **`.fdy-page`** (vertical section rhythm), opening with a
   **`.fdy-page__header`** (eyebrow + `.fdy-title-page` + `.fdy-page__desc` on the left, the one
   primary action on the right).
3. **Sections:** each region is a **`.fdy-page-section`** (a `.fdy-title-section` + optional
   `.fdy-toolbar`, then its body).
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
