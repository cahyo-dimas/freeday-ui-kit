# Freeday — UI KIT

**Design source-of-truth** yang token-driven dan *framework-agnostic*. Bukan component
library ter-compile; ini satu file token kanonik + halaman referensi hidup, tempat semua
warna/tipografi/spasi berasal. Diturunkan dari `Foundation Design System.html`.

> **Baca dulu spec sebelum implement:** [docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md)
> Itu sumber kebenaran untuk semua nilai token, keputusan, dan roadmap. CLAUDE.md ini hanya ringkasan operasional.

## Stack & tooling
- **Bahasa:** CSS murni + `tokens.json` (format W3C Design Tokens / DTCG).
- **Build:** `node tokens/build.mjs` — Node murni, baca `tokens/tokens.json` → tulis `dist/freeday.tokens.css`. Tidak ada Style Dictionary / bundler berat di v1 (YAGNI).
- **Docs:** `docs/index.html` — static, buka langsung di browser.
- **Tidak ada** framework runtime. Komponen = CSS + markup contoh.

## Arsitektur token — 3 lapis (jangan dilanggar)
```
Tier 1 PRIMITIVE  ramp mentah (--azure-600 dst) — TAK PERNAH dipakai di komponen
Tier 2 SEMANTIC   peran (--color-primary, --color-surface…) — berubah saat theme & re-brand
Tier 3 COMPONENT  --fdy-<komponen>-<properti>, opsional, hanya untuk override lokal
```
**Aturan keras:** komponen hanya menyentuh Tier 2/3. **Jangan pernah menaruh hex/px mentah**
di CSS komponen. Butuh nilai baru → compose → extend modifier → only then create.

## Identitas (Azure & Teal) — referensi cepat
- primary `#2050d8` · primary-hover `#1c40b0` · accent (teal) `#0d9488`
- surface `#ffffff` · text `#171b26` · border `#e0e3ea`
- Fonts: display **Sora** · body **IBM Plex Sans** · data **JetBrains Mono**
- Nilai lengkap (ramp 50–950, semantic light & dark) ada di spec §5.

## Konvensi
- **Prefix kelas:** `fdy-` (mis. `fdy-btn`, `fdy-card__title`, `fdy-btn--danger`). Pola BEM ringkas.
- **Token:** `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease-*`; component token `--fdy-<komp>-<prop>`.
- **Spasi:** selalu kelipatan 4px (skala `--space-*`), tak pernah nilai lepas.
- **Satu file per komponen** di `src/components/*.css`; digabung ke `dist/freeday.css`.

## Theming — 3 sumbu via `data-*` di `<html>`
- `data-theme="light|dark"` → re-definisi token **semantic** (wajib).
- `data-density="comfortable|compact"` → `--control-h` (compact untuk layar data-dense).
- `data-style="soft"` → default; gaya lain (glass/neumorph/…) = roadmap, jangan diimplement di v1.

## Aksesibilitas (wajib)
- Kontras **WCAG AA** di light & dark. `:focus-visible` selalu terlihat (outline 2px `--focus-ring`).
- Status jangan hanya lewat warna. Hormati `prefers-reduced-motion`.
- **ARIA:** HTML native dulu ("no ARIA is better than bad ARIA"); komponen interaktif ikut **kontrak spec §11.3** (role/aria/keyboard, pola WAI-ARIA APG). Markup di `docs/` = versi aksesibel, bukan hanya visual. Contoh: input error → `aria-invalid` + `aria-describedby`; modal → `role="dialog"` + `aria-modal` + focus trap; toast → `role="status"`/`aria-live`.

## Struktur
```
tokens/tokens.json     tokens/build.mjs
src/components/*.css
dist/freeday.tokens.css  dist/freeday.css   (dist DI-COMMIT — lihat .gitignore)
docs/index.html
```

## Roadmap ringkas
- **v0.1 (sekarang, token-first):** tokens.json + build.mjs + theming + docs skeleton + button, input, card, badge. Buktikan pipeline end-to-end.
- **v0.2:** app shell, table, modal, alert/toast, form controls lain → satu layar bisnis nyata.
- **v0.3+:** data grid, datepicker, filter bar, pagination, states, wizard, dst. (spec §7)

## Aset tersedia
- `Foundation Design System.html` — sumber referensi untuk **port** komponen (⬆ di spec §7).
- Font latin (Sora/IBM Plex Sans/Manrope/JetBrains Mono) sudah ter-embed base64 di file Foundation itu — bisa diekstrak ulang bila perlu.
