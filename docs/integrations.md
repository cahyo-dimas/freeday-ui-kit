# Freeday — Peta Integrasi Library

Freeday itu **fondasi tanpa dependency**: token + markup aksesibel + enhancer vanilla.
Dokumen ini memetakan tiap area ke library ekosistem yang biasa kamu pasang di project
nyata, **kapan** cukup pakai bawaan Freeday, dan **cara menjembataninya**. Tujuannya: pas
mulai project baru, buka satu file ini — tak perlu cari-cari lagi.

> Aturan emas: **Freeday pegang tampilan (token + markup + a11y), library pegang mesin
> (logika/engine berat).** Jangan duplikat. Sambungkan lewat 3 mekanisme di bawah.

---

## 3 mekanisme jembatan

Semua integrasi turun ke salah satu dari ini:

1. **Event `fdy-*`** — dengarkan output enhancer, teruskan ke state framework/library.
   Semua event *bubbling* `CustomEvent`, datanya di `event.detail`.
2. **Init hook `window.Freeday<X>.initAll(el)`** — panggil ulang setelah DOM dirender
   dinamis (Vue `onMounted`, React `useEffect`, Blazor `OnAfterRenderAsync`). Idempotent.
3. **Token warna** — samakan warna library dengan tema aktif:
   ```js
   // Read a live semantic token so a 3rd-party lib matches the current theme
   const token = (name) =>
     getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   const primary = token('--color-primary'); // e.g. Chart.js borderColor
   ```

### Kontrak event & API (referensi cepat)

| Enhancer | Event `detail` | API global |
|---|---|---|
| `freeday-select` | `fdy-change` `{value}` | `FreedayCombo` |
| `freeday-autocomplete` | `fdy-autocomplete-select` `{value}` | `FreedayAutocomplete` |
| `freeday-cascade` | `fdy-cascade-change` `{value,path,labels}` | `FreedayCascade` |
| `freeday-cfl` | `fdy-cfl-select` `{row}`/`{rows}` | `FreedayCfl` |
| `freeday-datepicker` | `fdy-datepicker-change` `{value,date}` | `FreedayDatepicker` |
| `freeday-timepicker` | `fdy-time-select` `{value}` | `FreedayTimepicker` |
| `freeday-datetime` | `fdy-datetime-change` `{date,time,value}` | `FreedayDatetime` |
| `freeday-mask` | `fdy-mask` `{value,raw}` | `FreedayMask` |
| `freeday-form` | `fdy-form-invalid` `{invalid}` / `fdy-form-valid` | `FreedayForm` |
| `freeday-table` | `fdy-table-change` · `fdy-row-select` | `FreedayTable` |
| `freeday-chip` | `fdy-chip-change` `{value,pressed,selected}` · `fdy-chip-remove` `{value}` | `FreedayChip` |
| `freeday-upload` | `fdy-upload-add` / `fdy-upload-remove` | `FreedayUpload` |
| `freeday-stepper` | `fdy-step-change` | `FreedayStepper` |
| `freeday-carousel` | `fdy-carousel-change` | `FreedayCarousel` |
| `freeday-breakpoint` | `fdy-breakpoint-change` | `FreedayBreakpoint` |
| `freeday-chart` | — (render-only) | `FreedayChart` |
| `freeday-toast` | — | `Freeday.toast({...})` |

---

## Peta per area

Legenda kolom **Cukup Freeday?**: ✅ pakai bawaan · ➕ bawaan + library · 🔌 tidak ada di
Freeday, murni library.

### Form, validasi & input

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Validasi | ✅ `freeday-form` | Aturan HTML native (required, email, pattern, min/max, match) | Schema kompleks, transform, dipakai server juga: **Zod** / **Yup** / **Valibot** · Vue: **VeeValidate** · React: **React Hook Form** · Blazor: **DataAnnotations** / **FluentValidation** | Jalankan schema di data layer → `input.setCustomValidity(msg)` (ditangkap `freeday-form`), atau toggle `aria-invalid` + isi `[data-fdy-error]`. Lihat contoh #1. |
| Mask input | ✅ `freeday-mask` | Pola statis (kartu, tanggal, telepon) | Mata uang/locale, mask dinamis: **imask** · **Maska** (Vue) · **react-imask** | Biarkan `.fdy-input` untuk gaya, pasang engine mask ke elemen yang sama. Contoh #2. |
| Password reveal | ✅ `freeday-mask` (`[data-fdy-password]`) | Semua kasus umum | Meter kekuatan: **zxcvbn** | Dengarkan `input`, render skor ke `.fdy-help`. |
| Select / dropdown | ✅ `freeday-select` (APG) | Opsi statis, single-select | Async, tag, virtualized ribuan opsi: **Tom Select** · **Choices.js** · React: **react-select** · Vue/Blazor: **PrimeVue/PrimeReact**, **MudBlazor** | Untuk remote search besar, pakai **`freeday-cfl`** (field + dialog, `fetchPage`). Contoh #6. |
| Autocomplete | ✅ `freeday-autocomplete` | Filter klien | Highlight, remote debounce berat: react-select/Tom Select | Dengarkan `fdy-autocomplete-select`. |
| Cascade / tree select | ✅ `freeday-cascade` | Hierarki drill-down | Tree checkbox multi-level, lazy load: **PrimeVue TreeSelect**, **MudBlazor TreeView** | `fdy-cascade-change` `{value,path}`. |
| File upload | ➕ `freeday-upload` (UI dropzone) | Pilih + tampil state per-berkas | Chunked/resumable, crop, progress nyata: **Uppy** · **FilePond** · **tus** (resumable) | Freeday = UI, Uppy = engine unggah. Dengarkan `fdy-upload-add` → serahkan file ke Uppy. |
| Rich text editor | 🔌 | — | **TipTap** · **Quill** · **Lexical** · Blazor: **Radzen HtmlEditor** | Bungkus editor, beri gaya via token `--color-*`. |

### Data & tabel

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Tabel | ✅ `freeday-table` | Sort/filter/paginasi klien, data sedang | Server-side, virtualisasi, grouping, pin kolom: **TanStack Table** (headless, Vue+React) · **AG Grid** · **MudBlazor MudDataGrid** · **PrimeVue DataTable** | TanStack headless → render pakai kelas `.fdy-table*` (gaya tetap Freeday). |
| Data fetching / cache | 🔌 | — | **TanStack Query** · **SWR** · Vue: **Pinia** | `freeday-cfl` `fetchPage` callback cocok dipadu Query. |
| Export Excel/PDF | 🔌 | — | **SheetJS (xlsx)** · **jsPDF** + **jspdf-autotable** | Ambil data dari state, bukan dari DOM. |
| Virtual scroll | 🔌 | — | **TanStack Virtual** · Vue: **vue-virtual-scroller** | — |

### Chart & visualisasi

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Chart | ➕ `freeday-chart` | Sparkline/bar/donut ringkas di card & dashboard | Interaktif (zoom, tooltip hover, multi-series, real-time, banyak tipe): **Chart.js** · **ApexCharts** · **ECharts** · React: **Recharts** / **visx** · Vue: **vue-chartjs** · Blazor: **ApexCharts.Blazor**, **MudBlazor Chart** | Mount library ke container; ambil warna dari token biar ikut tema. Contoh #3. |
| Peta | 🔌 | — | **Leaflet** · **MapLibre** | Beri gaya kontrol pakai token. |
| Diagram/flow | 🔌 | — | **Mermaid** · **React Flow** | — |

### Tanggal, angka & i18n

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Pilih tanggal/jam | ✅ `freeday-datepicker`/`timepicker`/`datetime` | Kalender & list waktu standar | Range presets, multi-bulan, locale rumit: **flatpickr** · React: **react-day-picker** | Freeday = UI pilih; parsing/format → date-fns. Contoh #4. |
| Math/format tanggal | 🔌 (pakai `Intl` native dulu) | Format sederhana → `Intl.DateTimeFormat` | Zona waktu, arithmetic, parsing: **date-fns** (+ `date-fns-tz`) · **Luxon** · **Day.js** | `format(parseISO(detail.value), 'dd MMM yyyy', { locale: id })`. |
| Format angka/uang | 🔌 (pakai `Intl` native dulu) | `Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR'})` | Kasus khusus: **dinero.js** (uang presisi) | Kombinasikan dengan `freeday-mask` untuk input. |
| i18n teks | 🔌 | — | **i18next** · Vue: **vue-i18n** · Blazor: **IStringLocalizer** | — |

### Overlay, posisi & motion

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Modal / dialog | ✅ modal (native `<dialog>`) | Fokus-trap + Esc sudah gratis | Headless primitives: **Radix** · **Headless UI** · **Ark UI** | Freeday pakai native — jarang perlu ganti. |
| Drawer | ✅ `freeday-drawer` | Overlay kiri/kanan | — | — |
| Tooltip / popover | ➕ tooltip (CSS) | Tooltip statis sederhana | Posisi sadar-collision (flip/shift), popover interaktif: **Floating UI** (`@floating-ui/dom`) | Pakai Floating UI untuk hitung posisi, gaya tetap token. Contoh #5. |
| Toast | ✅ `freeday-toast` | Notifikasi umum | Antrian/stack canggih: **Sonner** · **react-hot-toast** · **vue-toastification** | `Freeday.toast({variant,title,message})`. |
| Animasi | ✅ (CSS + hormati `prefers-reduced-motion`) | Transisi UI standar | Orkestrasi kompleks: **Motion One** · React: **Framer Motion** · **GSAP** | Selalu cek reduced-motion. |
| Carousel | ✅ `freeday-carousel` | Scroll-snap + panah + dots | Loop tak terbatas, parallax: **Embla** · **Swiper** | — |

### Navigasi, ikon & interaksi

| Area | Cukup Freeday? | Kapan cukup bawaan | Kalau butuh lebih | Jembatan |
|---|---|---|---|---|
| Ikon | ➕ (SVG inline) | Ikon bawaan set kecil | Set lengkap: **Lucide** (paling cocok — Freeday pakai gaya stroke ini), **Heroicons**, **Tabler**, **Phosphor** | Tempel SVG ke slot: `[data-fdy-icon]`, `.fdy-input-group__addon--icon`, `.fdy-combo__icon`. |
| Drag & drop / sortable | 🔌 | — | **SortableJS** (vanilla) · React: **dnd-kit** · Vue: **vuedraggable** | Susun pakai markup Freeday, DnD dari library. |
| Command palette | 🔌 | — | **cmdk** (React) · **kbar** | Gaya pakai token + `.fdy-kbd`. |
| Routing | 🔌 | — | Vue Router · React Router · Blazor Router | Setelah route change → `window.FreedayTable.initAll()` dsb. |

---

## Binding per framework

> **Jalur utama (disarankan):** pakai adapter siap pakai — composable `useFreeday` (Vue), hook
> `useFreeday` (React), atau `window.FreedayBlazor` (Blazor) — yang membungkus hydrate + jembatan
> event. Langkah lengkap per stack ada di **[`getting-started.md`](getting-started.md)**. Pola
> `initAll()` mentah di bawah adalah mekanisme dasarnya (dan fallback bila kamu tak pakai adapter).

Enhancer auto-init sekali saat `DOMContentLoaded`. Untuk DOM yang dirender dinamis:

**Vue 3**
```vue
<script setup lang="ts">
import { onMounted, onUpdated } from 'vue';
// Re-run Freeday enhancers over freshly rendered DOM (idempotent).
const rehydrate = (): void => { window.FreedayTable?.initAll(); window.FreedayForm?.initAll(); };
onMounted(rehydrate);
onUpdated(rehydrate);
</script>
```

**React**
```tsx
import { useEffect, useRef } from 'react';
function Panel(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  // Scope init to this subtree so it does not re-scan the whole document.
  useEffect(() => { window.FreedayCascade?.initAll(ref.current ?? undefined); }, []);
  return <div ref={ref} data-fdy-cascade />;
}
```
> **Alternatif controlled (parity dengan `v-model` Vue):** `freeday/react` juga mengekspor
> komponen typed `FdyCombo` / `FdyDatepicker` / `FdyDateRange` / `FdyAutocomplete` / `FdyCascade` /
> `FdyCfl` / `FdyChart` — `value`/`onChange` biasa,
> tanpa `data-fdy-*` + event listener manual:
> ```tsx
> import { FdyCombo } from 'freeday/react';
> <FdyCombo value={status} options={statusOptions} onChange={setStatus} ariaLabelledby="lbl-status" />
> ```
> `FdyDatepicker`/`FdyAutocomplete`/`FdyCascade`/`FdyCfl` pakai `value`/`onChange` yang sama;
> `FdyDateRange` pakai `{start, end}`; `FdyChart` pakai `series`/`values`. Set yang sama tersedia
> di `freeday/vue` lewat `v-model` — kedua adapter simetris penuh.
> Lihat [`getting-started.md` §React](getting-started.md#react-vite) dan
> `examples/react-faktur/src/App.tsx`. **Vite** transpile `.tsx` source-nya tanpa config tambahan;
> **Next.js** mungkin butuh `transpilePackages: ['freeday']`.

**Blazor**
```csharp
// Component.razor.cs — call the enhancer after Blazor renders the markup.
protected override async Task OnAfterRenderAsync(bool firstRender)
{
    if (firstRender)
        await JS.InvokeVoidAsync("FreedayForm.initAll");
}
```
```js
// wwwroot: expose a typed helper if you prefer, or listen for events and
// forward them to .NET via DotNetObjectReference.
document.addEventListener('fdy-form-invalid', (e) =>
  dotNetRef.invokeMethodAsync('OnFormInvalid', e.detail.invalid.length));
```

> **Alternatif:** re-implement komponen sebagai native framework (composable Vue / hook
> React / komponen Blazor), tapi **pertahankan markup + kontrak ARIA + kelas `fdy-*`**.
> Enhancer = implementasi rujukan, bukan keharusan.

---

## Contoh jembatan

### 1. Zod / Yup → `freeday-form`
Library pegang logika, Freeday pegang error UI aksesibel.
```js
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Format email tidak valid.'),
  age: z.coerce.number().min(17, 'Minimal 17 tahun.'),
});

const form = document.querySelector('[data-fdy-validate]');
form.addEventListener('submit', (e) => {
  const data = Object.fromEntries(new FormData(form));
  const result = schema.safeParse(data);
  if (!result.success) {
    e.preventDefault();
    // Map each Zod issue onto its control; freeday-form renders the message.
    for (const issue of result.error.issues) {
      const field = form.elements.namedItem(String(issue.path[0]));
      if (field) field.setCustomValidity(issue.message);
    }
    form.reportValidity(); // triggers freeday-form's paint via the invalid event
  }
});
// Clear the custom error as the user edits, so native + schema rules coexist.
form.addEventListener('input', (e) => e.target.setCustomValidity?.(''));
```
> Yup setara: `schema.validate(data, { abortEarly: false })` → tangkap `err.inner`
> (`{ path, message }`) di `catch`, lalu `setCustomValidity` per field.

### 2. imask → `.fdy-input` (mask lanjutan)
Pakai kalau butuh mata uang/locale yang di luar `data-fdy-mask`.
```js
import IMask from 'imask';
// Freeday keeps the input styling; imask owns the formatting engine.
IMask(document.querySelector('#amount'), {
  mask: 'Rp num',
  blocks: { num: { mask: Number, thousandsSeparator: '.', scale: 0 } },
});
```

### 3. Chart.js dengan warna token
```js
import { Chart } from 'chart.js/auto';
const token = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

new Chart(document.querySelector('#sales'), {
  type: 'line',
  data: { labels, datasets: [{
    data,
    borderColor: token('--color-primary'),
    backgroundColor: token('--color-primary-soft'),
  }]},
});
// Re-read tokens and update() when data-theme flips (watch with a MutationObserver).
```

### 4. `freeday-datepicker` + date-fns
```js
import { parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
document.querySelector('[data-fdy-datepicker]')
  .addEventListener('fdy-datepicker-change', (e) => {
    // e.detail.value is an ISO string; date-fns handles locale formatting.
    label.textContent = format(parseISO(e.detail.value), 'EEEE, dd MMMM yyyy', { locale: id });
  });
```

### 5. Floating UI untuk posisi tooltip/popover
```js
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
// Freeday styles the .fdy-tooltip; Floating UI keeps it inside the viewport.
computePosition(trigger, tip, { placement: 'top', middleware: [offset(8), flip(), shift({ padding: 8 })] })
  .then(({ x, y }) => Object.assign(tip.style, { left: `${x}px`, top: `${y}px` }));
```

### 6. Select async besar → `freeday-cfl`
Untuk ribuan baris dari server, jangan paksa `<select>` — pakai choose-from-list:
```js
window.FreedayCfl.init(el, {
  // Server owns paging/search; Freeday owns the accessible dialog UI.
  fetchPage: ({ query, page }) => api.get('/customers', { params: { query, page } }),
});
el.addEventListener('fdy-cfl-select', (e) => store.setCustomer(e.detail.row));
```

---

## Catatan SAP B1

Freeday murni untuk **web** (companion app, web addon .NET, portal). Addon **UI API
(SAPBouiCOM)** itu WinForms/COM — beda dunia, Freeday tak berlaku di sana. Untuk addon
berbasis web (Service Layer + .NET), Freeday + enhancer via JS interop jalan normal.

---

*Rekomendasi library = yang lazim & stabil per 2026; pilih sesuai lisensi & ukuran bundle
project. Freeday tidak mengikat satu pun — semua opsional dan bisa diganti.*
