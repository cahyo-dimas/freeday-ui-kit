# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.32.0 — note 004: kalender yang tak bisa dikemudikan + tanda centang yang ikut bicara.**
- **Judul kalender kini kontrol.** Dulu `<div>` — satu-satunya yang menyebut bulan, dan tak bisa
  diklik — jadi satu-satunya rute pointer ke bulan lain adalah satu klik per bulan: Agustus 2026 ke
  Maret 2022 = **53 klik**. `Shift+PageUp` sudah melompat setahun (APG, benar) tapi tanpa afordansi
  sama sekali; helper Playwright di repo pelapor mengklik "bulan sebelumnya" **24 kali** dan itu
  di-ship — bukti terkuat bahwa shortcut yang tak disebut siapa pun memang tak ditemukan.
- Tekan judul → grid 12 bulan, panahnya melangkah **tahun**. Perjalanan yang sama = **7 klik**.
  Memilih bulan itu navigasi, bukan seleksi: nilai baru ter-commit saat TANGGAL dipilih.
  Dikirim di enhancer vanilla + Vue + React; `FdyDateRange` mengomposisi picker dan Blazor
  membungkus enhancer, jadi semuanya ikut. Kelas baru: `.fdy-cal__grid--months`, `.fdy-cal__month`.
- **Nama aksesibel opsi combo tak lagi berubah saat terpilih.** Centangnya teks di dalam
  `role="option"`, jadi opsi terpilih berbunyi `✓August` sementara yang lain `August`: state dibaca
  dua kali, dan `getByRole('option', {name})` berhenti cocok tepat pada opsi yang terpilih. Sekarang
  glyph-nya dilukis CSS dengan alt text — teknik yang sama dengan `.fdy-label--required`.
- **Bug yang kutulis lalu kutangkap sendiri di perubahan ini:** menukar head kalender dengan
  `v-if`/`v-else` menghancurkan tombol yang barusan ditekan → fokus jatuh ke `<body>` → handler
  `focusout` menutup panel di tengah navigasi. Head kini satu set elemen yang labelnya berganti, dan
  `focusout` mengabaikan `relatedTarget` null.
- `browser/harness.mjs` dapat **`axName(selector)`** — nama aksesibel versi mesin (CDP
  `Accessibility.getPartialAXTree`). Langsung berguna: versi pertama guard-ku membaca `textContent`,
  yang TAK PERNAH memuat generated content, jadi lolos padahal centangnya kembali ke pohon a11y.

Gate: `npm test` **41/41** · `npm run test:browser` **29/29**.

---

**v1.31.0 — note 002: density cuma satu arah.**
- Kit hanya mengirim blok `compact`, padahal komentarnya menjanjikan density per-subtree. Karena ini
  custom property yang mewaris, begitu `<html>` compact maka SELURUH subtree compact, dan
  `data-density="comfortable"` di wrapper tak cocok dengan aturan apa pun. App yang padat secara
  keseluruhan tak bisa mengembalikan satu region — chrome bersama dengan produk saudaranya meleset
  4px di dua tempat (logo 12 vs 16, avatar 12 vs 20), murni dari `--space-4` + `--control-h`.
- Sekarang `[data-density="comfortable"]` nyata, dan **nilainya diturunkan dari default token** saat
  build — bukan ditulis ulang. Key set sama secara konstruksi; default yang di-retune tak bisa bikin
  dua blok itu berselisih.
- README kit sendiri sudah lama menyuruh menulis `data-density="comfortable"` di `<html>` padahal
  belum ada aturannya — di root kebetulan benar (sama dengan default), baru rusak saat dipakai di
  subtree.

Gate: `npm test` **41/41** · `npm run test:browser` **25/25**.

---

**v1.30.0 — note 008 + laporan desain langsung soal border input.**
- **Gate kontras tak pernah benar-benar menguji tema GELAP sejak v1.21.0.** Regex-nya mencari
  `:root[data-theme="dark"]`, padahal un-rooting 1.21.0 mengubah selectornya jadi
  `[data-theme="dark"]` — jadi `dark` diam-diam jatuh balik ke nilai TERANG dan seluruh assert
  "DARK" menguji tema terang berlabel gelap (54 deklarasi diabaikan, semua hijau). Sudah diperbaiki,
  plus guard-untuk-guard: scope gelap yang tak resolve = gagal berisik. Tak ada kegagalan tersembunyi.
- **`--color-control-border` diturunkan** ke ramp baru `--slate-450` (`#798295`). Sebelumnya
  `--slate-500` — tinta yang SAMA dengan `--color-text-subtle`: batas kontrol membawa kontras
  setingkat teks (4.69:1 padahal WCAG 1.4.11 minta 3:1). Itu sebabnya form terasa lebih berat dari
  kartu di sekitarnya. Sekarang ≈3.9/3.6/3.4 di tiga surface terang. Langkah yang sama justru
  MENGUATKAN tema gelap yang tadinya 3.02:1 (0.02 di atas lantai, dan tak terjaga karena bug di atas)
  → 3.66:1.
- **`.fdy-stat__label`** pindah ke `--color-text-muted` (006 §6): `-subtle` sengaja di-gate 3.0 untuk
  placeholder/dekoratif, dan 4.41 di surface-2 itu di bawah AA untuk teks.
- **`--stretch` kini jalan di `.fdy-list__row`** (008 §1), opt-in via `:has()`. Terukur sebelum fix:
  overlay tiap baris menutupi SELURUH list dan yang terakhir di DOM menang — klik baris satu membuka
  baris dua, atas nama baris satu.
- **008 §2 tak bisa direproduksi** — dengan kontrol positif (menunjuk badan kartu MEMANG membuat
  target `:hover`), menunjuk pintu keluar tidak. Tak ada kode yang dikirim untuknya.

Gate: `npm test` **40/40** · `npm run test:browser` **24/24**.

---

**v1.29.0 — note 001 dari app konsumen KEDUA (back office 40 layar): 8 temuan, 6 dieksekusi.**
- **`clearable` di `FdyCfl`** (Vue/React/Blazor) — tipe nilainya sudah `Row | null` tapi emit-nya
  `Row` saja, jadi choose-from-list bisa DIISI tapi tak bisa DIKOSONGKAN: setiap foreign key opsional
  rusak, dan user yang salah pilih harus reload form. Tombol clear = `.fdy-input-group__btn` kedua,
  emit `null`, fokus balik ke trigger, dialog tak tersentuh.
- **`.fdy-label--required`** — penanda lewat `::after` dengan **CSS alt text** (`content:"*" / ""`):
  glyph-nya tampil, accessibility tree tak dapat apa-apa. Kontrolnya sudah punya `required`.
- **`.fdy-icon`** (kotak 1em) · **`.fdy-text-success/-warning/-danger`** (teks inline ber-STATE; kit
  cuma punya tiga role de-emphasis, jadi kalimat paling penting malah diredupkan).
- **`.fdy-menu__item:focus-visible` dapat ring sungguhan** — sebelumnya fokus = fill hover, padahal
  `freeday-menu.js` memindahkan fokus DOM asli, jadi menyusuri menu dengan panah tak terlihat.
  Dilaporkan dua app berbeda.
- **`<fieldset>` bergrup dapat spasinya** — legend dirender di luar flex flow, jadi `gap` tak pernah
  sampai ke sana (terukur 0px). Satu deklarasi di reset yang sudah ada, bukan blok baru.
- **§7 bukan seperti yang terlihat:** SELURUH string enhancer vanilla berbahasa Indonesia, jadi
  menerjemahkan satu `aria-label` justru MENCIPTAKAN campuran yang dikeluhkan. Pilihannya (hook
  override vs ganti default) = keputusan owner, tercatat di NEXT-UP #6.
- Dua jebakan yang cuma ketahuan lewat pengukuran: `.fdy-icon` sebagai elemen inline **mengabaikan
  `width`** (936px) sampai diberi `display`; dan menumpuk dua role warna (`.fdy-help.fdy-text-warning`)
  kalah senyap ke aturan yang kebetulan belakangan.

Gate: `npm test` **38/38** · `npm run test:browser` **23/23**.

---

**v1.28.0 — note 007: kartu yang bisa diklik dengan dua aksi.**
- Kit tak punya bentuk untuk kasus paling umum: **satu kartu, satu aksi utama, satu pintu keluar**.
  `--button` = kartu yang *adalah* kontrol; `--interactive` = kartu yang *punya* kontrol; kartu
  dengan dua aksi bukan keduanya (konten interaktif di dalam `<button>` = HTML tak sah).
- **`.fdy-btn--stretch`** membentangkan area klik tombol utama ke seluruh kartu. Dikirim sebagai pola,
  bukan sebagai satu baris dokumentasi, karena **tak bisa dirakit tangan di atas `.fdy-btn`**:
  tombol menaikkan dirinya lewat `transform` saat hover/active, elemen ber-transform jadi containing
  block bagi turunan absolut-nya, jadi overlay-nya pindah anchor ke kotak tombol di tengah gestur —
  `mousedown` di tombol, `mouseup` di elemen lain, `click` jatuh ke leluhur bersama. Gejalanya persis
  sama dengan bug yang mau diperbaiki.
- Note melihatnya di `--text`/`--ghost` (pecah saat ditekan). Aturan **dasar** kit
  `.fdy-btn:hover{transform:translateY(-1px)}` bikin isian default & `--danger` pecah lebih awal lagi,
  saat hover — jadi memperbaiki `:active` saja (perbaikan setengah yang paling mungkin ditulis) tetap bocor.
- **Pintu keluar dinaikkan otomatis** (bukan konvensi), karena lupa menaikkan gagal senyap.
- **Bug yang kutemukan di perubahanku sendiri saat recheck:** `position:relative` di spesifisitas
  normal menimpa aturan aplikasi — tombol dismiss yang di-`absolute` tertarik balik ke aliran normal.
  Sekarang `z-index` tetap menang, tapi `position`-nya jadi default ber-`:where()` (bobot nol) yang
  dikalahkan aturan aplikasi mana pun. **Dua aturan itu jangan digabung** — dijaga di gate.
- **Kartu saja.** `.fdy-list__row` tak positioned (`.fdy-list` yang positioned), jadi `--stretch` di
  baris list akan menutupi seluruh list. Untuk baris yang bisa diklik: `.fdy-list__row--button`.
- `--interactive` kini tertulis **presentasional** — satu-satunya afordansi di kit yang kebenarannya
  ada di luar dirinya; gagal senyap di dua arah.

Gate: `npm test` **34/34** · `npm run test:browser` **21/21**.

---

**v1.27.0 — note #44: `type="number"` memakai tombol spin bawaan browser.**
- Tombol itu widget OS berwarna OS — tak terjangkau tema mana pun. Di permukaan gelap ia jadi
  artefak abu-abu yang menempel di field yang sudah berteme: **satu-satunya kontrol tak berteme**
  di halaman yang semua kontrolnya berteme. Dinetralkan dua-duanya karena beda mesin:
  `appearance:textfield` (Firefox) + pseudo-element `::-webkit-*-spin-button` (Blink/WebKit).
- **`[data-fdy-number]` + `freeday-number.js`** mengembalikan afordansinya. **Bukan blok baru** —
  `.fdy-input-group` + dua `__btn`, jadi border bersama, ring `:focus-within`, dan promosi error
  `:has()` ikut gratis. Usulan note (`.fdy-number` blok sendiri) akan menduplikasi semuanya.
- **Tanpa event kustom:** stepping men-dispatch `input` + `change` native, jadi `v-model`/`onChange`/
  `@bind` jalan tanpa adapter — input tetap sumber kebenaran. Itu juga alasan komponen ini tak butuh
  typed wrapper di empat stack.
- Tombol nonaktif di batas, di field `disabled`/`readonly`, dan saat `step="any"` (tak punya
  increment; `stepUp()` melempar). `MutationObserver` mengawasi atribut-atribut itu — framework
  mengubahnya tanpa event, dan tombol yang tampak aktif tapi tak berbuat apa-apa persis kebohongan
  yang mesin state ini ada untuk mencegah. Observer pertama di kit.
- **`type="search"` sengaja tak disentuh** — tombol × bawaannya juga tak berteme (dan ada 10 di
  halaman docs kit sendiri), tapi itu satu-satunya cara mengosongkan field: menghapusnya membuang
  fungsi, bukan chrome. `date`/`time` sama; kit sudah punya picker sendiri, jadi jawabannya docs.
- **Kenapa tak pernah ketahuan:** `type="number"` dipakai **nol kali** di seluruh docs + examples
  (vs `search` 10×, `text` 12×, `date` 4×). Kit tak pernah memakai input yang ia kirim. Sekarang
  halaman docs memuat field angka betulan.
- `browser/harness.mjs` dapat `pressKey` — urutan tab cuma bergerak oleh tombol tepercaya, jadi
  klaim "tombol step bukan tab stop" diukur, bukan dibaca dari atribut.

Gate: `npm test` **33/33** · `npm run test:browser` **18/18**.

---

**v1.26.0 — note #43: baris file tak bisa bilang "sudah terkirim, sekarang menunggu server".**
- Satu-satunya state panjang baris upload dinamai menurut **transfer**-nya. Untuk konsumen yang
  uploadnya diikuti kerja server (OCR/ekstraksi/scan), label "Mengunggah…" jadi salah begitu byte
  terakhir keluar — dan `setProgress(100)` memperburuk: bar penuh yang lalu diam adalah sinyal
  "hang" paling meyakinkan yang bisa dihasilkan UI. Tak ada jalan keluar di API baris: `done()`
  bohong, `fail()` bohong, `ready()` mundur. Konsumen akhirnya merender baris status kedua di luar
  row — dua komponen yang saling bertentangan.
- **`row.waiting(label)`** mengisi celah itu: bar jadi **indeterminate**, `aria-valuenow` dilepas
  (progressbar tanpa nilai = definisi indeterminate di ARIA — kontrak yang sudah tertulis di
  `COMPONENTS.md` untuk `.fdy-progress`), label milik konsumen (default `Menunggu server…`).
- **Patch di note-nya justru mengirim balik gejalanya:** modifier ditaruh di **bar** (padahal
  `.fdy-progress--indeterminate` menata `.fdy-progress__bar`, jadi tempatnya di kontainer) plus
  inline `width:100%` yang mengalahkan lebar modifier — dua-duanya merender bar penuh yang beku.
- **Keluar dari state ini lebih rawan daripada masuk:** `.fdy-progress__bar` itu block div, tanpa
  width ia memenuhi track. Jadi `uploading()`/`setProgress()` mengembalikan width eksplisit saat
  melepas modifier — kalau tidak, baris yang di-retry menggambar bar **penuh** untuk 0%.
- Tak ada kelas `.fdy-file--waiting` (`uploading` juga tak punya; hanya `--success`/`--error` yang
  membawa warna). Catatan: di `prefers-reduced-motion` bar indeterminate kit memang bar penuh yang
  diredupkan — perilaku lama, di situ yang jujur adalah label, bukan bar.

Gate: `npm test` **32/32** · `npm run test:browser` **15/15**.

---

**v1.25.0 — note #42 (ketemu saat mengadopsi 1.24.0): `fdy-upload-remove` tak pernah sampai.**
- Event-nya di-dispatch di **row**, yang tinggal di file list — dan markup contract kit sendiri
  menaruh list itu sebagai **sibling** dropzone, jadi ia tak pernah mem-bubble lewat zone.
  Konsumen yang mengikuti dokumentasi dapat `add`, tak pernah dapat `remove`: tanpa error, nama
  event benar, elemen benar, dan event satunya di elemen yang sama jalan.
- **Header file kit sendiri sumber kesalahannya** — tertulis kedua event "on the dropzone"
  padahal kode-nya lain. Sekarang header menyebut target masing-masing + alasannya.
- **Usulan note (dispatch di KEDUANYA) ditolak, dan guard membuktikan kenapa:** kalau list
  bersarang di dalam dropzone (`data-filelist` mengizinkan), row sudah mem-bubble lewat zone →
  listener zone kena **dua kali** per penghapusan. Satu target kanonik = fix yang jujur.
- Sekalian menutup kasus **tanpa list** dari 1.24.0: row yang tak pernah ter-attach mem-bubble ke
  mana pun tidak.
- **Migrasi:** konsumen yang tadinya mengakali dengan mendengarkan di file list harus pindah ke
  dropzone. Posisi itu memang tak pernah terdokumentasi — itulah bug-nya.

Gate: `npm test` **32/32** · `npm run test:browser` **14/14**.

---

**v1.24.0 — note #41: baris upload tak punya state "sudah dipilih, belum dikirim".**
- `handleFiles` memanggil `row.uploading()` tanpa syarat, dan **sebelum** `fdy-upload-add`
  di-dispatch — jadi konsumen tak bisa mendahuluinya. Antara drop dan tombol submit milik app
  (bisa semenit, selama user mengisi sisa form) baris itu mengaku sedang mengunggah dengan
  progress bar yang tak pernah bergerak → dibaca sebagai upload hang, dilaporkan sebagai bug atas
  transfer yang tak pernah dimulai. State machine-nya memang kehilangan **start state**.
  Sekarang default = **rest**; jalur demo (`data-fdy-upload-simulate`) tak berubah karena di situ
  kit memang sedang mentransfer.
- **`fdy-upload-add` tak lagi bergantung pada rendering row.** Guard `if (!list || !fileList)`
  membuat dropzone tanpa list kehilangan event-nya juga. Rendering & pengumuman kini terpisah —
  **tanpa atribut baru** (`data-rows="off"` yang diusulkan tak perlu: `list` cuma dipakai di dua
  tempat).
- **`row.ready()`** ditambahkan, memakai `dropProgress()` yang sudah ada.
- **API row akhirnya terdokumentasi.** `uploading`/`setProgress`/`done`/`fail` **nol sebutan** di
  seluruh docs ter-ship sebelum ini — itu sebagian alasan default lama tak pernah dipertanyakan.
- Dua koreksi atas note: fungsinya `handleFiles` (bukan `addFiles`), atributnya
  `data-fdy-upload-simulate` (bukan `data-simulate`).
- **Guard:** `browser/upload-states.mjs`. Fixture-nya membungkus dropzone tanpa-list di container
  sendiri **dengan sengaja** — tanpa `data-filelist`, enhancer jatuh ke
  `parentNode.querySelector('.fdy-filelist')` dan mengadopsi list tetangga; versi pertama guard ini
  tak menguji apa pun, dan mutation run yang membongkarnya.

Gate: `npm test` **32/32** · `npm run test:browser` **13/13**.

---

**v1.23.0 — ronde 6 (`improvement-notes/006`): 3 temuan, 2 di antaranya dilaporkan sebagai bug
pelapor sendiri — dan memang benar, tapi di kedua kasus kit punya cara membuat kesalahan itu
MUSTAHIL dan tak mengambilnya. Justru dua itu yang paling berharga.**
- **`initAll(ctx)` kini juga meng-enhance `ctx` itu sendiri.** `querySelectorAll` tak pernah cocok
  dengan root-nya sendiri, jadi ref framework yang dipasang **di** widget-nya (`<div ref="menu"
  data-fdy-menu>` — bentuk biasa kalau root komponen ITU widget-nya) membuat satu-satunya elemen
  yang butuh di-enhance jadi satu-satunya yang tak bisa ditemukan. Gagal **tanpa error, tanpa
  warning, UI terlihat jadi**. Satu baris `matches()` per selector di **21 enhancer** (drawer & cfl
  perlu callback inline-nya di-hoist dulu). `useFreeday` + `FreedayBlazor.initAll` mendelegasikan ke
  sini, jadi ikut terperbaiki tanpa perubahan.
- **Garis konektor stepper tak lagi menembus angka** saat `__btn` dihilangkan: lift-nya dipindah ke
  `.fdy-step__marker` (bagian yang selalu ada). Konektor itu `position:absolute;z-index:0`, dan box
  ber-posisi dilukis SETELAH konten inline in-flow di stacking context yang sama — jadi marker yang
  cuma inline tertimpa, bukan karena tak punya z-index tapi karena tak ber-posisi.
- **`.fdy-avatar--xs` (1.5rem)** — `.fdy-btn--sm` itu tepat 2rem, sama dengan `--sm`, jadi avatar
  kecil di tombol kecil mengisi habis dan border ghost memotong lingkarannya. Usul note `--text-2xs`
  TAK ADA di kit; dipakai `--text-xs` (terkecil yang ada).
- **Guard:** `browser/root-init.mjs` — mount setelah load, init via root sendiri, lalu **klik asli**
  untuk membuktikan terbuka. Mutation-checked.

Gate: `npm test` **32/32** · `npm run test:browser` **12/12** · `typecheck:react` 0 error.

---

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
