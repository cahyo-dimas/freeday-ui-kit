/* WCAG contrast regression test. Builds the token CSS in-memory from tokens.json,
 * resolves each theme's var() graph, alpha-composites semi-transparent -soft fills
 * over their surface, and asserts every critical pairing meets its WCAG threshold:
 *   text 4.5:1 (AA normal) · non-text UI / icon 3.0:1 (WCAG 1.4.11).
 * This guards the a11y contract so a future token tweak can't silently regress it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTokensCss } from '../tokens/build.mjs';

const css = buildTokensCss(JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url))));

// --- parse the light (:root) and dark ([data-theme=dark]) scopes ----------
const scope = (re) => { const m = css.match(re); return m ? m[1] : ''; };
const vars = (t) => { const o = {}; for (const m of t.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o; };
const base = vars(scope(/:root\s*\{([\s\S]*?)\n\}/));
/* The explicit theme selectors were un-rooted in v1.21.0 so a `data-theme` on any ancestor re-themes
 * that subtree — and this regex still said `:root[data-theme="dark"]`, so it matched NOTHING and
 * `dark` silently fell back to the light values. Every DARK assertion below was re-testing LIGHT
 * from v1.21.0 until this was found (v1.30.0). The shape is asserted immediately after, because a
 * scope that resolves to nothing is exactly as green as one that passes. */
const darkVars = vars(scope(/\n\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/));
const dark = { ...base, ...darkVars };
const THEMES = { LIGHT: base, DARK: dark };

test('the dark scope actually resolves', () => {
  /* Guard for the guard. If the emitted selector changes shape again, this fails loudly instead of
   * quietly re-running the light theme under a dark label. */
  assert.ok(Object.keys(darkVars).length > 20, `dark scope parsed ${Object.keys(darkVars).length} vars — the selector shape changed`);
  assert.notEqual(dark['--color-surface'], base['--color-surface'], 'dark must not resolve to the light surface');
});

// --- color math -----------------------------------------------------------
function parse(v, theme, depth = 0) {
  if (depth > 20) throw new Error('var cycle: ' + v);
  v = v.trim();
  let m = v.match(/^var\((--[\w-]+)\)$/); if (m) return parse(theme[m[1]], theme, depth + 1);
  m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/);
  if (m) { const A = parse(m[1], theme, depth + 1), B = parse(m[3], theme, depth + 1), p = +m[2] / 100;
    return { r: A.r * p + B.r * (1 - p), g: A.g * p + B.g * (1 - p), b: A.b * p + B.b * (1 - p), a: 1 }; }
  m = v.match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255, a: 1 }; }
  m = v.match(/^#([0-9a-f]{3})$/i); if (m) { const h = m[1]; return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 }; }
  m = v.match(/^rgba?\(([^)]+)\)$/); if (m) { const p = m[1].split(',').map(s => s.trim()); return { r: +p[0], g: +p[1], b: +p[2], a: p[3] == null ? 1 : +p[3] }; }
  throw new Error('unparseable color: ' + v);
}
const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratio = (f, b) => { const A = Math.max(lum(f), lum(b)), B = Math.min(lum(f), lum(b)); return (A + 0.05) / (B + 0.05); };
function bgOf(bg, theme) {
  if (typeof bg === 'string') return parse(theme[bg], theme);
  return over(parse(theme[bg.soft], theme), parse(theme[bg.on], theme)); // -soft fill over its surface
}
const R = (fg, bg, theme) => ratio(parse(theme[fg], theme), bgOf(bg, theme));

// --- required pairings ----------------------------------------------------
const SURF = ['--color-surface', '--color-surface-2', '--color-surface-3'];
const AA_TEXT = 4.5, AA_UI = 3.0;
const req = []; // {fg, bg, min, label}
const add = (fg, bg, min, label) => req.push({ fg, bg, min, label });
for (const s of SURF) {
  add('--color-text', s, AA_TEXT, `body text on ${s}`);
  add('--color-text-muted', s, AA_TEXT, `muted text (labels/help/day-headers/timestamps) on ${s}`);
  add('--color-text-subtle', s, AA_UI, `subtle (decorative/placeholder — non-text 3:1) on ${s}`);
}
for (const [strong, soft] of [['--color-primary-strong', '--color-primary-soft'], ['--color-success-strong', '--color-success-soft'], ['--color-warning-strong', '--color-warning-soft'], ['--color-danger-strong', '--color-danger-soft'], ['--color-info-strong', '--color-info-soft']])
  for (const s of SURF) add(strong, { soft, on: s }, AA_TEXT, `${strong.replace('--color-', '')} on ${soft.replace('--color-', '')}/${s.replace('--color-surface', 'surf')}`);
/* Inline state text (.fdy-text-success/-warning/-danger, note 001 §5) puts these inks on a PLAIN
 * surface — the pairing above only covers them over their own -soft fill, which is a different
 * background. A role that de-emphasises nothing must still be readable. */
for (const strong of ['--color-success-strong', '--color-warning-strong', '--color-danger-strong'])
  for (const s of SURF)
    add(strong, s, AA_TEXT, `inline state text ${strong.replace('--color-', '')} on ${s.replace('--color-surface', 'surf')}`);
add('--color-on-primary', '--color-primary', AA_TEXT, 'primary button label');
add('--color-on-danger', '--color-danger-btn', AA_TEXT, 'danger button label');
add('--color-on-accent', '--color-accent', AA_UI, 'accent FAB icon (icon-only, non-text 3:1)');
/* A control's boundary is a UI component boundary (WCAG 1.4.11, 3:1) — and it must hold on the
 * DARKEST surface it can sit on, not just the lightest. surface-3 was the missing one; it is the
 * case that pinned the dark theme to 3.02 before --slate-450. */
/* 3.25, not 3.0: a boundary that clears the floor by 0.02 has no headroom at all, and that is exactly
 * where the dark theme sat (3.02 on surface-3) until --slate-450. The margin is the guard — reverting
 * the token to the old slate-500 passes WCAG and silently returns the dark theme to the cliff. */
const UI_MARGIN = 3.25;
for (const s of SURF) add('--color-control-border', s, UI_MARGIN, `control border (input/select/checkbox…) on ${s}`);
add('--focus-ring', '--color-surface', AA_UI, 'focus ring on surface');
add('--color-primary', '--color-surface', AA_UI, 'primary fill vs surface');
for (const s of SURF) add('--color-accent', s, AA_UI, `accent on ${s}`);

// --- assert ---------------------------------------------------------------
for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast — ${themeName}`, () => {
    for (const p of req) {
      const r = R(p.fg, p.bg, theme);
      assert.ok(r >= p.min, `${themeName}: ${p.label} = ${r.toFixed(2)}:1 (need ${p.min}:1)`);
    }
  });
}

// Categorical tones: the text-leaning foreground on the tinted background must keep AA text
// contrast. ONE test for three components — .fdy-avatar--tone-*, .fdy-chip--tone-* and
// .fdy-badge--tone-* all use the identical mix (bg 18%, fg 50% toward --color-text over
// --color-surface), so they pass or fail together. Keep the ratios here in sync with all three;
// the css guard below asserts they stay identical.
for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast — categorical tones — ${themeName}`, () => {
    for (let i = 1; i <= 8; i++) {
      const c = `var(--chart-${i})`;
      const bg = parse(`color-mix(in srgb, ${c} 18%, var(--color-surface))`, theme);
      const fg = parse(`color-mix(in srgb, ${c} 50%, var(--color-text))`, theme);
      const r = ratio(fg, bg);
      assert.ok(r >= AA_TEXT, `${themeName}: tone-${i} = ${r.toFixed(2)}:1 (need ${AA_TEXT}:1)`);
    }
  });
}
