# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog.** Riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

> Berkas ini sempat mengingkari kalimat di atas: 419 barisnya berisi riwayat per-versi v1.24.0–v1.34.0,
> duplikat CHANGELOG, dan berhenti diperbarui 20 rilis sebelum 2.0.0. Snapshot basi lebih berbahaya
> daripada tak ada snapshot. Riwayat itu dibuang (2026-08-25), seperti yang sudah pernah dilakukan
> di v1.20.0 untuk alasan yang sama. Yang tersisa di sini hanya **keadaan sekarang**.

## Di mana kita sekarang

**`3.3.0`, dan itu yang terbit** (2026-08-28). Diperiksa, bukan diingat — ketiga perintah yang
berkas ini resepkan benar-benar dijalankan:

```
npm view @cahyo-dimas/freeday version   -> 3.3.0   (dist-tags latest = 3.3.0)
git rev-list --left-right --count origin/main...main -> 0  0
curl -L .../freeday-ui-kit/docs/        -> v3.3.0
```

Isi tarball diperiksa dari registry (`npm pack @cahyo-dimas/freeday@3.3.0`), bukan dari `npm pack`
lokal: ketujuh perubahan ada di dalamnya — `.fdy-field--full{max-width:none}`,
`.fdy-cfl__host{display:contents}`, `min-width:0;min-height:0` di `__content`, `flex:none` di
`__topbar`, `var(--fdy-app-sidebar-w,15.5rem)`, `.fdy-cfl__search .fdy-input-group`, dan
`dialogOnly`/`DialogOnly` + `defineExpose({ open …})` di ketiga adapter.

**Rilisnya lewat tag, bukan `npm publish` lokal.** `publish.yml` memicu pada tag `v*`, memanggil
`ci.yml` lebih dulu (jadi tag yang gerbangnya merah tak pernah sampai ke npm), lalu publish dengan
**OIDC trusted publishing** — tanpa token tersimpan, provenance otomatis. `npm publish` dari mesin
dev bukan cuma tak perlu, ia **melewati gerbang itu**, dan tetap akan berhenti di `EOTP` karena 2FA.
Perintahnya: `git tag -a v<versi> -m "<versi>" && git push origin main --follow-tags`.

Isi 3.3.0 dalam satu kalimat: **tiga kemampuan yang sudah ada di kit dan tak ada yang bisa
memintanya** — `FdyCfl` yang hanya bisa dibuka oleh field-nya sendiri (`#054`), cap `.fdy-field`
yang hanya bisa dilepas oleh `.fdy-form-grid` (`#055` §1), dan `.fdy-nav--flat` yang ada sejak 1.1.0
tapi dijelaskan salah di COMPONENTS.md (`#055` §3). Detail di CHANGELOG.

Gerbang untuk 3.3.0, lokal **dan** di runner: `node --test` **119/119**, `npm run test:browser`
**108/108** (24 spec), `npm run typecheck:react` bersih, `npm run test:blazor` **21/21**. Empat
gerbang baru diverifikasi dengan **mutasi**, satu per satu.

---

Snapshot rilis sebelumnya, `3.2.0` (2026-08-28), disimpan karena catatan kegagalan gerbangnya
masih berlaku. Waktu itu ketiga perintah yang sama dijalankan dan menjawab `3.2.0`; isi tarballnya
diperiksa dari registry, dan keempat perubahan 3.2.0 ada di dalamnya — `box-shadow` inset di `.fdy-tabs__list`, blok
`@container fdy-cfl`, `--color-text-subtle: var(--slate-450)` di scope gelap, dan `'wide' | 'cfl'`
di `FdyModal`. Sebelum ini `latest` = `3.1.0`.

Catatan kecil pada perintah ketiga: **sertakan `/docs/`**. Root Pages hanya stub 301-byte dengan
`<meta http-equiv="refresh">`, dan meta refresh bukan redirect HTTP, jadi `curl -L` pada root ikut
berhenti di sana dan grep versinya pulang kosong — yang terbaca persis seperti Pages belum terbit.

**3.1.0 ditolak gerbangnya tiga kali sebelum lolos, dan tak satu pun menerbitkan apa pun.**
Layak dicatat karena dua di antaranya bukan cacat kit: (1) guard baru menjumlahkan piksel yang sudah
dibulatkan sendiri-sendiri, `302` lawan `301` — hanya terlihat di runner, karena Chrome stable di
mesin dev berbagi font dengan Chromium-nya; (2) race stepper yang sudah merah sejak `3817482`;
(3) Chrome tak pernah hidup di runner. Nomor 1 diperbaiki, nomor 3 kini di-retry oleh harness, dan
nomor 2 **masih terbuka** — lihat §Yang diketahui dan belum diselesaikan.

Rilis terakhir, dan apa artinya bagi konsumen:

- **3.2.0: dua cacat yang tak bisa dipotret, dan satu komponen yang akhirnya muat di 420px.**
  `improvement-notes` #052 dan #053. Strip tab menggulung 1px karena `overflow-x:auto` tak bisa
  meminta satu sumbu saja — dan scrollport yang sama **memotong** separuh bawah underline tab aktif,
  jadi garis 2px itu selama ini terkirim 1px; keduanya hilang begitu garis strip jadi `box-shadow`
  inset. `--color-text-subtle` gelap naik ke `slate-450` (4.02 → **4.88:1** di `--color-surface`),
  karena tier dekoratif itu dipakai untuk placeholder kit sendiri. `FdyCfl` menata barisnya sebagai
  list di bawah container 30rem — **container query, nol prop baru**, jadi keempat stack dapat
  sekaligus. Plus `size="cfl"` di `FdyModal`. Aditif seluruhnya untuk konsumen 3.1.x, kecuali satu
  hal yang perlu dibaca: konsumen yang menyembunyikan garis strip tab dengan `border-bottom:0`
  sekarang harus memakai `box-shadow:none`.
- **3.1.0: lebar yang tak kelihatan di DOM.** Dua cacat dari layar sungguhan
  (`improvement-notes` #050, #051). Kontrol di dalam `.fdy-field` kini selebar field-nya — cap
  `22rem`-nya dulu hanya dilepas di `.fdy-filterbar`, untuk dua dari empat kontrol, jadi toolbar
  dengan field `26rem` menyembunyikan **64px ruang mati di dalam field** dan `gap:var(--space-3)`
  terbaca 76px. Plus `.fdy-stats--inline`, strip KPI yang memeluk angkanya: `.fdy-stat` bawaan
  `container-type:inline-size`, jadi ia **tak menyumbang lebar intrinsik**, dan header yang
  me-retrack grid-nya ke konten dapat tiga track nol. Keduanya aditif untuk konsumen 3.0.x.
- **3.0.0: adopsi back-office.** Tujuh item dari spec `2026-08-26`: row selection terkontrol di 4
  stack · `.fdy-table--striped` · `Freeday.busy()` · stepper `is-error` + Lanjut yang bisa ditolak ·
  mode nav overlay di layar lebar · **sumbu palet primary 18 pilihan** · **sumbu gaya
  `soft`/`glass`**. Seluruhnya **aditif** — konsumen 2.x naik tanpa mengubah satu baris; nomor mayor
  diambil sebagai keputusan pemilik untuk membuka lini ini, dan alasannya tertulis di CHANGELOG.
  Suite baru: `npm run test:blazor-server`, host Blazor Server sungguhan, yang menutup `NEXT-UP` #2.
- **2.0.0: enhancer vanilla berbahasa Inggris.** 39 string di 9 enhancer, plus fallback locale
  datepicker (`lang || 'en'`) yang menentukan nama bulan/hari. **Breaking** untuk app Indonesia di
  jalur mentah; migrasinya atribut, bukan fork: `data-fdy-text-<key>` (dan `<html lang="id">` untuk
  tanggal).
- **2.1.0: permukaan typed akhirnya terdokumentasi, dan dijaga.** `singleRow()` (narrowing
  `FdyCfl` untuk Vue/React), 12 tabel `### Props — <FdyX>` di COMPONENTS.md, kontrak
  `FdyTableColumn`, plus kebijakan "tipe publik yang melebar = breaking" di kepala CHANGELOG.
  Empat guard baru menahan semuanya, dan dua di antaranya menemukan kebasian yang sudah berumur
  satu rilis mayor: `FdyAppShell` absen dari empat daftar wrapper.
- **2.2.0: jalur mentah menyusul apa yang Vue/React implementasi sendiri.** `disabled`/`readonly`/
  `invalid` di datepicker & cascade (CSS-nya sudah menata ketiganya sejak awal, enhancer-nya tak
  pernah menyetel), `setState()` di empat enhancer, label kalender jadi overridable, dan paritas
  prop Blazor untuk empat picker. Ikut terangkat: `Seri 1` dan `Maks`, dua string Indonesia yang
  masih terbit setelah 2.0.0, ketahuan saat guard string dibalik dari "cari baris yang menulis ke
  DOM" jadi "baca setiap literal".

## Yang terjaga, dan seberapa

```
npm test                 119 test  · node --test, gerbang default, tanpa browser
npm run test:browser     108 test  · 24 spec, Chrome sungguhan (fokus/pointer/piksel/AX tree)
npm run typecheck:react  tsc --noEmit
npm run test:blazor      21 test  · bUnit, komponen Blazor dirender sungguhan
npm run test:blazor-server 4 test  · Blazor Server SUNGGUHAN + prerender, lewat CDP
```

- **Blazor akhirnya punya gerbang perilaku** (2026-08-25). Sebelumnya hanya `dotnet build`, yaitu
  kompilasi, untuk 12 komponen, termasuk `FdyAppShell` yang merekonsiliasi binding dua arah dengan
  enhancer JS. `test/blazor/` sengaja di luar `adapters/`, yang ikut terkirim ke npm.
- **Test browser kini jalan di CI** (`.github/workflows/ci.yml`, sejak 2026-08-24) di tiap push, dan
  `publish.yml` memanggilnya sebagai gerbang, jadi tag dengan guard merah tak pernah sampai ke npm.
  Job-nya **mengasersikan jumlahnya sendiri**: `node --test` keluar 0 untuk suite yang mem-skip
  semuanya, jadi "hijau" dan "guard-nya jalan" adalah dua fakta berbeda.
- **Kalau CI merah, baca anotasinya, bukan lognya.** `ci.yml` mengubah tiap baris `not ok` jadi
  `::error::`, dan anotasi terbaca **tanpa autentikasi**:
  `curl .../actions/runs/<id>/jobs` → ambil `check_run_url` → `curl <check_run_url>/annotations`.
  Unduhan log mentah butuh hak admin dan akan menjawab 403. Satu putaran penuh 2026-08-26 hilang
  karena menduga-duga alih-alih memanggil endpoint itu.
- **Engine sengaja berbeda**: CI memakai Chrome stable bawaan runner (yang dipakai konsumen), lokal
  memakai Chromium 133 dari cache puppeteer. `CHROME_BIN=<Chrome mana pun>` bisa dipakai langsung.
- Paralelisme suite dibatasi `--test-concurrency=3`: delapan Chrome tidak lebih cepat dari tiga
  (terukur 66s vs 64s), hanya lebih goyah.

## Rilis

```bash
npm version patch|minor|major   # bump + build + git add dist, bikin tag
git push --follow-tags          # CI jalan; publish.yml menerbitkan lewat OIDC
```

Tanpa token, tanpa OTP, dengan provenance SLSA. Token 2FA-bypass **tidak** dipakai lagi, karena npm sedang
membatasinya ([gh.io/npm-gat-bypass2fa-deprecation](https://gh.io/npm-gat-bypass2fa-deprecation)).

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i @cahyo-dimas/freeday`, panduan di
  [`README.md`](README.md) & [`docs/getting-started.md`](docs/getting-started.md)

## Lokasi

- `tokens/tokens.json` · `tokens/build.mjs` · pipeline token (Tier-1/2/3)
- `src/components/*.css` (49) + `src/freeday-*.js` (27 enhancer) authored · `dist/` hasil build (di-commit)
- `adapters/{vue,react,blazor}/` integrasi framework · `adapters/core/` logika lintas-adapter
  (`table-model.js`, `app-shell.js`) · `examples/*-faktur/` bukti pakai
- `browser/` spec + fixture + harness CDP (tak ikut di-ship; jumlahnya ada di blok gerbang di atas, satu tempat saja)
- `COMPONENTS.md` seluruh class publik · `USAGE.md` doktrin · `docs/agent-onboarding.md` untuk AI agent
- `docs/index.html` demo-site · `docs/reference-screen.html` 1 layar utuh · `getting-started.md` · `integrations.md`
- `docs/superpowers/specs/` spec/blueprint (sumber-kebenaran desain)
- `improvement-notes/` friksi dari app nyata; **tak pernah di-commit** (hook pre-commit memblokir)
- `reference/` material input, tak pernah di-ship

## Yang diketahui dan belum diselesaikan

- `docs/index.html` berprosa Indonesia dengan toggle ID→EN untuk chrome demo-nya sendiri; toggle itu
  tak menjangkau string enhancer, jadi sejak 2.0.0 mode Indonesia mencampur. Sengaja dibiarkan, karena
  halaman itu bertugas menunjukkan default kit yang sebenarnya.
- **Job browser di CI kadang gagal karena Chrome-nya tak pernah hidup**, bukan karena kodenya:
  `error: 'Chrome never wrote DevToolsActivePort'`, lalu lima sampai enam test berkoordinat ikut
  merah sebagai korban. Terlihat 2026-08-26: run `CI` di `main` merah karena ini, sementara run
  `Publish` menjalankan suite yang sama pada commit yang sama dan hijau, beberapa menit berselang.
  **Cara membedakannya cuma satu: baca anotasinya.** `ci.yml` menganotasikan baris
  `error:`/`expected`/`actual` dari diagnostik TAP, bukan cuma nama test — persis supaya kegagalan
  peluncuran browser tak lagi terbaca seperti regresi.
  **Sejak 3.1.0 saran "jalankan ulang job-nya" tak lagi jadi langkah pertama:** `browser/harness.mjs`
  mencoba peluncuran tiga kali, masing-masing dengan profil sendiri (profil setengah jadi adalah
  alasan peluncuran berikutnya ikut gagal), dan `stdio` stderr Chrome tak lagi dibuang — kalau ketiga
  percobaan habis, errornya menyebut `(attempt 3 of 3), chrome said: …`. Diuji dua arah dengan binary
  tiruan yang bisa disuruh gagal. Peluncuran bukan asersi; mengulanginya tak melemahkan apa pun.
  Kalau tetap merah setelah tiga percobaan, itu bukan lagi flake — baca apa kata Chrome.
- **Anotasi CI pernah menyebut angka tanpa menyebut asersinya.** `error:` TAP adalah block scalar
  begitu pesannya multi-baris, dan `assert.equal` selalu menambahkan `\n\n2 !== 1`, jadi setiap pesan
  asersi nyata datang sebagai `error: |-` dengan teksnya di bawah — dan teks itu dulu dibuang. Sebuah
  run bisa bilang `expected 1, actual 2` untuk test yang punya empat asersi `=== 1`. Diperbaiki di
  3.1.0; kalau menambah ekstraksi baru, uji terhadap TAP sungguhan dari kegagalan yang dipaksa, bukan
  terhadap TAP yang dibayangkan.
- **`stepper: a refused guard leaves the panel exactly where it was` masih bisa merah di runner.**
  `expected 1, actual 2` — panelnya maju padahal guard menolak. Sudah merah di `3817482` dan sekali
  lagi saat memotong 3.1.0, jadi `1549278` (yang mengejar race `settle`) belum menutupnya. **Tidak
  tereproduksi** di mesin dev: tidak di kedua engine, tidak di `--test-concurrency=3`, tidak di 4 run
  paralel, dan tidak dengan stylesheet digelembungkan ke 20MB untuk melebarkan jendela sebelum script
  inline fixture jalan — di percobaan terakhir itu `window.mode` justru sudah tersetel saat kondisi
  tunggu lama terpenuhi, jadi hipotesis "mode ditimpa" **tidak berlaku**. Yang sudah dilakukan:
  kedua spec stepper berhenti menunggu `.fdy-step.is-active` (markup statis, benar sejak parser
  melewatinya, membuktikan nol) dan kini menunggu `fdyStepperReady` + `window.asked`. Itu bukan
  perbaikan yang terbukti — run hijau berikutnya bukan bukti. Kalau muncul lagi, anotasinya sekarang
  akan menyebut asersi yang mana; mulai dari situ.

## Selanjutnya

Backlog aktif ada di **[`NEXT-UP.md`](NEXT-UP.md)**. Dua item yang pemicunya sudah datang, #8
(perilaku app-shell) dan #6 (bahasa default), **selesai** di 1.53.0/1.54.0/2.0.0. Dua catatan
friksi yang masih terbuka, `improvement-notes` #040 (kontrak kolom typed tak ada di COMPONENTS.md)
dan #045 (tipe emit `FdyCfl` melebar tanpa diumumkan), ditutup 2026-08-25 dan menunggu 2.1.0.

`improvement-notes` #050 dan #051 ditutup 2026-08-27 dan **terbit di 3.1.0**.

Sikap default tetap: **tunggu demand**. Tapi malam 24–25 Agustus 2026 memberi satu pelajaran yang
layak dibawa: **NEXT-UP sendiri bisa basi**. #6 menuliskan "bikin hook override" sebagai pilihan,
padahal hook itu sudah dikirim di 1.39.0; #8 menyebut label datepicker Indonesia yang ternyata sudah
Inggris. Verifikasi ulang klaim sebuah item sebelum menjadikannya alasan bekerja.
