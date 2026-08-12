# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.20.0 — siap di-commit, BELUM di-push/publish.** Dua badan kerja dalam satu rilis (v1.19.0
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

Gate saat ini: `npm test` **29/29** · `npm run test:browser` **8/8** (dua guard baru untuk
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
