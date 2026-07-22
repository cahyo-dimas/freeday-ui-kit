# Changelog

Semua perubahan penting dicatat di sini. Format longgar mengikuti
[Keep a Changelog](https://keepachangelog.com/); tiap versi = git tag.

## [0.8.1] — 2026-07-22
### Added
- **Form validation** (`foundry-form.js`, `[data-fdy-validate]`) — Constraint Validation
  API di-wire ke error inline aksesibel: `aria-invalid` + pesan ter-`aria-describedby`,
  fokus ke field invalid pertama saat submit, re-validasi live tiap blur/input. Pesan
  custom `data-fdy-msg-*`, cocok antar-field `data-fdy-match`. Event `fdy-form-invalid`/
  `fdy-form-valid`, `window.FoundryForm`.
- **Password reveal + input mask** (`foundry-mask.js`) — `[data-fdy-password]` tambah
  toggle tampil/sembunyi (memakai ulang chrome tombol input-group); `[data-fdy-mask]`
  format saat mengetik (`#` digit, `A` huruf, `*` alnum, sisanya literal), raw value di
  `dataset.fdyRaw` + event `fdy-mask`. `window.FoundryMask`.
- **Cascade select** (`cascade.css` + `foundry-cascade.js`, `[data-fdy-cascade]`) —
  pemilih hierarki drill-down dari `<ul>` bersarang; cabang membuka level berikut, daun
  memilih (nilai = jalur lengkap), back/crumb + keyboard penuh. Event `fdy-cascade-change`,
  `window.FoundryCascade`.
- **Chip choice/filter** (`chip.css` + `foundry-chip.js`) — chip interaktif
  (`fdy-chip--choice` / `fdy-chip--filter`, `<button aria-pressed>`) dalam grup
  `[data-fdy-chips]` (`data-single` = pilih-satu), plus wiring hapus untuk
  `.fdy-chip__remove`. Event `fdy-chip-change` / `fdy-chip-remove`, `window.FoundryChip`.
### Changed
- `.fdy-input`/`.fdy-textarea` kini juga menampilkan border error lewat
  `aria-invalid="true"` (bukan cuma kelas `--error`), jadi enhancer cukup toggle satu
  atribut aksesibel.

## [0.8.0] — 2026-07-22
### Added
- **Installable sebagai paket GitHub.** `npm i github:cahyo-dimas/foundry-ui-kit#v0.8.0`.
  `package.json` kini punya `exports`, `files`, `sideEffects`. Jalur import:
  `foundry/css` (token+komponen), `foundry` (semua enhancer), `foundry/tokens`,
  `foundry/css/components`, `foundry/enhancers/<nama>`.
- `dist/foundry.bundle.css` — token + komponen dalam satu file (satu import, anti-footgun
  "lupa token").
- Skrip rilis: lifecycle `version` build-ulang + `git add dist`; `prepack` build-ulang.
### Changed
- `version` 0.1.0 → 0.8.0 (mulai semver bersih; komponen baru berikutnya = rilis minor 0.8.x).

## [0.7.0] — 2026-07-22
### Added
- **Time picker** (`foundry-timepicker.js`, `[data-fdy-timepicker]`) — trigger + popup daftar
  waktu (listbox WAI-ARIA), 24 jam, `data-step`/`data-min`/`data-max`, keyboard penuh.
- **Datetime picker** (`foundry-datetime.js`, `[data-fdy-datetimepicker]`) — komposisi date +
  time, satu event `fdy-datetime-change` (`YYYY-MM-DDTHH:MM`).
- **Konvensi varian ikon**: `data-fdy-no-icon` / `<template data-fdy-icon>` di date/time/datetime
  picker; `fdy-combo--no-icon` + `.fdy-combo__icon` di select; contoh ikon depan di input-group.
- Test regresi kontras WCAG (`test/contrast.test.mjs`) — audit graf token (light + dark),
  composite fill `-soft`, tegakkan 4.5:1 teks / 3:1 batas kontrol.
### Fixed
- **A11y (WCAG 1.4.11 & AA):** border kontrol form 1.55:1 → token `--color-control-border`
  (≥3:1); badge danger/info gelap di surface-3 → ramp baru red-300/blue-300; `text-subtle`
  sebagai teks nyata (header hari kalender, timestamp) → `text-muted`.
- **App-shell scroll:** header sticky via natural-scroll (sidebar + topbar `position:sticky`),
  mengganti pendekatan `--fill` yang menyisakan area putih saat scroll ke bawah.
- **Cross-browser:** `-webkit-backdrop-filter` untuk Safari; floor browser didokumentasikan
  (`color-mix()` → Chrome 111 / Safari 16.4 / Firefox 113).

## [0.6.0] dan sebelumnya
Lihat git tag `v0.2`…`v0.6`. Ringkas: pipeline token (`tokens.json` → CSS) + theming 3-sumbu,
app-shell/table/modal, 40+ komponen (form, feedback, navigasi, data, chart), enhancer JS
0-dependency, docs demo-site.
