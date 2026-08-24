# Freeday — App shell behaviour (Design Spec)

- **Status:** Approved, staged implementation
- **Date:** 2026-08-24
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 1.52.1
- **Backlog item:** `NEXT-UP.md` #8, reported twice from consuming apps

---

## 1. Problem

`.fdy-app` ships the markup and the state classes and **no behaviour**. `COMPONENTS.md` states the
contract plainly:

> **JS: none.** Toggle `--nav-collapsed` (≥721px) or `--nav-open` (≤720px) on the root from
> `__navtoggle`'s click; clear `--nav-open` when `__backdrop` is clicked.

Those two sentences are the whole instruction. They do not mention Escape, focus, `inert`, or focus
restore — so a consumer who follows the documentation exactly builds an off-canvas overlay that
cannot be closed from the keyboard and lets Tab wander into the content behind the backdrop.

That is not a consumer mistake. It is what the kit asks for.

### 1.1 The kit's own docs prove the divergence

Two hand-rolled implementations ship inside this repository, and they already differ:

| | `docs/reference-screen.html` | `docs/index.html` |
|---|---|---|
| Escape closes the nav | **no** | yes |
| Clicking a nav item closes it | no | yes |
| Focus trap while it is an overlay | no | no |
| `inert` on the content behind | no | no |
| Focus restored to the toggle | no | no |

If the kit's own two pages cannot agree, every consumer is writing a third version. One already
assembled it wrongly enough to trap keyboard users — content marked `inert` while the nav was open,
with no way out — which is what produced `breakpoints.nav` in v1.20.0.

The kit already solves this exact problem correctly elsewhere: `.fdy-drawer` is a native `<dialog>`
opened with `showModal()`, which supplies trap, `inert` and focus restore for free. The app-shell
sidebar is an `<aside>`, so it gets none of them.

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Full overlay semantics, not parity-plus-Escape | Half the defect (Tab escaping behind the backdrop) would otherwise remain, and consumers would still be assembling the other half themselves. |
| 2 | Markup contract unchanged; behaviour is **opt-in** via `data-fdy-app` | Re-founding the mobile drawer on `<dialog>` is mechanically cleaner but breaks every shipped consumer's markup. |
| 3 | Typed `FdyAppShell` in Vue, React and Blazor as well as the enhancer | Decided by the owner. The apps that reported this are framework apps. |
| 4 | One controlled model: `navOpen` = "the nav is visible" | See §4. |
| 5 | Ship in two stages | Stage 1 alone closes the accessibility defect; stage 2 is ergonomics. |

## 3. The enhancer — `src/freeday-app-shell.js`

House style, matching the other 25: IIFE, `'use strict'`, idempotent through a `dataset` flag,
`init(context)` that includes its own root, `DOMContentLoaded` guard, and
`window.FreedayAppShell = { init, initAll }`. Opt-in: `<div class="fdy-app" data-fdy-app>`.

Two modes, split at `breakpoints.nav` (721):

| | ≥721px — static column | ≤720px — overlay |
|---|---|---|
| toggle flips | `--nav-collapsed` | `--nav-open` |
| `aria-expanded` on `__navtoggle` | tracks nav visible | tracks nav visible |
| focus | untouched | moves into the sidebar on open, **restored to the toggle** on close |
| Tab | free | trapped inside the sidebar |
| content behind | normal | `inert` on `__content` |
| Escape / backdrop / nav-item click | — | closes |

### 3.1 Crossing the breakpoint is part of the contract

Opening the nav as an overlay and then widening the window must drop `--nav-open`, remove `inert`
and release the trap. Without it, widening leaves the content permanently `inert` — the same class
of failure that produced `breakpoints.nav`. Handled with
`matchMedia('(min-width: 721px)').addEventListener('change', …)`.

### 3.2 Focus target

On open, focus moves to the first focusable element inside `__sidebar`; if there is none, to the
sidebar itself with `tabindex="-1"`. On close, focus returns to `__navtoggle` — never to `document.body`,
which is where a keyboard user is stranded today.

## 4. The typed contract

The shell has two state classes, but exposing both as props forces the app to think about the
viewport. One prop instead — `navOpen`, meaning *the nav is visible to the user* — with the kit
owning the mapping:

| viewport | `navOpen: true` | `navOpen: false` |
|---|---|---|
| ≥721px | no class | `--nav-collapsed` |
| ≤720px | `--nav-open` | no class |

Defaults to visible on wide viewports, hidden on narrow. Vue `v-model:navOpen` · React `navOpen` +
`onNavOpenChange` · Blazor `@bind-NavOpen`.

Slots/children per stack convention: `brand`, `nav`, `topbar` actions, `title`, and the main
content — Vue named slots, React `ReactNode` props plus `children`, Blazor `RenderFragment`.

## 5. Where the behaviour lives

Two implementations, not four. `dist/freeday.js` is a plain IIFE concatenation with no module
system, so the vanilla enhancer stays self-contained. The three wrappers share one core module,
following the precedent already in the repo (`adapters/core/table-model.js` — plain ESM with a
`.d.ts` sidecar, unit-testable under `node --test` with no framework runtime):

```
adapters/core/app-shell.js    trap Tab · inert · save + restore focus
   ├── FdyAppShell.vue / FdyAppShell.tsx    call it directly
   └── adapters/blazor/freeday-blazor.js    appShellOpen/appShellClose, like the existing dialogInit
```

A parity guard in `browser/adapter.mjs` holds the two implementations to the same behaviour.

## 6. Testing

**Stage 1 — `browser/app-shell.mjs` (vanilla):**

1. Toggle collapses at ≥721px and opens the overlay at ≤720px, with `aria-expanded` tracking.
2. Escape closes; backdrop click closes; clicking a nav item closes.
3. On open, focus is inside `__sidebar`.
4. Tab from the last focusable in the sidebar returns to the first — trapped, not escaped. Asserted
   with **trusted keys**, since only a real key moves focus.
5. `__content` is `inert` while open and not after close.
6. On close, `document.activeElement` is `__navtoggle`.
7. Crossing the breakpoint while open clears the state — no orphaned `inert`.

**Stage 2 — `browser/adapter.mjs`:** Vue and React entries asserting the same seven behaviours
through the typed component, so the wrapper path cannot drift from the enhancer path.

The suite runs on CI as of 2026-08-24 (`ci.yml`), so these guards run on every push.

## 7. Documentation and claims

Adding an eleventh typed component moves a number that is stated in five places, and the App shell
section's "JS: none" is now false:

- `COMPONENTS.md` — §App shell rewritten; typed-wrapper line added
- `USAGE.md` — which lane to use
- `README.md`, `README.id.md` — "10/10 parity" → 11/11
- `CLAUDE.md` — component/enhancer counts
- `docs/agent-onboarding.md` — "the ten typed components"
- `NEXT-UP.md` — #8 resolved
- `docs/index.html`, `docs/reference-screen.html` — stop hand-rolling; using the enhancer is the
  proof that it works

## 8. Staging

**Stage 1 — 1.53.0.** Enhancer + vanilla guards + `COMPONENTS.md` + both docs pages converted.
Closes the accessibility defect on its own.

**Stage 2 — 1.54.0.** `FdyAppShell` in Vue/React/Blazor + `adapters/core/app-shell.js` + parity
guards + the 10→11 claim updates.

## 9. Out of scope

- Persisting the collapsed state (localStorage) — no request for it; storage keys and privacy are a
  separate decision.
- Re-founding the sidebar on `<dialog>` — breaking, see §2.
- Multi-level / flyout navigation — `.fdy-nav` is unchanged by this work.

## 10. Definition of done

- Stage 1: seven vanilla guards green on CI; both docs pages render from the enhancer with no inline
  toggle script; `COMPONENTS.md` no longer says "JS: none"; released as 1.53.0.
- Stage 2: the same seven behaviours asserted through Vue and React entries; Blazor bridge wired;
  every claim in §7 moved from ten to eleven; released as 1.54.0.
