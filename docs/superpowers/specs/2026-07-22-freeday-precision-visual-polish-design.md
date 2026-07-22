# Freeday v1.1 — "Precision" Visual Polish — Design Spec

**Status:** approved (brainstorming) · **Date:** 2026-07-22 · **Target release:** `v1.1.0`
**Depends on:** [2026-07-21-freeday-ui-kit-design.md](2026-07-21-freeday-ui-kit-design.md) (canonical token/architecture source-of-truth)

## 1. Goal & scope

Sharpen Freeday's visual point-of-view from "calm/soft, floating in near-white" to
**"Precision"** — an engineered, crisp, confident look that still suits data-dense
business/ERP screens. This is a **token-first polish**, not a component rewrite and not a
rebrand. The Azure + Teal identity stays; only the *character* changes.

Because Freeday is token-driven, ~80% of the change lives in the token layer (Tier 1→2)
and cascades to all 44 components; the rest is cross-component state consistency in
component CSS (Tier 3). No new components. No renamed classes/tokens/JS API — this is a
**visually-only, non-breaking** change so consumers pinned to `v1.0.0` upgrade at will.

## 2. Design POV: "Precision"

- **Structure comes from geometry + borders + type hierarchy**, not soft shadow.
- **Elevation is rationed** — a resting surface is defined by a 1px border and
  value-contrast between `surface`/`surface-2`/`surface-3`; only genuinely floating
  surfaces (menu, dropdown, modal, toast, drawer, popover) get real elevation.
- **Teal stops being decorative** and becomes a *functional accent* marking
  active/selected/important.
- **Type hierarchy from weight + tracking**, not from an editorial size explosion.
- Motion is **snappy, no bounce** for controls; spring is reserved for overlay entry.

## 3. Token changes (Tier 1→2) — the engine

### 3.1 Radius — crisper
| token | from | to |
|---|---|---|
| `radius.xs` | 4px | **3px** |
| `radius.sm` | 6px | **4px** |
| `radius.md` | 8px | **6px** (workhorse) |
| `radius.lg` | 12px | **10px** |
| `radius.xl` | 16px | **14px** |
| `radius.full` | 999px | 999px (keep — pills/avatars) |

### 3.2 Elevation — flat body, confident overlays
Keep resting shadows minimal; make overlay shadows crisper and more present (tighter
blur, negative spread for a defined edge, higher alpha). Exact light-mode values (dark
`$dark` variants scale proportionally, staying ≥ current dark values):

| token | role | from | to |
|---|---|---|---|
| `shadow.1` | resting/subtle | `0 1px 2px /.06` | **keep** |
| `shadow.2` | resting card | `0 2px 6px /.07, 0 1px 2px /.05` | **keep** |
| `shadow.3` | menu/dropdown/popover | `0 8px 24px /.10, 0 2px 6px /.06` | **`0 4px 16px -2px /.14, 0 1px 3px /.10`** |
| `shadow.4` | modal | `0 20px 48px /.16, 0 4px 12px /.08` | **`0 24px 48px -12px /.26, 0 2px 8px /.10`** |
| `shadow.lift` / `lift-hover` | card lift interaction | current | keep (already characterful) |

Rule to encode in component CSS: **resting = border + value contrast; floating =
elevation.** Do not stack a heavy shadow on a bordered resting surface.

### 3.3 Typography — hierarchy via weight + tracking
- Add primitive `tracking.tighter = -0.03em`.
- Headings (display / `2xl`+): font **Sora**, weight **700**, tracking **tighter**,
  leading **snug** (`1.35`).
- Body stays **IBM Plex Sans**, regular/medium, `tracking.normal`, `leading.normal`.
- **Size scale (`text.*`) is unchanged** — Precision is not editorial; the size ramp
  stays as-is to protect data density.

### 3.4 Borders & surfaces — structure
- No ramp value changes. `border` (slate-200), `border-strong` (slate-300),
  `border-muted`, `control-border` (slate-500) all **kept**.
- Change is **usage discipline** (§5): containers/cards get a consistent, visible 1px
  border; depth is expressed by `surface`/`surface-2`/`surface-3` value steps rather
  than shadow. This is component-CSS work, not a token value change.

### 3.5 Motion — snappy
| token | from | to |
|---|---|---|
| `dur.fast` | 120ms | 120ms (keep) |
| `dur.base` | 200ms | **180ms** |
| `dur.slow` | 320ms | **280ms** |
| `ease.standard` | `cubic-bezier(.2,0,0,1)` | keep — controls |
| `ease.spring` | `cubic-bezier(.2,.8,.2,1)` | keep — **overlay entry only** |

### 3.6 What does NOT change (identity + a11y shields)
- All color ramps (azure/slate/teal/red/amber/green/blue) and every `color.*` semantic
  mapping (primary/accent/surface/text/danger…).
- `control-border` = slate-500, `focus-ring` = azure-600/400, `focus-ring-width` = 2px.
- `space.*` 4px scale, `control.h`, `bw`.

## 4. Teal as functional accent — usage rules

Teal (`--color-accent` and ramp) appears **only** at:
- active/current nav item (App shell `.fdy-nav`);
- selected option/row (combo, cascade, table row selection, autocomplete active option);
- active tab indicator (`.fdy-tabs`);
- data/secondary emphasis + focus-secondary highlights;
- (optional, decide during build) link color.

Teal is **not** used as a decorative fill, gradient, or background wash. When in doubt,
primary (azure) leads; teal marks state.

## 5. Cross-component refinements (Tier-3 / component CSS)

Token-only cannot normalize interaction states; do this per component using **only
Tier-2/3 tokens** (no raw hex/px):
- **Unified states** — consistent `hover` / `active` / `disabled` treatment across all
  interactive components (button, input, combo, cascade, chip, menu, tabs, table rows,
  pagination, selection controls).
- **Button** — crisp resting border/fill, decisive pressed state, no soft float.
- **Inputs/controls** — crisper border, clear 2px focus ring + offset, consistent height
  from `control.h`.
- **Table** — denser default rows, stronger sticky header separation, teal selection
  accent, numbers right-aligned (existing convention preserved).
- **Selected/active = teal**, applied consistently everywhere the pattern occurs.

## 6. Guardrails (non-negotiable)

1. Component CSS touches **Tier-2/3 tokens only** — zero raw hex/px (architecture rule).
2. **WCAG AA** maintained in light + dark. `test/contrast.test.mjs` **must stay green**
   — it is the gate for any color-touching change. Any new/changed color pairing must be
   added to the audit graph if applicable.
3. `prefers-reduced-motion` honored (no new always-on motion).
4. **No API/class/token renames** — `fdy-` prefix, `--color-*`/`--space-*`/etc., JS
   `window.Freeday*` all stable. Visually-only ⇒ non-breaking for consumers.
5. `dist/` stays committed & deterministic (rebuild = no diff).

## 7. Verification & delivery

Per iteration (grouped, not per-file):
1. Edit `tokens/tokens.json` and/or `src/components/*.css`.
2. `node tokens/build.mjs` → rebuild `dist/`.
3. **Screenshot the real docs (`docs/index.html`) in light AND dark** — the actual
   components are the canvas, not throwaway mockups. Compare before/after.
4. Impeccable audit pass (anti-slop bans + contrast) on the changed surfaces.
5. `npm test` (contrast) **green**.
6. Commit per coherent batch; when the pass is complete, cut **`v1.1.0`** (CHANGELOG
   entry + tag). Consumer bumps its pin (`#v1.0.0` → `#v1.1.0`) when ready.

## 8. Out of scope

- New components (data-grid virtualization, filter-bar, master-detail) — still YAGNI.
- Palette rebrand or new brand hues.
- Editorial size explosion (typography stays at current size ramp).
- Full "Dimension" depth treatment — only overlay elevation (§3.2) is borrowed.
- Any class/token/JS-API rename.
