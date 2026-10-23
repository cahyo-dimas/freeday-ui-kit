import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { breakpoints } from './breakpoints.mjs';

/* {a.b.c} -> var(--a-b-c). Every occurrence, not just a value that IS one reference: a token whose
 * value is an expression — `color-mix(in srgb, {primary.600} 20%, transparent)` — has to resolve its
 * references too, and the previous whole-string anchor let those through untouched, emitting a
 * literal `{primary.600}` into the stylesheet. No existing value contains braces for any other
 * reason, so a global replace is the same answer everywhere it used to apply. */
export function resolveValue(raw) {
  return String(raw).trim().replace(/\{([^}]+)\}/g, (_, ref) => `var(--${ref.replace(/\./g, '-')})`);
}

// leaf = objek dengan $value ; name = path digabung '-'
export function flatten(tokens, prefix = []) {
  const out = [];
  for (const [key, val] of Object.entries(tokens)) {
    /* `_`-prefixed keys are documentation, never tokens. Without this a note written as
       `"_comment": { "$value": "…" }` — the shape the rest of the file uses for real tokens —
       becomes `--primary-_comment: Alias ramp. The primary semantics read THESE…;` in the shipped
       stylesheet: a custom property holding a paragraph of English, invalid at the first `[`, and
       silently carried into every consumer's bundle. */
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object' && '$value' in val) {
      out.push({
        name: [...prefix, key].join('-'),
        value: val.$value,
        dark: val.$dark,
        compact: val.$compact,
        glass: val.$glass,
        glassDark: val.$glassDark,
      });
    } else if (val && typeof val === 'object') {
      out.push(...flatten(val, [...prefix, key]));
    }
  }
  return out;
}

const decl = (name, raw) => `  --${name}: ${resolveValue(raw)};`;

/* ---------------------------------------------------------------------------
 * CHANNEL TRIPLES: `{slate.0.rgb}` -> var(--slate-0-rgb), with `--slate-0-rgb: 255,255,255`
 * emitted here for every name a token actually asks for.
 *
 * They exist because `color-mix()` is NOT a safe way to put an alpha on a var() colour. A
 * declaration that contains var() is assumed valid at PARSE time and only re-parsed at
 * computed-value time; if `color-mix()` is unknown there (Safari <= 16.1, so every iPhone that
 * stopped at iOS 15) the declaration is invalid at computed-value time, and that does not fall
 * back to the preceding declaration — the property drops to its INITIAL value. For border-color
 * the initial value is currentColor, which is the thick black outline an iPhone 7 reported.
 * Measured, not assumed: see test/color-mix.test.mjs.
 *
 * `rgba(var(--x-rgb), .26)` is the same colour by construction, is plain var substitution, and
 * needs nothing newer than Safari 9 — so the kit states its alphas that way instead, and every
 * triple is asserted against the hex of the token it belongs to in test/color-mix.test.mjs.
 * ------------------------------------------------------------------------- */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function hexToTriple(hex) {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/* Follow a value down its reference chain to the hex it ends at. Deliberately strict: a token
   whose value is an expression has no single set of channels, so asking for its triple is a
   mistake the build should name rather than paper over. */
export function hexOfValue(raw, index, depth = 0) {
  if (depth > 20) throw new Error(`reference cycle resolving the rgb channels of \`${raw}\``);
  const v = String(raw).trim();
  if (HEX.test(v)) return v;
  const ref = v.match(/^\{([^}]+)\}$/);
  if (ref === null) throw new Error(`cannot take the rgb channels of \`${v}\`: not a hex and not a single reference`);
  const key = ref[1].replace(/\./g, '-');
  const target = index.get(key);
  if (target === undefined) throw new Error(`cannot take the rgb channels of {${ref[1]}}: no token named --${key}`);
  return hexOfValue(target, index, depth + 1);
}

/** name -> light value, for every leaf token (what a reference chain walks). */
export function valueIndex(flat) {
  return new Map(flat.map(t => [t.name, t.value]));
}

/** Every `{a.b.rgb}` a value asks for, as a dash-joined token name. */
export function rgbRefsIn(values) {
  const out = new Set();
  for (const v of values) {
    for (const m of String(v ?? '').matchAll(/\{([^}]+)\.rgb\}/g)) out.add(m[1].replace(/\./g, '-'));
  }
  return out;
}

export function hexOfName(name, index) {
  const raw = index.get(name);
  if (raw === undefined) throw new Error(`{…rgb} asked for --${name}, which is not a token`);
  return hexOfValue(raw, index);
}

/* The label ink of each primary palette. `$primaries` states it per palette rather than through a
   token, so the triples it needs are collected from there by hand — otherwise a palette whose ink
   is slate.950 would reference a --slate-950-rgb that nothing emitted. */
export function primaryInkRefs(tokens) {
  const spec = tokens.$primaries;
  if (spec === undefined) return [];
  return Object.entries(spec)
    .filter(([name]) => !name.startsWith('_'))
    .flatMap(([, p]) => [p.on, p.onDark])
    .filter(v => typeof v === 'string')
    .map(v => v.replace(/\}$/, '.rgb}'));
}

/** `--<name>-rgb: r,g,b` for each requested name, sorted so the output is stable. */
export function tripleDecls(names, index) {
  return [...names].sort().map(n => decl(`${n}-rgb`, hexToTriple(hexOfName(n, index))));
}

/* ---------------------------------------------------------------------------
 * PRECOMPUTED MIXES: a token may be WRITTEN as `color-mix(in srgb, {tone.1} 18%, {color.surface})`,
 * and the build flattens it to the colour it names. color-mix() never reaches the stylesheet.
 *
 * The triples above answer "an alpha on a role". They cannot answer "a tint of one role over
 * ANOTHER role", which is what the categorical tone modifiers are made of: 18% of a tone over the
 * surface, 50% toward the text, 30% over the border. Those three were the last color-mix() left in
 * the kit, and they were the ones that mattered most on Safari <= 16.1 — the colour arrived through
 * a per-element custom property, so the declaration carried var(), failed at computed-value time,
 * and `background` and `color` dropped to their initial values. A production roster screen opened
 * on a guard-post phone every shift change rendered its avatars with no fill and no ink.
 *
 * So the mix is computed HERE instead, once per theme, and the component reads a flat token. The
 * expression is kept in the CSS spelling on purpose: it states what the colour IS, the tier-2 roles
 * it is made of stay visible, and retuning a surface retunes everything derived from it.
 *
 * PER THEME, and derived rather than restated: a mix written in $value is evaluated twice, once
 * down each theme's chain (`$dark ?? $value` at every hop, exactly how the browser resolves the
 * var() graph under [data-theme="dark"]), and the dark result is emitted only when it differs. A
 * tone over the light surface and the same tone over the dark surface can therefore never fall out
 * of step, which one shared literal per token could not promise.
 *
 * The result is rounded to 8 bits. Chrome rasterises the mix it replaces to the SAME byte for all
 * of the kit's tone colours — measured through Page.captureScreenshot, not assumed; see
 * browser/color-mix.mjs. The computed VALUES differ by up to 0.5/255, which is what rounding to the
 * nearest byte means and is below anything a framebuffer can show.
 * ------------------------------------------------------------------------- */
const MIX = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/;
const byte = (v) => Math.min(255, Math.max(0, Math.round(v)));

/** Resolve a value to flat channels down ONE theme's chain. Strict: an operand that is not a flat
 *  colour has no single set of channels, so the build names it instead of papering over it. */
export function colorInTheme(raw, nodes, theme, owner, depth = 0) {
  if (depth > 20) throw new Error(`reference cycle resolving \`${raw}\` for --${owner}`);
  const v = String(raw).trim();
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (HEX.test(v)) {
    const [r, g, b] = hexToTriple(v).split(',').map(Number);
    return { r, g, b, a: 1 };
  }
  const ref = v.match(/^\{([^}]+)\}$/);
  if (ref === null) throw new Error(`--${owner}: cannot mix \`${v}\`: not a hex, not \`transparent\`, not a single reference`);
  const key = ref[1].replace(/\./g, '-');
  const node = nodes.get(key);
  if (node === undefined) throw new Error(`--${owner} mixes {${ref[1]}}, which is not a token`);
  const next = theme === 'dark' && node.dark !== undefined ? node.dark : node.value;
  return colorInTheme(next, nodes, theme, owner, depth + 1);
}

/** CSS Color 4 srgb interpolation: PREMULTIPLIED, and the alpha is carried out rather than forced
 *  to 1 — mixing with `transparent` is how a translucent edge is stated. */
export function mixSrgb(a, b, p) {
  const alpha = a.a * p + b.a * (1 - p);
  const chan = (ca, cb) => (alpha === 0 ? 0 : (ca * a.a * p + cb * b.a * (1 - p)) / alpha);
  return { r: chan(a.r, b.r), g: chan(a.g, b.g), b: chan(a.b, b.b), a: alpha };
}

/** Hex while it is opaque, rgba() once it is not: both parse back to Safari 9. */
export function formatColor(c) {
  if (c.a >= 1) return `#${[c.r, c.g, c.b].map(v => byte(v).toString(16).padStart(2, '0')).join('')}`;
  return `rgba(${byte(c.r)},${byte(c.g)},${byte(c.b)},${String(Math.round(c.a * 1000) / 1000).replace(/^0\./, '.')})`;
}

export function evalMix(raw, nodes, theme, owner) {
  const m = String(raw).trim().match(MIX);
  if (m === null) throw new Error(`--${owner}: \`${raw}\` is not a \`color-mix(in srgb, A p%, B)\` the build can flatten`);
  const a = colorInTheme(m[1], nodes, theme, owner);
  const b = colorInTheme(m[3], nodes, theme, owner);
  return formatColor(mixSrgb(a, b, Number(m[2]) / 100));
}

/** Every mix in the token set, replaced by the colour it names, per theme. */
export function flattenMixes(flat) {
  const nodes = new Map(flat.map(t => [t.name, { value: t.value, dark: t.dark }]));
  return flat.map(t => {
    /* The theme axis is the only one whose chain this walks. A mix on the density, glass or
       glass-dark axis would be flattened down the WRONG chain and ship a quietly wrong colour, so
       it is refused by name rather than guessed at. */
    for (const axis of ['compact', 'glass', 'glassDark']) {
      if (typeof t[axis] === 'string' && t[axis].includes('color-mix(')) {
        throw new Error(`--${t.name} mixes a colour in $${axis}; only $value and $dark are flattened`);
      }
    }
    const lightIsMix = typeof t.value === 'string' && t.value.includes('color-mix(');
    const darkIsMix = typeof t.dark === 'string' && t.dark.includes('color-mix(');
    if (!lightIsMix && !darkIsMix) return t;
    const value = lightIsMix ? evalMix(t.value, nodes, 'light', t.name) : t.value;
    const dark = darkIsMix ? evalMix(t.dark, nodes, 'dark', t.name)
      : lightIsMix ? evalMix(t.value, nodes, 'dark', t.name)
        : t.dark;
    /* Emitted for dark only when dark actually moves it: restating an unchanged value in a second
       scope is how two blocks drift apart. `--tone-6-border-soft` is the one that lands here — tone
       6 is the same green in both themes, and 26% of it over transparent has no surface to shift. */
    return { ...t, value, dark: dark === value ? t.dark : dark };
  });
}

export function buildTokensCss(tokens) {
  const flat = flattenMixes(flatten(tokens));
  const index = valueIndex(flat);
  /* Resolved to literals HERE, in :root only. The one family that moves with an axis is the
     primary ramp, and buildPrimariesCss re-states those triples beside the shades they belong
     to — the same place, and the same condition, as the shades themselves. */
  const wanted = rgbRefsIn([
    ...flat.flatMap(t => [t.value, t.dark, t.compact, t.glass, t.glassDark]),
    ...primaryInkRefs(tokens),
  ]);
  const root = [...flat.map(t => decl(t.name, t.value)), ...tripleDecls(wanted, index)].join('\n');
  const darkTokens = flat.filter(t => t.dark !== undefined);
  const dark = darkTokens.map(t => decl(t.name, t.dark)).join('\n');
  const lightReassert = darkTokens.map(t => decl(t.name, t.value)).join('\n');
  const compactTokens = flat.filter(t => t.compact !== undefined);
  const compact = compactTokens.map(t => decl(t.name, t.compact)).join('\n');
  /* The counterpart, DERIVED from the same tokens' defaults rather than restated: same key set by
     construction, so a token that gains a $compact value automatically gains its way back out, and
     a retuned default can never leave the two blocks disagreeing. */
  const comfortable = compactTokens.map(t => decl(t.name, t.value)).join('\n');

  return `/* Freeday tokens. GENERATED by tokens/build.mjs. Do not edit by hand. */
:root {
${root}
}
/* The SYSTEM default stays root-scoped: it is a statement about the document, and dropping :root
 * here would match every element that is not itself [data-theme="light"], which would re-darken
 * the children of a light panel, since they carry no attribute of their own. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark}
  }
}
/* The two EXPLICIT opt-ins are deliberately NOT scoped to :root, for the same reason as density
 * below: these are inheriting custom properties, so data-theme on any ancestor re-themes just that
 * subtree, a dark brand panel beside a light form is an ordinary layout, and it should not require
 * re-colouring each component by hand. The root still matches, so data-theme on <html> is unchanged.
 * Both keep the same specificity (0,1,0) as :root and come after it, so they still win there; and
 * --light after --dark means a light island inside a dark region wins in turn. */
[data-theme="dark"] {
${dark}
}
[data-theme="light"] {
${lightReassert}
}
/* Density is deliberately NOT scoped to :root. These are custom properties, so they inherit,
 * putting the attribute on any ancestor (a route wrapper, one section) densifies just that
 * subtree, which is how density is actually decided: per screen, not per app. The root still
 * matches, so setting data-density on the html element keeps working exactly as before. */
[data-density="compact"] {
${compact}
}
/* ...and the way back out. Inheritance only runs downhill: once the root is compact every subtree is
 * compact, and before this rule existed a data-density="comfortable" wrapper matched nothing, so the
 * comment above was true in one direction only. An app that is dense overall and carries one region
 * of shared chrome (a header, a toolbar, a footer shared with a sibling product) had to restate the
 * defaults by hand, which is exactly the local copy that goes stale when the kit retunes them. */
[data-density="comfortable"] {
${comfortable}
}
${buildStylesCss(flat)}${buildPrimariesCss(tokens)}`;
}

/* The visual-style axis. `soft` is the kit's own look and the default; `glass` frosts the RAISED
 * surfaces — the panel family only, never `--color-surface` itself, because that token is also the
 * fill of inputs, chips, table cells and frozen columns, and a translucent frozen column shows the
 * rows scrolling underneath it.
 *
 * Like theme and density, the selector is bare, so one region can be glass inside a soft app; and
 * `[data-style="soft"]` is a REAL rule, not an absence, so a region can opt back OUT of a glass
 * root. Density learned that the hard way, and this axis does not get to relearn it.
 *
 * Components never carry a [data-style] selector. They read the knobs — `--surface-filter`,
 * `--surface-inset`, `--color-surface-raised` — which are no-ops under `soft`, so a component that
 * cannot follow the axis through tokens is reporting a MISSING TOKEN, not asking for a rule. */
export function buildStylesCss(flat) {
  const glassTokens = flat.filter(t => t.glass !== undefined);
  if (glassTokens.length === 0) return '';
  const glass = glassTokens.map(t => decl(t.name, t.glass)).join('\n');
  const soft = glassTokens.map(t => decl(t.name, t.value)).join('\n');
  const darkTokens = glassTokens.filter(t => t.glassDark !== undefined);
  const glassDark = darkTokens.map(t => decl(t.name, t.glassDark)).join('\n');
  const glassLight = darkTokens.map(t => decl(t.name, t.glass)).join('\n');

  let out = `[data-style="glass"] {\n${glass}\n}\n[data-style="soft"] {\n${soft}\n}\n`;
  if (darkTokens.length > 0) {
    /* Glass is the only axis so far whose values differ per THEME as well: a frosted panel is a
       tint of the surface it sits on, and that surface flips. Emitted for the differing keys only,
       in the same three scopes the theme itself uses. */
    out += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])[data-style="glass"] {\n${glassDark}\n  }\n}\n`
      + `[data-theme="dark"][data-style="glass"] {\n${glassDark}\n}\n`
      + `[data-theme="light"][data-style="glass"] {\n${glassLight}\n}\n`;
  }
  return out;
}

/* The primary-palette axis. Each palette redefines the eight-shade `primary` ALIAS ramp, never the
 * semantics — so which shade is the fill, which is hover and which is the soft wash is stated once,
 * in `color.primary*`, and a palette that got one of them wrong is not a shape this can produce.
 *
 * Scoping follows `data-theme` exactly, and for the same reasons: the selector is bare, so a palette
 * can be set on any ancestor and re-brand one region; the dark scopes are emitted only for the keys
 * that actually DIFFER in dark (the label ink, and the shifted aliases), because restating the
 * unchanged ones is how two blocks drift apart; and a `[data-theme="light"]` re-assert follows, so a
 * light island inside a dark region wins back. */
export function buildPrimariesCss(tokens) {
  const spec = tokens.$primaries;
  if (spec === undefined) return '';
  const SHADES = ['50', '100', '300', '400', '500', '600', '700', '800'];
  /* One step lighter, for a hue whose 500 sits where neither white nor ink clears 4.5:1 on it. */
  const SHIFT = { 500: '400', 400: '300', 300: '200' };
  const out = [];
  const flat = flatten(tokens);
  const index = valueIndex(flat);
  /* Which shades need a channel triple is read off the tokens, not listed here: a semantic that
     starts asking for {primary.300.rgb} gains its triple in all 18 palettes without this function
     being touched, and one that stops asking loses it. */
  const asked = rgbRefsIn(flat.flatMap(t => [t.value, t.dark, t.compact, t.glass, t.glassDark]));
  const rgbShades = SHADES.filter(s => asked.has(`primary-${s}`));
  const triple = (ref) => hexToTriple(hexOfValue(ref, index));

  for (const [name, p] of Object.entries(spec)) {
    if (name.startsWith('_')) continue;
    const light = p.light ?? Object.fromEntries(SHADES.map(s => [s, `{${p.ramp}.${s}}`]));
    const dark = p.dark ?? (p.darkShift === true
      ? Object.fromEntries(SHADES.map(s => [s, `{${p.ramp}.${SHIFT[s] ?? s}}`]))
      : null);

    const sel = `[data-primary="${name}"]`;
    const lightDecls = [
      ...SHADES.map(s => decl(`primary-${s}`, light[s])),
      ...rgbShades.map(s => decl(`primary-${s}-rgb`, triple(light[s]))),
      decl('color-on-primary', p.on),
      decl('color-on-primary-rgb', p.on.replace(/\}$/, '.rgb}')),
    ].join('\n');
    out.push(`${sel} {\n${lightDecls}\n}`);

    // Only what dark actually changes.
    const darkDecls = [
      ...(dark === null ? [] : SHADES.filter(s => dark[s] !== light[s]).map(s => decl(`primary-${s}`, dark[s]))),
      ...(dark === null ? [] : rgbShades.filter(s => dark[s] !== light[s]).map(s => decl(`primary-${s}-rgb`, triple(dark[s])))),
      ...(p.onDark !== p.on ? [decl('color-on-primary', p.onDark), decl('color-on-primary-rgb', p.onDark.replace(/\}$/, '.rgb}'))] : []),
    ];
    if (darkDecls.length === 0) continue;
    const backLight = [
      ...(dark === null ? [] : SHADES.filter(s => dark[s] !== light[s]).map(s => decl(`primary-${s}`, light[s]))),
      ...(dark === null ? [] : rgbShades.filter(s => dark[s] !== light[s]).map(s => decl(`primary-${s}-rgb`, triple(light[s])))),
      ...(p.onDark !== p.on ? [decl('color-on-primary', p.on), decl('color-on-primary-rgb', p.on.replace(/\}$/, '.rgb}'))] : []),
    ].join('\n');
    out.push(
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])${sel} {\n${darkDecls.join('\n')}\n  }\n}`,
      `[data-theme="dark"]${sel} {\n${darkDecls.join('\n')}\n}`,
      `[data-theme="light"]${sel} {\n${backLight}\n}`,
    );
  }
  return `/* Primary palette axis. ${Object.keys(spec).filter(k => !k.startsWith('_')).length} options, see $primaries in tokens.json. */\n`
    + out.join('\n') + '\n';
}

/* The CSS half of the breakpoint scale.
 *
 * `@media` cannot read a custom property — that is why breakpoints.css carries literals and why the
 * scale also lives in tokens/breakpoints.mjs for JS. Nothing answered it for CSS, so every consuming
 * app retyped the kit's literals, and retyped literals drift: two consoles ended up expressing one
 * width three ways (`640px`, `40rem`, `45rem`) for the same idea (#058 §2).
 *
 * `@custom-media` is a PostCSS transform (postcss-custom-media), so this sheet is OPT-IN for the
 * consumer: an app that runs PostCSS imports it and writes `@media (--fdy-below-sm)`; an app that
 * does not keeps using literals exactly as before. The kit's own build never reads it, and no
 * existing export moves.
 *
 * Generated from the same object the JS side exports, so the two halves cannot disagree, and the
 * pairs mirror the queries the kit actually ships: the ramp's utilities split at n-0.02, the shell
 * switches at nav-1/nav, and the filter bar stacks at its own width. */
export function buildMediaCss(bp) {
  const { nav, filterbar, ...ramp } = bp;
  const ramps = Object.entries(ramp).flatMap(([name, px]) => [
    `@custom-media --fdy-below-${name} (max-width: ${px - 0.02}px);`,
    `@custom-media --fdy-from-${name} (min-width: ${px}px);`,
  ]);
  return `/* Freeday breakpoints as @custom-media. GENERATED by tokens/build.mjs. Do not edit by hand.
 *
 * Requires postcss-custom-media (or any PostCSS setup that includes postcss-preset-env); without it
 * a browser ignores the at-rules and every @media (--fdy-*) in your CSS never matches. Import it
 * ONCE, above the rules that use it:
 *
 *   @import '@cahyo-dimas/freeday/media';
 *   @media (--fdy-below-sm) { .page-header { display: block } }
 *
 * This file carries no rules of its own, so importing it costs nothing at runtime; it is not part
 * of freeday.css or freeday.bundle.css. */
${ramps.join('\n')}

/* NOT ramp steps. Each mirrors one hard-wired rule in the kit, and a rule that must fire with it
 * uses THIS condition, never the nearest ramp step: aligning shell-dependent code to --fdy-below-md
 * leaves 721–959px broken, and aligning a filter-bar rule to --fdy-below-sm leaves 600–640px
 * half-stacked. See tokens/breakpoints.mjs for what each one governs. */
@custom-media --fdy-nav-drawer (max-width: ${nav - 1}px);
@custom-media --fdy-nav-static (min-width: ${nav}px);
@custom-media --fdy-filterbar-stacked (max-width: ${filterbar}px);
`;
}

export function bundleCss(parts) {
  return `/* Freeday components. GENERATED by tokens/build.mjs. Do not edit by hand. */\n`
    + parts.map(p => p.trim()).join('\n\n') + '\n';
}

export function bundleJs(parts) {
  return `/* Freeday enhancers. GENERATED by tokens/build.mjs. Do not edit by hand.\n`
    + ` * Concatenation of every src/*.js enhancer (each a self-contained IIFE). */\n`
    + parts.map(p => p.trim()).join('\n\n') + '\n';
}

// Single-import CSS: tokens + components in one file (so `import 'freeday/css'`
// brings everything, avoiding the "forgot the tokens" footgun).
export function bundleFullCss(tokensCss, componentsCss) {
  return `/* Freeday, tokens + components in one file. GENERATED by tokens/build.mjs. */\n`
    + tokensCss.trim() + '\n\n' + componentsCss.trim() + '\n';
}

export function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, '..');
  const tokens = JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8'));
  const css = buildTokensCss(tokens);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/freeday.tokens.css'), css);
  console.log('Wrote dist/freeday.tokens.css');

  const base = readFileSync(join(root, 'src/base.css'), 'utf8');
  const compDir = join(root, 'src/components');
  const components = readdirSync(compDir)
    .filter(f => f.endsWith('.css')).sort()
    .map(f => readFileSync(join(compDir, f), 'utf8'));
  const componentsCss = bundleCss([base, ...components]);
  writeFileSync(join(root, 'dist/freeday.css'), componentsCss);
  console.log('Wrote dist/freeday.css');

  writeFileSync(join(root, 'dist/freeday.bundle.css'), bundleFullCss(css, componentsCss));
  console.log('Wrote dist/freeday.bundle.css');

  /* Its own file, never folded into the bundle: @custom-media is a build-time at-rule, so shipping
     it inside the stylesheet every app loads would hand browsers a block they must skip and apps
     that run no PostCSS a set of declarations that can never resolve. */
  writeFileSync(join(root, 'dist/freeday.media.css'), buildMediaCss(breakpoints));
  console.log('Wrote dist/freeday.media.css');

  // Copy optional JS enhancers (authored in src/, shipped as-is) to dist,
  // and also emit a single concatenated bundle for one-tag project consumption.
  const jsFiles = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
  const jsSources = [];
  for (const f of jsFiles) {
    const src = readFileSync(join(root, 'src', f), 'utf8');
    jsSources.push(src);
    writeFileSync(join(root, 'dist', f), src);
    console.log('Wrote dist/' + f);
  }
  writeFileSync(join(root, 'dist/freeday.js'), bundleJs(jsSources));
  console.log('Wrote dist/freeday.js');
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
