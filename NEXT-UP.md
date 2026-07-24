# Freeday — Next up

Titik lanjut. Kalau mau nerusin kerjaan di repo ini, **buka dokumen ini dulu**, pilih satu item,
kerjakan. Status ada di [`HANDOFF.md`](HANDOFF.md); riwayat versi di [`CHANGELOG.md`](CHANGELOG.md);
sumber-kebenaran desain di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

_Ditulis 2026-07-24, tepat setelah v1.6.0 di-push & live._

---

## TL;DR — tidak ada yang mendesak

Kit **fungsional & live di v1.6.2**. Tiga item di bawah semuanya **bisa ditunda**:
tak satu pun memblokir siapa pun hari ini, tak satu pun mengubah fitur atau UI secara signifikan,
dan **dua dari tiga menunggu keputusanmu, bukan koding**. Aman kalau repo ini didiamkan berbulan-bulan.

## Kondisi saat dokumen ini ditulis

- `main` = `origin/main` = tag **`v1.6.2`**, satu branch bersih, working tree bersih.
- Tag: **`v1.5.0`** (React adapter parity) · **`v1.6.0`** (wrapper input ekstra + filter-bar) ·
  **`v1.6.1`** (fix: pemilihan opsi combo dengan mouse — lihat "Pelajaran" di bawah) ·
  **`v1.6.2`** (lisensi MIT + file `LICENSE`).
- Live: <https://cahyo-dimas.github.io/freeday-ui-kit/docs/> — terverifikasi menampilkan v1.6.2.
- Gate hijau: `npm test` 9/9 · `npm run typecheck:react` 0 error · `node tokens/build.mjs` tanpa diff.
- `improvement-notes/` sengaja dibiarkan untracked (catatan mentah, bukan bagian rilis).

---

## Urutan prioritas (jujur)

### 1. Tutup gap kontras AA pada soft badge — spec §13
**Effort: S** · **butuh keputusanmu**

**Masalah.** Foreground badge "soft" di tema **terang** ada di 3.0–4.24:1, di bawah 4.5:1 yang
disyaratkan untuk teks kecil ber-bold. Sementara kit mengklaim **WCAG AA** di mana-mana (hero docs,
README, HANDOFF).

**Kenapa ini nomor satu.** Ini bukan fitur baru — ini selisih antara yang kita *klaim* dan yang kita
*penuhi*. Kecil, tapi menyangkut kredibilitas klaim utama kit.

**Kenapa belum dikerjakan.** Butuh keputusanmu: menggelapkan teks sedikit mengubah tampilan "soft"
badge. Pilihan:
- **(a)** Gelapkan hanya *foreground* sampai lolos 4.5:1, background soft dipertahankan. ← rekomendasiku, perubahan visual paling kecil
- **(b)** Besarkan/tebalkan teks badge agar masuk pengecualian teks besar (≥18.66px bold) — mengubah bentuk badge, lebih invasif
- **(c)** Putuskan badge soft memang bukan untuk informasi kritis, lalu **turunkan klaimnya** di docs supaya jujur

**Enaknya:** gate-nya objektif, bukan selera. Tambah assertion pasangan badge soft di
`test/contrast.test.mjs`, lalu setel token sampai `npm test` hijau.

**Mulai dari:** `src/components/badge.css` (pasangan `--color-*-strong` di atas `--color-*-soft`) ·
`tokens/tokens.json` · `test/contrast.test.mjs` · spec §13.

---

### 2. Review independen untuk kode v1.6.0
**Effort: S (satu perintah)** · tindak lanjut tergantung temuan

**Apa.** Jalankan code review untuk rentang **`91e2953..ae43914`**.

**Kenapa.** v1.5.0 lewat review multi-agent penuh (per-task + whole-branch, verdict *READY TO MERGE*).
v1.6.0 — `FdyDateRange`, `FdyAutocomplete`, `FdyCascade`, `.fdy-filterbar` — baru lewat typecheck +
build + render + review saya sendiri, **belum direview independen**. Ini kode interaktif dengan
logika keyboard/ARIA, tempat bug halus biasa bersembunyi:
- roving index & fokus saat drill/ascend di `FdyCascade`
- wrap ↑/↓ dan commit-vs-ketik di `FdyAutocomplete`
- keterkaitan min/max di `FdyDateRange` saat salah satu sisi dikosongkan
- perilaku `.fdy-filterbar` di container sempit (media query berbasis viewport, bukan container)

**Catatan.** Sudah ter-rilis & live, jadi ini menangkap bug laten — bukan gerbang rilis. Nggak ada
yang rusak sejauh ini.

**Mulai dari:** `/code-review 91e2953..ae43914` (atau `/code-review ultra` untuk yang lebih dalam).

---

### 3. #8 — Distribusi registry-friendly
**Effort: S–M setelah keputusan** · **butuh keputusanmu**

**Masalah.** `npm i github:cahyo-dimas/freeday-ui-kit#v1.6.0` menulis `git+ssh://` ke lockfile
konsumen → `npm ci` di CI tanpa SSH key yang berwenang akan **gagal**.

**Status.** Sudah dimitigasi sebagian sejak v1.1 lewat dokumentasi install `git+https`. Jadi **bukan
blocker aktif** — cuma friksi onboarding.

**Kenapa paling bawah.** Nol dampak ke pengguna kit hari ini; baru terasa saat menambah konsumen atau
CI baru. Dan ini menunggu keputusanmu, bukan koding: **npm publik vs GitHub Packages**, nama scope
(mis. `@cahyo-dimas/freeday`), plus token/secrets untuk publish.

**Mulai dari:** `package.json` (`name`, `publishConfig`, `files`) · bagian install di `README.md` +
`docs/getting-started.md` · kemungkinan satu workflow release.

---

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
menyembunyikan seluruh kelas bug "listbox tertutup sebelum pilih". Harness sekali-pakai ada di
scratchpad sesi (driver CDP nol-dependency: Node 22 `WebSocket`+`fetch` global). Pola tes:
buka trigger → **pastikan** `aria-expanded="true"` → klik opsi di koordinatnya (settle dulu, hindari
klik saat transisi/scroll) → assert nilai berubah.

## Kalau nanti mau rilis lagi

Semua perubahan sejauh ini bersifat aditif → **MINOR bump**. Saat cut versi, jangan lupa **sync semua
referensi versi publik**, bukan cuma `package.json`:

`package.json` · `package-lock.json` (2 field) · `README.md` (badge + 3 install) ·
`docs/index.html` (eyebrow, `#install-cmd`, footer) · `docs/getting-started.md` (4×) · `HANDOFF.md` ·
`examples/{react,vue}-faktur/README.md`

**Jangan disentuh:** `README.md` baris "WCAG **1.4.11**" (itu nomor sukses WCAG, bukan versi), entri
historis di `CHANGELOG.md`, dan jalur rilis historis di `HANDOFF.md`.

Setelah push, Pages rebuild otomatis (~belasan detik) — verifikasi dengan meng-`curl` docs live dan
memastikan install command sudah menunjukkan versi baru.
