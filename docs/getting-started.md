# Freeday — Getting Started (per stack)

A step-by-step guide to adopting Freeday in **your new project**. Pick your stack:

**[Static HTML](#static-html-no-build)** · **[Vue 3 (Vite)](#vue-3-vite)** · **[React (Vite)](#react-vite)** · **[Blazor (WASM)](#blazor-wasm)**

> **Component reference** (each component's exact markup + ARIA): live docs →
> <https://cahyo-dimas.github.io/freeday-ui-kit/> (open a component section, copy its markup).
> **Ecosystem library map & how to bridge:** [`integrations.md`](integrations.md).

---

## Core concepts (read once, applies to every stack)

Freeday = **CSS** (semantic tokens + `fdy-*` classes) + **zero-dependency JS enhancers** (optional).

1. **Static vs interactive.** Static components (button, card, badge, plain input, layout) need
   only the **`fdy-*` classes** — no JS. Interactive components (select/combo, cascade, date/time
   picker, table, dropzone, form validation, input mask, chip) need the **JS enhancers**.
2. **The enhancer is the source of truth — *on the raw path*.** You don't re-implement components;
   the enhancer owns the widget's DOM. You **listen for `fdy-*` events** (all bubbling
   `CustomEvent`s, data in `event.detail`) → store them in your framework state. Event/API contract
   table: [`integrations.md` §Event & API contract](integrations.md).
   **On Vue, React or Blazor this is not the path to take for ten of the components** — `FdyCombo`,
   `FdyDatepicker`, `FdyDateRange`, `FdyAutocomplete`, `FdyCascade`, `FdyCfl`, `FdyChart`,
   `FdyTable`, `FdyModal`, `FdyDrawer` ship typed wrappers that own the state properly (Vue and
   React re-implement the interaction natively; Blazor wraps the enhancer over interop). Use them;
   the raw path is for the components without a wrapper, and for stacks without an adapter.
3. **Hydrate dynamic DOM.** Enhancers auto-init once on `DOMContentLoaded`. DOM an SPA renders
   **after** that must be re-hydrated: `window.Freeday<X>.initAll(el)` (idempotent, safe to repeat).
   Each framework's adapter wraps this — you don't call it manually.
4. **Theme via `data-*`.** `data-theme="light|dark"` (all semantic tokens switch) +
   `data-density="comfortable|compact"` (control height, for data-dense screens). Normally on
   `<html>`; change at runtime with `document.documentElement.dataset.theme = 'dark'`. Both also
   work on **any ancestor** — these are inheriting custom properties, so `<section data-theme="dark">`
   inverts just that region and every component inside it follows. See [`USAGE.md`](../USAGE.md) §5b.
5. **3-tier token rule.** Components only touch **Tier 2/3** (`var(--color-primary)`,
   `var(--space-4)`, `var(--radius-md)`…). **Never** write raw hex/px.
6. **Scope: components + tokens, deliberately *not* layout.** Freeday ships components and tokens;
   the only layout helpers are `.fdy-hidden` / `.fdy-visually-hidden`. Stacks, grids, gaps and sizing
   come from **your** layout layer — pair Freeday with a utility framework (Tailwind, UnoCSS…) run
   **utilities-only, preflight OFF** (Freeday's `base.css` is your reset). Two consequences worth
   knowing up front:
   - **base.css is a *light* reset** — it does not strip `ul`/`ol`/`p` margins. With preflight off, a
     semantic `<ul>` keeps native bullets + a 40px indent; add **`.fdy-list-reset`** (or use a Freeday
     list component) on such lists.
   - **The spacing scale is public.** `--space-0`…`--space-24`, `--radius-*`, `--dur-*` etc. are real
     custom properties in `dist/freeday.tokens.css` — **define your utility theme in terms of them**
     (`spacing: { 4: 'var(--space-4)' }`) so both systems stay in step. `data-density="compact"` steps
     `--control-h` **and** the mid-range spacing scale (`--space-3`…`--space-6`), so Freeday components
     densify — and if your utility theme is built on `var(--space-N)`, density reaches your utilities too.
7. **Load the fonts — the package does not.** The type tokens *name* **Sora** (display), **IBM Plex
   Sans** (body) and **JetBrains Mono** (data), but Freeday bundles no `@font-face` and no font files.
   Load them yourself, or the kit renders in the system fallback — which reads as "unfinished design",
   not "missing dependency". One line with [Fontsource](https://fontsource.org):
   ```css
   @import '@fontsource/sora/600.css'; @import '@fontsource/sora/700.css';
   @import '@fontsource-variable/ibm-plex-sans'; @import '@fontsource/jetbrains-mono/500.css';
   ```
   (Or a `<link>` to your own self-hosted copies, or override `--font-display`/`--font-body`/`--font-mono`
   to faces you already ship. If you keep a system-sans fallback, consider softening
   `--tracking-tighter` on headings — it's tuned for Sora's proportions.)
8. **Start from the shell, then compose.** Every application goes inside **`.fdy-app`** (see below);
   inside it, assemble screens from the composition primitives — `.fdy-page`, `.fdy-page__header`,
   `.fdy-page-section`, `.fdy-toolbar`, `.fdy-stats`/`.fdy-stat` — and the type roles (`.fdy-title-page`
   / `-section` / `-card`), not by re-using `.fdy-card__title` for everything. **Which token/role/shadow
   to use when lives in [`USAGE.md`](../USAGE.md)** — read it once; it's what makes screens cohere.

---

## The app shell (start here)

Every Freeday application goes inside **`.fdy-app`** — the frame that holds a top bar, a sidebar, and
the scrolling content. Don't hand-roll one from flexbox; the responsive sidebar + backdrop are built in.
The nav toggle is one line: toggle `.fdy-app--nav-open` (mobile drawer) / `.fdy-app--nav-collapsed`
(desktop) on the `.fdy-app` element from the `__navtoggle` button's click.

The nesting is not free-form — `.fdy-app` is a flex **row** of `[sidebar | content]`, and `__content`
is the column that holds the topbar and the main area (it gives the sticky topbar a tall containing
block to travel in). The brand belongs in the **sidebar**, sized to match the topbar's height:

```html
<div class="fdy-app">
  <a class="fdy-skip" href="#main">Skip to content</a>

  <aside class="fdy-app__sidebar">
    <a class="fdy-app__brand" href="/">
      <span class="fdy-app__brand-mark"><!-- logo --></span>
      <span class="fdy-app__brand-text">
        <span class="fdy-app__brand-title">Acme</span>
        <span class="fdy-app__brand-subtitle">Finance</span><!-- optional -->
      </span>
    </a>
    <nav class="fdy-nav"><!-- .fdy-nav__item … --></nav>
  </aside>

  <div class="fdy-app__content">
    <header class="fdy-app__topbar">
      <button class="fdy-app__navtoggle" aria-label="Toggle navigation"><!-- hamburger svg --></button>
      <h1 class="fdy-app__title">Invoices</h1><!-- auto-spacer: what follows goes right -->
      <!-- topbar actions … -->
    </header>
    <main class="fdy-app__main" id="main">
      <!-- YOUR SCREEN: a .fdy-page … (see USAGE.md) -->
    </main>
  </div>

  <div class="fdy-app__backdrop"></div>
</div>
```

`.fdy-app__main` already carries the page padding (`--space-8`, `--space-5` on mobile) — don't wrap
your screen in another padded box. The toggle's two states split at **720px**: above it,
`.fdy-app--nav-collapsed` collapses the sidebar to zero width; at or below it,
`.fdy-app--nav-open` slides the sidebar in as an off-canvas drawer over the backdrop. A complete,
working version of all of this — including the toggle script — is
[`reference-screen.html`](reference-screen.html).

Then compose the screen inside `__main` with `.fdy-page` / `.fdy-page__header` / `.fdy-page-section`
/ `.fdy-stats` and the type roles. The live **App shell** + **Sidebar menu** demos in
[`docs/index.html`](index.html) are copy-pasteable; **[`USAGE.md`](../USAGE.md)** says which role and
token to use where.

---

## Static HTML (no build)

Good for plain `.html` pages / templates — no bundler, no npm.

### 1. Get the dist files into your project
`dist/` is committed, so there's no build step. Easiest way — use npm once just to download, then
copy the files (vendor them):
```bash
npm i @cahyo-dimas/freeday
cp -r node_modules/@cahyo-dimas/freeday/dist ./assets/freeday   # copy into your project
```
(or `git clone` the repo and copy `dist/`, or download the files one by one). The minimum you need:
`freeday.bundle.css` (tokens + components in one) and `freeday.js` (all enhancers).

### 2. Set the theme on `<html>` + link the CSS
```html
<!doctype html>
<html lang="en" data-theme="light" data-density="comfortable">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="assets/freeday/freeday.bundle.css">
</head>
```
> Two-file alternative: `freeday.tokens.css` (tokens) + `freeday.css` (components).

### 3. Load the enhancers before `</body>`
```html
  <script src="assets/freeday/freeday.js" defer></script>
  <!-- or pick per-file: freeday-select.js, freeday-table.js, freeday-datepicker.js, … -->
</body>
```

### 4. Use `fdy-*` classes + `data-fdy-*` hooks
```html
<button class="fdy-btn fdy-btn--primary" type="button">Save</button>

<div data-fdy-datepicker></div>   <!-- enhancer auto-inits on DOMContentLoaded -->
```
Listen for events as needed; for DOM you add **dynamically** after load, re-hydrate:
```html
<script>
  document.addEventListener('fdy-datepicker-change', (e) => console.log(e.detail.value));
  // after inserting new markup dynamically:
  // window.FreedayDatepicker.initAll(containerEl);
</script>
```

### 5. Copy component markup
From **[`COMPONENTS.md`](../COMPONENTS.md)** (every component's classes + minimal markup, shipped in
the package) or **[`reference-screen.html`](reference-screen.html)** for a whole assembled screen. The
live docs also have a copy button per component.

---

## Vue 3 (Vite)

### 1. Install
```bash
npm i @cahyo-dimas/freeday
```
Lands in `package.json` as `"@cahyo-dimas/freeday": "^1.32.0"` (public npm package). `dist/` is
committed and published → no build step; `npm ci` runs without auth.

### 2. Import the CSS + enhancers **once** in your entry (`src/main.ts`)
```ts
import { createApp } from 'vue';
import '@cahyo-dimas/freeday/css'; // tokens + components (single file)
import '@cahyo-dimas/freeday';     // side-effect: registers every window.Freeday* enhancer
import App from './App.vue';

createApp(App).mount('#app');
```

### 3. Set the theme on the root (`index.html`)
```html
<html lang="en" data-theme="light" data-density="comfortable">
```

### 4. Use `fdy-*` + hydrate via `useFreeday`
Call `useFreeday(root)` **once** per component; put `ref="root"` on the subtree container. `fdy-*`
events are bubbling `CustomEvent`s → use native `v-on` (`@fdy-*`) and read `event.detail` (typed).
```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useFreeday } from '@cahyo-dimas/freeday/vue';
import type { FdyCascadeChangeDetail, FdyDatepickerChangeDetail } from '@cahyo-dimas/freeday/vue';

const root = ref<HTMLElement | null>(null);
useFreeday(root); // hydrate [data-fdy-*] in the subtree, on each mount + update (idempotent)

const form = reactive({ category: '', dueDate: '' });
const onCascade = (e: Event) => { form.category = (e as CustomEvent<FdyCascadeChangeDetail>).detail.value; };
const onDate    = (e: Event) => { form.dueDate  = (e as CustomEvent<FdyDatepickerChangeDetail>).detail.value; };
</script>

<template>
  <div ref="root">
    <button class="fdy-btn fdy-btn--primary" type="button">Save</button>
    <div data-fdy-cascade    @fdy-cascade-change="onCascade">…</div>
    <div data-fdy-datepicker @fdy-datepicker-change="onDate">…</div>
  </div>
</template>
```

**Gotcha:** if TypeScript complains about `import '@cahyo-dimas/freeday/css'`, make sure `env.d.ts`
has `/// <reference types="vite/client" />`. For **Nuxt/SSR**, enhancers are client-only — wrap them
in `onMounted`/`<ClientOnly>`.

Full working example: [`examples/vue-faktur/`](../examples/vue-faktur/).

---

## React (Vite)

### 1. Install
```bash
npm i @cahyo-dimas/freeday
```

### 2. Import the CSS + enhancers **once** in your entry (`src/main.tsx`)
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cahyo-dimas/freeday/css'; // tokens + components
import '@cahyo-dimas/freeday';     // registers every window.Freeday* enhancer
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

### 3. Set the theme on the root (`index.html`)
```html
<html lang="en" data-theme="light" data-density="comfortable">
```

### 4. Use `fdy-*` + hydrate via the `useFreeday` hook
React has no native `on:fdy-*` handler → since the events **bubble**, attach one set of listeners on
`root` via `useEffect` (clean up on unmount). Read `event.detail` (typed).
```tsx
import { useRef, useEffect } from 'react';
import { useFreeday } from '@cahyo-dimas/freeday/react';
import type { FdyCascadeChangeDetail, FdyDatepickerChangeDetail } from '@cahyo-dimas/freeday/react';

export function Panel() {
  const root = useRef<HTMLDivElement>(null);
  useFreeday(root); // hydrate subtree on mount + every commit (idempotent)

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onCascade = (e: Event) => { /* (e as CustomEvent<FdyCascadeChangeDetail>).detail.value */ };
    const onDate    = (e: Event) => { /* (e as CustomEvent<FdyDatepickerChangeDetail>).detail.value */ };
    el.addEventListener('fdy-cascade-change', onCascade);
    el.addEventListener('fdy-datepicker-change', onDate);
    return () => {
      el.removeEventListener('fdy-cascade-change', onCascade);
      el.removeEventListener('fdy-datepicker-change', onDate);
    };
  }, []);

  return (
    <div ref={root}>
      <button className="fdy-btn fdy-btn--primary" type="button">Save</button>
      <div data-fdy-cascade />
      <div data-fdy-datepicker />
    </div>
  );
}
```

**Gotcha:** because the enhancer owns the widget DOM, don't double-control it from React — store the
value from `event.detail` in state/ref; don't set the DOM `value` back. `StrictMode` mounts twice in
dev; `useFreeday` is idempotent, so it's safe.

### 5. Alternative: typed controlled components (`FdyCombo` · `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` · `FdyCascade` · `FdyCfl` · `FdyChart`)
For fields you'd normally write as a native `<select>`/`<input type="date">`,
`@cahyo-dimas/freeday/react` also exports typed **controlled** components — plain `value`/`onChange`,
no manual event bubbling (parity with the Vue `v-model` components above):
```tsx
import { FdyCombo } from '@cahyo-dimas/freeday/react';
import type { FdyComboOption } from '@cahyo-dimas/freeday/react';

type Status = 'draft' | 'sent' | 'paid';
const options: ReadonlyArray<FdyComboOption<Status>> = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];

function StatusField({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  return <FdyCombo<Status> value={value} options={options} onChange={onChange} ariaLabelledby="lbl-status" />;
}
```
`FdyDatepicker`, `FdyCfl` (async choose-from-list), and `FdyChart` share the same shape (typed
`value`/`onChange`, or `series`/`values` for `FdyChart`) — see [`integrations.md`](integrations.md)
and `examples/react-faktur/src/App.tsx` for the full patterns. **Vite works with no extra config**
(esbuild transpiles the `.tsx` source directly); **Next.js** consumers may need
`transpilePackages: ['@cahyo-dimas/freeday']` in `next.config.js`.

Full working example: [`examples/react-faktur/`](../examples/react-faktur/).

---

## Blazor (WASM)

Blazor doesn't use npm — Freeday is served as **static files** in `wwwroot/`.

> **Prefer the native components?** Jump to [§4 — the `Freeday.Blazor` RCL](#4-recommended-native-typed-components-freedayblazor-rcl):
> typed `<FdyX>` with `@bind`, no manual JS interop. Steps 1–2 (assets + scripts) still apply; step 3
> below (the raw enhancer + event bridge) is the underlying mechanism and the fallback for markup the
> RCL doesn't cover.

### 1. Place the assets in `wwwroot/freeday/`
Copy 3 files into `wwwroot/freeday/`: `freeday.bundle.css`, `freeday.js` (from `dist/`), and
`freeday-blazor.js` (from `adapters/blazor/`). Manually, **or** automatically via an MSBuild target
(put the Freeday repo near your project and adjust the path) in `.csproj`:
```xml
<Target Name="CopyFreedayAssets" BeforeTargets="ResolveStaticWebAssetsInputs;Build">
  <ItemGroup>
    <_FreedaySrc Include="PATH\dist\freeday.bundle.css;PATH\dist\freeday.js;PATH\adapters\blazor\freeday-blazor.js" />
  </ItemGroup>
  <Copy SourceFiles="@(_FreedaySrc)" DestinationFolder="$(MSBuildProjectDirectory)\wwwroot\freeday" SkipUnchangedFiles="true" />
</Target>
```

### 2. Set the theme + load the assets in `wwwroot/index.html`
Load `freeday.js` then `freeday-blazor.js` **before** `blazor.webassembly.js`:
```html
<html lang="en" data-theme="light" data-density="comfortable">
<head>
  <link rel="stylesheet" href="freeday/freeday.bundle.css" />
</head>
<body>
  <div id="app">Loading…</div>
  <script src="freeday/freeday.js"></script>
  <script src="freeday/freeday-blazor.js"></script>
  <script src="_framework/blazor.webassembly.js"></script>
</body>
```
> Use the global IIFE (`window.FreedayBlazor`), **not** an ES module — so it passes strict-MIME on static hosts.

### 3. Hydrate + bridge events in code-behind (`.razor.cs`)
In `OnAfterRenderAsync(firstRender)`: `initAll`, then `on(...)` per event → `[JSInvokable]` methods.
Release them in `DisposeAsync`.
```csharp
public partial class Panel : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    private ElementReference _root;
    private DotNetObjectReference<Panel>? _self;
    private readonly List<int> _tokens = new();

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);   // hydrate the Blazor markup
        _self = DotNetObjectReference.Create(this);
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade)));
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-datepicker-change", _self, nameof(OnDate)));
    }

    [JSInvokable] public void OnCascade(CascadeDetail d) { /* d.Value / d.Path */ StateHasChanged(); }
    [JSInvokable] public void OnDate(ValueDetail d)      { /* d.Value */ StateHasChanged(); }

    public async ValueTask DisposeAsync()
    {
        foreach (var t in _tokens)
            try { await JS.InvokeVoidAsync("FreedayBlazor.off", t); } catch (JSDisconnectedException) { }
        _self?.Dispose();
    }

    public sealed record CascadeDetail(string Value, string Path, string[] Labels);
    public sealed record ValueDetail(string Value);
}
```
```razor
@* Panel.razor — @ref on the subtree container, fdy-* classes + data-fdy-* hooks in the markup *@
<div @ref="_root">
  <button class="fdy-btn fdy-btn--primary" type="button">Save</button>
  <div data-fdy-cascade></div>
  <div data-fdy-datepicker></div>
</div>
```
Extras: `FreedayBlazor.toast(new { variant, title, message })` for toasts; `FreedayBlazor.toggleTheme()`
to flip the theme. Event DTOs are deserialized case-insensitively by Blazor.

### 4. Recommended: native typed components (`Freeday.Blazor` RCL)

Instead of hand-writing `fdy-*` markup + the interop above, reference the **Razor Class Library** and
use typed `<FdyX>` components with `@bind` — the Blazor equivalent of the Vue `v-model` / React
`value`/`onChange` adapters. Place the Freeday repo near your solution and add a project reference:
```xml
<!-- YourApp.csproj -->
<ProjectReference Include="PATH\adapters\blazor\Freeday.Blazor.csproj" />
```
```razor
@* _Imports.razor *@
@using Freeday.Blazor
```
Load `freeday.js` + `freeday-blazor.js` exactly as in step 2 (the components still hydrate over the
kit's CSS/enhancers), then bind:
```razor
@* Invoice.razor — no @ref, no manual JS interop, no [JSInvokable] *@
<FdyCombo TValue="string" @bind-Value="_status" Options="_statusOptions" AriaLabelledby="lbl-status" />
<FdyDatepicker @bind-Value="_dueDate" Label="Due date" />
<FdyTable TRow="Invoice" Columns="_cols" Rows="_rows" RowKey="@(i => i.Code)"
          PageSize="10" RowActivatable="true" RowActivate="OpenDetail" />
<FdyChart Type="donut" Values="_byCity" Labels="_cityLabels" AriaLabel="Revenue by city" />
<FdyDrawer @bind-Open="_drawerOpen" Title="Detail" Side="right">…</FdyDrawer>
```
Ten components at parity with the Vue/React adapters: **`FdyModal`** · **`FdyDrawer`** (`@bind-Open`,
`Title`, `Size`/`Side`, `Dismissible`) · **`FdyCombo<TValue>`** · **`FdyDatepicker`** ·
**`FdyAutocomplete`** · **`FdyCascade`** · **`FdyDateRange`** (`@bind-From`/`@bind-To`) ·
**`FdyCfl<TRow>`** (async `LoadPage`) · **`FdyChart`** · **`FdyTable<TRow>`** (client sort/filter/page,
or controlled `Sort`/`Filters`/`Page` for a server-paged table; `RowActivatable`, `RowDetail`). Each
`select`-type control also takes `Disabled`/`Readonly`/`Invalid`. The RCL targets **net8.0** and is
consumed as source (`<ProjectReference>`); `.NET bin/obj` never ships in the npm tarball.

Full working example (all ten): [`examples/blazor-faktur/`](../examples/blazor-faktur/) —
`Pages/ComponentsDemo.razor`.

---

## Verify (every stack)

Run the project → check two things:
1. **CSS connected** — buttons/cards are styled (not plain HTML).
2. **Enhancers connected** — interactive components come alive (e.g. datepicker/combo open on
   click), and `event.detail` reaches your state.

If the visuals are plain → the CSS didn't load. If visuals are fine but widgets are dead → the
enhancers aren't hydrated (make sure `import '@cahyo-dimas/freeday'` / `<script freeday.js>` is
present, and the adapter/`initAll` is called for dynamic DOM).
