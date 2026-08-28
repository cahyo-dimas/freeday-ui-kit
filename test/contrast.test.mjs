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
 * that subtree, and this regex still said `:root[data-theme="dark"]`, so it matched NOTHING and
 * `dark` silently fell back to the light values. Every DARK assertion below was re-testing LIGHT
 * from v1.21.0 until this was found (v1.30.0). The shape is asserted immediately after, because a
 * scope that resolves to nothing is exactly as green as one that passes. */
const darkVars = vars(scope(/\n\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/));
const dark = { ...base, ...darkVars };
const THEMES = { LIGHT: base, DARK: dark };

test('the dark scope actually resolves', () => {
  /* Guard for the guard. If the emitted selector changes shape again, this fails loudly instead of
   * quietly re-running the light theme under a dark label. */
  assert.ok(Object.keys(darkVars).length > 20, `dark scope parsed ${Object.keys(darkVars).length} vars, the selector shape changed`);
  assert.notEqual(dark['--color-surface'], base['--color-surface'], 'dark must not resolve to the light surface');
});

// --- color math -----------------------------------------------------------
function parse(v, theme, depth = 0) {
  if (depth > 20) throw new Error('var cycle: ' + v);
  v = v.trim();
  let m = v.match(/^var\((--[\w-]+)\)$/); if (m) return parse(theme[m[1]], theme, depth + 1);
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/);
  if (m) {
    const A = parse(m[1], theme, depth + 1), B = parse(m[3], theme, depth + 1), p = +m[2] / 100;
    /* PREMULTIPLIED, and the alpha is carried out rather than forced to 1. Mixing with
       `transparent` is how every -soft fill is now derived, and flattening its alpha here would
       composite the fill as if it were opaque — the exact error the -soft pairings exist to catch,
       hidden inside the tool that checks them. */
    const a = A.a * p + B.a * (1 - p);
    const chan = (ca, cb) => (a === 0 ? 0 : (ca * A.a * p + cb * B.a * (1 - p)) / a);
    return { r: chan(A.r, B.r), g: chan(A.g, B.g), b: chan(A.b, B.b), a };
  }
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
  add('--color-text-subtle', s, AA_UI, `subtle (decorative: chevrons, separators, out-of-month days, non-text 3:1) on ${s}`);
}
/* A placeholder is not decorative (#053). It is the only thing telling an operator what an empty
 * field wants, and it is the first thing they read, so it owes AA — but only on the surface it can
 * actually appear on: `.fdy-input`/`.fdy-textarea` paint `--color-surface`, never surface-2 or -3.
 * That is the whole reason dark `--color-text-subtle` is slate-450 and not slate-500 (4.02, which
 * shipped through 3.1.0 and put twelve of the kit's OWN elements under AA in a dark app). Asserting
 * it on all three surfaces instead would force subtle up to slate-400, which is `--color-text-muted`,
 * and collapse two tiers into one. */
add('--color-text-subtle', '--color-surface', AA_TEXT, 'placeholder ink on the surface .fdy-input paints (#053)');
for (const [strong, soft] of [['--color-primary-strong', '--color-primary-soft'], ['--color-success-strong', '--color-success-soft'], ['--color-warning-strong', '--color-warning-soft'], ['--color-danger-strong', '--color-danger-soft'], ['--color-info-strong', '--color-info-soft']])
  for (const s of SURF) add(strong, { soft, on: s }, AA_TEXT, `${strong.replace('--color-', '')} on ${soft.replace('--color-', '')}/${s.replace('--color-surface', 'surf')}`);
/* Inline state text (.fdy-text-success/-warning/-danger, note 001 §5) puts these inks on a PLAIN
 * surface, the pairing above only covers them over their own -soft fill, which is a different
 * background. A role that de-emphasises nothing must still be readable. */
for (const strong of ['--color-success-strong', '--color-warning-strong', '--color-danger-strong'])
  for (const s of SURF)
    add(strong, s, AA_TEXT, `inline state text ${strong.replace('--color-', '')} on ${s.replace('--color-surface', 'surf')}`);
add('--color-on-primary', '--color-primary', AA_TEXT, 'primary button label');
add('--color-on-danger', '--color-danger-btn', AA_TEXT, 'danger button label');
add('--color-on-accent', '--color-accent', AA_UI, 'accent FAB icon (icon-only, non-text 3:1)');
/* A control's boundary is a UI component boundary (WCAG 1.4.11, 3:1), and it must hold on the
 * DARKEST surface it can sit on, not just the lightest. surface-3 was the missing one; it is the
 * case that pinned the dark theme to 3.02 before --slate-450. */
/* 3.25, not 3.0: a boundary that clears the floor by 0.02 has no headroom at all, and that is exactly
 * where the dark theme sat (3.02 on surface-3) until --slate-450. The margin is the guard, reverting
 * the token to the old slate-500 passes WCAG and silently returns the dark theme to the cliff. */
const UI_MARGIN = 3.25;
for (const s of SURF) add('--color-control-border', s, UI_MARGIN, `control border (input/select/checkbox…) on ${s}`);
add('--focus-ring', '--color-surface', AA_UI, 'focus ring on surface');
add('--color-primary', '--color-surface', AA_UI, 'primary fill vs surface');
for (const s of SURF) add('--color-accent', s, AA_UI, `accent on ${s}`);

// --- assert ---------------------------------------------------------------
for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast: ${themeName}`, () => {
    for (const p of req) {
      const r = R(p.fg, p.bg, theme);
      assert.ok(r >= p.min, `${themeName}: ${p.label} = ${r.toFixed(2)}:1 (need ${p.min}:1)`);
    }
  });
}

// Categorical tones: the text-leaning foreground on the tinted background must keep AA text
// contrast. ONE test for three components: .fdy-avatar--tone-*, .fdy-chip--tone-* and
// .fdy-badge--tone-* all use the identical mix (bg 18%, fg 50% toward --color-text over
// --color-surface), so they pass or fail together. Keep the ratios here in sync with all three;
// the css guard below asserts they stay identical.
for (const [themeName, theme] of Object.entries(THEMES)) {
  test(`WCAG contrast, categorical tones: ${themeName}`, () => {
    for (let i = 1; i <= 8; i++) {
      const c = `var(--chart-${i})`;
      const bg = parse(`color-mix(in srgb, ${c} 18%, var(--color-surface))`, theme);
      const fg = parse(`color-mix(in srgb, ${c} 50%, var(--color-text))`, theme);
      const r = ratio(fg, bg);
      assert.ok(r >= AA_TEXT, `${themeName}: tone-${i} = ${r.toFixed(2)}:1 (need ${AA_TEXT}:1)`);
    }
  });
}

/* --- the primary palette axis ------------------------------------------------------------------
 *
 * 18 palettes x 2 themes, and the pairs that actually move when the hue does. This is the gate that
 * decides whether a palette may ship: `on`/`onDark` in $primaries are a DESIGN choice about which
 * ink survives on a fill, and a choice nobody measured is a choice that fails on exactly the hues
 * where it is least obvious — the mid-luminance ones, where white and near-black are both marginal.
 *
 * Two of them, indigo and violet, do not clear 4.5 at shade 500 with either ink; they carry a
 * `darkShift` for that reason, and this suite is what says so rather than a comment claiming it. */
const paletteScope = (name, sel) => {
  const re = new RegExp(`\\n${sel.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&')}\\[data-primary="${name}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`);
  return vars(scope(re));
};

const PALETTES = Object.keys(JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url))).$primaries)
  .filter((k) => !k.startsWith('_'));

test('every palette is actually emitted', () => {
  assert.ok(PALETTES.length >= 18, `expected the full axis, found ${PALETTES.length}`);
  for (const name of PALETTES) {
    assert.ok(Object.keys(paletteScope(name, '')).length >= 9,
      `[data-primary="${name}"] emitted nothing — a palette that does not resolve is as green as one that passes`);
  }
});

for (const name of PALETTES) {
  /* Cascade order, not convenience order. The palette blocks are emitted AFTER the theme blocks and
     match at the same specificity (0,1,0), so a palette's `--color-on-primary` wins over the
     theme's generic one — which is the point: the ink that survives on a fill is a property of the
     HUE, not of the theme. Spreading darkVars last would have re-tested every warm palette with the
     default white label and failed nine of them for a reason the stylesheet does not have. */
  const light = { ...base, ...paletteScope(name, '') };
  const dark = { ...base, ...darkVars, ...paletteScope(name, ''), ...paletteScope(name, '[data-theme="dark"]') };

  for (const [themeName, theme] of [['LIGHT', light], ['DARK', dark]]) {
    test(`WCAG contrast: palette ${name} (${themeName})`, () => {
      const fails = [];
      const check = (fg, bg, min, label) => {
        const r = R(fg, bg, theme);
        if (r < min) fails.push(`${label}: ${r.toFixed(2)} < ${min}`);
      };
      check('--color-on-primary', '--color-primary', AA_TEXT, 'primary button label');
      check('--color-primary', '--color-surface', AA_UI, 'primary fill vs surface');
      check('--focus-ring', '--color-surface', AA_UI, 'focus ring on surface');
      for (const s of SURF) {
        check('--color-primary-strong', { soft: '--color-primary-soft', on: s }, AA_TEXT,
          `primary-strong on primary-soft/${s.replace('--color-surface', 'surf')}`);
      }
      assert.deepEqual(fails, [], `palette "${name}" (${themeName}) fails its contract:\n  ` + fails.join('\n  '));
    });
  }
}

/* --- the glass style axis -----------------------------------------------------------------------
 *
 * A frosted panel is TRANSLUCENT, so the ink on it is not read against the panel — it is read
 * against the panel composited over whatever is behind. That makes glass the one axis where a
 * contrast number cannot be taken from the token alone, and the reason a "just make it see-through"
 * change is so easy to ship broken.
 *
 * The worst case the kit can actually name is the page ground, `--color-surface-2`, which is what
 * `.fdy-app` paints and therefore what sits behind every raised panel in a Freeday screen. Anything
 * the app puts back there (a photo, a gradient) is beyond what a token can promise, and
 * COMPONENTS.md says so rather than this suite pretending otherwise. */
const styleVars = (sel) => vars(scope(new RegExp(`\\n${sel.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`)));

const GLASS_LIGHT = { ...base, ...styleVars('[data-style="glass"]'), ...styleVars('[data-theme="light"][data-style="glass"]') };
const GLASS_DARK = { ...base, ...darkVars, ...styleVars('[data-style="glass"]'), ...styleVars('[data-theme="dark"][data-style="glass"]') };

test('the glass scope actually resolves', () => {
  const g = styleVars('[data-style="glass"]');
  assert.ok(Object.keys(g).length >= 3, `[data-style="glass"] parsed ${Object.keys(g).length} vars`);
  assert.notEqual(GLASS_LIGHT['--color-surface-raised'], base['--color-surface-raised'],
    'glass must actually change the raised surface, or this suite is re-testing soft under a glass label');
  assert.notEqual(GLASS_DARK['--color-surface-raised'], GLASS_LIGHT['--color-surface-raised'],
    'a frosted panel is a tint of the surface it sits on, and that surface flips with the theme');
});

/* Composited over the PAGE GROUND is the obvious check and it is nearly vacuous: `--color-surface-2`
 * is within a few percent of the panel's own lightness, so a panel four times more transparent still
 * passes. Measured — that exact mutation went green.
 *
 * The invariant that actually holds is stronger: a glass panel must carry its own contrast, whatever
 * is behind it. So the ink is checked against the panel composited over BLACK and over WHITE, the
 * two extremes any ground lies between. Pass both and the promise holds over a photo, a gradient or
 * another panel; fail either and the kit is quietly relying on a background it does not control. */
const GROUNDS = { black: '#000000', white: '#ffffff' };

for (const [name, theme] of [['LIGHT', GLASS_LIGHT], ['DARK', GLASS_DARK]]) {
  test(`WCAG contrast: glass (${name}) holds over any ground`, () => {
    const fails = [];
    for (const [groundName, ground] of Object.entries(GROUNDS)) {
      const bg = over(parse(theme['--color-surface-raised'], theme), parse(ground, theme));
      const check = (fg, min, label) => {
        const r = ratio(parse(theme[fg], theme), bg);
        if (r < min) fails.push(`${label} over ${groundName}: ${r.toFixed(2)} < ${min}`);
      };
      check('--color-text', AA_TEXT, 'body text');
      check('--color-text-muted', AA_TEXT, 'muted text');
      check('--color-primary-strong', AA_TEXT, 'primary-strong');
    }
    assert.deepEqual(fails, [], `glass (${name}) fails its contract:\n  ` + fails.join('\n  '));
  });
}

test('soft is a real rule, not the absence of glass', () => {
  /* Density shipped without its way back out, and a compact root could not contain a comfortable
     region. This axis does not get to relearn that: `[data-style="soft"]` must restate every key
     glass overrides, or a soft island inside a glass app inherits the frost. */
  const soft = styleVars('[data-style="soft"]');
  const glass = styleVars('[data-style="glass"]');
  assert.deepEqual(Object.keys(soft).sort(), Object.keys(glass).sort(),
    'every key glass sets must be reset by soft, or a region cannot opt back out');
});
