# Freeday — Next up

Apa yang dikerjakan berikutnya, apa yang menunggu pemicunya, dan apa yang sudah diputuskan tidak
dikerjakan. Mulai dari §1. Keadaan sekarang ada di [`HANDOFF.md`](HANDOFF.md), riwayat di
[`CHANGELOG.md`](CHANGELOG.md), dan sumber kebenaran desain di
[`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

Berkas ini hanya memuat yang masih berlaku. Butir yang terkirim pindah ke CHANGELOG. Butir yang
diputuskan tidak dikerjakan pindah ke §7 beserta alasannya, sebab keputusan yang tidak tercatat akan
dibangun ulang oleh orang berikutnya. Nomor `#1` sampai `#16` di §10 tetap, karena uji dan komentar
kode merujuknya ("NEXT-UP #8").

**Sikap bawaan: tunggu demand.** Kit ini feature-complete di empat stack sejak 1.16.0. Yang
menentukan rilis berikutnya adalah cacat yang ditemukan dan permintaan dari app nyata. Cacat
didahulukan dari fitur.

---

## 1. Berikutnya, urut

| # | Pekerjaan | Kenapa sekarang | Selesai bila |
|---|---|---|---|
| 1 | **Pohon `FdyCascade` Blazor sesudah hidrasi.** `Nodes` yang diubah host tidak pernah tampil: enhancer menelan `<ul>` seed dan menghapusnya, dan tidak punya API untuk mengganti pohonnya | Sisa terakhir kelas "nilai dan opsi dari host" (`#123`), yang 3.25.0 tutup untuk nilai di enam wrapper dan opsi autocomplete | `FreedayCascade.setNodes(root, tree)`, didorong dari `OnParametersSetAsync` bila isi pohonnya berubah (dibandingkan per isi, seperti opsi autocomplete), dengan uji bUnit dan uji peramban yang terbukti merah |
| 2 | **`theme-pref.mjs` kadang merah di CI.** Merah 2026-11-05 dan dua kali pada tag v3.23.0, selalu lulus di laptop. `window.beforeKit` terbaca `null`: sesudah muat ulang, cuplikan `<head>` tidak menemukan `fdy-theme` di `localStorage` | Tag yang merah menahan rilis, dan sudah dua kali memaksa jalanan ulang | Direproduksi di runner. Dugaan: Chromium menyetor `localStorage` ke proses peramban secara batch, dan muat ulang di runner sibuk datang lebih dulu. Kalau benar, perbaikannya di uji (tunggu kuncinya terlihat lewat CDP `DOMStorage.getDOMStorageItems`, lalu muat ulang), bukan di kit. Tidak dengan menaikkan timeout |
| 3 | **Carousel.** Handler gulir menimpa indeks yang baru diset `goTo` selama gulir halus, jadi dua klik Next cepat berhenti di slide 2. `mouseleave` menyalakan autoplay lagi saat fokus papan ketik masih di dalam | Sisa audit `#123`, baru dilacak di kode | Direproduksi di peramban dulu, lalu diperbaiki dengan uji yang terbukti merah |
| 4 | **Fitur yang diminta owner (2026-11-20).** Lihat §5 | Diminta, dan urutannya sudah disepakati | Per fitur: brainstorm, spec, rencana, lalu rilis |

---

## 2. Menunggu pemicu

Jangan dikerjakan sebelum pemicunya datang. Nomor `#` merujuk ke §10.

| Butir | Pemicu |
|---|---|
| `#1` NuGet package `Freeday.Blazor` (kini hanya `<ProjectReference>`) | ada consumer Blazor di luar repo ini |
| `#7` `groupBy` di `FdyTable` (layar bergrup kini satu tabel per grup) | ada layar dengan cukup banyak grup sampai N tabel jadi masalah |
| `#9` gaya untuk `.fdy-pagination` (kini hook penamaan saja) | wrapper paginasi butuh gaya sendiri |
| `#14` permukaan di balik angka 3.94:1 | pelapor menyebut selector dan permukaan yang diukurnya |
| `#15` sapuan deskripsi modifier di `COMPONENTS.md` | satu lagi ketahuan salah, atau ada waktu luang |
| Pembungkus bertipe `FdyTabs` (navigasi papan ketik daftar tab masih ditulis app) | pemakai kedua yang menulis ulang kunci tab sendiri |
| Penyempitan cakupan `useFreeday(ref)` yang ref-nya kosong (kini memindai seluruh dokumen dan memperingatkan) | konsumen sudah membereskan peringatannya; dibahas di rilis minor |
| `[data-fdy-number]` sebagai bawaan untuk `input[type=number]` | app berikutnya juga memakai nol, padahal punya isian angka (ronda: 10 isian, 0 opt-in) |
| Uji otomatis untuk label `[data-token]` di `docs/index.html` | ada label yang hanyut lagi |
| Data grid virtualisasi (spec §7), `data-style` selain `soft`/`glass` (spec §6) | project nyata yang butuh |

## 3. Menunggu ukuran di perangkat

Mesin yang bisa melihat cacat ini (Safari iOS 15, iPhone 7 pemilik) bukan mesin yang menjalankan uji
kit. Mengirim perbaikan tanpa ukuran pernah memakan empat rilis dalam sehari.

| Butir | Yang perlu diukur |
|---|---|
| Latar ikut tergulir di belakang drawer di HP. `overscroll-behavior:contain` butuh Safari 16, dan scrim yang ditarik menggulir halaman di semua peramban karena scrim bukan kotak yang menggulir | Dua kandidat, keduanya diukur di iOS 15 dulu: `touch-action:none` di `.fdy-app__backdrop` (menutup tarikan di scrim di semua peramban; tap untuk menutup tetap jalan), atau `html:has(.fdy-app--nav-open){overflow:hidden}` di dalam `@supports not (overscroll-behavior:contain)`. Alasan versi pendeknya ada di `ALLOWED`, `test/baseline.test.mjs` |
| Badan `FdyModal` di Safari 15 (`#104`, terkirim 3.14.1) | Konfirmasi dari iPhone 7 bahwa badan modal tidak lagi selarik. Mekanismenya baru direproduksi di Chrome |
| `FdyModal`/`FdyDrawer` Blazor sesudah Escape kedua (3.24.0) | Perbaikannya di jembatan JS, jadi bUnit tidak melihatnya. Satu kasus di `browser/blazor-server.mjs` menutupnya |

## 4. Dikumpulkan untuk 4.0

Perubahan yang memecah, ditahan sampai ada rilis mayor karena alasan lain.

- `#16` `--hover-actionable` jadi perilaku bawaan `.fdy-table`, dengan `--hover-all` untuk yang ingin
  semua baris ber-hover.
- `.fdy-badge` netral jadi bawaan (catatan ronda §4; separuhnya dijawab `--outline` di 3.9.0).
- `mode="month"` di `FdyDatepicker` dan `FdyDatepickerMode.Month` di Blazor dihapus. Penggantinya
  `FdyMonthpicker`. Jalur mentah tetap `data-mode="month"`.

## 5. Fitur yang diminta

**Empat fitur dari owner (2026-11-20),** dipicu tangkapan layar sebuah app pemesanan bengkel pihak
ketiga; yang diambil hanya polanya. Kit memegang interaksi, aksesibilitas dan kontrak event; app
memegang data dan aturan bisnis. Pembungkus Vue, React dan Blazor ikut di tiap fitur. Urutannya 0,
1, 2, 3. Nomor 4 kecil dan boleh disisipkan kapan saja.

| # | Fitur | Isi |
|---|---|---|
| 0 | Kontrak "pindah" bersama | `data-fdy-sortable` diperluas ke pindah antar-daftar dan gulir otomatis di tepi (kini tertulis "not in the kit"). Event dapat dibatalkan, jalur papan ketik (WCAG 2.5.7), live region, fokus dikembalikan |
| 1 | Papan kanban | Seret antar-kolom (status, veto app, batas WIP), urut ulang dalam kolom, klik kartu membuka drawer, tambah di kolom, angkat/pindah/jatuhkan lewat papan ketik dan menu "Move to...". Swimlane dan lipat kolom diputuskan saat brainstorm |
| 2 | Kalender acara | Tampilan Bulan dan Agenda, acara seharian, "+N more", klik tanggal membuka hari, klik acara membuka detail |
| 3 | Penjadwal sumber daya | Baris sumber daya berkelompok lawan kolom jam, baris kapasitas, lajur "Not assigned", strip 7 hari, klik sel kosong membuat entri (yang penuh, lampau, atau libur ditolak dengan alasan), seret untuk pindah atau ubah ukuran dengan veto app, jalur papan ketik. Ditambah mode Gantt |
| 4 | Timeline aktivitas | `.fdy-timeline` dengan pengelompokan tanggal, butir yang dapat dibuka, saringan jenis event, dan muat lebih banyak |

**Identitas, lanjutan 3.21.0 dan 3.22.0.**

| # | Butir | Pemicu |
|---|---|---|
| B2 | Preset identitas `ledger`, `inbox`, `thread`, `field`, masing-masing dengan layar desktop dan mobile di atas `USAGE.md` §8. Berupa contoh, bukan impor | owner meminta |
| D | Tinta palet lewat alias (`--primary-on`, dipetakan blok tema ke `--color-on-primary`), supaya island terbalik dan wrapper polos jalan tanpa mengulang palet | laporan pertama label island yang rusak |
| C | Server MCP di paket (`bin`) dengan tool `check_identity` | B2 ada, dan agen konsumen sering melanggar kontrak identitas |

## 6. Dimiliki repo lain

**Ronda** (diperiksa 2026-11-27: `package.json` masih `^3.20.0`, `data-primary-fill` dan
`.fdy-actionbar` belum dipakai):
- Naik ke 3.24.0, lalu pindahkan loader ke `useLoad` (urutannya ada di catatan serah terima audit
  `#123`).
- Pakai `data-density="touch"` dan `data-primary-fill="deep"`, lalu hapus `--control-h` dan
  `--color-primary*` teal yang disetel tangan serta override `--color-on-primary` di
  `:root[data-primary=teal]`. Jalan keluar on-primary di `[data-theme='dark']` baru boleh dihapus
  setelah region POS gelap membawa `data-primary` di sebelah `data-theme`.
- Terapkan `USAGE.md` §8 ke layar daftarnya: tabel jadi baris daftar, navigasi bawah 5 item, tanpa
  kartu di sekitar header halaman, aksi utama di `.fdy-actionbar`, tanpa tampilan Grid di HP.

---

## 7. Diputuskan tidak dikerjakan

| Butir | Alasan |
|---|---|
| `text-wrap:balance` dipagari untuk Safari di bawah 17.5 | Nilainya keyword, jadi peramban lama menolaknya saat parse dan judul patah seperti dulu. Tidak ada cara kedua di CSS, jadi `@supports` tidak membeli apa pun |
| `100dvh` dipagari untuk Chrome 105 sampai 107 | Dua dari tiga pemakaian ada di sidebar yang juga `top:0;bottom:0`. Cadangan `vh` yang membawa `var()` jatuh ke nilai initial, bukan ke baris di atasnya (`test/color-mix.test.mjs`). Ditinjau lagi saat floor bergerak |
| Penanda `summary` di accordion | Diukur di Firefox: `summary` yang `display:flex` tidak punya kotak `::marker`. Dugaan awalnya dari satu baris `grep` yang tidak membaca aturan lengkapnya |
| Tombol × bawaan `type="search"` diberi tema atau dihapus | Ia satu-satunya cara mengosongkan isian. Yang ingin bertema memakai `[data-fdy-search]` (`#10`) |
| `.fdy-list-bullet` (catatan ronda §12) | Daftar `ul` polos sudah berbutir; janjinya ditulis dan dijaga uji (`#101`) |
| String autocomplete per `<form>` (catatan ronda §25b) | Yang dibaca dari `<form>` hanya pesan validasi. Bentuk yang benar adalah teks bawaan untuk seluruh kit, bila ada yang butuh |
| Sinkron tema antar-tab (`#113`) | Tidak diminta |
| Membangkitkan jumlah pembungkus saat rilis (`#117`) | Prosa tidak lagi menyebut angkanya, jadi tidak ada yang dibangkitkan |
| `FdyDateRange`: dua bulan berdampingan, kalender layar penuh, preset (`#118`) | Dikecualikan catatannya sendiri; diusulkan terpisah bila ada pemakai |
| Pewarnaan `.in-range` di `FdyDateRange` `layout="split"` Vue/React | Tiap picker berdiri sendiri; tidak diminta |
| Simulasi `data-fdy-upload-simulate` yang tetap berjalan sesudah barisnya dihapus | Hanya mode demo |

---

## 8. Aturan yang berlaku

1. **Deskripsi modifier harus bisa dibenarkan oleh deklarasinya.** `.fdy-nav--flat` dijelaskan
   "drops the surface", yang tidak pernah ia lakukan, dan dua console membangun ulang varian yang
   sudah ada selama empat bulan (`#055`). Varian yang hilang menghasilkan laporan; varian yang
   dijelaskan salah menghasilkan pekerjaan duplikat yang diam.
2. **Nilai token tidak pernah ditulis di prosa atau label docs.** Pakai `<span data-token="--x">`
   (diisi dari stylesheet saat runtime) atau `<code>var(--x)</code>`. Breakpoint hanya hidup di
   `tokens/breakpoints.mjs`.
3. **Komponen yang bergantung pada fokus, blur atau pointer diuji dengan gestur asli** (CDP
   `Input.dispatchMouseEvent` lewat `browser/harness.mjs`), bukan `.click()`. `.click()` tidak
   memicu `focusout`, dan bug combo 1.6.1 hanya muncul dengan mouse asli.
4. **Uji baru dipercaya sesudah terbukti merah** pada kode lama (stash, atau mutasi pada kode baru).
   Penjaga yang tidak bisa gagal sudah pernah lolos untuk perbaikan yang mati.
5. **"Nilainya tidak berubah" dan "belum ada apa-apa" adalah penjaga hampa**, sebab keduanya juga
   keadaan sebelum klik diproses. Cari pengamatan positif yang hanya perilaku benar dapat hasilkan.
6. **CI merah: jalankan ulang hanya bila ujinya lulus sendirian dan jalanan yang merah berbeda dari
   jalanan hijau atas kode yang sama.** Selain itu selidiki. Menaikkan timeout bukan jawaban:
   bundle 0 byte di 3.23.0 tampak seperti timeout dan ternyata balapan tulis.
7. **Satu kelas cacat, satu rilis.** Saat satu cacat ketahuan, audit kelasnya di semua komponen dan
   keempat stack, lalu kirim bersama penjaga yang menangkap kelasnya.
8. **Floor peramban tinggal di satu baris** `README.md`/`README.id.md`, dibaca
   `test/baseline.test.mjs`. Fitur di atas floor dipagari, dipasangkan dengan `-webkit-`, atau masuk
   `ALLOWED` dengan alasan yang menyebut apa yang hilang.
9. **Di bawah prerender, penanda hidrasi bisa benar tentang DOM yang akan dibuang** (`#2`). Uji
   Blazor Server menunggu komponen interaktif, bukan `data-fdy-*-ready`.
10. **Komponen hanya menyentuh token tier 2 dan 3**, kontras AA dijaga gerbang, dan repo ini publik:
    `improvement-notes/` di-ignore dan diblokir hook pre-commit karena nama berkasnya memuat kode klien.

## 9. Rilis

Bump mengikuti apa yang berubah. Tipe publik yang melebar dihitung breaking (kebijakan di kepala
CHANGELOG), dan 2.0.0 major karena bahasa bawaan enhancer berubah.

1. **Gerbang lokal, semuanya hijau:** `node tokens/build.mjs && node --test`,
   `npm run typecheck:react`, `npm run test:blazor`, `npm run test:browser`. Suite peramban sekitar
   tiga menit; jaga laptop tidak tidur, karena tidur memutus CDP dan suitenya menggantung. WebKit
   (`npm run test:webkit`) hanya jalan di CI.
2. **Versi:** `npm version <versi> --no-git-tag-version`, lalu cari setiap stempel lama, jangan dari
   ingatan:

   ```bash
   git grep -n '<versi-lama>' -- . ':!CHANGELOG.md'
   ```

   Yang kena: `package.json`, `package-lock.json`, `README.md`, `README.id.md` (badge dan tautan tag),
   `docs/index.html` (eyebrow dan footer), `docs/getting-started.md`. `test/docs.test.mjs` menjaganya.
   Jangan sentuh "WCAG 1.4.11" di README dan entri lama CHANGELOG.
3. **Tulisan:** entri CHANGELOG (bahasa Indonesia, nomor catatan `#NNN` disebut), paragraf versi di
   HANDOFF, dan baris status di §11 (atau §7 bila tidak dikerjakan) berkas ini. Semua prosa lewat `/humanizer:humanizer`.
4. **Terbitkan dengan tag, tidak pernah `npm publish`:**

   ```bash
   git tag -a v<versi> -m "<versi>: <isi>" && git push origin main --follow-tags
   ```

   `publish.yml` menjalankan `ci.yml` dulu, jadi tag yang merah tidak sampai ke npm. `npm publish`
   lokal melewati gerbang itu dan berhenti di `EOTP` karena akunnya ber-2FA.
5. **Kawal:** `gh run watch <id> --exit-status`. Registry baru menyajikan versi baru 1 sampai 3
   menit sesudah publish sukses; `notarget` di jendela itu adalah propagasi, bukan kegagalan
   (`npm view @cahyo-dimas/freeday version --prefer-online`). Pages membangun ulang dalam hitungan
   detik.
6. **Tag merah:** lihat aturan 6. Tag yang versinya belum pernah ada di npm boleh dipindah ke commit
   perbaikan (`git tag -fa`, lalu `git push -f origin v<versi>`), sesudah memastikannya dengan
   `npm view ... versions`. Versi yang sudah terbit tidak pernah dipindah; naikkan patch.

---

## 10. Nomor tetap

Dirujuk uji dan komentar kode, jadi baris yang selesai tetap di sini dan nomornya tidak dipakai ulang.

| # | Butir | Status |
|---|---|---|
| 1 | NuGet package `Freeday.Blazor` | menunggu (§2) |
| 2 | Verifikasi Blazor Server + prerender | selesai 2026-08-26: `test/blazor-server/`, `browser/blazor-server.mjs` |
| 3 | Row selection + bulk action di `FdyTable` | selesai 3.0.0 (`#049`): select-all hanya halaman yang terlihat, key halaman lain dipertahankan |
| 4 | Ditunda: grid virtualisasi, `data-style` lain | menunggu (§2); form dua kolom terkirim sebagai `.fdy-page__columns` (`#065`) |
| 5 | bUnit guard Blazor di CI | selesai 2026-08-25: `test/blazor/` |
| 6 | String UI enhancer bisa diganti | selesai 2.0.0: bawaan Inggris, `data-fdy-text-<key>`, `<html lang>` untuk nama tanggal |
| 7 | `groupBy` di `FdyTable` | menunggu (§2) |
| 8 | Perilaku drawer `.fdy-app` | selesai: `freeday-app-shell.js` 1.53.0, `FdyAppShell` 1.54.0 |
| 9 | `.fdy-pagination` tanpa aturan CSS | menunggu (§2). Hook penamaan, dikirim sejak 3.1.0 dan dijaga `STRUCTURAL_HOOKS` |
| 10 | Tombol bersih untuk `type="search"` | selesai: `[data-fdy-search]` (`#061`). Tombol × bawaan sengaja dibiarkan, karena ia satu-satunya cara mengosongkan isian; yang ingin bertema memakai hook itu |
| 11 | Tabel props pembungkus di `COMPONENTS.md` | selesai 2026-08-25, dijaga dua arah di `test/docs.test.mjs` |
| 12 | Paritas prop Blazor untuk picker | selesai 2.2.0: `setState()` di enhancer, empat pengecualian didokumentasikan |
| 13 | Kegagalan CI terbaca tanpa hak admin | selesai: `ci.yml` menganotasi tiap `not ok` |
| 14 | Permukaan di balik 3.94:1 | menunggu (§2). Tidak tereproduksi: 3.94 adalah `--color-border-strong`, yang tidak dipakai sebagai latar |
| 15 | Sapuan deskripsi modifier | menunggu (§2); lihat aturan 1 |
| 16 | `--hover-actionable` jadi bawaan | untuk 4.0 (§4) |

## 11. Catatan masuk: sudah dikerjakan atau belum

`improvement-notes/` di-ignore dan bukan catatan status. Statusnya di sini dan di CHANGELOG.

**Catatan bernomor** dijawab CHANGELOG, yang mengutip nomornya:

```bash
awk '/^## \[/{v=$2} match($0,/#[01][0-9][0-9]([^0-9a-fA-F]|$)/){print substr($0,RSTART,4)" -> "v}' CHANGELOG.md | sort -u
```

Polanya menolak warna hex (`#0078d4` tidak terbaca sebagai `#007`). Nomor yang tidak muncul dan
tidak punya berkas tidak pernah ada.

**Catatan tak bernomor** dicatat di tabel ini. Kalau kamu mengerjakan sebuah catatan, nomornya masuk
CHANGELOG. Kalau kamu memutuskan tidak mengerjakannya, barisnya masuk ke sini dan alasannya ke §7.

`CATATAN-FREEDAY.md` dari app ronda (§20 dan §21 tidak ada di berkasnya):

| § | Pokok | Status |
|---|---|---|
| 1 | `FdyTableFooter` berteks Inggris | 3.8.0 `#075`, diperluas ke `FdyTable` 3.9.0 `#080` |
| 2 | Popover mengabaikan `fdy-menu--end` | 3.8.0 `#074`, jalur bertipe 3.9.0 `#081` |
| 3 | `.fdy-pagination` tidak ada di bundle | ditutup tanpa kode: kelasnya ada, sebagai hook struktural |
| 4 | `.fdy-badge` tanpa modifier netral | separuh 3.9.0 `#083` (`--outline`); netral sebagai bawaan untuk 4.0 (§4) |
| 5 | Ritme `.fdy-card__body > * + *` mengenai kolom grid | ditutup tanpa kode: aturannya sudah tidak ada |
| 6 | Preset `teal` terlalu terang | 3.7.0 `#073` |
| 7 | Tidak ada tab tegak | 3.8.0 `#077` |
| 8 | Tidak ada pemilih bulan | 3.8.0 `#076`, jadi `FdyMonthpicker` 3.9.0 `#086` |
| 9 | Enhancer chip menghapus chip-nya sendiri | 3.13.0 `#098` |
| 10 | `useFreeday()` salah cakupan gagal tanpa suara | 3.13.0 `#099`, untuk setiap hook |
| 11 | `--danger` lawan `--error` | 3.13.0 `#100`, alias untuk `.fdy-help` saja |
| 12 | Daftar berbutir sederhana | 3.13.0 `#101` sebagai janji dan uji (§7) |
| 13 | `required` pada `FdyCombo` | sudah ada di 3.12.0 `#096` |
| 14 | Markup yang sengaja mentah | 3.14.0 `#102`, `data-fdy-ignore` |
| 15 | Urut ulang lewat seret | 3.14.0 `#103`, `data-fdy-sortable`; antar-daftar dan gulir tepi masuk fitur 0 (§5) |
| 16 | Badan `FdyModal` selarik di Safari iOS | 3.14.1 `#104`; konfirmasi perangkat menunggu (§3) |
| 17 | `useFreeday(ref)` ref kosong memindai seluruh dokumen | 3.14.2 `#105` sebagai peringatan; penyempitan menunggu (§2) |
| 18 | Pilihan bertumpuk untuk ibu jari | 3.15.0 `#107`, `.fdy-btn-group--stack` |
| 19 | `.fdy-btn--stretch` di luar kartu | 3.15.1 `#109`, peringatan pada klik pertama |
| 22 | `fdy-form-grid` menjadikan anak bukan-isian kolom | 3.16.0 `#111` |
| 23 | Pengalih tema hanya untuk Blazor | 3.17.0 `#113`, `FreedayTheme` dan `useTheme()` |
| 24 | `FdyAutocomplete` tidak dapat dijadikan wajib | 3.18.0 `#114`, ditambah Cfl dan DateRange |
| 25 | Atribut autocomplete, daftar terbuka tersaring | (a) dan (c) 3.19.0 `#115`; (b) tidak diambil (§7) |
| 26 | `<h1>` shell berisi merek | dokumen 3.19.0 `#116`; perbaikannya di app |
| 26b | `reference-screen.html` menyembunyikan `<h1>` di HP | 3.23.0 `#122` |
| 27 | Angka himpunan pembungkus di blok onboarding | dokumen 3.19.1 `#117` |
| 28 | Rentang tanggal dalam satu kolom | 3.20.0 `#118`, `layout="single"` |
| 29 | `useFreeday` tidak menghidrasi DOM anak | 3.23.0 `#119`, `MutationObserver` |
| 30 | Tidak ada kelas tautan teks | 3.23.0 `#120`, `.fdy-link` |
| 31 | Tab tegak tanpa bentuk ringkas | 3.23.0 `#121`, `.fdy-tabs--picker-narrow`; `FdyTabs` menunggu (§2) |

**Audit, bukan catatan app:**

| Audit | Status |
|---|---|
| Kontrol native di seluruh layar ronda, 2026-10-26 | date/time 3.11.0 `#094`/`#095`; accordion, search × dan isian angka di §2 dan §7 |
| Celah validasi kontrol kit | 3.12.0 `#096` dan 3.18.0 `#114` |
| State machine implisit, 2026-11-26 | 3.24.0 `#123`: `useLoad` dan sembilan cacat. 3.25.0: nilai dari host di enam wrapper Blazor, opsi autocomplete. Sisanya §1 butir 1 dan 3 |
