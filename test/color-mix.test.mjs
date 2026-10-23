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
 * everywhere. Four rules cannot be answered statically (the tone modifiers inject their colour per
 * element, and .fdy-file--error blends two tokens), so those keep color-mix() and carry a real
 * @supports counterpart.
 *
 * What this file asserts, so the next color-mix() somebody writes cannot be silent:
 *   1. the token layer carries NONE. A custom property is the one place with no remedy at all:
 *      whoever reads it has var() in their declaration, so they take the computed-value-time path.
 *   2. every color-mix() in a component either sits under `@supports not (color: color-mix(...))`,
 *      or is answered by a counterpart rule in one — and a var()-free mix may instead be answered
 *      by a preceding declaration, which is the only case where that actually works.
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

test('every color-mix() in a component is answered', () => {
  const all = ruleSets(components);

  // selector -> the properties its @supports counterpart actually restates.
  const answered = new Map();
  for (const rule of all) {
    if (!rule.at.some(a => GUARD.test(a))) continue;
    const props = answered.get(rule.selector) ?? new Set();
    for (const { prop } of declarations(rule.body)) props.add(prop);
    answered.set(rule.selector, props);
  }

  let mixes = 0;
  for (const rule of all) {
    if (rule.at.some(a => GUARD.test(a))) continue; // this IS a fallback
    const decls = declarations(rule.body);
    decls.forEach(({ prop, value }, i) => {
      if (!value.includes('color-mix(')) return;
      mixes++;
      if (value.includes('var(')) {
        /* Carries a token, so it fails at computed-value time and no preceding line can catch it.
           @supports is the only mechanism left. */
        const props = answered.get(rule.selector);
        assert.ok(props !== undefined,
          `${rule.selector} mixes a token into ${prop} with no @supports counterpart; on Safari <= 16.1 ` +
          `${prop} drops to its initial value, and a fallback declaration above it would never run`);
        assert.ok(props.has(prop),
          `${rule.selector} has an @supports counterpart but it does not restate ${prop}`);
      } else {
        /* No token in the mix, so the declaration is rejected at parse time and the pattern works. */
        const earlier = decls.slice(0, i).some(d => d.prop === prop && !d.value.includes('color-mix('));
        assert.ok(earlier,
          `${rule.selector} needs a static ${prop} declared BEFORE its color-mix() one`);
      }
    });
  }
  assert.ok(mixes > 0, 'found no color-mix() to check, so this test is proving nothing');
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
