# Freeday

**English** · [Bahasa Indonesia](README.id.md)

> **More free days for devs — the UI kit is ready to use.**

[![Live docs](https://img.shields.io/badge/docs-live-2050d8?style=flat-square)](https://cahyo-dimas.github.io/freeday-ui-kit/)
[![Release](https://img.shields.io/badge/release-v1.16.0-0078d4?style=flat-square)](https://github.com/cahyo-dimas/freeday-ui-kit/tree/v1.16.0)

A token-driven, framework-agnostic UI kit — one source of truth for color, typography,
spacing, and components. Blueprint: `docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`.
**Living reference:** **[cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)** — or open `docs/index.html` directly in a browser.

> 🚀 **Starting a project?** Step-by-step per stack (HTML · Vue · React · Blazor): **[`docs/getting-started.md`](docs/getting-started.md)**.

## Build
```bash
node tokens/build.mjs   # tokens.json -> dist/freeday.tokens.css; bundles dist/freeday.css;
                        #   dist/freeday.bundle.css (tokens+components); copies dist/*.js + dist/freeday.js
npm test                # build-transform tests + WCAG contrast (node:test)
```
`dist/` is committed — consumers don't have to build it themselves.

## Use in a project

**As a package (projects with a bundler — Vue/React/Blazor/Vite):**
```bash
npm i @cahyo-dimas/freeday
```
```js
import '@cahyo-dimas/freeday/css';   // tokens + components (single file)
import '@cahyo-dimas/freeday';       // all JS enhancers (auto-init [data-fdy-*])
// granular if needed: '@cahyo-dimas/freeday/tokens' · '@cahyo-dimas/freeday/css/components' · '@cahyo-dimas/freeday/enhancers/<name>'
```
Set the theme on your app root: `<html data-theme="light" data-density="comfortable">`. `dist/` is
committed and published, so install needs **no build step**; minification is left to the consumer's
bundler. Because it's on **public npm**, `npm ci` runs in CI without auth or an SSH key.

> **From source (no registry):** `npm i github:cahyo-dimas/freeday-ui-kit`.

**Or link the files directly (no build):**

### 1. Include the CSS (required)
```html
<html lang="en" data-theme="light" data-density="comfortable">
<link rel="stylesheet" href="dist/freeday.tokens.css">  <!-- tokens: color, spacing, etc. -->
<link rel="stylesheet" href="dist/freeday.css">          <!-- fdy-* components -->
```
Component classes are prefixed `fdy-` (e.g. `fdy-btn`, `fdy-card`, `fdy-badge`). Use them directly
in any framework's markup — Vue, React, Blazor, or plain HTML.

> `.fdy-btn` is **already** the primary button — there's no separate `.fdy-btn--primary` modifier.
> Modifiers for other variants: `--ghost`, `--danger`, `--text`, `--sm`, `--lg`, `--icon`
> (see `docs/index.html`).

### 2. Include the JS enhancers (optional, zero dependencies)
Interactive components (dropdown, tabs, table, choose-from-list, datepicker, upload, toast) need
JS. Two ways:
```html
<!-- a) one bundle with every enhancer -->
<script src="dist/freeday.js" defer></script>

<!-- b) or pick only the per-file ones you use -->
<script src="dist/freeday-select.js"     defer></script>  <!-- [data-fdy-combo] -->
<script src="dist/freeday-tabs.js"       defer></script>  <!-- [data-fdy-tabs] -->
<script src="dist/freeday-table.js"      defer></script>  <!-- [data-fdy-table] -->
<script src="dist/freeday-cfl.js"        defer></script>  <!-- [data-fdy-cfl] + <dialog> -->
<script src="dist/freeday-datepicker.js" defer></script>  <!-- [data-fdy-datepicker] -->
<script src="dist/freeday-upload.js"     defer></script>  <!-- [data-fdy-dropzone] -->
<script src="dist/freeday-toast.js"      defer></script>  <!-- Freeday.toast({...}) -->
```
Each one auto-inits `[data-fdy-*]` on `DOMContentLoaded` — idempotent, progressive enhancement.

| Enhancer | Markup hook | Event / API |
|---|---|---|
| `freeday-select` | `[data-fdy-combo]` | `fdy-change` `{value}` · `window.FreedayCombo` |
| `freeday-tabs` | `[data-fdy-tabs]` | `window.FreedayTabs` |
| `freeday-table` | `[data-fdy-table]` (+ `[data-fdy-filter]`, `[data-fdy-table-bulk]`) | `fdy-table-change` · `window.FreedayTable` |
| `freeday-cfl` | `[data-fdy-cfl]` → `<dialog>` | `fdy-cfl-select` `{row}`/`{rows}` · `window.FreedayCfl` |
| `freeday-datepicker` | `[data-fdy-datepicker]`, `[data-fdy-daterange]` | `fdy-datepicker-change` `{value,date}` · `window.FreedayDatepicker` |
| `freeday-timepicker` | `[data-fdy-timepicker]` | `fdy-time-select` `{value}` · `window.FreedayTimepicker` |
| `freeday-datetime` | `[data-fdy-datetimepicker]` | `fdy-datetime-change` `{date,time,value}` · `window.FreedayDatetime` |
| `freeday-cascade` | `[data-fdy-cascade]` (nested `<ul>` model) | `fdy-cascade-change` `{value,path,labels}` · `window.FreedayCascade` |
| `freeday-mask` | `[data-fdy-mask]`, `[data-fdy-password]` | `fdy-mask` `{value,raw}` · `window.FreedayMask` |
| `freeday-form` | `[data-fdy-validate]` (form) | `fdy-form-invalid`/`-valid` · `window.FreedayForm` |
| `freeday-chip` | `[data-fdy-chips]`, `.fdy-chip__remove` | `fdy-chip-change`/`fdy-chip-remove` · `window.FreedayChip` |
| `freeday-upload` | `[data-fdy-dropzone]` | `fdy-upload-add`/`-remove` · `window.FreedayUpload` |
| `freeday-toast` | — | `Freeday.toast({variant,title,message,timeout})` |

Wide tables (many columns) need a wrapper for horizontal scroll: wrap `.fdy-table` in
`.fdy-table-wrap` (a standard table, includes the border + shadow shell) or `.fdy-table-scroll`
(plain scroll, no shell — works standalone or inside `.fdy-datatable`, which already has its own
border/shadow shell). Without one of these wrappers, a wide table overflows its container instead
of scrolling.

### 3. Theming — 3 axes via `data-*` on the root
- `data-theme="light|dark"` — redefines the semantic tokens (bind it to your app's theme state).
- `data-density="comfortable|compact"` — control height (`--control-h`) for data-dense screens.
  This auto-applies only to Freeday's built-in controls (button, input, combo, etc.);
  custom/hand-built components must read `--control-h` themselves (e.g. `height: var(--control-h)`)
  to shrink or grow when `data-density` changes.
- (roadmap) `data-style` — alternative visual variants.
- The breakpoint scale (`sm`/`md`/`lg`/`xl` = 600/960/1280/1920px, matching the
  `src/components/breakpoints.css` utilities) is also available in JS: `import { breakpoints } from
  '@cahyo-dimas/freeday/breakpoints'` — use it to align your app's `matchMedia`/`@media` with
  Freeday's scale.

## Framework integration (SPA)
> **Full library map:** [`docs/integrations.md`](docs/integrations.md) — each area (forms/validation,
> charts, tables, dates, overlays, etc.) mapped to the ecosystem library you'd normally reach for
> (Zod/Yup, Chart.js, TanStack Table, date-fns, Floating UI, …), plus how to bridge it and the
> Vue/React/Blazor bindings. Read it when starting a new project.

**Ready-made adapters — Vue · React · Blazor.** All thin: the enhancer stays the source of truth;
the adapter only hydrates and bridges events. Each ships a working **invoice** screen:

```ts
// Vue 3 — @cahyo-dimas/freeday/vue
import { useFreeday } from '@cahyo-dimas/freeday/vue';
const root = ref<HTMLElement | null>(null);
useFreeday(root);                     // @fdy-cascade-change="…" (typed detail)
```
```tsx
// React — @cahyo-dimas/freeday/react
import { useFreeday } from '@cahyo-dimas/freeday/react';
const root = useRef<HTMLDivElement>(null);
useFreeday(root);                     // fdy-* events bubble → listen at the root
```
```csharp
// Blazor — @cahyo-dimas/freeday/blazor (window.FreedayBlazor via JS interop)
await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);
await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade));
```

| Framework | Adapter | Working example |
|---|---|---|
| Vue 3 | `@cahyo-dimas/freeday/vue` | [`examples/vue-faktur/`](examples/vue-faktur/) (`npm install && npm run dev`) |
| React 19 | `@cahyo-dimas/freeday/react` | [`examples/react-faktur/`](examples/react-faktur/) (`npm install && npm run dev`) |
| Blazor WASM (.NET 10) | `@cahyo-dimas/freeday/blazor` | [`examples/blazor-faktur/`](examples/blazor-faktur/) (`dotnet run`) |

Full library map and patterns: [`docs/integrations.md`](docs/integrations.md).

Enhancers auto-init once on load. For DOM rendered dynamically (Vue/React/Blazor):
- **Reuse the enhancer:** after a mount or route change, call `window.FreedayTable.initAll(el)`
  (or the global `initAll()`). Safe to repeat — each init is guarded by an idempotent flag. Bridge
  to framework state through the events it emits (e.g. listen for `fdy-cfl-select`,
  `fdy-datepicker-change`).
- **Or re-implement:** write your own framework component, keeping the same **markup + ARIA
  contract + `fdy-*` classes** (see `docs/index.html`). The enhancer is the reference
  implementation, not a requirement. For choose-from-list, make it a controlled component
  (`fetchPage` callback + server cache) rather than mirroring into a global store.

## Token rules — 3 tiers (don't break them)
```
Tier 1 PRIMITIVE  raw ramp (--azure-600…) — NEVER used in components
Tier 2 SEMANTIC   roles (--color-primary, --color-surface…) — change on theme & re-brand
Tier 3 COMPONENT  --fdy-<component>-<prop> — optional, local override
```
Components only touch Tier 2/3. Need a new value → compose → extend a modifier → only then create.

## Repo structure
```
tokens/tokens.json     source of truth (edit here)
tokens/build.mjs       generator (pure Node, zero dependencies)
src/base.css           reset + utilities
src/components/*.css    one file per component (fdy-*)
src/*.js               optional JS enhancers (reference, vanilla)
dist/                  build output (COMMITTED):
  freeday.tokens.css   semantic tokens (light/dark/compact)
  freeday.css          bundle of every component
  freeday.js           bundle of every enhancer (single <script>)
  freeday-*.js         per-file enhancers
docs/index.html        living reference / demo site
```

## Component inventory
- **Foundation:** semantic colors, typography (Sora/IBM Plex Sans/JetBrains Mono), 4px spacing
  scale, radius & elevation, motion, accessibility checklist.
- **Actions & forms:** button, input (+error), input-group (currency/%/icon),
  checkbox/radio/switch, **select `fdy-combo`** (APG), **autocomplete**, **cascade select**
  (hierarchical drill-down), **choose-from-list** (field + single/multi dialog),
  **date / time / datetime picker**, **file upload** (dropzone + per-file state),
  **password reveal + input mask**, **form validation** (Constraint Validation API → accessible
  errors).
- **Data:** table, **data table** (search · sort · **per-column filter** text/enum/number · **bulk
  actions** · pagination · selection), states (empty/loading/error).
- **Feedback:** alert, toast, tooltip. **Navigation:** tabs, breadcrumb, pagination.
- **Display:** card, badge, avatar, chip (default/removable · choice · filter), description list,
  progress, spinner, skeleton.
- **Layout:** app shell, accordion (native `<details>`), modal (native `<dialog>`), divider, kbd.

## Accessibility
WCAG AA contrast (light & dark), audited automatically by `test/contrast.test.mjs`: it resolves the
token graph, composites semi-transparent `-soft` fills over their surface, and enforces every pair
(text 4.5:1; control borders / icons 3:1, WCAG 1.4.11). Form control borders use
`--color-control-border` (≥3:1); decorative borders are intentionally lighter. `:focus-visible` is
always visible, native HTML comes before ARIA, interactive components follow the WAI-ARIA APG
patterns, and `prefers-reduced-motion` is respected. Status is never conveyed by color alone. See
the "Accessibility" section in `docs/index.html`.

## Browser support
Needs an evergreen browser, roughly 2023+: **Chrome 111 · Safari 16.4 · Firefox 113** (the floor is
set by `color-mix()`). Other features used: native `<dialog>`/`::backdrop`, `accent-color`,
`100dvh`, `conic-gradient`, `scroll-snap` — all ≥ Safari 15.4. Backdrop blur uses
`-webkit-backdrop-filter` + `backdrop-filter` (older Safari still works, just without the blur).
There's no CSS build or autoprefixer step — supporting older browsers is the consumer's
responsibility.

## License
[MIT](LICENSE) © 2026 Cahyo D. Kurnianto — free to use, modify, and distribute, as long as the
copyright line and license text are included.
