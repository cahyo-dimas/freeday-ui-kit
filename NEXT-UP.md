# Freeday — Next up

Titik lanjut. Kalau mau nerusin kerjaan di repo ini, **buka dokumen ini dulu**, pilih satu item,
kerjakan. Status ada di [`HANDOFF.md`](HANDOFF.md); riwayat versi di [`CHANGELOG.md`](CHANGELOG.md);
sumber-kebenaran desain di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

_Dokumen ini **hanya melihat ke depan**: backlog + invariant yang masih berlaku. Riwayat dibuang
ke `CHANGELOG.md` saat pembersihan v1.20.0, supaya tak ada dua tempat mencatat hal yang sama._

---

## Roadmap ke depan (per v2.0.0), default: **tunggu demand**

Per **v1.16.0** kit ini **feature-complete**: 11/11 komponen paritas penuh di **4 stack**
(vanilla · Vue · React · Blazor). Tak ada gap "wajib" tersisa, dan membangun spekulatif dari sini
melanggar prinsip demand-driven yang menjaga kit tetap ramping ([[freeday-consumption-model]]).
**Sikap default = tunggu demand.** Sinyal paling berharga = project Blazor berikutnya: bangun
memakainya, biar friksi nyata (prop kurang, timing Server-mode, kebutuhan NuGet) yang menentukan
rilis berikut, yang lebih murah dan akurat daripada menebak. Kandidat #1 & #2 paling mungkin muncul
duluan dari project itu.

Backlog jujur (terurut, **bukan** untuk dikerjakan sekarang; pemicunya di kolom kanan):

| # | Kandidat | Kerjakan saat |
|---|---|---|
| 1 | **NuGet package `Freeday.Blazor`**: kini source-only via `<ProjectReference>`; NuGet (bundle static asset lewat RCL `wwwroot`) = distribusi bersih di luar repo | ada consumer di luar repo ini |
| 2 | ~~**Verifikasi Blazor Server + prerender.**~~ **selesai** (2026-08-26): harness Server sungguhan di `test/blazor-server/` + `browser/blazor-server.mjs` (`npm run test:blazor-server`), **4/4 hijau**. Prerender mengeluarkan markup penuh tanpa satu pun penanda hidrasi; enhancer hidrat begitu circuit tersambung; `<dialog>` show/close dari .NET benar; combo yang dipilih dengan mouse asli sampai ke binding .NET. **Koreksi yang layak dibawa:** satu check sempat merah dan sempat dilaporkan sebagai cacat kit. Ia bukan. Enhancer auto-init saat DOMContentLoaded, jadi mereka menstempel `data-fdy-*-ready` pada markup **prerender yang sebentar lagi dibuang** Blazor saat circuit tersambung — test yang menunggu penanda itu menunggu hal yang salah, dan klik-nya mendarat di node yang akan dilepas. Menunggu komponen benar-benar interaktif membuatnya hijau, 3 dari 3 run. Pelajarannya: **di bawah prerendering, penanda hidrasi bisa benar tentang DOM yang tak punya masa depan.** | — |
| 3 | ~~**Row selection + bulk-action bar** di `FdyTable` (ketiga adapter).~~ **selesai** (2026-08-26, 3.0.0): pemicunya datang dari layar back-office nyata (note `#049`). `selectable` + `selectedKeys` di Vue/React/Blazor, ber-key `rowKey` seperti `expandedKeys`. Select-all sengaja hanya menjangkau **halaman yang terlihat**, dan key dari halaman lain dipertahankan. Blazor butuh satu interop (`setIndeterminate`) karena `indeterminate` properti DOM tanpa atribut. Dijaga 2 test Chrome + 7 bUnit, keduanya diverifikasi dengan mutasi | — |
| 4 | **Deferred YAGNI**: data grid virtualized · form master-detail 2-kolom · `data-style` **selain** `soft`/`glass` (neumorph/clay/dst.) — `glass` sendiri **terkirim di 3.0.0** | on-demand murni |
| 5 | ~~_Opsional infra:_ bUnit guard komponen Blazor di CI~~ **selesai** (2026-08-25): `test/blazor/`, 7 test, jalan di `npm run test:blazor` dan di CI. Catatan lama menyebut "manual runtime-verify via `drive-*.mjs` + CDP", padahal skrip itu **tak ada**; sebelum ini satu-satunya gerbang Blazor adalah `dotnet build`, yaitu kompilasi | — |
| 6 | ~~**String UI vanilla bisa di-override.**~~ **selesai** (2026-08-25): owner memilih (b), ganti default ke English, terbit di **2.0.0** — 39 string di 9 enhancer plus fallback locale datepicker (`lang || 'en'`). Hook override (a) ternyata sudah ada sejak 1.39.0, jadi migrasinya atribut: `data-fdy-text-<key>`, dan `<html lang="id">` untuk nama tanggal | — |
| 7 | **`groupBy` di `FdyTable`.** Layar list ber-grup kini merender satu `FdyTable` per grup (note 003 §5, dikonfirmasi lagi di 004 §1). Dengan `pageIndex` terkontrol (v1.20.0) satu index sudah bisa menjangkau beberapa tabel, jadi ini murni soal kenyamanan sekarang | ada layar ber-grup yang cukup banyak grupnya sampai N tabel jadi masalah |
| 8 | ~~**Perilaku drawer `.fdy-app` tak ikut dikirim**~~ **selesai**: `freeday-app-shell.js` di **1.53.0**, `FdyAppShell` typed (Vue/React/Blazor) di **1.54.0**. Nomornya sengaja dipertahankan meski isinya kosong: CHANGELOG, spec, dan header guard menyebut "NEXT-UP #8", jadi menomori ulang baris di bawahnya akan memutus rujukan yang sudah tertulis | — |
| 9 | **`.fdy-pagination` tanpa rule CSS.** Class blok di `<nav>` cuma hook penamaan; `__list`/`__link`/`__ellipsis` yang menata. Konsisten secara dokumentasi (COMPONENTS.md + guard `STRUCTURAL_HOOKS`), tapi kalau nanti wrapper butuh style (mis. `justify-content`), di situlah tempatnya. **Sejak 3.1.0 hook itu benar-benar dikirim** — sebelumnya nol match di seluruh paket, jadi kalimat "di situlah tempatnya" tak akan berlaku untuk keluaran kit sendiri (`improvement-notes` #050 §2) | wrapper paginasi butuh style sendiri |
| 10 | **Tombol clear ber-teme untuk `type="search"`.** Tombol × bawaan WebKit tak berteme sama seperti spin button di #44 (v1.27.0), tapi **sengaja tak distrip**: ia satu-satunya cara mengosongkan field, jadi menghapusnya membuang fungsi. Kalau mau konsisten visual, bentuknya bukan CSS melainkan `.fdy-input-group__btn` yang mengosongkan input (pola yang sudah dipakai FdyDatepicker clearable v1.13.0), dengan `type="text"` supaya × bawaan tak muncul. Ditulis di COMPONENTS.md sebagai keputusan, bukan kelalaian | ada layar yang mempermasalahkan × bawaan itu — jangan spekulatif |
| 11 | ~~**Props 10 komponen typed sisanya di `COMPONENTS.md`.**~~ **selesai** (2026-08-25): 12 tabel `### Props — <FdyX>`, satu per wrapper yang diekspor, plus guard dua arah + gerbang kelengkapan di `test/docs.test.mjs` (nama prop di docs == prop Vue ∪ React; wrapper baru tanpa tabel = merah). Diverifikasi dengan mutasi | — |
| 12 | ~~**Paritas prop Blazor untuk empat wrapper picker.**~~ **selesai** (2026-08-26, 2.2.0): akar masalahnya bukan wrapper Blazor melainkan **enhancer**-nya, yang tak pernah punya konsep `disabled`/`readonly`/`invalid` meski CSS-nya sudah menata ketiganya sejak awal. Jalur mentah kini punya `data-disabled`/`data-readonly`/`data-invalid` + `data-id`/`data-describedby` + `setState()`; Blazor: datepicker 6→20 parameter, autocomplete 6→12, cascade 8→13, combo dapat `Describedby`. Empat pengecualian didokumentasikan dengan alasannya. Dijaga guard paritas + 7 test bUnit + 7 test Chrome | — |
| 13 | ~~**Bikin kegagalan CI bisa dibaca tanpa hak admin.**~~ **selesai** (2026-08-26), tapi bukan seperti yang ditulis di sini: artifact TAP tak pernah dibutuhkan, karena `ci.yml` **sudah** menganotasi tiap baris `not ok` lewat `::error::`, dan anotasi itu terbaca via API tanpa autentikasi. Anotasi itulah yang menjawab flake-nya: tiga test **berkoordinat** gagal bersamaan. Sebabnya geometri, bukan asersi — target di bawah lipatan pada jendela runner, klik mendarat di titik kosong. `clickCenter` kini men-scroll target ke tampilan lalu menolak titik kosong dengan pesan yang menyebut viewport + rect | — |
| 14 | **Permukaan di balik 3.94:1.** Note `#053` §3 melaporkan `--color-text-muted` di 3.94:1 atas `--color-surface-raised` gelap. Tak reproduksi: di `soft` permukaan itu **identik** dengan `--color-surface` (7.28:1), di `glass` terburuknya 6.70:1, dan muted tak pernah di bawah 5.46:1 di mana pun ramp gelap. Angkanya sendiri nyata — 3.94 persis `slate-400` di atas `slate-700`, yaitu `--color-border-strong`, token border yang tak dipakai komponen mana pun sebagai latar. Kalau ternyata ada komponen kit yang mengecatnya sebagai latar, itu cacat | pelapor menyebut selector/permukaan yang diukurnya |

Prinsip tetap: komponen hanya sentuh token Tier-2/3 (nol hex/px mentah); kontras AA gate wajib hijau;
tiap rilis sinkron SEMUA ref versi publik incl. live Pages ([[sync-docs-on-version-bump]]); repo
PUBLIC ([[public-repo-keep-internal-out]]).

---

Riwayat rilis **tidak** diulang di sini: 15 blok log `Update …` (v1.8.0–v1.18.0) plus tiga
post-mortem item lama (2026-07-27) dan snapshot kondisi v1.7.0 dibuang di v1.20.0: semuanya sudah
tercatat di **[`CHANGELOG.md`](CHANGELOG.md)**, dan snapshot yang basi lebih berbahaya daripada
tidak ada. Kondisi terkini: **[`HANDOFF.md`](HANDOFF.md)**.

## Sengaja ditunda (YAGNI, hanya kalau ada project nyata yang butuh)

- **Data grid virtualisasi**, spec §7
- **Form master-detail / 2 kolom**, spec §7
- **`data-style` selain `soft`/`glass`** (neumorph / clay / dst.): `glass` terkirim di 3.0.0; sisanya spec §6

Ini bukan utang. Ini keputusan sadar: design system tak pernah "selesai", dia ber-versi.

---

## Pelajaran / invariant: docs jangan pernah menyalin nilai token ke prosa

**Kejadian (2026-07-24).** Section "Radius" di `docs/index.html` menampilkan ramp *lama sebelum
v1.1* (`xs 4 / sm 6 / md 8 / lg 12 / xl 16 px`) padahal token asli sudah `3/4/6/10/14px`. Pass
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
- Nilai skala (breakpoint) yang tak bisa dibaca CSS custom-prop hidup di `tokens/breakpoints.mjs`,
  itu satu-satunya sumber; jangan restate angkanya di tempat lain.
- Kalau me-retune ramp token, tak perlu sentuh label docs lagi, tapi **cek**: `grep -nE "[0-9]+px"
  docs/index.html` mestinya nyaris tak menyentuh area token (sisanya cuma nilai layout lepas yang
  memang bukan token).
- Audit cepat kapan pun ragu: render headless lalu bandingkan DOM ber-`[data-token]` dengan
  `dist/freeday.tokens.css`. (Contoh perintah ada di commit `adc80dc`.)

Status: tertutup untuk radius/spasi/motion. Belum dijadikan tes otomatis. Kalau mau paling aman,
tambah satu tes yang me-render docs headless dan meng-assert tiap `[data-token]` == nilai token
(kandidat kerja kecil, opsional).

## Pelajaran / invariant: uji komponen interaktif dengan **gestur mouse asli**, bukan `.click()` sintetik

**Kejadian (2026-07-24, v1.6.1).** Di live, memilih opsi combo/select dengan mouse **tidak
mengubah nilai** (tetap "Button"). Awalnya tak terlihat karena tes memakai `element.click()`
sintetik, yang **melewati** urutan fokus/blur asli. Akar masalah: menekan (mousedown) opsi
mem-blur tombol combo → handler `focusout` di `freeday-select.js` memanggil `close()` yang
menyembunyikan listbox **sebelum** event `click` opsi menjalankan `choose()`. Jadi pilihan hilang.
Hanya kena mouse asli; keyboard tak terpengaruh. Fix: `preventDefault` pada `mousedown` listbox
(tombol tetap fokus, `close` tak terpicu, `click` mendarat). Rilis di v1.6.1.

**Aturan.** Untuk komponen yang bergantung pada **fokus/blur/pointer** (combo, dropdown, menu,
picker), verifikasi dengan **event mouse asli** (headless Chrome via CDP `Input.dispatchMouseEvent`
di koordinat sungguhan), bukan hanya `.click()` sintetik, karena `.click()` tak memicu `focusout`, jadi
menyembunyikan seluruh kelas bug "listbox tertutup sebelum pilih". Harness-nya kini permanen di
**`browser/`** (`npm run test:browser`; driver CDP nol-dependency di `browser/harness.mjs`,
auto-skip kalau tak ada Chrome), bukan lagi skrip sekali-pakai di scratchpad. Pola tes:
buka trigger → **pastikan** `aria-expanded="true"` → klik opsi di koordinatnya (settle dulu, hindari
klik saat transisi/scroll) → assert nilai berubah.

## Kalau nanti mau rilis lagi

2.0.0 mematahkan pola "semua aditif → MINOR": default bahasa enhancer berubah, jadi setiap layar
jalur mentah merender kata lain. Bump-nya ikut apa yang benar-benar berubah, bukan kebiasaan.

Saat cut versi, **sync semua referensi versi publik**, bukan cuma `package.json`, dan itu sekarang
**dijaga test** (`test/docs.test.mjs`, "the public version stamps match package.json"), karena
runbook di bawah ini benar dan tetap terlewat tiga rilis berturut-turut: `docs/index.html` mengirim
`v1.51.0` sepanjang 1.52.0–1.53.0, dan `getting-started.md` menyuruh orang memasang `^1.34.0` selama
delapan belas rilis. Langkah runbook bergantung pada ingatan; test tidak.

Jangan pakai daftar hafalan (yang lama sudah salah: menyebut `examples/*/README.md` yang tak punya
versi, dan "getting-started 4×" padahal 1×). **Cari saja**, inilah daftar otoritatifnya:

```bash
git grep -n '<versi-lama>' -- . | grep -v CHANGELOG    # semua yang harus di-bump
```

per v1.34.0 yang kena: `package.json` · `package-lock.json` (2 field) · `README.md` +
`README.id.md` (badge + link tag) · `docs/index.html` (eyebrow + footer) ·
`docs/getting-started.md` (contoh `^versi`) · `HANDOFF.md` · `NEXT-UP.md`.

**Jangan disentuh:** `README.md` baris "WCAG **1.4.11**" (itu nomor sukses WCAG, bukan versi) dan
entri historis di `CHANGELOG.md`.

Setelah push, Pages rebuild otomatis (~belasan detik). Verifikasi dengan meng-`curl` docs live dan
memastikan install command sudah menunjukkan versi baru.
