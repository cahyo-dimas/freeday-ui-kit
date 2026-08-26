# Freeday — UI KIT Blueprint (Design Spec)

- **Status:** Draft for review
- **Date:** 2026-07-21
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Sumber inspirasi:** `reference/foundation-design-system.html` (starter design system, token-driven)
- **Nama produk:** **Freeday** · prefix kelas `fdy-` · package `freeday`

---

## 1. Ringkasan & Tujuan

**Freeday** adalah **design source-of-truth** milik sendiri: satu file token kanonik + halaman referensi hidup, bersifat *framework-agnostic*. Ia mewarisi filosofi token-driven dari Foundation, tetapi dengan identitas, struktur, dan cakupan komponen yang disesuaikan untuk **aplikasi bisnis/ERP** (dunia kerja pemilik: SAP B1, DevExtreme, PrimeVue).

### Tujuan (Goals)
1. **Satu sumber kebenaran visual**, semua warna, tipografi, spasi berasal dari `tokens.json`; kode per-project mengacu ke sana.
2. **Re-brand & dark mode murah**, ganti brand cukup ubah mapping token *primitive → semantic*; dark mode cukup re-definisi token *semantic*.
3. **Siap data-dense**, komponen data (grid, form, filter) adalah warga kelas satu, plus mode `compact`.
4. **Aksesibel by default**, kontras WCAG AA, focus ring, keyboard-friendly.
5. **Lintas-stack tanpa lock-in**. CSS variables untuk semua stack web; `tokens.json` bisa disuplai ke generator (Tailwind/MudBlazor/Flutter) saat dibutuhkan.

### Bukan tujuan (Non-goals) untuk v1
- Bukan component library ter-*compile* per framework (Vue/React/Blazor package), itu layer di atas source-of-truth, bukan v1.
- Bukan mempertahankan ke-7 visual style Foundation, hanya **1 gaya utama** + dark/light di v1 (sisanya roadmap).
- Bukan pola khusus SAP B1 di core, itu *extension pack* terpisah nanti.

---

## 2. Keputusan yang Terkunci (hasil interview)

| # | Keputusan | Pilihan |
|---|---|---|
| 1 | Bentuk KIT | **Design source-of-truth** (framework-agnostic, token file + referensi hidup) |
| 2 | Strategi build | **Hybrid**, token layer ditulis bersih dari nol, komponen di-port dari Foundation |
| 3 | Identitas visual | **"Azure"** (azure `#2050d8` primary + accent sky/Microsoft-Azure `#0078d4`, netral slate dingin) |
| 4 | Cakupan komponen | Foundation **+ komponen business-app** (app shell, data grid, master-detail, wizard, filter bar, pagination, states) |
| 5 | Target konsumsi | **CSS variables + `tokens.json` kanonik (W3C DTCG)**; adapter stack lain on-demand |
| 6 | Visual styles v1 | **1 gaya utama (`soft`) + dark/light**; gaya lain = roadmap |
| 7 | Nama | **Freeday** (prefix `fdy-`) |

---

## 3. Prinsip (warisan Foundation, dipertahankan)

**Usage:**
1. **Semantic only**, komponen memakai token *semantic/component*, tak pernah nilai mentah.
2. **4px grid**, semua spasi kelipatan 4px.
3. **One accent per view**, satu warna aksen dominan per layar.
4. **Accessible by default**. AA, focus visible, target sentuh memadai.

**Token discipline:**
1. **Compose first**, rakit dari token yang ada.
2. **Extend with a modifier**, kalau kurang, tambah modifier (mis. `--btn` varian).
3. **Only then create**, baru bikin token baru bila benar-benar perlu.
4. **Never add a raw value**, jangan pernah menaruh hex/px mentah di komponen.

---

## 4. Arsitektur Token — 3 Lapis (model PrimeVue Aura)

Komponen **hanya** menyentuh Tier 2 & 3. Tier 1 tak pernah dipakai langsung.

```
Tier 1 · PRIMITIVE   nilai mentah (ramp warna, skala), tidak dipakai di komponen
Tier 2 · SEMANTIC    peran/makna, berubah saat theme (light/dark) & saat re-brand
Tier 3 · COMPONENT   opsional, hanya untuk override lokal per komponen
```

Contoh alur:
```
--azure-600:#2050d8            (Tier 1)
--color-primary:var(--azure-600)   (Tier 2)
--fdy-btn-bg:var(--color-primary)   (Tier 3, opsional)
```

---

## 5. Token Catalog (nilai final)

> Format kanonik = `tokens.json` (W3C Design Tokens Community Group). Di bawah ini nilai referensi; `build.mjs` men-generate `dist/freeday.tokens.css`.

### 5.1 Primitive — Color ramps

**Azure (brand)**
```
50 #eff4ff · 100 #dbe6fe · 200 #bdd2fd · 300 #90b3fb · 400 #5c8bf6 · 500 #3467ec
600 #2050d8 · 700 #1c40b0 · 800 #1c398c · 900 #1c336e · 950 #131e42
```
**Slate (neutral, cool)**
```
0 #ffffff · 50 #f7f8fa · 100 #eef0f4 · 200 #e0e3ea · 300 #cbd0da · 400 #99a1b3
500 #6b7488 · 600 #4d5568 · 700 #3a4152 · 800 #262b38 · 900 #171b26 · 950 #0e111a
```
**Sky / Azure light (accent)**
```
50 #eff6fd · 100 #d6e9fb · 200 #b0d4f6 · 300 #7bbdef · 400 #47a1e6 · 500 #1a86dc
600 #0078d4 · 700 #0061ac · 800 #004d88 · 900 #003a67
```
**Support (semantic)**, ramp ringkas 50/100/500/600/700
```
Red     50 #fef2f2 · 100 #fee2e2 · 500 #ef4444 · 600 #dc2626 · 700 #b91c1c
Amber   50 #fffbeb · 100 #fef3c7 · 500 #f59e0b · 600 #d97706 · 700 #b45309
Green   50 #f0fdf4 · 100 #dcfce7 · 500 #22c55e · 600 #16a34a · 700 #15803d
Blue    50 #eff6ff · 100 #dbeafe · 500 #3b82f6 · 600 #2563eb · 700 #1d4ed8
```

### 5.2 Semantic — Light (default)
```
--color-primary        #2050d8      --color-text         #171b26
--color-primary-hover  #1c40b0      --color-text-muted   #4d5568
--color-primary-active #1c398c      --color-text-subtle  #6b7488
--color-on-primary     #ffffff      --color-text-onbrand #ffffff
--color-primary-soft   #eff4ff
--color-primary-border #dbe6fe      --color-surface      #ffffff
                                     --color-surface-2    #f7f8fa
--color-accent         #0078d4      --color-surface-3    #eef0f4
--color-accent-hover   #0f766e
--color-on-accent      #ffffff      --color-border       #e0e3ea
                                     --color-border-strong#cbd0da
--focus-ring           #2050d8      --color-border-muted #eef0f4

--color-success #16a34a  --success-soft #dcfce7
--color-warning #c2740a  --warning-soft #fef3c7
--color-danger  #dc2626  --danger-soft  #fee2e2
--color-info    #2563eb  --info-soft    #dbeafe
```

### 5.3 Semantic — Dark (`data-theme="dark"` re-definisi Tier 2 saja)
```
--color-primary        #3467ec      --color-text         #eef0f4
--color-primary-hover  #5c8bf6      --color-text-muted   #99a1b3
--color-primary-active #90b3fb      --color-text-subtle  #6b7488
--color-on-primary     #ffffff
--color-primary-soft   rgba(32,80,216,.20)
--color-primary-border rgba(92,139,246,.28)

--color-accent         #24c49d      --color-surface      #0e111a
--color-accent-hover   #5eead4      --color-surface-2    #171b26
--color-on-accent      #06231f      --color-surface-3    #262b38

--focus-ring           #5c8bf6      --color-border       #262b38
                                     --color-border-strong#3a4152
                                     --color-border-muted #1c2130

--color-success #22c55e  --success-soft rgba(34,197,94,.18)
--color-warning #eab308  --warning-soft rgba(234,179,8,.18)
--color-danger  #f87171  --danger-soft  rgba(248,113,113,.18)
--color-info    #60a5fa  --info-soft    rgba(96,165,250,.18)
```

### 5.4 Typography
```
--font-display 'Sora', ui-sans-serif, system-ui, sans-serif
--font-body    'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, sans-serif
--font-mono    'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace

Scale:  xs .75 · sm .875 · base 1 · lg 1.125 · xl 1.25 · 2xl 1.5625 · 3xl 1.9375 · 4xl 2.4375 · 5xl 3.0625 (rem)
Leading: tight 1.2 · snug 1.35 · normal 1.55 · loose 1.75
Tracking: tight -.02em · normal 0 · wide .06em
Weight:  regular 400 · medium 500 · semibold 600 · bold 700
```

### 5.5 Spacing (4px grid)
```
0 0 · 1 .25 · 2 .5 · 3 .75 · 4 1 · 5 1.25 · 6 1.5 · 8 2 · 10 2.5 · 12 3 · 16 4 · 20 5 · 24 6 (rem)
```

### 5.6 Radius
```
xs 4px · sm 6px · md 8px · lg 12px · xl 16px · full 999px
```

### 5.7 Elevation (light)
```
--shadow-1 0 1px 2px rgba(16,14,30,.06)
--shadow-2 0 2px 6px rgba(16,14,30,.07), 0 1px 2px rgba(16,14,30,.05)
--shadow-3 0 8px 24px rgba(16,14,30,.10), 0 2px 6px rgba(16,14,30,.06)
--shadow-4 0 20px 48px rgba(16,14,30,.16), 0 4px 12px rgba(16,14,30,.08)
```
Dark: `--shadow-1..4` memakai `rgba(0,0,0,.4 … .6)`.

### 5.8 Motion
```
--dur-fast 120ms · --dur-base 200ms · --dur-slow 320ms
--ease-standard cubic-bezier(.2,0,0,1)
--ease-spring   cubic-bezier(.2,.8,.2,1)
```
Hormati `prefers-reduced-motion: reduce` → matikan transisi non-esensial.

### 5.9 Density knobs
```
--control-h  comfortable 2.5rem | compact 2rem
--bw         1px (global border width)
```

### 5.10 Token tambahan (dari implementasi v0.1)
Ditambahkan saat build v0.1 agar tak ada nilai mentah pada warna/outline:
```
--focus-ring-width  2px            (lebar & offset outline :focus-visible)
--color-on-danger   #ffffff        (light) | #4a0f0f (dark)
                    teks tombol danger; dark dibuat gelap agar AA di atas
                    --color-danger yang menjadi merah-muda (#f87171) di dark.
```

---

## 6. Theming Model — 3 sumbu via `data-*` di `<html>`

| Atribut | Nilai | Efek | v1? |
|---|---|---|---|
| `data-theme` | `light` \| `dark` | Re-definisi token **semantic** | ✅ wajib |
| `data-density` | `comfortable` \| `compact` | `--control-h` (layar data-dense) | ✅ |
| `data-style` | `soft` (default) · `glass` | Sumbu gaya visual | ✅ terkirim di 3.0.0 |

Gaya default **`soft`** = flat bersih, shadow halus, radius sedang.

> **Koreksi (2026-08-26).** Baris ini dulu berbunyi bahwa knob `--blur/--sat/--inset` sudah
> "dicadangkan (default no-op)". Ketiganya **tidak pernah dibuat** — grep ke `src/`, `dist/` dan
> `tokens/` mengembalikan nol, dan fondasi untuk gaya kedua adalah nol, bukan setengah jalan. Klaim
> itu menaikkan estimasi setiap pekerjaan yang bergantung padanya. Knob yang benar-benar terkirim di
> 3.0.0 bernama `--surface-filter`, `--surface-inset` dan `--color-surface-raised`, dan janji
> "tanpa mengubah komponen" **tidak** terpenuhi: keluarga panel harus ikut membaca token permukaan
> terangkat, karena memfrost `--color-surface` sendiri akan membuat kolom beku tabel tembus pandang.

---

## 7. Inventaris Komponen

Legenda: **⬆** port dari Foundation · **✦** baru (business-app)

| Grup | Komponen |
|---|---|
| **Layout & shell** | app shell (sidebar+topbar) ✦ · page ⬆ · card ⬆ · grid/stack/divider ⬆ |
| **Forms** | button ⬆ · input/textarea ⬆ · select/combobox ⬆ · checkbox/radio/switch ⬆ · datepicker ⬆ · choose-from-list field+dialog ⬆ · file upload ⬆ · field/label/help ⬆ · filter bar ✦ · form layout (2-kolom & header+baris/dokumen) ✦ |
| **Data** | table ⬆ · advanced data grid (sort/filter/bulk/sticky) ⬆✦ · pagination ✦ · data states (empty/loading/error) ⬆ · skeleton ⬆ |
| **Feedback** | alert ⬆ · toast ⬆ · modal ⬆ · progress ⬆ · tooltip ⬆ · badge/tag ⬆ · avatar ⬆ · kbd ⬆ |
| **Navigation** | tabs ⬆ · breadcrumb ⬆ · wizard/stepper ✦ |

### Prioritas rilis (token-first)
- **v0.1 (MVP, token-first)**, `tokens.json` + `build.mjs` + theming (light/dark + density) + `docs/index.html` skeleton + komponen: **button, input, card, badge**. *Tujuan: buktikan pipeline `json → css → komponen → docs` end-to-end, utuh tapi sempit.*
- **v0.2 (polish + layar bisnis pertama)**: **refinement visual "rich"** (default look Freeday mulai v0.2: elevation berlapis/`--shadow-lift`, tombol gradient halus + colored-shadow *glow*, `:active` press, focus ring lebih tegas, teks badge `-strong` **lolos AA**) **+** app shell (sidebar+topbar), table, modal (native `<dialog>`), form controls (select/checkbox/radio/switch); **embed font asli di docs** + **demo "satu layar bisnis"**. Native-first, CSS-first, 0 dependency, JS vanilla minimal (native dialog). *(divalidasi via mockup before/after)*
- **v0.3**, alert/toast, advanced data grid, combobox, datepicker, choose-from-list, file upload, tabs, breadcrumb, filter bar, pagination, data states, skeleton.
- **v0.4**, wizard/stepper, master-detail/document form, avatar/tooltip/kbd, progress, + preset gaya tambahan.

---

## 8. Struktur Folder (ringan, tanpa toolchain berat)

```
freeday/
  tokens/
    tokens.json           # sumber sejati (W3C DTCG)
    build.mjs             # script Node kecil: tokens.json -> css vars
  src/
    tokens/               # (opsional) sumber token per-kategori sebelum digabung
    components/*.css       # satu file per komponen, kelas fdy-*
  dist/
    freeday.tokens.css     # generated (light + dark + density)
    freeday.css            # bundel komponen
  docs/
    index.html             # living reference (evolusi Foundation)
  CLAUDE.md
  README.md
```

**Prinsip build:** `build.mjs` cukup Node murni (baca JSON → tulis CSS). Tidak wajib Style Dictionary di v1 (YAGNI); bisa diadopsi nanti bila generator multi-stack dibutuhkan.

---

## 9. Konvensi Penamaan

- **Prefix kelas:** `fdy-` (mis. `fdy-btn`, `fdy-input`, `fdy-card`).
- **Pola:** BEM ringkas, `fdy-card`, `fdy-card__title`, `fdy-card--elevated`.
- **Token semantic:** `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease-*`.
- **Token component (Tier 3):** `--fdy-<komponen>-<properti>` (mis. `--fdy-btn-bg`).
- **Nilai mentah (kebijakan pragmatis):** Warna **selalu** token. Spasi yang cocok skala `--space-*` **wajib** pakai token (mis. `.5rem` → `var(--space-2)`). Literal lokal-komponen tanpa padanan token (padding relatif `em`, hairline `1.5px`, spread focus `3px`, `min-height` ad-hoc) boleh sebagai literal. Prinsip §3 "never a raw value" mengikat **warna & spasi berskala**, bukan setiap literal.

---

## 10. Konsumsi (per-project)

1. **Project web** → import `dist/freeday.tokens.css` + `dist/freeday.css`; pakai kelas `fdy-*`, atau konsumsi token-nya saja dan biarkan komponen project membaca CSS vars.
2. **Claude-assisted** → arahkan Claude ke `tokens/tokens.json` + `docs/index.html`; Claude men-generate kode per-stack yang mengacu token (analog "Reusable design brief" Foundation).
3. **Stack lain (on-demand)** → jalankan generator dari `tokens.json`:
   - Tailwind → `tailwind.preset.js`
   - Blazor/MudBlazor → `AppTheme.cs`
   - Flutter → `ThemeData`

*(Generator ini bukan v1; struktur `tokens.json` yang DTCG-compliant memastikan mereka bisa dibangun kapan saja.)*

---

## 11. Aksesibilitas (wajib)

### 11.1 WCAG (visual)
- Kontras teks **WCAG AA** (≥ 4.5:1 teks normal, ≥ 3:1 teks besar/UI) di light & dark.
- `:focus-visible` selalu terlihat (outline 2px `--focus-ring`, offset 2px).
- Target interaktif ≥ 32px (compact, `--control-h` 2rem) / 40px (comfortable, 2.5rem), memenuhi & melampaui WCAG 2.2 target minimum (24px).
- Status tidak hanya lewat warna, sertakan ikon/teks.
- `prefers-reduced-motion` dihormati.
- Button primary dipilih agar teks putih lolos AA.

### 11.2 Kebijakan ARIA
**ARIA** (Accessible Rich Internet Applications) = atribut `role` + `aria-*` yang memberi tahu teknologi bantu (screen reader) **apa** sebuah elemen, **keadaannya**, dan **hubungannya**, saat HTML biasa belum cukup. Tiga jenis: **role** (mis. `role="dialog"`), **property** (relatif tetap, mis. `aria-label`, `aria-describedby`), **state** (dinamis, mis. `aria-expanded`, `aria-invalid`, `aria-busy`).

Aturan Freeday:
1. **HTML semantik dulu — _"no ARIA is better than bad ARIA."_** Pakai `<button>`, `<input>`, `<nav>`, `<table>` native; ARIA hanya mengisi celah, bukan mengganti elemen native.
2. **Setiap komponen interaktif mengikuti pola baku WAI-ARIA APG** (role, state, keyboard, fokus), lihat kontrak §11.3. Sumber: W3C ARIA Authoring Practices Guide → https://www.w3.org/WAI/ARIA/apg/patterns/
3. **Docs menampilkan markup yang benar-benar aksesibel** (bukan hanya tampilan) agar siapa pun yang menyalin ikut mendapat ARIA + keyboard yang benar. Ini requirement docs, bukan opsional.
4. **Focus management** wajib untuk overlay (modal/dialog): perangkap fokus saat terbuka, kembalikan fokus ke pemicu saat tutup.
5. **Live region** untuk pesan dinamis: alert = `role="alert"`, toast = `role="status"` / `aria-live="polite"`.

### 11.3 Kontrak Aksesibilitas per komponen
Setiap komponen WAJIB mengimplementasikan barisnya. Komponen native (button/input/table) sebagian besar "gratis"; komponen custom (modal/tabs/combobox/datepicker) adalah tempat ARIA paling kritis.

| Komponen | Basis / role | ARIA kunci | Keyboard | Rilis |
|---|---|---|---|---|
| Button | `<button>` native | icon-only → `aria-label`; loading → `aria-busy`; toggle → `aria-pressed`; disabled → atribut `disabled` native | Enter / Space | v0.1 |
| Input / Field | `<input>` + `<label for>` (atau `<label>` membungkus) | error → `aria-invalid="true"` + `aria-describedby` ke pesan; wajib → `aria-required` | native | v0.1 |
| Card | container (`<article>`/`<section>`) + heading | jika seluruh card klikable → satu `<a>`/`<button>` di dalam, bukan `onclick` pada div | native | v0.1 |
| Badge / Tag | teks (`<span>`) | umumnya dekoratif; status dinamis → bungkus `role="status"`; tag removable → tombol `aria-label="Hapus …"` | — | v0.1 |
| Checkbox / Radio | `<input type>` native | native `checked`; grup radio dalam `<fieldset>`+`<legend>` | Space (checkbox), ↑↓ (grup radio) | v0.2 |
| Switch | `role="switch"` (atau checkbox) | `aria-checked` | Space / Enter | v0.2 |
| Select / Combobox | `role="combobox"` + `role="listbox"` | `aria-expanded`, `aria-controls`, `aria-activedescendant`, opsi `aria-selected` | ↑↓ Enter Esc, type-ahead | v0.3 |
| Datepicker | `role="dialog"` + `role="grid"` | `aria-modal`, grid `aria-label` bulan, hari `aria-selected` | panah, PageUp/Down, Esc | v0.3 |
| Choose-from-list dialog | `role="dialog"` + `role="listbox"` | `aria-modal`, `aria-labelledby`; multi → `aria-multiselectable` | listbox + dialog | v0.3 |
| File upload | `<input type=file>` + dropzone | dropzone `aria-label`; instruksi via `aria-describedby` | native | v0.3 |
| Table | `<table>` semantik | `<caption>`, `<th scope>`; kolom tersortir → `aria-sort="ascending\|descending"` | — | v0.2 |
| Data grid (interaktif) | `role="grid"` | `aria-rowcount`/`aria-colcount`, `aria-sort`, fokus sel (roving tabindex) | panah, Home/End, PageUp/Down | v0.3 |
| Pagination | `<nav aria-label="Paginasi">` + list | halaman aktif `aria-current="page"` | Tab / Enter | v0.3 |
| Tabs | `role="tablist"` / `tab` / `tabpanel` | `aria-selected`, tab `aria-controls`, panel `aria-labelledby` | ← → Home/End | v0.3 |
| Breadcrumb | `<nav aria-label="Breadcrumb">` + `<ol>` | item terakhir `aria-current="page"` | — | v0.3 |
| Modal / Dialog | `role="dialog"` | `aria-modal="true"`, `aria-labelledby`, `aria-describedby`; **focus trap + return focus** | Esc menutup, Tab siklik | v0.2 |
| Alert | `role="alert"` (implicit `aria-live="assertive"`) | — | — | v0.2 |
| Toast | region `aria-live="polite"`, tiap toast `role="status"` | `aria-atomic="true"`; tombol tutup fokusable | tombol tutup di-Tab | v0.2 |
| Tooltip | `role="tooltip"` | pemicu `aria-describedby` ke tooltip | Esc menutup; muncul saat hover **dan** focus | v0.4 |
| Avatar | `<img alt>` atau inisial teks | `alt` deskriptif; jika dekoratif → `aria-hidden="true"` | — | v0.4 |
| Progress | `role="progressbar"` | `aria-valuenow`/`min`/`max`, `aria-label` | — | v0.4 |
| Wizard / Stepper | `<nav>` + `<ol>` | langkah aktif `aria-current="step"` | — | v0.4 |
| App shell | landmark `<header>`/`<nav aria-label>`/`<main>`/`<aside>` | nav item aktif `aria-current="page"` | Skip-link ke `<main>` | v0.2 |

### 11.4 Testing aksesibilitas
- **Keyboard-only:** setiap alur dapat dioperasikan tanpa mouse; urutan Tab logis; fokus tidak terjebak (kecuali modal yang memang memerangkap lalu melepas saat ditutup).
- **Screen reader smoke test:** VoiceOver (macOS: `Cmd+F5`) untuk komponen interaktif, nama, role, dan state terbaca benar.
- **Otomatis (opsional, roadmap):** axe-core / Lighthouse a11y bila CI ditambahkan.

---

## 12. Kriteria Sukses

1. Satu layar bisnis penuh (list + filter bar + data grid + form + modal) bisa dirakit **hanya** dari Freeday.
2. Re-brand cukup mengubah mapping token **primitive → semantic**, tanpa menyentuh CSS komponen.
3. Dark mode cukup re-definisi token **semantic**.
4. `tokens.json` memakai format **DTCG-lite** (subset: `$value` + alias `{...}`; ekstensi non-standar `$dark`/`$compact`). `$type` + pemodelan mode standar DTCG = target v0.2.
5. Audit kontras AA: **teks & kontrol interaktif lolos AA** (light & dark) setelah fix dark danger/info + palet Azure (primary button dark kini **4.89:1**). Foreground *soft badge* juga **lolos AA 4.5:1** (light & dark) sejak v0.2, dipertegas ke `--color-*-strong`, soft-bg tetap (§13); terendah `danger` light **5.30:1**. Dijaga regresi oleh `test/contrast.test.mjs` (pasangan `*-strong` di atas `*-soft` di tiap surface).
6. `docs/index.html` menampilkan seluruh komponen v0.1 dalam kedua tema & kedua density.
7. Setiap komponen interaktif memenuhi **kontrak aksesibilitas §11.3** (role/aria/keyboard) dan lolos uji keyboard-only + smoke test VoiceOver. Markup di docs adalah versi yang aksesibel (bukan hanya visual).

---

## 13. Open Items / Masa Depan (bukan v1)

- Preset visual style tambahan (glass/liquid/clay/neumorph/material/bento) via `data-style`.
- Generator adapter multi-stack (Tailwind/MudBlazor/Flutter).
- Component library ter-*compile* per framework (Vue/React/Blazor package).
- SAP B1 *extension pack* (matrix/grid ala UI API, form dokumen header+baris, badge approval).
- Ikon set (dipilih/di-embed), di v1 pakai ikon inline seperlunya.
- **Kontras soft-badge → dituntaskan di v0.2:** teks soft badge dipertegas ke token baru `--color-*-strong` (light shade -700/-800, dark shade -400) agar lolos **AA 4.5:1**, soft-bg tetap. *(Label primary button dark sudah lolos 4.89:1 sejak palet Azure.)* Sekalian selaraskan `warning` dark (`amber.500` vs `#eab308` §5.3).
```

---

## Lampiran A — Aset yang sudah tersedia

- **Source Foundation** ter-ekstrak: `_template.txt` (±226 KB HTML bersih), sumber port komponen.
- **Font latin ter-embed** (base64, dari manifest Foundation): IBM Plex Sans (400/500/600/700), Sora (600/700), Manrope (600/700), JetBrains Mono (400/500).
- **Papan identitas** (artifact), perbandingan 3 arah, arah A "Azure & Teal" terpilih.
