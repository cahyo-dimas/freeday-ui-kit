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
const dark = { ...base, ...vars(scope(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)) };
const THEMES = { LIGHT: base, DARK: dark };

// --- color math -----------------------------------------------------------
function parse(v, theme, depth = 0) {
  if (depth > 20) throw new Error('var cycle: ' + v);
  v = v.trim();
  let m = v.match(/^var\((--[\w-]+)\)$/); if (m) return parse(theme[m[1]], theme, depth + 1);
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
add('--color-on-primary', '--color-primary', AA_TEXT, 'primary button label');
add('--color-on-danger', '--color-danger-btn', AA_TEXT, 'danger button label');
add('--color-on-accent', '--color-accent', AA_UI, 'accent FAB icon (icon-only, non-text 3:1)');
add('--color-control-border', '--color-surface', AA_UI, 'control border (input/select/checkbox…) on surface');
add('--color-control-border', '--color-surface-2', AA_UI, 'control border on surface-2');
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
