/* color-mix() is not safe in this kit, and this file is what keeps it that way.
 *
 * MEASURED, in real Chrome, before any of it was written (the probe is reproduced in the two
 * assertions at the bottom of this comment so it is not lost):
 *
 *   #a { border-color:#eff4ff; border-color:bogus-mix(in srgb,#2050d8 22%,transparent); }
 *        -> rgb(239,244,255)   the unknown function has no var(), so the declaration is rejected
 *                              at PARSE time and the line above it wins. Progressive enhancement
 *                              works, exactly as the pattern promises.
 *   #b { border-color:#eff4ff; border-color:bogus-mix(in srgb,var(--c) 22%,transparent); }
 *        -> rgb(0,0,0)         the same function WITH var() is assumed valid at parse time and
 *                              only re-parsed at computed-value time. It fails there, and that
 *                              path does NOT fall back to a preceding declaration: the property
 *                              drops to its INITIAL value. border-color's initial value is
 *                              currentColor. That is the thick black outline an iPhone 7 reported.
 *
 * So "static value first, color-mix() second" is DEAD CODE for any mix that mentions a token, and
 * 92 of the kit's 94 mixes mentioned one. The fix was to stop needing a fallback: every alpha is
 * now stated as `rgba(var(--color-<role>-rgb), .26)`, which is the same colour and parses
 * everywhere.
 *
 * v3.7.0 finished the job. Ten mixes survived the first pass because a triple can only put an alpha
 * on ONE role, and they tinted one role over another: the categorical tone modifiers (18% of a tone
 * over the surface, 50% toward the text, 30% over the border, 26% over transparent) and
 * .fdy-file--error (40% of danger over the border). Those are now computed at BUILD time, per theme,
 * by tokens/build.mjs, and the components read flat tokens — so the @supports counterparts that used
 * to stand in for them are gone too, along with the private per-element custom properties that made
 * the mix unanswerable in the first place. The kit ships zero color-mix().
 *
 * What this file asserts, so the next color-mix() somebody writes cannot be silent:
 *   1. the token layer carries NONE. A custom property is the one place with no remedy at all:
 *      whoever reads it has var() in their declaration, so they take the computed-value-time path.
 *   2. no component declares one either — not even with a fallback above it, and not even under an
 *      @supports. The pattern is banned outright rather than policed, because every form of it that
 *      works depends on somebody noticing which form they wrote.
 *   3. every --*-rgb a component reads exists.
 *   4. every --X-rgb is still the channels of --X, in EVERY scope: root, both themes, all 18
 *      palettes. A triple that drifts from its role is a wrong colour that nothing else would see.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const components = readFileSync(join(root, 'dist', 'freeday.css'), 'utf8');
const tokens = readFileSync(join(root, 'dist', 'freeday.tokens.css'), 'utf8');

const GUARD = /^@supports\s+not\s*\(\s*color\s*:\s*color-mix\(/;

/** Strip comments, then walk the sheet into rule sets that remember the at-rules above them. */
function ruleSets(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let head = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      const prelude = head.trim();
      head = '';
      if (prelude.startsWith('@')) { stack.push(prelude); continue; }
      let depth = 1, j = i + 1;
      while (depth > 0) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
      out.push({ at: [...stack], selector: prelude.replace(/\s+/g, ' '), body: src.slice(i + 1, j - 1) });
      i = j - 1;
    } else if (c === '}') { stack.pop(); head = ''; }
    else head += c;
  }
  return out;
}

/** property -> value, in source order, duplicates kept (the whole point of a fallback pair). */
function declarations(body) {
  return body.split(';').map(d => d.trim()).filter(Boolean).map(d => {
    const at = d.indexOf(':');
    return at === -1 ? null : { prop: d.slice(0, at).trim(), value: d.slice(at + 1).trim() };
  }).filter(Boolean);
}

test('the token layer carries no color-mix() at all', () => {
  /* A custom property cannot be rescued. Whoever reads it writes `background: var(--x)`, which
     contains var(), so an engine that does not know color-mix() takes the computed-value-time path
     and the property drops to its initial value — a preceding declaration is never consulted, and
     @supports cannot see inside a var() chain either. The remedy is to not need one: the stripe is
     a flattened token, and the dark primary washes are rgba() over a channel triple. */
  assert.equal(tokens.includes('color-mix('), false,
    'dist/freeday.tokens.css must contain no color-mix(): a custom property has no fallback path');

  for (const rule of ruleSets(components)) {
    for (const { prop, value } of declarations(rule.body)) {
      if (prop.startsWith('--') && value.includes('color-mix(')) {
        assert.fail(`${rule.selector} puts color-mix() in ${prop}; a custom property has no fallback path`);
      }
    }
  }
});

test('no component declares color-mix(), in any form', () => {
  /* Banned outright, not policed into a safe shape. The safe shape exists — a var()-free mix with a
     static declaration above it really does fall back — but it is one word away from the shape that
     silently drops the property, and telling them apart means reading the whole declaration for a
     var() that may be three tokens deep. Every mix the kit needed is computed by tokens/build.mjs
     now, so there is nothing left to allow.

     The @supports counterparts are gone with them, and that is asserted too: a guard block for a
     function nobody calls is dead CSS that reads like a live safety net. */
  const all = ruleSets(components);
  let checked = 0;
  for (const rule of all) {
    const where = [...rule.at, rule.selector].join(' ');
    for (const { prop, value } of declarations(rule.body)) {
      checked++;
      assert.equal(value.includes('color-mix('), false,
        `${where} declares ${prop} with color-mix(); compute it in tokens/build.mjs instead — on ` +
        `Safari <= 16.1 a mix carrying var() drops ${prop} to its INITIAL value, and no fallback ` +
        `declaration above it is ever consulted`);
    }
    assert.equal(rule.at.some(a => GUARD.test(a)), false,
      `${where} sits under an \`@supports not (color: color-mix(…))\`, but the kit no longer uses ` +
      `color-mix(); a fallback for a function nobody calls reads like a live safety net`);
  }
  assert.ok(checked > 1000, `only ${checked} declarations scanned; the stylesheet shape changed`);
});

// --- the channel triples --------------------------------------------------
/** scope selector -> { --name: value } for every block in the token sheet. */
function scopes(css) {
  return ruleSets(css).map(r => ({
    name: [...r.at, r.selector].join(' '),
    vars: Object.fromEntries(declarations(r.body).map(({ prop, value }) => [prop, value])),
  }));
}
const tokenScopes = scopes(tokens);
const ROOT = tokenScopes.find(s => s.name === ':root').vars;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const triple = (hex) => {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/** Follow a value to the flat thing it ends at, reading the scope first and :root behind it. */
function chase(value, stop, vars, depth = 0) {
  if (depth > 20) throw new Error('reference cycle at ' + value);
  const v = value.trim().replace(/\s+/g, '');
  if (stop.test(v)) return v;
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  if (ref === null) return null;
  const next = vars[ref[1]] ?? ROOT[ref[1]];
  return next === undefined ? null : chase(next, stop, vars, depth + 1);
}
const hexOf = (value, vars) => chase(value, HEX, vars);
const tripleOf = (value, vars) => chase(value, /^\d{1,3},\d{1,3},\d{1,3}$/, vars);

test('every --*-rgb is the channels of the token it is named after, in every scope', () => {
  let checked = 0;
  for (const scope of tokenScopes) {
    for (const [prop, value] of Object.entries(scope.vars)) {
      if (!prop.endsWith('-rgb')) continue;
      const role = prop.slice(0, -4);
      /* Co-location is itself the invariant: a triple is emitted beside the shade or role it
         belongs to, so a scope that moves one and not the other is the drift this catches. */
      assert.ok(scope.vars[role] !== undefined,
        `${scope.name} declares ${prop} but not ${role}; the triple can no longer track its role`);

      const want = hexOf(scope.vars[role], scope.vars);
      if (want === null) continue; // a role that resolves to an expression, not a flat colour
      const got = tripleOf(value, scope.vars);
      assert.notEqual(got, null, `${scope.name}: ${prop} does not resolve to three channels`);
      assert.equal(got, triple(want),
        `${scope.name}: ${prop} is ${got} but ${role} is ${want}, whose channels are ${triple(want)}`);
      checked++;
    }
  }
  assert.ok(checked > 150, `only ${checked} triples checked (166 expected); the token sheet shape changed`);
});

test('every channel triple a component reads is defined', () => {
  const used = new Set([...components.matchAll(/var\((--[\w-]+-rgb)\)/g)].map(m => m[1]));
  assert.ok(used.size > 5, 'no channel triples in use, so this test is proving nothing');
  for (const name of used) {
    assert.ok(ROOT[name] !== undefined,
      `components read ${name}, which :root never defines; the declaration would drop to its ` +
      `initial value — the exact failure the triples exist to prevent`);
  }
});
