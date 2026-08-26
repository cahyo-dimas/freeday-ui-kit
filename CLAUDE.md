# Freeday — UI KIT

**Design source-of-truth** yang token-driven dan *framework-agnostic*. Bukan component
library ter-compile; ini satu file token kanonik + halaman referensi hidup, tempat semua
warna/tipografi/spasi berasal. Diturunkan dari `reference/foundation-design-system.html`.

> **Baca dulu spec sebelum implement:** [docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md)
> Itu sumber kebenaran untuk semua nilai token, keputusan, dan roadmap. CLAUDE.md ini hanya ringkasan operasional.

## Stack & tooling
- **Bahasa:** CSS murni + `tokens.json` (format W3C Design Tokens / DTCG).
- **Build:** `node tokens/build.mjs`, Node murni yang membaca `tokens/tokens.json` → tulis `dist/freeday.tokens.css`. Tidak ada Style Dictionary / bundler berat di v1 (YAGNI).
- **Docs:** `docs/index.html`, static, buka langsung di browser.
- **Tidak ada** framework runtime. Komponen = CSS + markup contoh.

## Arsitektur token: 3 lapis (jangan dilanggar)
```
Tier 1 PRIMITIVE  ramp mentah (--azure-600 dst), TAK PERNAH dipakai di komponen
Tier 2 SEMANTIC   peran (--color-primary, --color-surface…), berubah saat theme & re-brand
Tier 3 COMPONENT  --fdy-<komponen>-<properti>, opsional, hanya untuk override lokal
```
**Aturan keras:** komponen hanya menyentuh Tier 2/3. **Jangan pernah menaruh hex/px mentah**
di CSS komponen. Butuh nilai baru → compose → extend modifier → only then create.

## Identitas (Azure), referensi cepat
- primary `#2050d8` · primary-hover `#1c40b0` · accent (sky / Microsoft Azure blue) `#0078d4`
- surface `#ffffff` · text `#171b26` · border `#e0e3ea`
- Fonts: display **Sora** · body **IBM Plex Sans** · data **JetBrains Mono**
- Nilai lengkap (ramp 50–950, semantic light & dark) ada di spec §5.

## Konvensi
- **Prefix kelas:** `fdy-` (mis. `fdy-btn`, `fdy-card__title`, `fdy-btn--danger`). Pola BEM ringkas.
- **Token:** `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease-*`; component token `--fdy-<komp>-<prop>`.
- **Spasi:** selalu kelipatan 4px (skala `--space-*`), tak pernah nilai lepas.
- **Satu file per komponen** di `src/components/*.css`; digabung ke `dist/freeday.css`.

## Theming: 3 sumbu via `data-*` di `<html>`
- `data-theme="light|dark"` → re-definisi token **semantic** (wajib). Selector-nya bare (bukan
  `:root`), jadi bisa dipasang di ancestor mana pun untuk membalik satu region; default sistem
  (`prefers-color-scheme`) sengaja tetap root-scoped.
- `data-density="comfortable|compact"` → `--control-h` (compact untuk layar data-dense).
- `data-primary="<nama>"` → 18 palet primary (default `azure`). Yang di-redefinisi adalah **ramp
  alias** `--primary-*` berisi delapan shade, bukan token semantic-nya: pemetaan "shade mana yang
  jadi fill / hover / wash" ditulis sekali di `color.primary*`, jadi sebuah palet tak mungkin
  berbeda pendapat soal arti "primary". Sumbernya `$primaries` di `tokens.json`; **setiap palet
  dijaga gerbang kontras di kedua tema** (`test/contrast.test.mjs`), dan nilai `on`/`onDark`-nya
  hasil ukur, bukan tebakan.
- `data-style="soft|glass"` → sumbu gaya visual. `soft` default (tampilan kit selama ini); `glass`
  memfrost **permukaan terangkat saja** lewat `--color-surface-raised`, `--surface-filter`,
  `--surface-inset` — bukan `--color-surface`, yang juga jadi isian input, chip, sel tabel dan kolom
  beku (kolom beku tembus pandang akan memperlihatkan baris yang menggulung di bawahnya). Komponen
  **tak pernah** membawa selector `[data-style]`; mereka membaca knob-nya, yang no-op di `soft`.
  Seberapa tembus kaca boleh jadi **ditentukan gerbang kontras, bukan selera**: di bawah .82 (terang)
  / .90 (gelap) tinta muted dan `primary-strong` berhenti lolos 4.5:1 begitu panel dikomposit di atas
  latar sembarang. Frost yang benar-benar terlihat datang dari blur-nya, bukan dari alpha-nya.

## Aksesibilitas (wajib)
- Kontras **WCAG AA** di light & dark. `:focus-visible` selalu terlihat (outline 2px `--focus-ring`).
- Status jangan hanya lewat warna. Hormati `prefers-reduced-motion`.
- **ARIA:** HTML native dulu ("no ARIA is better than bad ARIA"); komponen interaktif ikut **kontrak spec §11.3** (role/aria/keyboard, pola WAI-ARIA APG). Markup di `docs/` = versi aksesibel, bukan hanya visual. Contoh: input error → `aria-invalid` + `aria-describedby`; modal → `role="dialog"` + `aria-modal` + focus trap; toast → `role="status"`/`aria-live`.

## Struktur
```
tokens/tokens.json  tokens/build.mjs   sumber token + generator (Node murni)
src/base.css  src/components/*.css     satu file per komponen (authored)
src/freeday-*.js                       enhancer (authored; dist/ = salinan identik)
dist/  (DI-COMMIT, lihat .gitignore)  freeday.tokens.css · freeday.css (komponen SAJA)
                                       freeday.bundle.css (token+komponen ← ini yang dipakai)
                                       freeday.js + freeday-*.js
COMPONENTS.md                          seluruh class publik + skeleton markup + kontrak a11y
USAGE.md                               doktrin pemakaian (token/role mana, kapan)
docs/index.html                        referensi hidup · reference-screen.html (1 layar utuh)
docs/agent-onboarding.md               onboarding untuk AI agent di project konsumen
reference/                             material input, TAK PERNAH di-ship
```
`files` di package.json memuat jalur ter-ship **satu per satu** (bukan direktori), dan `src/*.js` sengaja
tak dikirim karena byte-identik dengan `dist/*.js` dan tak ada jalur `exports` yang menyentuhnya.

## Status: **feature-complete**, demand-driven
Kit ini sudah lewat fase roadmap: 48 stylesheet di `src/components/` + 26 enhancer di
`src/freeday-*.js` (keduanya angka terhitung, bukan hafalan), paritas 11/11 komponen typed di
**4 stack** (vanilla · Vue · React · Blazor), terbit publik di npm. **Sikap default sekarang =
tunggu demand**, bukan bangun spekulatif; friksi dari app nyata yang menentukan rilis berikutnya.
Riwayat per-versi: [`CHANGELOG.md`](CHANGELOG.md) · kandidat kerja berikutnya (dengan pemicunya):
[`NEXT-UP.md`](NEXT-UP.md) · kondisi terkini: [`HANDOFF.md`](HANDOFF.md).

## Aset tersedia, semuanya di `reference/` (material input, **tak pernah** di-ship)
Lihat [`reference/README.md`](reference/README.md): isinya provenance tiap file + tabel **15 arketipe
layout → primitif Freeday mana** (mana yang sudah tertutup komponen, mana yang framenya tetap milikmu).
- `reference/foundation-design-system.html` adalah artefak asal tempat kit ini di-port (historis: 44/44
  komponen sudah di-port, jadi ini catatan provenance, bukan daftar kerja).
  **Tak ada font yang bisa diekstrak dari file ini**: `@font-face`-nya menunjuk UUID mati sisa
  ekspor tool asalnya; file itu merender via CDN Google Fonts. (Klaim lama "ter-embed base64" salah.)
- `reference/layout-patterns.png` berisi 15 arketipe layout aplikasi web (dashboard/admin, master-detail,
  kanban, feed, chat, canvas, kalender, editor dokumen, media, e-commerce, analytics/BI, POS, wizard,
  file manager, forum) sebagai referensi wireframe saat menyusun layar bisnis nyata. Di-generate
  dengan Claude atas permintaan author, jadi tak ada hak pihak ketiga.
