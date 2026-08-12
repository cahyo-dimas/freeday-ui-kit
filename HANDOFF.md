# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.22.0 — 3 temuan lanjutan ronde 5 (§5-§7) + kit sekarang MERUTEKAN per stack.**

- **`.fdy-nav--horizontal`** — link nav yang SAMA disusun jadi baris, untuk app top-nav tanpa
  sidebar. Sengaja modifier, bukan blok baru: item, state, dan `aria-current="page"` tak berubah.
  Di `.fdy-appbar--primary` otomatis on-colour. Sebelumnya `.fdy-appbar` punya
  `__brand`/`__spacer`/`__actions` tapi tak punya tempat untuk *link*-nya.
- **`.fdy-tabs__tab` menerima `aria-current="page"`** → tampilan tab sah dipakai untuk sub-navigasi
  ber-rute dari `<a>` asli (`aria-selected` itu ARIA tak valid di anchor). Role tab + enhancer tetap
  untuk tab in-page.
- **State pressed** via `aria-pressed="true"` (ghost/text: soft+strong; solid: gradient terbalik +
  inset; danger: hue-nya sendiri) → `.fdy-btn-group` jadi segmented control **utuh**. Pelajaran:
  satu rule bersama `.fdy-btn[aria-pressed]` TAK BISA — gradient itu background-*image*, jadi
  shorthand-nya mereset `background-color` ke transparan dan pada spesifisitas sama rule terakhir
  menang → ghost kehilangan fill. Hanya kelihatan di engine asli → guard-nya di `browser/state.mjs`.
- **Hard rule 1 dapat pengecualiannya**: `.fdy-input-group__addon--icon` memang standalone.

**Routing per stack (semula disiapkan sebagai 1.21.1, dilebur ke sini).** Ditemukan dari project nyata yang terlanjur dibangun pakai markup mentah + enhancer padahal stack-nya punya wrapper typed. Akar masalahnya struktural, bukan redaksional: di **v1.18.0** `docs/getting-started.md` (satu-satunya perute per-stack) **tak ada di `files`**, jadi `npm i` mengirim README yang link "per stack"-nya menunjuk path yang tak ada di dalam `node_modules` — sementara `adapters/` ikut terkirim, jadi wrapper-nya nangkring tak terpakai. Blok paste `agent-onboarding.md` (satu-satunya teks yang dibaca agent tiap task) bahkan membuka dengan "**not a component framework**" — menjauhkan project Vue/React dari adapter. Sekarang: step 0 tabel rute di blok paste · penanda wrapper di **10** seksi `COMPONENTS.md` beserta binding aslinya (bukan seragam — modal/drawer `open`+`close`, chart data props, table `columns`+`rows`+event) · hard rule 7 · tabel rute di atas blok import pertama di kedua README · core concept 2 getting-started dibatasi ke jalur mentah.

---

**v1.21.0 — ronde 5 consumption feedback (`improvement-notes/005`, untracked): 3 temuan, semuanya
bug/gap kit, semuanya diukur di Chrome asli sebelum & sesudah fix.**
- **Label tersembunyi bisa men-scroll seluruh halaman.** `.fdy-visually-hidden` itu
  `position:absolute` dan `clip` menyembunyikan *painting*, bukan *layout* — tanpa ancestor
  ber-posisi, containing block-nya = dokumen, dan `overflow` hanya meng-clip yang containing
  block-nya ada di dalam kotak overflow. Jadi label tersembunyi di tabel yang scroll horizontal
  (cara kit sendiri menamai icon button) parkir di static position-nya dan menyeret dokumen ke
  samping: **1351px** dari 11 span; `overflow-x:hidden` di scroller/shell/`body`/`html` **0px**
  efeknya. Semua container yang meng-clip + menampung markup konsumen kini `position:relative`
  (`.fdy-table-scroll` · `.fdy-table-wrap` · `.fdy-list` · `.fdy-card` · `.fdy-tabs__list` ·
  `.fdy-carousel__viewport` · `.fdy-accordion`). Yang menarik: `.fdy-accordion` selama ini aman
  **hanya** karena animasi reveal panelnya (transform ⇒ containing block) — dan animasi itu di balik
  `prefers-reduced-motion: no-preference`, jadi bug-nya cuma kena pembaca yang minta reduced motion.
- **`--button` row/card mengabaikan `:disabled`** — hover tint + cursor pointer tetap hidup saat
  kontrol menolak input. Kini `:disabled` / `[aria-disabled="true"]` meredupkan + menarik hover,
  ikut konvensi kit (`opacity:.5` + `not-allowed`), bukan `cursor:default` seperti usul note.
- **`data-theme` tak lagi terikat `:root`** — langkah yang sama dengan density di v1.20.0. Dua
  selector eksplisit kini bare (`[data-theme="dark"]`/`[data-theme="light"]`), jadi
  `<section data-theme="dark">` membalik region itu dan **semua komponen di dalamnya ikut** —
  termasuk role tipografi seperti `.fdy-title-page` yang menyetel `color: var(--color-text)` sendiri
  sehingga tak pernah kena override tangan konsumen. **Default sistem sengaja tetap root-scoped:**
  note minta "dua selector", padahal ada tiga — meng-un-root blok `@media (prefers-color-scheme:
  dark)` bikin `:not([data-theme="light"])` cocok dengan *setiap* elemen, termasuk anak-anak dari
  light island (diukur: island jadi tinta terang di atas permukaan terang).
- **Ditolak & ditarik:** §A note 004 ("`.fdy-page-section` + `.fdy-table-scroll` tak compose")
  dicabut sendiri oleh pelapor setelah mengisolasi mekanisme sebenarnya. Kedua paruh penolakan
  v1.20.0 tereproduksi lagi di sini.
- **Guard baru:** `test/css.test.mjs` (invariant: rule ber-`overflow` wajib ber-posisi, atau
  terdaftar beserta ancestor yang sudah menampungnya) · `browser/layout.mjs` (bug escape yang sama
  end-to-end di Chrome asli) · `browser/theme.mjs` (komponen di dalam region ter-invert benar-benar
  ikut ganti token) · `test/build.test.mjs` (bentuk selector tema + urutan blok yang jadi sandaran
  cascade). Semuanya mutation-checked.

Gate: `npm test` **32/32** · `npm run test:browser` **11/11** · `typecheck:react` 0 error ·
`dotnet build` RCL 0 error/0 warning · rebuild byte-identical.

---

**v1.20.0.** Dua badan kerja dalam satu rilis (v1.19.0
disiapkan tapi tak pernah di-commit/tag/publish, jadi dilebur ke sini daripada meninggalkan versi
hantu).

**(b) Dari improvement note ronde 4** (`improvement-notes/004`, untracked): 5 keluhan terkonfirmasi,
1 premis ditolak, 1 bug dokumentasi milik sendiri yang tersingkap saat mengejarnya.
- **`.fdy-list`/`__row`** — container baris **rata** (border hairline, pembatas `--color-border-muted`,
  tanpa shadow). Doktrin §3 sudah lama bilang baris list harus rata, tapi satu-satunya container yang
  dikirim kit adalah `.fdy-card` yang memakai `--shadow-lift` (angkat 34px).
- **`FdyTable` `pageIndex` terkontrol** di **tiga** adapter (Vue/React/Blazor) — pager-nya ter-render di
  dalam `.fdy-datatable`, jadi layar yang menyembunyikan tabel di bawah `md` kehilangan pager; index
  client dulu ref privat tanpa prop/event/`goTo`. Blazor sekalian dapat `Process` (1.18 cuma Vue+React).
- **`breakpoints.nav` (721)** — angka switch sidebar tadinya cuma ada di `app-shell.css`; test baru
  memastikan ia tak bisa hanyut dari CSS-nya.
- **`data-density` tak lagi terikat `:root`** → bisa per-screen (custom property itu inherit).
- **FIX milik sendiri:** `USAGE.md` §3 salah mendeskripsikan skala elevasi kit (bilang `.fdy-card`
  pakai `--shadow-1`, padahal `--shadow-lift`; modal bukan `--shadow-4` tapi `--shadow-lift-hover`).
- **DITOLAK:** klaim "`.fdy-page-section` + `.fdy-table-scroll` tak compose" **tak tereproduksi**
  (diukur: tabel 1400px di kolom 688px → overflow halaman 0px) dan `min-width:0` yang diusulkan no-op.
  Ronde ketiga berturut-turut sebuah usulan fix ternyata tak mengubah apa pun.

**(a) Docs + pembersihan repo:** **`COMPONENTS.md`** (seluruh permukaan class publik dalam satu file rata — 425 class ada di
`src/components/`, tapi cuma ~33 yang muncul sebagai string literal di docs yang ter-ship),
**`docs/agent-onboarding.md`** (blok siap-tempel untuk `CLAUDE.md`/`AGENTS.md` project konsumen +
tabel mapping migrasi Bootstrap/MudBlazor → Freeday + checklist verifikasi),
**`docs/reference-screen.html`** (satu layar bisnis utuh dirakit `.fdy-app` → `.fdy-page` →
`.fdy-stats` → section; v1.18.0 mengirim primitif komposisi tapi tak ada yang mendemokannya
end-to-end), **`test/docs.test.mjs`** (drift guard: tiap class yang disebut dokumen harus ada di
kit — mutation-checked), dan `files` kini mengirim dokumen-dokumen itu **per-file, bukan `"docs"`**,
supaya `docs/superpowers/` tetap di luar tarball. Tarball 263.6 kB → 297.9 kB, 177 → 182 file.
`examples/` **sengaja tidak** dikirim (127 MB `node_modules` + 208 MB .NET `bin/obj` di bawahnya).
Dua temuan dicatat, bukan ditambal: `.fdy-pagination` tak punya rule CSS (hook penamaan saja) dan
`freeday-table.js` hard-code string Indonesia tanpa override — keduanya di backlog
[`NEXT-UP.md`](NEXT-UP.md) #6/#7.

Gate saat itu: `npm test` **29/29** · `npm run test:browser` **8/8** (dua guard baru untuk
`pageIndex`, mutation-checked) · `typecheck:react` 0 error · `dotnet build` RCL 0 error/0 warning.

Riwayat lengkap per-versi (termasuk jalur rilis v0.x → v1.20.0, alasan tiap fix, dan
bukti verifikasinya) ada di **[`CHANGELOG.md`](CHANGELOG.md)** — tidak diulang di sini.


- **48 file CSS** di `src/components/` (45 komponen + primitif `composition.css`/`breakpoints.css`) — termasuk `.fdy-filterbar` (baris filter) & `.fdy-form-grid` (grid header/dokumen)
- **24 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`) — termasuk `freeday-tree.js` (cascade tree checkbox)
- **3 adapter framework** terbukti — Vue / React / Blazor (`adapters/`), tiap-tiap dengan
  contoh faktur nyata yang diverifikasi headless (`examples/{vue,react,blazor}-faktur/`)
- **Komponen framework Vue + React — simetris penuh** (v1.2 → v1.8): sepuluh komponen controlled
  typed di **kedua** adapter — `FdyCombo` · `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` ·
  `FdyCascade` · `FdyCfl` (async terkontrol) · `FdyChart` · `FdyTable` (sort/filter/paginate,
  client atau server) · `FdyModal` · `FdyDrawer` — plus `usePopover` dan core tabel
  framework-agnostik `adapters/core/table-model.js`, semuanya di atas class CSS kit yang sama
  (WAI-ARIA APG, dropdown/popover top-layer lewat Popover API). Vue lewat
  `freeday/vue` (`v-model`), React lewat `freeday/react` (`value`/`onChange`). Tak ada lagi
  jembatan event manual untuk kontrol-kontrol ini.
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **28/28** hijau
- `dist/` di-commit & deterministik (rebuild = tanpa diff)

Definisi v1.0 terpenuhi: AA lolos audit · installable via git · ≥1 integrasi framework
terbukti · docs adopsi lengkap.

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i @cahyo-dimas/freeday` — panduan di
  [`README.md`](README.md) & [`docs/getting-started.md`](docs/getting-started.md)

## Build & test

```bash
node tokens/build.mjs   # tokens.json -> dist/freeday.tokens.css + freeday.css + copy dist/*.js
npm test                # node --test (28/28) — default gate, no browser
npm run test:browser    # real-Chrome interaction guards (focus/blur/pointer) — dev-only, auto-skips without Chrome. See browser/README.md
```

## Lokasi

- `tokens/tokens.json` · `tokens/build.mjs` — pipeline token (Tier-1/2/3)
- `src/components/*.css` + `src/freeday-*.js` — authored · `dist/` — hasil build (di-commit)
- `adapters/{vue,react,blazor}/` — integrasi framework · `examples/*-faktur/` — bukti pakai
- `COMPONENTS.md` — seluruh class publik · `USAGE.md` — doktrin · `docs/agent-onboarding.md` — untuk AI agent
- `docs/index.html` — demo-site · `docs/reference-screen.html` — 1 layar utuh · `getting-started.md` · `integrations.md`
- `docs/superpowers/specs/` — spec/blueprint (sumber-kebenaran desain). **Hanya spec kanonik yang
  tersisa**; plan-plan implementasi yang sudah tuntas dibuang di v1.20.0 (tak dikutip siapa pun,
  riwayatnya ada di CHANGELOG + git history).
- `reference/` — material input (artefak asal port + 15 arketipe layout), tak pernah di-ship

## Selanjutnya

Backlog aktif + titik lanjut ada di **[`NEXT-UP.md`](NEXT-UP.md)** — buka itu dulu kalau mau
nerusin. Ringkasnya: **tak ada yang mendesak**; sikap default = tunggu demand dari app nyata.

Rilis **otomatis via OIDC** (GitHub Actions, tanpa token/OTP) tiap kali tag `v*` di-push;
workflow-nya menggerbangi `node tokens/build.mjs` → `node --test` → `npm run typecheck:react`
sebelum `npm publish`. Runbook di `NEXT-UP.md`.

Cakupan komponen praktis lengkap. Sisa spec §7 — **data grid virtualisasi, form master-detail /
2-kolom** — sengaja ditunda: dibuat hanya saat project nyata membutuhkannya. Design system tak
pernah "selesai", dia ber-versi.
