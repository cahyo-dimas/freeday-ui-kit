# Freeday — Getting Started (per stack)

Panduan adopsi Freeday di **project barumu**, langkah demi langkah. Pilih stack-mu:

**[HTML statis](#html-statis-tanpa-build)** · **[Vue 3 (Vite)](#vue-3-vite)** · **[React (Vite)](#react-vite)** · **[Blazor (WASM)](#blazor-wasm)**

> **Referensi komponen** (markup + ARIA persis tiap komponen): docs live →
> <https://cahyo-dimas.github.io/freeday-ui-kit/> (buka section komponen, tiru markup-nya).
> **Peta library ekosistem & cara jembatan:** [`integrations.md`](integrations.md).

---

## Konsep inti (baca sekali, berlaku semua stack)

Freeday = **CSS** (token semantic + kelas `fdy-*`) + **enhancer JS 0-dependency** (opsional).

1. **Statis vs interaktif.** Komponen statis (button, card, badge, input biasa, layout) cukup
   **kelas `fdy-*`** — tanpa JS. Komponen interaktif (select/combo, cascade, date/time picker,
   table, dropzone, form-validation, input-mask, chip) butuh **enhancer JS**.
2. **Enhancer = sumber kebenaran.** Kamu tak me-reimplement komponen; enhancer memegang DOM
   widget-nya. Kamu **dengarkan event `fdy-*`** (semua *bubbling* `CustomEvent`, datanya di
   `event.detail`) → simpan ke state framework-mu. Tabel kontrak event/API:
   [`integrations.md` §Kontrak event & API](integrations.md).
3. **Hydrate untuk DOM dinamis.** Enhancer auto-init sekali saat `DOMContentLoaded`. DOM yang
   dirender SPA **setelah** itu harus di-hydrate ulang: `window.Freeday<X>.initAll(el)`
   (idempotent, aman diulang). Adapter tiap framework membungkus ini — kamu tak perlu memanggilnya manual.
4. **Tema via `data-*` di `<html>`.** `data-theme="light|dark"` (semua token semantic berganti)
   + `data-density="comfortable|compact"` (tinggi kontrol, untuk layar padat data). Ganti runtime:
   `document.documentElement.dataset.theme = 'dark'`.
5. **Aturan token 3-lapis.** Komponen hanya menyentuh **Tier-2/3** (`var(--color-primary)`,
   `var(--space-4)`, `var(--radius-md)`…). **Jangan** tulis hex/px mentah.

---

## HTML statis (tanpa build)

Cocok untuk halaman `.html` polos / template — tanpa bundler, tanpa npm.

### 1. Ambil file dist ke project-mu
`dist/` sudah di-commit, jadi tak ada build step. Cara termudah — pakai npm sekali hanya untuk
mengunduh, lalu salin file-nya (vendor):
```bash
npm i github:cahyo-dimas/freeday-ui-kit#v1.5.0
cp -r node_modules/freeday/dist ./assets/freeday   # salin ke project-mu
```
(atau `git clone` repo lalu salin `dist/`, atau unduh file satu per satu). Yang kamu butuh minimal:
`freeday.bundle.css` (token + komponen jadi satu) dan `freeday.js` (semua enhancer).

### 2. Set tema di `<html>` + link CSS
```html
<!doctype html>
<html lang="id" data-theme="light" data-density="comfortable">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="assets/freeday/freeday.bundle.css">
</head>
```
> Alternatif dua file terpisah: `freeday.tokens.css` (token) + `freeday.css` (komponen).

### 3. Muat enhancer sebelum `</body>`
```html
  <script src="assets/freeday/freeday.js" defer></script>
  <!-- atau pilih per-file: freeday-select.js, freeday-table.js, freeday-datepicker.js, … -->
</body>
```

### 4. Pakai kelas `fdy-*` + hook `data-fdy-*`
```html
<button class="fdy-btn fdy-btn--primary" type="button">Simpan</button>

<div data-fdy-datepicker></div>   <!-- enhancer auto-init saat DOMContentLoaded -->
```
Dengarkan event bila perlu; untuk DOM yang kamu tambah **dinamis** setelah load, hydrate ulang:
```html
<script>
  document.addEventListener('fdy-datepicker-change', (e) => console.log(e.detail.value));
  // setelah menyisipkan markup baru secara dinamis:
  // window.FreedayDatepicker.initAll(containerEl);
</script>
```

### 5. Salin markup komponen
Dari docs live (View Source) atau `Foundation Design System.html`. **Ganti** kelas lama → `fdy-*`.

---

## Vue 3 (Vite)

### 1. Install
```bash
npm i github:cahyo-dimas/freeday-ui-kit#v1.5.0
```
Masuk ke `package.json` sebagai `"freeday": "github:cahyo-dimas/freeday-ui-kit#v1.5.0"`
(nama paket **`freeday`**). `dist/` di-commit → tanpa build step; repo public → tanpa auth.

### 2. Import CSS + enhancer **sekali** di entry (`src/main.ts`)
```ts
import { createApp } from 'vue';
import 'freeday/css'; // tokens + komponen (satu file)
import 'freeday';     // side-effect: daftarkan semua enhancer window.Freeday*
import App from './App.vue';

createApp(App).mount('#app');
```

### 3. Set tema di root (`index.html`)
```html
<html lang="id" data-theme="light" data-density="comfortable">
```

### 4. Pakai `fdy-*` + hydrate via `useFreeday`
Panggil `useFreeday(root)` **sekali** per komponen; taruh `ref="root"` di wadah subtree.
Event `fdy-*` = `CustomEvent` bubbling → pakai `v-on` native (`@fdy-*`), baca `event.detail` (bertipe).
```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useFreeday } from 'freeday/vue';
import type { FdyCascadeChangeDetail, FdyDatepickerChangeDetail } from 'freeday/vue';

const root = ref<HTMLElement | null>(null);
useFreeday(root); // hydrate [data-fdy-*] di subtree, tiap mount + update (idempotent)

const form = reactive({ kategori: '', jatuhTempo: '' });
const onCascade = (e: Event) => { form.kategori   = (e as CustomEvent<FdyCascadeChangeDetail>).detail.value; };
const onDate    = (e: Event) => { form.jatuhTempo = (e as CustomEvent<FdyDatepickerChangeDetail>).detail.value; };
</script>

<template>
  <div ref="root">
    <button class="fdy-btn fdy-btn--primary" type="button">Simpan</button>
    <div data-fdy-cascade    @fdy-cascade-change="onCascade">…</div>
    <div data-fdy-datepicker @fdy-datepicker-change="onDate">…</div>
  </div>
</template>
```

**Gotcha:** kalau TypeScript protes soal `import 'freeday/css'`, pastikan `env.d.ts` punya
`/// <reference types="vite/client" />`. Untuk **Nuxt/SSR**, enhancer client-only — bungkus di
`onMounted`/`<ClientOnly>`.

Contoh utuh yang jalan: [`examples/vue-faktur/`](../examples/vue-faktur/).

---

## React (Vite)

### 1. Install
```bash
npm i github:cahyo-dimas/freeday-ui-kit#v1.5.0
```

### 2. Import CSS + enhancer **sekali** di entry (`src/main.tsx`)
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'freeday/css'; // tokens + komponen
import 'freeday';     // daftarkan semua enhancer window.Freeday*
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

### 3. Set tema di root (`index.html`)
```html
<html lang="id" data-theme="light" data-density="comfortable">
```

### 4. Pakai `fdy-*` + hydrate via hook `useFreeday`
React tak punya handler `on:fdy-*` native → karena event **bubbling**, pasang satu set listener
di `root` lewat `useEffect` (bersihkan saat unmount). Baca `event.detail` (bertipe).
```tsx
import { useRef, useEffect } from 'react';
import { useFreeday } from 'freeday/react';
import type { FdyCascadeChangeDetail, FdyDatepickerChangeDetail } from 'freeday/react';

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
      <button className="fdy-btn fdy-btn--primary" type="button">Simpan</button>
      <div data-fdy-cascade />
      <div data-fdy-datepicker />
    </div>
  );
}
```

**Gotcha:** karena enhancer memegang DOM widget, jangan double-kontrol dari React — simpan nilai
dari `event.detail` ke state/ref, jangan meng-set balik `value` DOM-nya. `StrictMode` men-*mount*
dua kali di dev; `useFreeday` idempotent jadi aman.

### 5. Alternatif: komponen controlled typed (`FdyCombo` / `FdyDatepicker` / `FdyCfl` / `FdyChart`)
Untuk field yang biasa kamu tulis lewat `<select>`/`<input type="date">` native, `freeday/react`
juga mengekspor komponen **controlled** typed — `value`/`onChange` biasa, tanpa event bubbling
manual (parity dengan komponen `v-model` Vue di atas):
```tsx
import { FdyCombo } from 'freeday/react';
import type { FdyComboOption } from 'freeday/react';

type Status = 'draft' | 'sent' | 'paid';
const options: ReadonlyArray<FdyComboOption<Status>> = [
  { value: 'draft', label: 'Draf' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'paid', label: 'Lunas' },
];

function StatusField({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  return <FdyCombo<Status> value={value} options={options} onChange={onChange} ariaLabelledby="lbl-status" />;
}
```
`FdyDatepicker`, `FdyCfl` (choose-from-list async), dan `FdyChart` punya bentuk yang sama
(`value`/`onChange` typed, atau `series`/`values` untuk `FdyChart`) — lihat
[`integrations.md`](integrations.md) dan `examples/react-faktur/src/App.tsx` untuk pola lengkap.
**Vite jalan tanpa config tambahan** (esbuild men-transpile `.tsx` source-nya langsung); konsumen
**Next.js** mungkin perlu `transpilePackages: ['freeday']` di `next.config.js`.

Contoh utuh yang jalan: [`examples/react-faktur/`](../examples/react-faktur/).

---

## Blazor (WASM)

Blazor tak pakai npm — Freeday disajikan sebagai **file statis** di `wwwroot/`.

### 1. Taruh aset di `wwwroot/freeday/`
Salin 3 file ke `wwwroot/freeday/`: `freeday.bundle.css`, `freeday.js` (dari `dist/`), dan
`freeday-blazor.js` (dari `adapters/blazor/`). Cara manual, **atau** otomatis lewat MSBuild target
(taruh repo Freeday di dekat project, sesuaikan path) di `.csproj`:
```xml
<Target Name="CopyFreedayAssets" BeforeTargets="ResolveStaticWebAssetsInputs;Build">
  <ItemGroup>
    <_FreedaySrc Include="PATH\dist\freeday.bundle.css;PATH\dist\freeday.js;PATH\adapters\blazor\freeday-blazor.js" />
  </ItemGroup>
  <Copy SourceFiles="@(_FreedaySrc)" DestinationFolder="$(MSBuildProjectDirectory)\wwwroot\freeday" SkipUnchangedFiles="true" />
</Target>
```

### 2. Set tema + muat aset di `wwwroot/index.html`
Muat `freeday.js` lalu `freeday-blazor.js` **sebelum** `blazor.webassembly.js`:
```html
<html lang="id" data-theme="light" data-density="comfortable">
<head>
  <link rel="stylesheet" href="freeday/freeday.bundle.css" />
</head>
<body>
  <div id="app">Memuat…</div>
  <script src="freeday/freeday.js"></script>
  <script src="freeday/freeday-blazor.js"></script>
  <script src="_framework/blazor.webassembly.js"></script>
</body>
```
> Pakai IIFE global (`window.FreedayBlazor`), **bukan** ES module — supaya lolos strict-MIME di host statis.

### 3. Hydrate + jembatani event di code-behind (`.razor.cs`)
Di `OnAfterRenderAsync(firstRender)`: `initAll` lalu `on(...)` per event → method `[JSInvokable]`.
Lepas di `DisposeAsync`.
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
        await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);   // hydrate markup Blazor
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
@* Panel.razor — @ref pada wadah subtree, kelas fdy-* + hook data-fdy-* di markup *@
<div @ref="_root">
  <button class="fdy-btn fdy-btn--primary" type="button">Simpan</button>
  <div data-fdy-cascade></div>
  <div data-fdy-datepicker></div>
</div>
```
Ekstra: `FreedayBlazor.toast(new { variant, title, message })` untuk toast; `FreedayBlazor.toggleTheme()`
untuk flip tema. DTO event di-deserialize case-insensitive oleh Blazor.

Contoh utuh yang jalan: [`examples/blazor-faktur/`](../examples/blazor-faktur/).

---

## Verifikasi (semua stack)

Jalankan project → cek dua hal:
1. **CSS nyambung** — tombol/kartu sudah ber-style (bukan HTML polos).
2. **Enhancer nyambung** — komponen interaktif hidup (mis. datepicker/combo terbuka saat diklik),
   dan `event.detail` masuk ke state-mu.

Kalau visual polos → CSS belum ke-load. Kalau visual OK tapi widget mati → enhancer belum
ter-*hydrate* (pastikan `import 'freeday'` / `<script freeday.js>` ada, dan adapter/`initAll` dipanggil
untuk DOM dinamis).
