# Freeday — Next up

Titik lanjut. Kalau mau nerusin kerjaan di repo ini, **buka dokumen ini dulu**, pilih satu item,
kerjakan. Status ada di [`HANDOFF.md`](HANDOFF.md); riwayat versi di [`CHANGELOG.md`](CHANGELOG.md);
sumber-kebenaran desain di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

_Ditulis 2026-07-24, tepat setelah v1.6.0 di-push & live. **Diperbarui 2026-07-27** setelah
menuntaskan ketiga item di bawah._

> **Update 2026-07-28 — v1.8.0 (published).** Tiga improvement note dari migrasi
> `doc-ai-automation-web-*` sudah dikerjakan & rilis (aditif, non-breaking):
> **#22** utilitas `.fdy-mono` (mono alignment-neutral untuk id/kode/IP/timestamp);
> **#23** `FdyTable` controlled Vue+React (baca `rows` tiap render — aman di framework, tak seperti
> enhancer yang snapshot DOM; sort/filter type-aware text/enum/number/date/paginate; client **atau**
> server via `page`) di atas core murni `adapters/core/table-model.js` (di-test `node --test`);
> **#24** `FdyModal`/`FdyDrawer` controlled Vue+React (glue `showModal()`/`close()` + Esc + backdrop
> ditulis sekali). Gate hijau: `node --test` 20/20 · `typecheck:react` 0 · build no-diff (dist =
> hanya penambahan CSS). Catatan mentah ada di `improvement-notes/` (tetap untracked).
>
> **Update 2026-07-28 (2) — v1.9.0 (published).** Follow-up `FdyTable` dari notes #25/#26:
> **#25** generic row dilonggarkan `Record<string,unknown>` → `extends object` (blocker: DTO
> ber-`interface` sebelumnya gagal compile; komponen tak pernah meng-index row langsung, semua lewat
> core, jadi tanpa cast). **#26** aktivasi baris opt-in: `rowActivatable` + `row-activate`/`onRowActivate`
> + `rowClass` + `.fdy-table__row--activatable` (guard `target !== currentTarget` untuk Enter/Space).
> Gate hijau + type-proof: interface row compile di `extends object`, ditolak di constraint lama.
>
> **Update 2026-07-28 (3) — v1.10.0 (published).** Notes #27–#30 (aditif/korektif). **#27** reset
> UA-chrome `fieldset.fdy-field` (border/padding/`min-inline-size` groove bocor saat grup pakai
> `<fieldset>`). **#28** kolom filterbar `.fdy-field--w-2xl` (25rem) + `min-width:7rem` picker daterange
> (catatan #28 root-cause-nya **basi** — rule "clobber" yang dituduh ternyata milik `.fdy-datetimepicker`,
> bukan daterange; jadi cuma bagian aditif yang diambil). **#29** fix tabrakan label terakhir sumbu-x
> chart (ganti tebakan 40px → ukur label + drop penultimate saat bertumpuk). **#30** `FdyTable` baris
> detail expandable: slot `row-detail`/prop `renderRowDetail` + `expandedKeys` terkontrol +
> `.fdy-table__detailrow` (menutup tabel hand-rolled terakhir: LogsView). Gate: 20/20 · typecheck 0 ·
> SFC compile · `node --check` chart OK.
>
> **Update 2026-07-28 (4) — v1.11.0 (published).** Notes #31–#33. **#31** `.fdy-badge` +
> `white-space:nowrap` (konsisten dgn `.fdy-badge-ov`). **#33** donut hormati `data-fdy-legend="none"`
> (gate sama dgn cartesian). **#32** modifier opt-in `.fdy-filterbar--actions-inline` + doc: **proposal
> margin note (a) DIUJI di headless Chrome dan TAK bekerja** — margin (auto/left/right) tak mengubah
> flex line-breaking, actions tetap terdampar sendiri di semua varian (rows=3, actionsAlone=true);
> hanya posisi horizontal berubah (far-right 665px → adjacent 432px). Jadi #32 = modifier b + doc saja
> (basis grow menentukan wrap, bukan lebar render). Verifikasi #31 (whiteSpace=nowrap, tinggi 1 baris)
> & #33 (none→0 legend, auto→1) juga via browser. **Pola berulang: note bisa mengusulkan non-fix (spt
> #28) — verifikasi tiap klaim & fix di source/render nyata sebelum ship.**
>
> **Update 2026-07-28 (5) — v1.11.1 (published, fix-only patch).** Note #34: `.fdy-modal` tak pernah
> punya flex context (base tak `flex-direction:column`, `[open]` tak `display:flex`, body tak
> `flex:1;min-height:0`) → body height = content, `overflow:auto` tak punya yang di-scroll, `max-height`
> meng-clip footer + tombol submit di viewport pendek. Diberi pola milik `.fdy-drawer` (yang sudah benar).
> Diverifikasi headless Chrome: body scrollHeight 1595 > clientHeight 609, footer di dalam dialog, tombol
> submit terlihat; `.fdy-modal--cfl` juga OK (results tetap scroll via max-height sendiri, gap 0, tanpa
> regresi). Note #34 = valid & fix-nya benar (beda dari #28/#32 yang non-fix).
>
> **Update 2026-07-28 (6) — v1.11.2 (published, fix-only patch).** Note #35: `.fdy-filterbar`
> (`align-items:flex-end`) & `.fdy-table-toolbar` (`align-items:center`) dua-duanya single-class (0,1,0)
> → saat digabung `<div class="fdy-table-toolbar fdy-filterbar">`, yang belakangan di bundle (toolbar,
> `t`>`f`) menang → semua kontrol ter-center, actions ngambang ~13px. Ditambah `.fdy-table-toolbar.fdy-filterbar
> {align-items:flex-end}` (0,2,0) — aditif, cuma kena elemen dgn KEDUA kelas. Verifikasi browser:
> composed bar computed align-items=flex-end, field input & actions button satu baseline (bottom 83/83).
> Sekeluarga dgn #32 (trailing `__actions` berakhir di tempat tak diinginkan). Note #35 = valid & fix benar.
>
> **Update 2026-07-29 — v1.12.0 (published).** Note #36: `data-fdy-colors` (& prop
> `<FdyChart colors>`) selalu resolve lewat tier semantik (`colorVar` → `var(--color-<name>)`), jadi
> override tak pernah bisa menyebut slot palet kategorikal `--chart-1..8` (tak ada `--color-chart-N`) →
> app yang butuh warna stabil **per kategori** terpaksa override lalu jatuh ke hue semantik terdekat
> (mis. 3 biru bertetangga untuk 3-way split — lolos kontras tapi tak terbaca sbg perbandingan). Fix
> 1-baris: `colorVar` memetakan nama `chart-1..8` → `var(--chart-N)`; aditif & backward-compatible (tak
> ada token semantik berawalan `chart-`; `data-fdy-color` single-seri juga terima bentuk `chart-N`).
> Diverifikasi headless Chrome: explicit `chart-1..3` == palet default (`#2a78d6/#eb6834/#1baf7a`),
> `success/warning/danger` tetap semantik. Saran kedua note ("export `chartSlotVar`") **sengaja
> ditunda** — `--chart-1..8` sudah token publik di `dist/freeday.tokens.css`, jadi swatch/bar milik
> consumer cukup pakai `var(--chart-N)` langsung; helper JS bisa menyusul kalau ada kebutuhan
> index-dinamis nyata (hindari export runtime pertama dari core adapter tanpa alasan). Gate: 20/20 ·
> typecheck 0 · `node --check` chart OK. **Published via OIDC; parity 141/141 file byte-identik.**
>
> **Update 2026-07-30 — v1.13.0 (published).** Note #37 pada `FdyDatepicker` (Vue+React,
> simetris). **A** prop `clearable` → tombol × di trigger untuk mengosongkan tanggal opsional (menutup
> regresi vs native `<input type=date>` yang punya clear). Karena trigger sendiri `<button>`, × = sibling
> overlay di slot ikon (BUKAN nested button — invalid HTML): ikon `visibility:hidden` saat × tampil
> (reserve space → boundary ellipsis value tak bergeser), × meng-emit `''` (`update:modelValue`+`change`
> Vue / `onChange('')` React). **B** label nav bulan hardcoded Indonesia & tak bisa di-override → tambah
> `prevMonthLabel`/`nextMonthLabel` (+ `clearLabel`); default UI string kini **Inggris**
> (`Select date`/`Previous month`/`Next month`, selaras docs English-first) — **satu perubahan default
> string**, di-flag & dikonfirmasi user (opsi Indonesia ditolak). Scope = adapter saja; enhancer vanilla
> `freeday-datepicker.js` tetap Indonesia (dipakai demo docs ID) — sengaja ditunda. Geometri × diverifikasi
> browser nyata (chrome-headless-shell — Chrome user sedang jalan mem-block `--headless` bind port; solusi:
> binari headless-shell terpisah): × 12px dari kanan (=`--space-3`), center vertikal (offset 0), ikon
> hidden, tak overlap value (pendek & panjang/ellipsis). Gate: 20/20 · typecheck 0 · SFC compile.
> **Published via OIDC; parity 141/141 identik; live docs di-sync ke v1.13.0.**
>
> **Update 2026-08-01 — v1.13.1 (published, fix-only patch).** Note #38: `FdyCombo` tak bisa dipilih
> pakai MOUSE (blocker — tiap konsumen). Opsi `<li>` tak fokusabel → `mousedown` memindah fokus dari
> tombol combobox → handler `@focusout`/`onBlur` di root menutup list (meng-`hidden` + `hidePopover`)
> SEBELUM `mouseup` → browser tak pernah bikin `click` → `choose()` tak tercapai, `update:modelValue`
> tak emit. Keyboard (↑/↓+Enter) tetap jalan → itu sebabnya lolos smoke-test keyboard. Sama persis dgn
> bug vanilla `freeday-select.js` yang sudah difix v1.6.1 — hanya adapter Vue/React yang ketinggalan.
> Fix: `@mousedown.prevent` (Vue) / `onMouseDown` `preventDefault` (React) di opsi `<li>` → fokus tetap
> di tombol, `@focusout` tak fire, klik mendarat. **Kedua adapter** (React punya bug identik walau note
> cuma sebut Vue). Tanpa perubahan API; keyboard & hover tak tersentuh. Diverifikasi CDP TRUSTED mouse
> (`Input.dispatchMouseEvent`) di replika mekanisme: tanpa fix value tetap `anthropic`, dgn fix →
> `openai` (sintetis `el.dispatchEvent` TAK mereproduksi — event untrusted tak jalankan default action,
> fokus tak pindah). Adapter-only → dist tak berubah. Gate: SFC compile · typecheck 0 · 20/20. Regression
> test browser sengaja TAK ditambah (kit tak punya infra browser-test/puppeteer; strategi = `node --test`
> saja) — flag ke user bila mau infra itu. See [[verify-interactive-ui-with-real-mouse]].
>
> **Update 2026-08-01 (2) — v1.14.0 (published, MINOR: cakupan STATE komponen).** Dari audit "state
> mode" user + note #39. **readonly** (aditif): rule `[readonly]` input/textarea (versi #39 — full-contrast
> di `--color-surface-2`, border `--color-border` dilembutkan, focus tak eskalasi; BEDA dari `:disabled`
> yang opacity .5 → placeholder-grey + keluar tab order). Prop `readonly` di **6 adapter select-type**
> (Combo/Cascade/Datepicker/DateRange/Autocomplete/**Cfl**) × Vue+React — tetap fokusabel + `aria-readonly`,
> guard open/openPanel/openList no-op, Datepicker matikan tombol clear, Autocomplete native `readonly` di
> input. **disabled** ditambah CSS ke timepicker/rating(`--disabled`)/tree(`[aria-disabled]`)/tabs/
> file-upload/datepicker; **invalid** ke rating(`--error`). **datetime** (vanilla composer): propagasi
> `data-fdy-disabled`/`data-fdy-invalid` wrapper → KEDUA anak. **BUG timing ketangkap browser test:** awal
> pakai direct-set (asumsi anak sudah enhanced) → cuma date kena (timepicker enhancer register SESUDAH
> composer di bundle); lalu microtask → masih gagal (microtask drain di ANTARA listener DOMContentLoaded,
> sebelum timepicker listener); fix = `setTimeout(0)` (macrotask, tunggu seluruh init pass). Diverifikasi
> browser: readonly opacity 1 vs disabled 0.5, semua state render, datetime disable/invalid ke 2 anak.
> Gate 20/20 · typecheck 0 · 6 SFC compile. Vanilla picker readonly sengaja di-skip (datetime interaktif;
> adapter cover). See [[verify-interactive-ui-with-real-mouse]].
>
> **Update 2026-08-03 — harness regresi interaksi (dev-only, BUKAN version bump).** Utang test yang
> berulang gigit (combo mouse-select #38 di vanilla+adapter, timing datetime v1.14.0) kini punya guard
> otomatis di `browser/`: driver CDP nol-dependency menyetir `chrome-headless-shell` nyata dengan
> `Input.dispatchMouseEvent` **trusted** (sintetik `.click()` tak mereproduksi kelas bug ini). Cakupan
> cut-1: datetime disabled/invalid → KEDUA anak (vanilla), combo mouse-select ubah value (vanilla + Vue
> + React yang benar-benar di-mount lewat esbuild). Jalan lewat `npm run test:browser` — **di luar `test/`
> & tak bernama `*.test.mjs`** supaya bare `node --test` (gate default + CI) tak menjaringnya; auto-skip
> kalau Chrome tak ada. Dev-deps baru `vue`/`react`/`react-dom`/`esbuild` (dev-only, tak ikut publish —
> `files` tak memuat `browser/`). **Tiap guard dibuktikan bites via mutation test** (revert fix → spec
> gagal dgn signature bug asli, mis. datetime `{"dp":true,"tp":false}`, combo `got "button"`). Detail di
> `browser/README.md`. See [[verify-interactive-ui-with-real-mouse]], [[freeday-browser-test-harness]].
>
> **Update 2026-08-10 — v1.15.0 (published, MINOR: deklarasi tipe).** Note #40: hanya `./vue` & `./react`
> yang punya kondisi `types` di `exports`; delapan export lain tak punya, jadi konsumen TS gagal resolve
> side-effect import (`./css`, root, `./enhancers/*`, `./breakpoints`) dan `window.Freeday` ditebak-tangan
> per konsumen — invisible di TS5 (side-effect import unresolvable lolos diam), error keras di TS6
> (`noUncheckedSideEffectImports` default-on). Fix aditif: `dist/asset.d.ts` (`export {}` — stub side-effect
> css/enhancer), `tokens/breakpoints.d.ts` (skala breakpoint), `dist/freeday.d.ts` (global
> `window.Freeday.toast` **di-author dari `freeday-toast.js`**, bukan disalin dari tebakan konsumen: semua
> field opsional + return `HTMLElement` — tebakan konsumen keliru `message`/`variant` wajib & return void).
> `types` diletakkan **pertama** di tiap kondisi (TS berhenti di match pertama). `files` ditambah
> `tokens/breakpoints.d.ts` (whitelist cuma kirim `breakpoints.mjs` — celah yang snippet note tak sebut).
> `./blazor` sengaja dibiarkan tanpa tipe (tak ada konsumen TS meng-import-nya; ikut note). **Divalidasi
> empiris** (bukan penalaran): `npm pack` tarball → konsumen TS `moduleResolution:bundler` +
> `noUncheckedSideEffectImports` → **4 error SEBELUM** (css/enhancers TS2307, breakpoints TS7016,
> `window.Freeday` TS2339), **bersih SESUDAH**; cek negatif (variant salah, number→string) → dua TS2322 →
> tipe nyata bukan `any`; `.d.ts` hadir di tarball termasuk wildcard `enhancers/*` (→ `asset.d.ts`). Build
> tak sentuh `.d.ts` (statis, di-commit) → determinisme utuh. Gate 20/20 · typecheck 0 · test:browser 5/5.

---

## TL;DR — ketiga item lama sudah ditangani; sisanya satu langkah rilis

Kit **fungsional & live di v1.7.0**. Update 2026-07-27:
1. **Kontras AA soft-badge** — ternyata **sudah tertutup sejak v0.2** (bukan gap terbuka). Yang
   salah cuma prosa spec §12 yang basi (bilang "belum 4.5" padahal §13 di dokumen sama bilang
   "dituntaskan v0.2"); sudah di-truth-up. Semua soft badge lolos AA (terendah `danger` light
   **5.30:1**), dijaga `test/contrast.test.mjs`. **Tak ada perubahan token.**
2. **Review independen v1.6.0** — **selesai**. Tak ada bug korektnes; 3 catatan minor
   (lihat item 2). Gate hijau.
3. **Distribusi #8** — **diputuskan: npm publik ber-scope** (`@cahyo-dimas/freeday`). Plumbing
   sudah dikerjakan di working tree (package.json publishable, workflow, contoh di-rename).
   Sisanya = **eksekusi rilis** (langkah luar/outward-facing, punyamu) — runbook di item 3.

Perubahan sesi ini **belum di-commit** dan **belum di-rilis**. Aman untuk direview dulu.

## Kondisi saat dokumen ini ditulis

- `main` = `origin/main` = tag **`v1.7.0`**. **Working tree TIDAK bersih (per 2026-07-27):**
  ada perubahan sesi ini yang belum di-commit — truth-up spec §12 (item 1) + plumbing distribusi
  npm ber-scope (item 3: `package.json`, `package-lock.json`, `.github/workflows/publish.yml`,
  `examples/**`). Review lalu commit di branch (jangan langsung ke `main`).
- Tag: **`v1.5.0`** (React adapter parity) · **`v1.6.0`** (wrapper input ekstra + filter-bar) ·
  **`v1.6.1`** (fix: pemilihan opsi combo dengan mouse — lihat "Pelajaran" di bawah) ·
  **`v1.6.2`** (lisensi MIT + file `LICENSE`) · **`v1.7.0`** (tree checkbox + `.fdy-form-grid` + tiga section docs full-width).
- Live: <https://cahyo-dimas.github.io/freeday-ui-kit/docs/> — terverifikasi menampilkan v1.7.0.
- Gate hijau: `npm test` 9/9 · `npm run typecheck:react` 0 error · `node tokens/build.mjs` tanpa diff.
- `improvement-notes/` sengaja dibiarkan untracked (catatan mentah, bukan bagian rilis).

---

## Urutan prioritas (jujur)

### 1. ✅ SELESAI (2026-07-27) — kontras AA soft-badge ternyata sudah tertutup

**Temuan.** Premis lama ("foreground soft badge 3.0–4.24:1, belum 4.5") **basi**. Gap ini sudah
dituntaskan **di v0.2** persis lewat opsi (a): foreground dipertegas ke `--color-*-strong`,
background soft dipertahankan. Diukur dari token yang jalan sekarang, semua soft badge lolos
AA 4.5:1 (light: primary 7.91 · success 6.49 · warning 6.37 · **danger 5.30** · info 5.49;
dark ≥ 7.7). Dan **sudah dijaga** `test/contrast.test.mjs` (pasangan `*-strong` di atas `*-soft`
di tiap surface, threshold `AA_TEXT`) — jadi saran "tambah assertion" pun sudah terpenuhi.

**Akar kesalahan = kontradiksi di dalam spec:** §13 bilang "dituntaskan v0.2" tapi §12 (kriteria
sukses) masih menulis "Terbuka … belum 4.5". NEXT-UP/HANDOFF/memory semua nyalin baris §12 yang basi.
**Fix:** §12 di-truth-up agar sama dengan §13. **Tidak ada perubahan token, tidak ada keputusan
terbuka.** (Pelajaran: nilai kebenaran cukup di satu tempat — §12 seharusnya menunjuk §13, bukan
menyatakan ulang statusnya.)

---

### 2. ✅ SELESAI (2026-07-27) — review independen kode v1.6.0

**Catatan rentang.** Hash `91e2953..ae43914` sudah tak resolve (history di-scrub 2026-07-23).
Rentang yang benar sekarang = **`v1.5.0..v1.6.0`** (tip `ae43914`). Direview statis (bukan
`/code-review` berbayar; harness mount React/Vue tak sepadan untuk kode yang sudah live).

**Hasil: tak ada bug korektnes.** Keempat area risiko aman:
- **FdyCascade** — `active` reset ke 0 saat drill/ascend, fokus tetap di listbox `tabindex="-1"`
  (drill via mouse tak menghilangkan fokus keyboard), roving via `aria-activedescendant`,
  tutup-di-luar pakai `contains()` pada `mousedown` (hindari bug focusout combo lama).
- **FdyAutocomplete** — wrap ↑/↓ benar; Enter commit hanya opsi ter-highlight (bukan teks ketik);
  opsi pakai `mousedown.preventDefault` → fokus input tetap → `choose()`→`input.focus()` no-op,
  list tak reopen. (Persis pelajaran v1.6.1.)
- **FdyDateRange** — aman: `FdyDatepicker` hanya emit ISO string (tak pernah `''`), jadi
  `?? props.max/min` fallback benar saat satu sisi `null`.
- **.fdy-filterbar** — tak overflow (`flex-wrap`); stack full-width viewport-gated (`@media 640px`).

**3 catatan minor (bukan fix wajib):** (a) filterbar pakai `@media` viewport, bukan `@container` —
di container sempit pada viewport lebar ia wrap, bukan stack (tak overflow); (b) `options` duplikat
(Autocomplete) / `value` duplikat sesama level (Cascade) → tabrakan `key` — tanggung jawab pemanggil;
(c) `aria-activedescendant` bisa menggantung kalau cabang Cascade `children: []` (data cacat).
Gate hijau: test 9/9 · typecheck:react 0 · build no-diff.

---

### 3. #8 — Distribusi registry-friendly · **DIPUTUSKAN: npm publik ber-scope**

**Keputusan (2026-07-27).** Publish ke **npm publik** dengan scope **`@cahyo-dimas/freeday`**
(handle GitHub, sudah publik lewat Pages; hindari nama perusahaan). GitHub Packages ditolak karena
paket publik pun masih menuntut token di `.npmrc` konsumen — tak menghapus friksi onboarding.

**Auth = OIDC Trusted Publishing (bukan token).** Warning npm saat signup — "tokens that bypass
2FA are being restricted" — persis alasan menghindari classic automation token. OIDC = GitHub
Actions menukar id-token jangka-pendek dgn izin publish; nol token tersimpan.

**Sudah dikerjakan (working tree, belum commit/rilis):**
- `package.json` — `name` → `@cahyo-dimas/freeday`, hapus `private`, tambah
  `publishConfig.access:"public"` + `repository`/`homepage`/`bugs`.
- `package-lock.json` — nama diselaraskan.
- `.github/workflows/publish.yml` — publish-on-tag (`v*`) via **OIDC** (`id-token: write`,
  `npm publish` tanpa token, provenance otomatis; upgrade npm ke ≥11.5.1 di runner).
- `examples/**` — di-rename ke specifier ber-scope (link lokal `file:../..` tetap).
- **Docs publik SUDAH di-sync** ke nama ber-scope + install `npm i @cahyo-dimas/freeday`:
  `README.md` (buang seksi workaround `git+https` — payoff #8), `docs/getting-started.md`,
  `docs/integrations.md`, `docs/index.html` (`#install-cmd` + kartu), `examples/*/README.md`.
- Gate inti tetap hijau (nama paket tak menyentuh test/typecheck/build).

**Sisa = eksekusi rilis (outward-facing, punyamu) — RUNBOOK:**
1. **Pastikan scope `cahyo-dimas` milikmu** di npm. Kalau beda, ganti string scope di seluruh repo
   (satu find-replace) — sudah dipakai luas.
2. **Publish pertama (bootstrap paket baru) manual dari laptop:** dari root repo →
   `npm publish` (mesin sudah `npm login`; `publishConfig.access:"public"` menangani akses).
3. **Set Trusted Publisher di npmjs.com** untuk paket ini: repo `cahyo-dimas/freeday-ui-kit`,
   workflow `publish.yml` → agar rilis berikutnya otomatis lewat CI tanpa token.
4. **Verifikasi contoh** (belum bisa di sesi ini — npm tak di PATH + butuh jaringan): di tiap
   `examples/*` jalankan `npm install` (regen lockfile) + `npm run build`.
5. **Commit di branch** (jangan langsung `main`) + push. Pages rebuild → docs live menampilkan
   install npm. **Publish (langkah 2) sebaiknya sebelum/berbarengan push** supaya perintah yang
   diiklankan sudah valid.
6. **Rilis berikutnya:** tambah entri CHANGELOG (satu versi = satu tag) → `npm version minor`
   (build + stage `dist`) → `git push --follow-tags` → workflow OIDC publish. **Verifikasi:**
   `npm view @cahyo-dimas/freeday version` + `curl` docs live.

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
