# Foundry

Token-driven UI KIT — design source-of-truth. Lihat blueprint di
`docs/superpowers/specs/2026-07-21-foundry-ui-kit-design.md`.

## Build
```bash
node tokens/build.mjs   # tokens.json -> dist/foundry.tokens.css + bundel dist/foundry.css
npm test                # test transformasi build (node:test)
```

## Pakai di project
```html
<link rel="stylesheet" href="dist/foundry.tokens.css">
<link rel="stylesheet" href="dist/foundry.css">
<html data-theme="light" data-density="comfortable">
```
Kelas komponen berprefix `fdy-` (mis. `fdy-btn`, `fdy-card`, `fdy-badge`).
- Komponen v0.2: app shell, table, modal (native `<dialog>`), select, checkbox/radio/switch — plus refinement visual "rich".

## Struktur
- `tokens/tokens.json` — sumber sejati (edit di sini)
- `tokens/build.mjs` — generator
- `src/` — base + komponen (`fdy-*`)
- `dist/` — hasil build (di-commit)
- `docs/index.html` — referensi hidup
