# Freeday — Back-office adoption parity (Design Spec)

- **Status:** Approved 2026-08-26 — every open question in §6 answered by the owner. Item 2 (row
  selection) is **implemented**; the rest is ready for implementation in the §3 order.
- **Date:** 2026-08-26
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 2.2.0
- **Scope:** tokens, components, enhancers and all four adapters. This is the largest single scope
  the kit has taken; §8 argues it is a **major** version, not a minor one.
- **Motivation:** improvement note `#049`. A back-office application of ~62 document modules
  evaluated the kit as a replacement for its current component library. Eight gaps block that
  adoption. This spec closes them.

---

## 1. Problem

The kit is feature-complete against its own roadmap: 11/11 typed components at parity across four
stacks. That completeness was measured against the kit's own inventory, never against a large
consuming application. Note `#049` is the first such measurement, and it found eight things a
document-heavy back office cannot ship without.

Three of the eight are ordinary component gaps. Five are **axes the kit deliberately does not
have** — and two of those are documented as if they exist.

### 1.1 Two claims in the docs that the code does not support

Verified 2026-08-26 by grep over `src/`, `dist/freeday.tokens.css`, `tokens/tokens.json` and
`COMPONENTS.md`:

| Claim | Where it is written | Reality |
|---|---|---|
| `data-style="soft"` is the default style axis | `CLAUDE.md` §Theming, spec `2026-07-21` §6 (marked ⏳ roadmap) | **No `data-style` selector exists anywhere.** The kit has no style axis at all; `soft` describes how it looks, it is not a value anything reads. |
| `--blur` / `--sat` / `--inset` are reserved no-op knobs so a future style preset "can land without changing components" | spec `2026-07-21` §6 | **None of the three tokens exist.** The groundwork for a second style is zero, not partial. |

This matters for estimation, and it is the same failure `NEXT-UP.md` already records about itself:
*"NEXT-UP sendiri bisa basi… verifikasi ulang klaim sebuah item sebelum menjadikannya alasan
bekerja."* Item 4 below is priced as new work, not as finishing something half-built.

### 1.2 The eight items

| # | Item | Kind | Blocks |
|---|---|---|---|
| 1 | Editable table cell | component | document detail grids — the core screen of the app |
| 2 | Controlled row selection in the typed adapters | adapter parity | every list screen with bulk actions |
| 3 | Primary palette axis, 18 options | tokens | user-level theming already shipped in that app |
| 4 | `data-style` axis, two styles | tokens + every component | ditto |
| 5 | Desktop overlay nav mode in `.fdy-app` | shell | ditto |
| 6 | `.fdy-table--striped` | component | ditto |
| 7 | `.fdy-busy` blocking overlay | component | every form that posts to a slow backend |
| 8 | Stepper `is-invalid` + guarded next | component | multi-step document forms |

Items 3–6 exist because the consuming app already ships a user-facing personalisation surface with
20 preferences. Adoption is not allowed to take features away from its users, so each preference
either maps onto a kit axis or the kit grows one. Seven of the twenty map today; four change shape;
four wait on item 7; **five have no kit equivalent**, and the owner has decided none of the five may
be dropped.

---

## 2. Decisions

### D1 — The style axis absorbs the frosted-glass effect. **Approved 2026-08-26.**

The consuming app has two separate mechanisms: a *style preset* (three named component-shape
philosophies) and a *glass toggle* (a body class that frosts a handful of surfaces). The owner has
asked for two styles instead of three, under names that do not collide with the other library's,
and for the glass toggle to survive.

**Decision: these are one axis, not two.**

```
data-style="soft"     the current look — flat, soft shadow, medium radius (default)
data-style="glass"    frosted surfaces, raised saturation, hairline inset borders
```

Rationale: an orthogonal `style × glass` matrix is four combinations, of which two ("glass style
with glass off", "soft style with glass on") have no coherent visual definition and would have to be
invented and then contrast-tested. One axis of two values is two combinations, both meaningful, and
it satisfies both requests exactly.

The rejected alternative, recorded so it is not relitigated: two independent axes would be four
combinations, not double the work but **four times**, because every AA verification in D3 runs per
combination — and two of the four ("glass style with glass off", "soft style with glass on") have no
coherent visual definition to verify against in the first place.

**Naming:** `soft` is already the name in `CLAUDE.md` and carries no external association. `glass`
describes the effect rather than borrowing a brand. Neither name appears in any other UI library's
preset vocabulary.

### D2 — `data-style` follows the theming selector doctrine exactly

Same rules as `data-theme` and `data-density`, and for the same reason:

- The selector is **bare** (`[data-style="glass"]`), never `:root[data-style]`, so a region can opt
  in without the root doing so.
- `[data-style="soft"]` is a **real rule**, not an absence, so a region can opt back *out* of a
  glass root. `data-density` learned this the hard way (see the comment in `dist/freeday.tokens.css`
  around the `comfortable` block); the style axis does not get to relearn it.
- It redefines **Tier-2 semantic tokens only**. No component stylesheet may gain a
  `[data-style]` selector of its own. If a component cannot be restyled through tokens, the missing
  token is the bug, not the component.

This last rule is what keeps item 4 from touching 48 stylesheets. It also means the three knobs the
old spec promised must actually be created now: `--surface-blur`, `--surface-saturate`,
`--surface-inset`, no-op under `soft`.

### D3 — 18 primary palettes, authored as Tier-1 ramps, gated on contrast. **Decided 2026-08-26.**

The owner has chosen to keep the full set rather than curate a subset, and to **keep `noir`**.
Priced honestly:

- The set is **17 hues + `noir`** = 18 options.
- Existing Tier-1 ramps: 7 (`azure`, `sky`, `slate`, `red`, `green`, `amber`, `blue`).
- Four of the requested hues (`green`, `amber`, `sky`, `blue`) overlap by **name** with existing
  ramps, but nothing says the values match. Whether to reuse them is a visual decision, not a
  bookkeeping one, so budget **12–16 new ramps** at 11 shades (50–950) = **132–176 primitive
  values**, and settle the four by diff before authoring.
- **`noir` is not a hue.** It derives from the surface ramp, so it is a **Tier-2 remap**, not a
  Tier-1 ramp, and needs its own short specification: which semantic tokens re-point at surface
  shades, and what `--color-on-primary` becomes when primary is a neutral. It is the one option
  whose contrast behaviour differs in kind from the other 17.
- Verification: **36 passes** (18 options × light/dark) across the 150 semantic tokens, every one
  required to hold WCAG AA. This is a hard gate in `CLAUDE.md`, not a preference.

**The switch itself is cheap; the authoring is not.** Runtime palette switching is one assignment to
`--color-primary` and its derived semantic tokens, because Tier-2 is already indirection. Budget the
work in ramps and contrast passes, never in "adding a dropdown".

**Surface palettes are explicitly out of scope.** The consuming app offers 8 and their stored
default is "none", meaning a user who never opened the settings screen has none. Reintroducing a
surface axis multiplies D3 by 8 and was not requested.

### D4 — Editable cell is a table *mode*, not a new component

The requirement is inline editing of document detail lines: tab across cells, edit in place, commit
or revert per row.

- Raw path: `data-fdy-cell-edit` on the `<td>`, `.fdy-table__cell--editing`, and the enhancer swaps
  in the field the cell declares (`data-fdy-cell-type="text|number|combo|cfl|date"`) reusing the
  existing field components rather than inventing cell-local ones.
- Commit contract: **Enter commits, Escape reverts, blur commits, and a rejected commit keeps focus
  in the cell.** The last clause is the one hand-rolled grids get wrong.
- Typed path: `FdyTableColumn<T>` gains `editable?: boolean` and the table gains
  `onCellCommit?: (row, key, value) => boolean | Promise<boolean>` — returning `false` refuses the
  edit and leaves the cell open.

**No parity exception. Decided 2026-08-26:** editable cell ships to **all four stacks at once**. The
staged alternative (vanilla + Vue first) was put to the owner and **rejected** — the kit's public
claim is full parity across four stacks, and a feature that lands in two of them makes that claim
false for however long the gap lasts.

**This makes `NEXT-UP.md` #2 a prerequisite, not a backlog item.** Cell editing reconciles two-way
binding against a JS-driven DOM swap, and `HANDOFF.md` records that only Blazor **WASM** is
verified; Server and prerender have different JS-interop timing (no JS during prerender,
`<dialog>` show/close ordering). #2 was written as "do it when a project uses Server/Auto render
mode", i.e. it had no trigger of its own. It now has one: **item 1 cannot start until Blazor Server
+ prerender is verified**, which means someone must stand up a Server-rendered harness rather than
wait for a project to supply it. Budget that before item 1, not during it.

**Update 2026-08-26: the harness is built, and it found a blocker.** `test/blazor-server/` is a real
Blazor Server host (not a bUnit double) driven by the CDP harness. Three of its four checks pass —
prerender emits full markup with no hydration marker, the enhancers hydrate once the circuit
connects, and a `<dialog>` opened from .NET really opens. The fourth does not: on a **real** mouse
click `FdyCombo` opens and then closes itself, because Blazor detaches the focused node under the
enhancer (`relatedTarget=null`, focus falls to `BODY`) and the enhancer's own `focusout` handler
shuts what it had just opened. A synthetic `.click()` works and `setValue()` commits, so neither the
markup nor the enhancer is at fault — **DOM co-ownership under Server is**. Item 1 stays blocked, and
the owner's decision to require this verification is what stopped a broken editable grid shipping to
Blazor consumers.

### D5 — The shell grows a desktop overlay mode

`.fdy-app` today expresses one idea, "is the nav visible?", and maps it to `--nav-collapsed` above
the nav breakpoint and `--nav-open` below it. The requirement adds a third arrangement: on a wide
screen, a nav that is visible but **floating over** the content rather than displacing it.

- New modifier `--nav-overlay`, meaningful only at ≥ `breakpoints.nav`.
- It reuses the existing off-canvas machinery — backdrop, Escape, close-on-follow, focus return,
  `inert` on `__content` — because those are already correct and already guarded. What changes is
  the layout rule, not the behaviour.
- `FdyAppShell` gains `navMode?: 'push' | 'overlay'` (default `'push'`, today's behaviour) in all
  four stacks. This is additive: an omitted prop renders exactly what it renders now.
- **The breakpoint-crossing contract still holds**: below the breakpoint `navMode` is ignored, since
  the nav is off-canvas there by definition.

### D6 — `.fdy-table--striped`

One modifier, zebra striping on `tbody` rows, `:nth-child(even)` against a Tier-2 surface token.
The kit has no opinion against striping; it simply never had a caller. Cheapest item in the spec.

### D7 — `.fdy-busy` is imperative and single-owner

Per note `#049` §1. The full rationale is there; the decisions this spec fixes:

- **Imperative only**, `Freeday.busy({ caption, delay })` / `Freeday.idle()`, returning the node the
  way `Freeday.toast()` does. A component API invites two instances; the consuming app shipped
  exactly that bug and left a comment about it.
- **Revised while implementing (2026-08-26): no dialog role.** This spec first said
  `role="alertdialog"` + `aria-modal`, copied from the app that raised the note. That is wrong on
  its own terms: an alertdialog asks the reader for a response, and this asks for nothing — it
  cannot be dismissed and has no controls. Shipped instead: `aria-busy` on the overlay and
  `role="status"` on the caption, so the message is announced politely and nothing pretends to be a
  dialog. Focus still parks on the panel and is returned on `idle()`, because the element that had
  it is inert by then and the browser would otherwise drop focus to `<body>`.
- A **delay before appearing** (default in the 100–150ms range, `0` disables) so a fast operation
  never flashes a scrim.
- `inert` on the app root while up — it is not a dialog and has nothing to focus; blocking
  interaction is the entire purpose.
- Reduced motion: nothing travels; the caption carries the signal.
- The animated mark is a **slot**. The kit ships one plain spinner; brand marks stay with the app.

### D8 — Stepper gains an error state and a refusable next

Per note `#049` §3. **Both halves were revised while implementing (2026-08-26); the reasons are the
useful part.**

- **The state is `is-error`, not `is-invalid`.** `stepper.css` already carried
  `.fdy-step.is-error` — styled, unused, and documented nowhere, so nothing could reach it. Adding
  a second class for one state would have been the worse outcome. Shipped: the existing name, now
  documented, with the label following the marker into danger, plus `.fdy-step__badge` for the
  count, because colour alone tells a reader who cannot see red nothing at all. The badge is a
  **sibling** of the marker, not a slot inside it — the enhancer rewrites `__marker.innerHTML` on
  every render, so a child would vanish the first time the reader moved a step.
- **A cancelable event, not an attribute.** `data-fdy-step-guard` was unimplementable as written:
  an HTML attribute cannot carry a function, and validation is usually a round-trip away, which a
  synchronous `preventDefault()` cannot express either. Shipped: a cancelable
  `fdy-step-before-change` (`detail: { from, to, waitFor }`), refused with `preventDefault()` **or**
  deferred by assigning a promise to `detail.waitFor`. While one is outstanding the nav is disabled
  and the header carries `aria-busy`. Resolving to anything but `false` advances — a handler that
  forgets to return is not a refusal — and a guard that throws advances nothing, since it decided
  nothing. Going back never asks; a forward jump to an already-reached step does.
- **How validity is decided stays with the app** — the kit stays form-library agnostic, and this
  event is the line that keeps it so.

---

## 3. Order of work

Ordered by (what it unblocks ÷ what it risks), not by size:

1. **Item 2 — row selection.** Purely additive, already in the backlog, needs no decision from this
   spec, and it is the first change to touch all four adapters at once. It sets the guard pattern
   the rest of the spec reuses. **Start here.**
2. **Item 6 — striped rows.** One rule; lands with item 2's release.
3. **Item 7 — `.fdy-busy`.** Self-contained; no existing component changes.
4. **Item 8 — stepper.** Self-contained.
5. **Item 5 — shell overlay mode.** Touches the most heavily guarded component in the kit; do it
   while the guard pattern is fresh.
6. **Item 3 — 17 palettes.** Long, mechanical, and parallelisable. Independent of everything else.
7. **Item 4 — style axis.** Depends on item 3 landing first, because glass redefines surface tokens
   that the palette work also touches.
8. **Item 1 — editable cell.** Last, because it is the largest, and because it now carries a
   prerequisite of its own: **Blazor Server + prerender must be verified first** (D4). By then every
   guard convention it needs already exists.

## 4. Verification

Every item ships with its guard, or it does not ship.

| Item | Guard |
|---|---|
| 1 editable cell | `browser/` spec — **real mouse and key events via CDP**, never synthetic `.click()`. Tab across cells, Enter commit, Escape revert, rejected commit keeps focus. |
| 2 row selection | `browser/` spec for the bulk bar; adapter parity test; docs completeness test picks up the new props automatically |
| 3 palettes | contrast assertion across all 17 × light/dark in `npm test`; a failing pair is a red build, not a review comment |
| 4 style axis | contrast assertion under `glass`; a scoping test proving a `soft` region inside a `glass` root renders `soft` |
| 5 shell overlay | `browser/` spec: backdrop, Escape, focus return, `inert`, and the breakpoint crossing |
| 6 striped | visual token test only |
| 7 `.fdy-busy` | `browser/` spec: `inert` actually lands on the app root **and is removed**; the delay does not paint for a fast operation |
| 8 stepper | `browser/` spec: a rejected guard leaves the panel unchanged |

The four suites (`npm test`, `test:browser`, `typecheck:react`, `test:blazor`) must be green before
any merge. `test:browser` must additionally be green **in CI**, because CI runs the Chrome the
consumer runs while local runs a cached Chromium — the difference is deliberate.

## 5. What this spec does not do

- **No surface-palette axis** (see D3).
- **No third style.** Two values, and the axis is built so a third is additive.
- **No component-local `[data-style]` rules** (D2). A component that cannot follow the axis through
  tokens is reporting a missing token.
- **No row virtualisation, no master-detail form scaffold.** Still deferred (`NEXT-UP.md` #4); the
  consuming app needs neither.
- **No opinion on validation, session, or drag-and-drop.** Note `#049` withdrew a widget-canvas
  request for this reason and the line holds here.

## 6. Questions put to the owner, and the answers

All three were answered 2026-08-26. Recorded here rather than in a conversation, because the
reasoning is what a later reader needs.

| # | Question | Answer |
|---|---|---|
| D1 | Style axis absorbs the glass toggle (2 values), or two independent axes (4 combinations)? | **One axis, two values.** `soft` · `glass`. |
| D3 | `noir` is a surface-derived neutral, not a hue — keep it as an 18th option (Tier-2 remap) or drop it? | **Keep it.** 17 hues + `noir`. |
| D4 | Is vanilla + Vue first acceptable for editable cell, leaving Blazor without it for a release? | **No.** All four stacks at once; `NEXT-UP.md` #2 becomes a prerequisite of item 1. |

One assumption still standing, and cheap to overturn: **`toastPos` is allowed to die.** The
consuming app offers four toast positions; `toast.css` pins the region to bottom-right, which is
also that app's default, so no user who never changed it is affected. It was never formally put to
the owner. If the answer is no, the region needs a position axis and this becomes item 9.

## 7. Documentation impact

`COMPONENTS.md` gains: an editable-cell section under Data, `--striped`, the `.fdy-busy` component,
the stepper invalid state, `navMode` on `<FdyAppShell>`, and the two new prop rows on `<FdyTable>`.
`CLAUDE.md` §Theming must be corrected: it currently describes `data-style` as if implemented.
Spec `2026-07-21` §6 keeps its ⏳ marker until item 4 lands, and its reserved-knob claim must be
struck or built — it cannot stay as written.

Every changelog entry for this work cites note `#049`. **No consuming project, client or product is
named anywhere in this repository**, which is public.

## 8. Versioning

`data-style` changes the meaning of an attribute the docs already describe, `FdyTableColumn` gains a
field, and `FdyAppShell` gains a mode. Under the policy at the head of `CHANGELOG.md` a widened
public type is breaking. Combined with a new theming axis, this is a **3.0.0**, and it should ship
as one release rather than dribbling out — a consumer adopting the kit wants one migration, not
eight.

Publishing is a separate, explicit decision: a tag ships to npm through OIDC with provenance and
cannot be withdrawn.
