# Freeday — Next up

Titik lanjut. Kalau mau nerusin kerjaan di repo ini, **buka dokumen ini dulu**, pilih satu item,
kerjakan. Status ada di [`HANDOFF.md`](HANDOFF.md); riwayat versi di [`CHANGELOG.md`](CHANGELOG.md);
sumber-kebenaran desain di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

_Dokumen ini **hanya melihat ke depan**: backlog + invariant yang masih berlaku. Riwayat dibuang
ke `CHANGELOG.md` saat pembersihan v1.20.0, supaya tak ada dua tempat mencatat hal yang sama._

---

## Roadmap ke depan (per v1.28.0) — default: **tunggu demand**

Per **v1.16.0** kit ini **feature-complete**: 10/10 komponen paritas penuh di **4 stack**
(vanilla · Vue · React · Blazor). Tak ada gap "wajib" tersisa — membangun spekulatif dari sini
melanggar prinsip demand-driven yang menjaga kit tetap ramping ([[freeday-consumption-model]]).
**Sikap default = tunggu demand.** Sinyal paling berharga = project Blazor berikutnya: bangun
memakainya, biar friksi nyata (prop kurang, timing Server-mode, kebutuhan NuGet) yang menentukan
rilis berikut — lebih murah & akurat daripada menebak. Kandidat #1 & #2 paling mungkin muncul
duluan dari project itu.

Backlog jujur (terurut, **bukan** untuk dikerjakan sekarang — pemicunya di kolom kanan):

| # | Kandidat | Kerjakan saat |
|---|---|---|
| 1 | **NuGet package `Freeday.Blazor`** — kini source-only via `<ProjectReference>`; NuGet (bundle static asset lewat RCL `wwwroot`) = distribusi bersih di luar repo | ada consumer di luar repo ini |
| 2 | **Verifikasi Blazor Server + prerender** — baru WASM yang diverifikasi; SSR/prerender beda timing JS-interop (tak ada JS saat prerender; `<dialog>` show/close) | project pakai Server / Auto render mode |
| 3 | **Row selection + bulk-action bar** di `FdyTable` (ketiga adapter) — enhancer vanilla punya `.fdy-table-bulkbar` + kolom pilih, adapter controlled belum (gap lintas-stack, bukan Blazor saja) | ada layar butuh aksi massal multi-baris |
| 4 | **Deferred YAGNI** (tak berubah): data grid virtualized · form master-detail 2-kolom · `data-style` lain (glass/neumorph) | on-demand murni |
| 5 | _Opsional infra:_ bUnit `dotnet test` guard komponen Blazor di CI (kini manual runtime-verify via `drive-*.mjs` + CDP) | mau safety-net regresi Blazor |
| 6 | **String UI vanilla bisa di-override** — `freeday-table.js` hard-code bahasa Indonesia (`'Menampilkan … dari …'`, `'N dipilih'`) tanpa hook; adapter Vue/React/Blazor sudah English. Ketemu saat menulis `docs/reference-screen.html` (v1.20.0): halaman English jadi campur. Opsi termurah = baca `data-fdy-i18n-*` di root `.fdy-datatable`, fallback ke default sekarang | ada layar non-Indonesia yang pakai enhancer vanilla (bukan adapter) |
| 7 | **`groupBy` di `FdyTable`** — layar list ber-grup kini merender satu `FdyTable` per grup (note 003 §5, dikonfirmasi lagi di 004 §1). Dengan `pageIndex` terkontrol (v1.20.0) satu index sudah bisa menjangkau beberapa tabel, jadi ini murni soal kenyamanan sekarang | ada layar ber-grup yang cukup banyak grupnya sampai N tabel jadi masalah |
| 8 | **Perilaku drawer `.fdy-app` tak ikut dikirim** — kit mengirim `__navtoggle`, `__backdrop`, dan kelas state `--nav-open`/`--nav-collapsed`, tapi **nol JS**: tiap konsumen merakit sendiri toggle + Escape + focus trap + restore focus + `inert`, dan satu di antaranya sudah salah merakitnya (nav terbuka, konten di-`inert`, pengguna tanpa jalan keluar — itu yang melahirkan `breakpoints.nav` di v1.20.0). Dilaporkan **dua kali** (note 004 §B footer & note 005 tail, keduanya salah menyebutnya "003 §8" — note 003 cuma punya 7 seksi). Bentuknya jelas: satu enhancer `freeday-app-shell.js` bergaya rumah (`data-fdy-app`, auto-init, idempotent, `initAll`), pakai `breakpoints.nav` untuk membedakan mode overlay vs kolom statis, dan `docs/index.html` + `docs/reference-screen.html` berhenti merakit sendiri (itu sekaligus buktinya) | **pemicunya sudah ada** — ini kandidat #1 yang nyata sekarang, bukan spekulatif; tinggal keputusan apakah kit mau memiliki perilaku shell |
| 9 | **`.fdy-pagination` tanpa rule CSS** — class blok di `<nav>` cuma hook penamaan; `__list`/`__link`/`__ellipsis` yang menata. Konsisten secara dokumentasi (COMPONENTS.md + guard `STRUCTURAL_HOOKS`), tapi kalau nanti wrapper butuh style (mis. `justify-content`), di situlah tempatnya | wrapper paginasi butuh style sendiri |
| 10 | **Tombol clear ber-teme untuk `type="search"`** — tombol × bawaan WebKit tak berteme sama seperti spin button di #44 (v1.27.0), tapi **sengaja tak distrip**: ia satu-satunya cara mengosongkan field, jadi menghapusnya membuang fungsi. Kalau mau konsisten visual, bentuknya bukan CSS melainkan `.fdy-input-group__btn` yang mengosongkan input (pola yang sudah dipakai FdyDatepicker clearable v1.13.0), dengan `type="text"` supaya × bawaan tak muncul. Ditulis di COMPONENTS.md sebagai keputusan, bukan kelalaian | ada layar yang mempermasalahkan × bawaan itu — jangan spekulatif |

Prinsip tetap: komponen hanya sentuh token Tier-2/3 (nol hex/px mentah); kontras AA gate wajib hijau;
tiap rilis sinkron SEMUA ref versi publik incl. live Pages ([[sync-docs-on-version-bump]]); repo
PUBLIC ([[public-repo-keep-internal-out]]).

---

Riwayat rilis **tidak** diulang di sini — 15 blok log `Update …` (v1.8.0–v1.18.0) plus tiga
post-mortem item lama (2026-07-27) dan snapshot kondisi v1.7.0 dibuang di v1.20.0: semuanya sudah
tercatat di **[`CHANGELOG.md`](CHANGELOG.md)**, dan snapshot yang basi lebih berbahaya daripada
tidak ada. Kondisi terkini: **[`HANDOFF.md`](HANDOFF.md)**.

## Sengaja ditunda (YAGNI — hanya kalau ada project nyata yang butuh)

- **Data grid virtualisasi** — spec §7
- **Form master-detail / 2 kolom** — spec §7
- **`data-style` lain** (glass / neumorph / dst.) — v1 sengaja hanya `soft`; spec §6

Ini bukan utang. Ini keputusan sadar: design system tak pernah "selesai", dia ber-versi.

---

## Pelajaran / invariant — docs jangan pernah menyalin nilai token ke prosa

**Kejadian (2026-07-24).** Section "Radius" di `docs/index.html` menampilkan ramp *lama sebelum
v1.1* — `xs 4 / sm 6 / md 8 / lg 12 / xl 16 px` — padahal token asli sudah `3/4/6/10/14px`. Pass
"Precision" di v1.1 me-retune radius (`tokens.json`), tapi label docs ditulis tangan dan **tidak ikut
berubah**. Kotaknya dirender pakai token asli (`var(--radius-md)`), teksnya menyebut angka lain →
developer melihat sudut 6px berlabel "8px". Untuk kit yang seluruh nilai jualnya adalah *jadi sumber
kebenaran token*, ini diam-diam menghancurkan kepercayaan.

**Akar masalah = duplikasi**, bukan salah ketik. Nilai token hidup di dua tempat (token + label docs)
yang bisa hanyut berpisah.

**Invariant sekarang (ditegakkan di `docs/index.html`).** Setiap label nilai token adalah
`<span data-token="--nama-token">` yang **diisi runtime dari stylesheet yang jalan** (panjang diukur
ke px lewat elemen probe; token waktu dibaca apa adanya). Token berubah → label ikut otomatis. Sudah
diterapkan ke **radius · spasi · motion**.

**Aturan saat menyentuh docs / token:**
- **Jangan pernah** menulis angka nilai token (px/rem/ms) langsung di prosa atau label docs. Pakai
  `<span data-token="--x">` (di HTML docs) atau `<code>var(--x)</code>` (kalau yang dimaksud memang
  *nama* token, bukan nilainya).
- Nilai skala (breakpoint) yang tak bisa dibaca CSS custom-prop hidup di `tokens/breakpoints.mjs` —
  itu satu-satunya sumber; jangan restate angkanya di tempat lain.
- Kalau me-retune ramp token, tak perlu sentuh label docs lagi — tapi **cek**: `grep -nE "[0-9]+px"
  docs/index.html` mestinya nyaris tak menyentuh area token (sisanya cuma nilai layout lepas yang
  memang bukan token).
- Audit cepat kapan pun ragu: render headless lalu bandingkan DOM ber-`[data-token]` dengan
  `dist/freeday.tokens.css`. (Contoh perintah ada di commit `adc80dc`.)

Status: tertutup untuk radius/spasi/motion. Belum dijadikan tes otomatis — kalau mau paling aman,
tambah satu tes yang me-render docs headless dan meng-assert tiap `[data-token]` == nilai token
(kandidat kerja kecil, opsional).

## Pelajaran / invariant — uji komponen interaktif dengan **gestur mouse asli**, bukan `.click()` sintetik

**Kejadian (2026-07-24, v1.6.1).** Di live, memilih opsi combo/select dengan mouse **tidak
mengubah nilai** (tetap "Button"). Awalnya tak terlihat karena tes memakai `element.click()`
sintetik — yang **melewati** urutan fokus/blur asli. Akar masalah: menekan (mousedown) opsi
mem-blur tombol combo → handler `focusout` di `freeday-select.js` memanggil `close()` yang
menyembunyikan listbox **sebelum** event `click` opsi menjalankan `choose()`. Jadi pilihan hilang.
Hanya kena mouse asli; keyboard tak terpengaruh. Fix: `preventDefault` pada `mousedown` listbox
(tombol tetap fokus, `close` tak terpicu, `click` mendarat). Rilis di v1.6.1.

**Aturan.** Untuk komponen yang bergantung pada **fokus/blur/pointer** (combo, dropdown, menu,
picker), verifikasi dengan **event mouse asli** (headless Chrome via CDP `Input.dispatchMouseEvent`
di koordinat sungguhan), bukan hanya `.click()` sintetik — `.click()` tak memicu `focusout`, jadi
menyembunyikan seluruh kelas bug "listbox tertutup sebelum pilih". Harness-nya kini permanen di
**`browser/`** (`npm run test:browser`; driver CDP nol-dependency di `browser/harness.mjs`,
auto-skip kalau tak ada Chrome) — bukan lagi skrip sekali-pakai di scratchpad. Pola tes:
buka trigger → **pastikan** `aria-expanded="true"` → klik opsi di koordinatnya (settle dulu, hindari
klik saat transisi/scroll) → assert nilai berubah.

## Kalau nanti mau rilis lagi

Semua perubahan sejauh ini bersifat aditif → **MINOR bump**. Saat cut versi, jangan lupa **sync semua
referensi versi publik**, bukan cuma `package.json`:

Jangan pakai daftar hafalan (yang lama sudah salah: menyebut `examples/*/README.md` yang tak punya
versi, dan "getting-started 4×" padahal 1×). **Cari saja** — inilah daftar otoritatifnya:

```bash
git grep -n '<versi-lama>' -- . | grep -v CHANGELOG    # semua yang harus di-bump
```

per v1.28.0 yang kena: `package.json` · `package-lock.json` (2 field) · `README.md` +
`README.id.md` (badge + link tag) · `docs/index.html` (eyebrow + footer) ·
`docs/getting-started.md` (contoh `^versi`) · `HANDOFF.md` · `NEXT-UP.md`.

**Jangan disentuh:** `README.md` baris "WCAG **1.4.11**" (itu nomor sukses WCAG, bukan versi) dan
entri historis di `CHANGELOG.md`.

Setelah push, Pages rebuild otomatis (~belasan detik) — verifikasi dengan meng-`curl` docs live dan
memastikan install command sudah menunjukkan versi baru.
