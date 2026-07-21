# Foundry — UI KIT Blueprint (Design Spec)

- **Status:** Draft for review
- **Date:** 2026-07-21
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Sumber inspirasi:** `Foundation Design System.html` (starter design system, token-driven)
- **Nama produk:** **Foundry** · prefix kelas `fdy-` · package `foundry`

---

## 1. Ringkasan & Tujuan

**Foundry** adalah **design source-of-truth** milik sendiri: satu file token kanonik + halaman referensi hidup, bersifat *framework-agnostic*. Ia mewarisi filosofi token-driven dari Foundation, tetapi dengan identitas, struktur, dan cakupan komponen yang disesuaikan untuk **aplikasi bisnis/ERP** (dunia kerja pemilik: SAP B1, DevExtreme, PrimeVue).

### Tujuan (Goals)
1. **Satu sumber kebenaran visual** — semua warna, tipografi, spasi berasal dari `tokens.json`; kode per-project mengacu ke sana.
2. **Re-brand & dark mode murah** — ganti brand cukup ubah mapping token *primitive → semantic*; dark mode cukup re-definisi token *semantic*.
3. **Siap data-dense** — komponen data (grid, form, filter) adalah warga kelas satu, plus mode `compact`.
4. **Aksesibel by default** — kontras WCAG AA, focus ring, keyboard-friendly.
5. **Lintas-stack tanpa lock-in** — CSS variables untuk semua stack web; `tokens.json` bisa disuplai ke generator (Tailwind/MudBlazor/Flutter) saat dibutuhkan.

### Bukan tujuan (Non-goals) untuk v1
- Bukan component library ter-*compile* per framework (Vue/React/Blazor package) — itu layer di atas source-of-truth, bukan v1.
- Bukan mempertahankan ke-7 visual style Foundation — hanya **1 gaya utama** + dark/light di v1 (sisanya roadmap).
- Bukan pola khusus SAP B1 di core — itu *extension pack* terpisah nanti.

---

## 2. Keputusan yang Terkunci (hasil interview)

| # | Keputusan | Pilihan |
|---|---|---|
| 1 | Bentuk KIT | **Design source-of-truth** (framework-agnostic, token file + referensi hidup) |
| 2 | Strategi build | **Hybrid** — token layer ditulis bersih dari nol, komponen di-port dari Foundation |
| 3 | Identitas visual | **Baru — "Slate Indigo"** (indigo `#574fd6` + accent teal, netral slate dingin) |
| 4 | Cakupan komponen | Foundation **+ komponen business-app** (app shell, data grid, master-detail, wizard, filter bar, pagination, states) |
| 5 | Target konsumsi | **CSS variables + `tokens.json` kanonik (W3C DTCG)**; adapter stack lain on-demand |
| 6 | Visual styles v1 | **1 gaya utama (`soft`) + dark/light**; gaya lain = roadmap |
| 7 | Nama | **Foundry** (prefix `fdy-`) |

---

## 3. Prinsip (warisan Foundation, dipertahankan)

**Usage:**
1. **Semantic only** — komponen memakai token *semantic/component*, tak pernah nilai mentah.
2. **4px grid** — semua spasi kelipatan 4px.
3. **One accent per view** — satu warna aksen dominan per layar.
4. **Accessible by default** — AA, focus visible, target sentuh memadai.

**Token discipline:**
1. **Compose first** — rakit dari token yang ada.
2. **Extend with a modifier** — kalau kurang, tambah modifier (mis. `--btn` varian).
3. **Only then create** — baru bikin token baru bila benar-benar perlu.
4. **Never add a raw value** — jangan pernah menaruh hex/px mentah di komponen.

---

## 4. Arsitektur Token — 3 Lapis (model PrimeVue Aura)

Komponen **hanya** menyentuh Tier 2 & 3. Tier 1 tak pernah dipakai langsung.

```
Tier 1 · PRIMITIVE   nilai mentah (ramp warna, skala) — tidak dipakai di komponen
Tier 2 · SEMANTIC    peran/makna — berubah saat theme (light/dark) & saat re-brand
Tier 3 · COMPONENT   opsional, hanya untuk override lokal per komponen
```

Contoh alur:
```
--indigo-600:#574fd6            (Tier 1)
--color-primary:var(--indigo-600)   (Tier 2)
--fdy-btn-bg:var(--color-primary)   (Tier 3, opsional)
```

---

## 5. Token Catalog (nilai final)

> Format kanonik = `tokens.json` (W3C Design Tokens Community Group). Di bawah ini nilai referensi; `build.mjs` men-generate `dist/foundry.tokens.css`.

### 5.1 Primitive — Color ramps

**Indigo (brand)**
```
50 #eef0ff · 100 #e0e2ff · 200 #c7c8ff · 300 #a5a3fb · 400 #8781f4 · 500 #6f66ea
600 #574fd6 · 700 #473fb4 · 800 #3a3491 · 900 #322d74 · 950 #1f1b47
```
**Slate (neutral, cool)**
```
0 #ffffff · 50 #f7f8fa · 100 #eef0f4 · 200 #e0e3ea · 300 #cbd0da · 400 #99a1b3
500 #6b7488 · 600 #4d5568 · 700 #3a4152 · 800 #262b38 · 900 #171b26 · 950 #0e111a
```
**Teal (accent)**
```
50 #f0fdfa · 100 #ccfbf1 · 200 #99f6e4 · 300 #5eead4 · 400 #24c49d · 500 #14b8a6
600 #0d9488 · 700 #0f766e · 800 #115e59 · 900 #134e4a · 950 #042f2c
```
**Support (semantic)** — ramp ringkas 50/100/500/600/700
```
Red     50 #fef2f2 · 100 #fee2e2 · 500 #ef4444 · 600 #dc2626 · 700 #b91c1c
Amber   50 #fffbeb · 100 #fef3c7 · 500 #f59e0b · 600 #d97706 · 700 #b45309
Green   50 #f0fdf4 · 100 #dcfce7 · 500 #22c55e · 600 #16a34a · 700 #15803d
Blue    50 #eff6ff · 100 #dbeafe · 500 #3b82f6 · 600 #2563eb · 700 #1d4ed8
```

### 5.2 Semantic — Light (default)
```
--color-primary        #574fd6      --color-text         #171b26
--color-primary-hover  #473fb4      --color-text-muted   #4d5568
--color-primary-active #3a3491      --color-text-subtle  #6b7488
--color-on-primary     #ffffff      --color-text-onbrand #ffffff
--color-primary-soft   #eef0ff
--color-primary-border #e0e2ff      --color-surface      #ffffff
                                     --color-surface-2    #f7f8fa
--color-accent         #0d9488      --color-surface-3    #eef0f4
--color-accent-hover   #0f766e
--color-on-accent      #ffffff      --color-border       #e0e3ea
                                     --color-border-strong#cbd0da
--focus-ring           #574fd6      --color-border-muted #eef0f4

--color-success #16a34a  --success-soft #dcfce7
--color-warning #c2740a  --warning-soft #fef3c7
--color-danger  #dc2626  --danger-soft  #fee2e2
--color-info    #2563eb  --info-soft    #dbeafe
```

### 5.3 Semantic — Dark (`data-theme="dark"` re-definisi Tier 2 saja)
```
--color-primary        #6f66ea      --color-text         #eef0f4
--color-primary-hover  #8781f4      --color-text-muted   #99a1b3
--color-primary-active #a5a3fb      --color-text-subtle  #6b7488
--color-on-primary     #ffffff
--color-primary-soft   rgba(87,79,214,.20)
--color-primary-border rgba(135,129,244,.28)

--color-accent         #24c49d      --color-surface      #0e111a
--color-accent-hover   #5eead4      --color-surface-2    #171b26
--color-on-accent      #06231f      --color-surface-3    #262b38

--focus-ring           #8781f4      --color-border       #262b38
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

---

## 6. Theming Model — 3 sumbu via `data-*` di `<html>`

| Atribut | Nilai | Efek | v1? |
|---|---|---|---|
| `data-theme` | `light` \| `dark` | Re-definisi token **semantic** | ✅ wajib |
| `data-density` | `comfortable` \| `compact` | `--control-h` (layar data-dense) | ✅ |
| `data-style` | `soft` (default) | Hook untuk gaya lain (glass/neumorph/…) | ⏳ roadmap |

Gaya default **`soft`** = flat bersih, shadow halus, radius sedang. Knob `--blur/--sat/--inset` **dicadangkan** (default no-op) agar preset gaya masa depan bisa masuk tanpa mengubah komponen.

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
- **v0.1 (MVP — token-first)** — `tokens.json` + `build.mjs` + theming (light/dark + density) + `docs/index.html` skeleton + komponen: **button, input, card, badge**. *Tujuan: buktikan pipeline `json → css → komponen → docs` end-to-end, utuh tapi sempit.*
- **v0.2 (layar bisnis pertama)** — app shell (sidebar+topbar), table, modal, alert/toast, form controls (select/checkbox/radio/switch). *(cukup untuk merakit satu layar bisnis nyata)*
- **v0.3** — advanced data grid, combobox, datepicker, choose-from-list, file upload, tabs, breadcrumb, filter bar, pagination, data states, skeleton.
- **v0.4** — wizard/stepper, master-detail/document form, avatar/tooltip/kbd, progress, + preset gaya tambahan.

---

## 8. Struktur Folder (ringan, tanpa toolchain berat)

```
foundry/
  tokens/
    tokens.json           # sumber sejati (W3C DTCG)
    build.mjs             # script Node kecil: tokens.json -> css vars
  src/
    tokens/               # (opsional) sumber token per-kategori sebelum digabung
    components/*.css       # satu file per komponen, kelas fdy-*
  dist/
    foundry.tokens.css     # generated (light + dark + density)
    foundry.css            # bundel komponen
  docs/
    index.html             # living reference (evolusi Foundation)
  CLAUDE.md
  README.md
```

**Prinsip build:** `build.mjs` cukup Node murni (baca JSON → tulis CSS). Tidak wajib Style Dictionary di v1 (YAGNI); bisa diadopsi nanti bila generator multi-stack dibutuhkan.

---

## 9. Konvensi Penamaan

- **Prefix kelas:** `fdy-` (mis. `fdy-btn`, `fdy-input`, `fdy-card`).
- **Pola:** BEM ringkas — `fdy-card`, `fdy-card__title`, `fdy-card--elevated`.
- **Token semantic:** `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease-*`.
- **Token component (Tier 3):** `--fdy-<komponen>-<properti>` (mis. `--fdy-btn-bg`).

---

## 10. Konsumsi (per-project)

1. **Project web** → import `dist/foundry.tokens.css` + `dist/foundry.css`; pakai kelas `fdy-*`, atau konsumsi token-nya saja dan biarkan komponen project membaca CSS vars.
2. **Claude-assisted** → arahkan Claude ke `tokens/tokens.json` + `docs/index.html`; Claude men-generate kode per-stack yang mengacu token (analog "Reusable design brief" Foundation).
3. **Stack lain (on-demand)** → jalankan generator dari `tokens.json`:
   - Tailwind → `tailwind.preset.js`
   - Blazor/MudBlazor → `AppTheme.cs`
   - Flutter → `ThemeData`

*(Generator ini bukan v1; struktur `tokens.json` yang DTCG-compliant memastikan mereka bisa dibangun kapan saja.)*

---

## 11. Aksesibilitas (wajib)

- Kontras teks memenuhi **WCAG AA** (≥ 4.5:1 teks normal, ≥ 3:1 teks besar/UI) di light & dark.
- `:focus-visible` selalu terlihat (outline 2px `--focus-ring`, offset 2px).
- Target interaktif ≥ 32px (compact, `--control-h` 2rem) / 40px (comfortable, 2.5rem) — memenuhi & melampaui WCAG 2.2 target minimum (24px).
- Status tidak hanya lewat warna — sertakan ikon/teks (mis. badge status).
- `prefers-reduced-motion` dihormati.
- Semua button primary sudah dipilih agar teks putih lolos AA.

---

## 12. Kriteria Sukses

1. Satu layar bisnis penuh (list + filter bar + data grid + form + modal) bisa dirakit **hanya** dari Foundry.
2. Re-brand cukup mengubah mapping token **primitive → semantic**, tanpa menyentuh CSS komponen.
3. Dark mode cukup re-definisi token **semantic**.
4. `tokens.json` valid sebagai W3C DTCG.
5. Audit kontras AA lolos untuk semua komponen inti (light & dark).
6. `docs/index.html` menampilkan seluruh komponen v0.1 dalam kedua tema & kedua density.

---

## 13. Open Items / Masa Depan (bukan v1)

- Preset visual style tambahan (glass/liquid/clay/neumorph/material/bento) via `data-style`.
- Generator adapter multi-stack (Tailwind/MudBlazor/Flutter).
- Component library ter-*compile* per framework (Vue/React/Blazor package).
- SAP B1 *extension pack* (matrix/grid ala UI API, form dokumen header+baris, badge approval).
- Ikon set (dipilih/di-embed) — di v1 pakai ikon inline seperlunya.
```

---

## Lampiran A — Aset yang sudah tersedia

- **Source Foundation** ter-ekstrak: `_template.txt` (±226 KB HTML bersih) — sumber port komponen.
- **Font latin ter-embed** (base64, dari manifest Foundation): IBM Plex Sans (400/500/600/700), Sora (600/700), Manrope (600/700), JetBrains Mono (400/500).
- **Papan identitas** (artifact) — perbandingan 3 arah, arah A "Slate Indigo" terpilih.
