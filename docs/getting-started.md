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
2. **The enhancer is the source of truth.** You don't re-implement components; the enhancer owns
   the widget's DOM. You **listen for `fdy-*` events** (all bubbling `CustomEvent`s, data in
   `event.detail`) → store them in your framework state. Event/API contract table:
   [`integrations.md` §Event & API contract](integrations.md).
3. **Hydrate dynamic DOM.** Enhancers auto-init once on `DOMContentLoaded`. DOM an SPA renders
   **after** that must be re-hydrated: `window.Freeday<X>.initAll(el)` (idempotent, safe to repeat).
   Each framework's adapter wraps this — you don't call it manually.
4. **Theme via `data-*` on `<html>`.** `data-theme="light|dark"` (all semantic tokens switch) +
   `data-density="comfortable|compact"` (control height, for data-dense screens). Change at runtime:
   `document.documentElement.dataset.theme = 'dark'`.
5. **3-tier token rule.** Components only touch **Tier 2/3** (`var(--color-primary)`,
   `var(--space-4)`, `var(--radius-md)`…). **Never** write raw hex/px.

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
From the live docs (View Source) or `Foundation Design System.html`. **Replace** the old classes → `fdy-*`.

---

## Vue 3 (Vite)

### 1. Install
```bash
npm i @cahyo-dimas/freeday
```
Lands in `package.json` as `"@cahyo-dimas/freeday": "^1.7.0"` (public npm package). `dist/` is
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

Full working example: [`examples/blazor-faktur/`](../examples/blazor-faktur/).

---

## Verify (every stack)

Run the project → check two things:
1. **CSS connected** — buttons/cards are styled (not plain HTML).
2. **Enhancers connected** — interactive components come alive (e.g. datepicker/combo open on
   click), and `event.detail` reaches your state.

If the visuals are plain → the CSS didn't load. If visuals are fine but widgets are dead → the
enhancers aren't hydrated (make sure `import '@cahyo-dimas/freeday'` / `<script freeday.js>` is
present, and the adapter/`initAll` is called for dynamic DOM).
