# Freeday — Library Integration Map

Freeday is a **dependency-free foundation**: tokens + accessible markup + vanilla enhancers. This
document maps each area to the ecosystem library you'd normally install in a real project, **when**
Freeday's built-ins are enough, and **how to bridge**. The goal: when you start a new project, open
this one file — no more hunting around.

> Golden rule: **Freeday owns the look (tokens + markup + a11y); the library owns the engine
> (heavy logic).** Don't duplicate. Connect through the 3 mechanisms below.

---

## 3 bridging mechanisms

Every integration comes down to one of these:

1. **`fdy-*` events** — listen to enhancer output, forward it to framework/library state.
   All events are bubbling `CustomEvent`s; the data is in `event.detail`.
2. **Init hook `window.Freeday<X>.initAll(el)`** — call it again after DOM is rendered
   dynamically (Vue `onMounted`, React `useEffect`, Blazor `OnAfterRenderAsync`). Idempotent.
3. **Color tokens** — match a library's colors to the active theme:
   ```js
   // Read a live semantic token so a 3rd-party lib matches the current theme
   const token = (name) =>
     getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   const primary = token('--color-primary'); // e.g. Chart.js borderColor
   ```

### Event & API contract (quick reference)

| Enhancer | Event `detail` | Global API |
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

## Map by area

Legend for **Freeday enough?**: ✅ use the built-in · ➕ built-in + library · 🔌 not in Freeday,
library only.

### Forms, validation & input

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Validation | ✅ `freeday-form` | Native HTML rules (required, email, pattern, min/max, match) | Complex schemas, transforms, shared with the server: **Zod** / **Yup** / **Valibot** · Vue: **VeeValidate** · React: **React Hook Form** · Blazor: **DataAnnotations** / **FluentValidation** | Run the schema in your data layer → `input.setCustomValidity(msg)` (picked up by `freeday-form`), or toggle `aria-invalid` + fill `[data-fdy-error]`. See example #1. |
| Input mask | ✅ `freeday-mask` | Static patterns (card, date, phone) | Currency/locale, dynamic masks: **imask** · **Maska** (Vue) · **react-imask** | Keep `.fdy-input` for styling, attach the mask engine to the same element. Example #2. |
| Password reveal | ✅ `freeday-mask` (`[data-fdy-password]`) | All common cases | Strength meter: **zxcvbn** | Listen for `input`, render the score into `.fdy-help`. |
| Select / dropdown | ✅ `freeday-select` (APG) | Static options, single-select | Async, tags, thousands of virtualized options: **Tom Select** · **Choices.js** · React: **react-select** · Vue/Blazor: **PrimeVue/PrimeReact**, **MudBlazor** | For large remote search, use **`freeday-cfl`** (field + dialog, `fetchPage`). Example #6. |
| Autocomplete | ✅ `freeday-autocomplete` | Client-side filtering | Highlighting, heavy remote debounce: react-select/Tom Select | Listen for `fdy-autocomplete-select`. |
| Cascade / tree select | ✅ `freeday-cascade` | Drill-down hierarchy | Multi-level checkbox tree, lazy loading: **PrimeVue TreeSelect**, **MudBlazor TreeView** | `fdy-cascade-change` `{value,path}`. |
| File upload | ➕ `freeday-upload` (dropzone UI) | Pick + show per-file state | Chunked/resumable, cropping, real progress: **Uppy** · **FilePond** · **tus** (resumable) | Freeday = UI, Uppy = upload engine. Listen for `fdy-upload-add` → hand the file to Uppy. |
| Rich text editor | 🔌 | — | **TipTap** · **Quill** · **Lexical** · Blazor: **Radzen HtmlEditor** | Wrap the editor, style it via `--color-*` tokens. |

### Data & tables

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Table (vanilla) | ✅ `freeday-table` | Static/server-rendered HTML, client-side sort/filter/pagination | — | Enhancer over a plain `<table>`; **don't** use it on a Vue/React-rendered table (it snapshots the DOM). |
| Table (Vue/React) | ✅ `FdyTable` | `columns`/`rows` in, controlled sort/filter/page out; type-aware column filters (text/enum/number/date) | Virtualization, grouping, pinned columns: **TanStack Table** (headless) · **AG Grid** | `FdyTable` is the framework-safe primitive (reads `rows` every render). TanStack is headless → still render with `.fdy-table*` classes. |
| Data fetching / cache | 🔌 | — | **TanStack Query** · **SWR** · Vue: **Pinia** | `freeday-cfl`'s `fetchPage` and `FdyTable`'s controlled `sort`/`filters`/`page` pair well with Query. |
| Excel/PDF export | 🔌 | — | **SheetJS (xlsx)** · **jsPDF** + **jspdf-autotable** | Take data from state, not from the DOM. |
| Virtual scroll | 🔌 | — | **TanStack Virtual** · Vue: **vue-virtual-scroller** | — |

> **Monospace data cells:** add `.fdy-mono` to any identifier / code / IP / timestamp cell (or an
> inline `<span>`) to render it in the data font with tabular figures. It is alignment-neutral —
> unlike `.fdy-table__num`, which is also right-aligned. `FdyTable` applies it automatically to any
> column with `mono: true`.

### Charts & visualization

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Chart | ➕ `freeday-chart` | Compact sparkline/bar/donut in cards & dashboards | Interactive (zoom, hover tooltips, multi-series, real-time, many types): **Chart.js** · **ApexCharts** · **ECharts** · React: **Recharts** / **visx** · Vue: **vue-chartjs** · Blazor: **ApexCharts.Blazor**, **MudBlazor Chart** | Mount the library into a container; pull colors from tokens so it follows the theme. Example #3. |
| Maps | 🔌 | — | **Leaflet** · **MapLibre** | Style the controls with tokens. |
| Diagram/flow | 🔌 | — | **Mermaid** · **React Flow** | — |

### Dates, numbers & i18n

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Date/time picking | ✅ `freeday-datepicker`/`timepicker`/`datetime` | Standard calendar & time list | Range presets, multi-month, complex locales: **flatpickr** · React: **react-day-picker** | Freeday = the picking UI; parsing/formatting → date-fns. Example #4. |
| Date math/formatting | 🔌 (reach for native `Intl` first) | Simple formatting → `Intl.DateTimeFormat` | Time zones, arithmetic, parsing: **date-fns** (+ `date-fns-tz`) · **Luxon** · **Day.js** | `format(parseISO(detail.value), 'dd MMM yyyy', { locale: enUS })`. |
| Number/currency formatting | 🔌 (reach for native `Intl` first) | `Intl.NumberFormat('en-US', {style:'currency',currency:'USD'})` | Special cases: **dinero.js** (precise money) | Combine with `freeday-mask` for input. |
| Text i18n | 🔌 | — | **i18next** · Vue: **vue-i18n** · Blazor: **IStringLocalizer** | — |

### Overlays, positioning & motion

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Modal / dialog | ✅ modal (native `<dialog>`) · Vue/React: `FdyModal` | Focus trap + Esc + top layer come for free; `FdyModal` adds the controlled `open`/`onClose` glue | Headless primitives: **Radix** · **Headless UI** · **Ark UI** | Freeday uses native — rarely worth replacing. `FdyModal` writes the `showModal()`/`close()` + Esc + backdrop reconciliation once. |
| Drawer | ✅ `freeday-drawer` · Vue/React: `FdyDrawer` | Left/right overlay; `FdyDrawer` adds controlled `open`/`onClose` | — | Same controlled contract as `FdyModal`, `side="left"\|"right"`. |
| Tooltip / popover | ➕ tooltip (CSS) | Simple static tooltips | Collision-aware positioning (flip/shift), interactive popovers: **Floating UI** (`@floating-ui/dom`) | Use Floating UI to compute position; styling stays token-based. Example #5. |
| Toast | ✅ `freeday-toast` | Common notifications | Advanced queue/stack: **Sonner** · **react-hot-toast** · **vue-toastification** | `Freeday.toast({variant,title,message})`. |
| Animation | ✅ (CSS + respect `prefers-reduced-motion`) | Standard UI transitions | Complex orchestration: **Motion One** · React: **Framer Motion** · **GSAP** | Always check reduced-motion. |
| Carousel | ✅ `freeday-carousel` | Scroll-snap + arrows + dots | Infinite loop, parallax: **Embla** · **Swiper** | — |

### Navigation, icons & interaction

| Area | Freeday enough? | When the built-in is enough | If you need more | Bridge |
|---|---|---|---|---|
| Icons | ➕ (inline SVG) | A small built-in set | A full set: **Lucide** (best fit — Freeday uses this stroke style), **Heroicons**, **Tabler**, **Phosphor** | Drop the SVG into a slot: `[data-fdy-icon]`, `.fdy-input-group__addon--icon`, `.fdy-combo__icon`. |
| Drag & drop / sortable | 🔌 | — | **SortableJS** (vanilla) · React: **dnd-kit** · Vue: **vuedraggable** | Lay it out with Freeday markup, DnD from the library. |
| Command palette | 🔌 | — | **cmdk** (React) · **kbar** | Style with tokens + `.fdy-kbd`. |
| Routing | 🔌 | — | Vue Router · React Router · Blazor Router | After a route change → `window.FreedayTable.initAll()`, etc. |

---

## Per-framework binding

> **Recommended path:** use the ready-made adapters — the `useFreeday` composable (Vue), the
> `useFreeday` hook (React), or `window.FreedayBlazor` (Blazor) — which wrap hydration + event
> bridging. Full steps per stack are in **[`getting-started.md`](getting-started.md)**. The raw
> `initAll()` pattern below is the underlying mechanism (and a fallback if you don't use an adapter).

Enhancers auto-init once on `DOMContentLoaded`. For dynamically rendered DOM:

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
> **Controlled alternative (parity with Vue's `v-model`):** `@cahyo-dimas/freeday/react` also exports
> the typed components `FdyCombo` / `FdyDatepicker` / `FdyDateRange` / `FdyAutocomplete` /
> `FdyCascade` / `FdyCfl` / `FdyChart` / `FdyTable` / `FdyModal` / `FdyDrawer` — plain
> `value`/`onChange` (props in, events out), no `data-fdy-*` + manual event listener:
> ```tsx
> import { FdyCombo } from '@cahyo-dimas/freeday/react';
> <FdyCombo value={status} options={statusOptions} onChange={setStatus} ariaLabelledby="lbl-status" />
> ```
> `FdyDatepicker`/`FdyAutocomplete`/`FdyCascade`/`FdyCfl` use the same `value`/`onChange`;
> `FdyDateRange` uses `{start, end}`; `FdyChart` uses `series`/`values`; `FdyTable` takes
> `columns`/`rows` (client-side sort/filter/pagination, or controlled `sort`/`filters`/`page` for a
> server-paged table); `FdyModal`/`FdyDrawer` take `open` + `onClose`. The same set is available
> in `@cahyo-dimas/freeday/vue` via `v-model` / props — both adapters are fully symmetric. See
> [`getting-started.md` §React](getting-started.md#react-vite) and
> `examples/react-faktur/src/App.tsx`. **Vite** transpiles the `.tsx` source with no extra config;
> **Next.js** may need `transpilePackages: ['@cahyo-dimas/freeday']`.

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

> **Alternative:** re-implement a component as a native framework one (Vue composable / React hook /
> Blazor component), but **keep the markup + ARIA contract + `fdy-*` classes**. The enhancer is the
> reference implementation, not a requirement.

---

## Bridging examples

### 1. Zod / Yup → `freeday-form`
The library owns the logic; Freeday owns the accessible error UI.
```js
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email format.'),
  age: z.coerce.number().min(17, 'Must be at least 17.'),
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
> Yup equivalent: `schema.validate(data, { abortEarly: false })` → catch `err.inner`
> (`{ path, message }`) in `catch`, then `setCustomValidity` per field.

### 2. imask → `.fdy-input` (advanced masking)
Use this when you need currency/locale beyond `data-fdy-mask`.
```js
import IMask from 'imask';
// Freeday keeps the input styling; imask owns the formatting engine.
IMask(document.querySelector('#amount'), {
  mask: '$ num',
  blocks: { num: { mask: Number, thousandsSeparator: ',', scale: 0 } },
});
```

### 3. Chart.js with token colors
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
import { enUS } from 'date-fns/locale';
document.querySelector('[data-fdy-datepicker]')
  .addEventListener('fdy-datepicker-change', (e) => {
    // e.detail.value is an ISO string; date-fns handles locale formatting.
    label.textContent = format(parseISO(e.detail.value), 'EEEE, dd MMMM yyyy', { locale: enUS });
  });
```

### 5. Floating UI for tooltip/popover positioning
```js
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
// Freeday styles the .fdy-tooltip; Floating UI keeps it inside the viewport.
computePosition(trigger, tip, { placement: 'top', middleware: [offset(8), flip(), shift({ padding: 8 })] })
  .then(({ x, y }) => Object.assign(tip.style, { left: `${x}px`, top: `${y}px` }));
```

### 6. Large async select → `freeday-cfl`
For thousands of server-side rows, don't force a `<select>` — use choose-from-list:
```js
window.FreedayCfl.init(el, {
  // Server owns paging/search; Freeday owns the accessible dialog UI.
  fetchPage: ({ query, page }) => api.get('/customers', { params: { query, page } }),
});
el.addEventListener('fdy-cfl-select', (e) => store.setCustomer(e.detail.row));
```

---

## SAP B1 note

Freeday is purely for the **web** (companion apps, .NET web add-ons, portals). A **UI API
(SAPBouiCOM)** add-on is WinForms/COM — a different world where Freeday doesn't apply. For
web-based add-ons (Service Layer + .NET), Freeday + enhancers over JS interop work normally.

---

*Library recommendations reflect what's common and stable as of 2026; choose based on your
project's license and bundle-size budget. Freeday locks you into none of them — everything is
optional and replaceable.*
