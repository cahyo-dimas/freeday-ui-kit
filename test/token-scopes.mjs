/* Reads the token stylesheet the way a browser computes ONE element: the declarations of the
 * scopes that match it, later and more specific scopes winning, then every var() substituted
 * until a literal is left. Used to pin output values (token-snapshot.test.mjs) and to compose the
 * neutral scopes (contrast.test.mjs). */

/**
 * @typedef {Record<string, string>} Scope  custom property name -> raw or resolved value
 * @typedef {{ neutral: string | null, primary: string | null, glass: boolean }} Axes
 * @typedef {{ light: Scope, dark: Scope }} Themed
 * @typedef {{ soft: Themed, glass: Themed, palettes: Record<string, Themed> }} Snapshot
 */

const escape = (s) => s.replace(/[[\]"^$.*+?()|{}\\]/g, '\\$&');

/** Declarations of the top-level block whose selector is exactly `selector`, or {} when absent.
 *  @param {string} css @param {string} selector @returns {Scope} */
export function block(css, selector) {
  const m = css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`));
  /** @type {Scope} */
  const out = {};
  if (m === null) return out;
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}

/** Every value with its var() chain substituted down to a literal.
 *  @param {Scope} scope @returns {Scope} */
export function resolveAll(scope) {
  /** @type {(v: string, depth: number) => string} */
  const resolve = (v, depth) => {
    if (depth > 30) throw new Error(`var() cycle or unresolvable value: ${v}`);
    if (!v.includes('var(')) return v;
    return resolve(v.replace(/var\((--[\w-]+)\)/g, (_, name) => {
      const inner = scope[name];
      if (inner === undefined) throw new Error(`undefined custom property ${name}`);
      return inner;
    }), depth + 1);
  };
  /** @type {Scope} */
  const out = {};
  for (const [k, v] of Object.entries(scope)) out[k] = resolve(v, 0);
  return out;
}

/** The resolved light and dark values of an element carrying the given axes and an explicit
 *  data-theme. Spread order follows the cascade: each axis block comes after the theme block at
 *  the same specificity, and its [data-theme="dark"] twin outranks both.
 *  @param {string} css @param {Axes} axes @returns {Themed} */
export function scopes(css, axes) {
  const root = block(css, ':root');
  const axis = (attr, value, theme) => (value === null ? {} : block(css, `${theme}[data-${attr}="${value}"]`));
  const glass = axes.glass ? block(css, '[data-style="glass"]') : {};
  const glassDark = axes.glass ? block(css, '[data-theme="dark"][data-style="glass"]') : {};
  const light = {
    ...root, ...glass,
    ...axis('neutral', axes.neutral, ''), ...axis('primary', axes.primary, ''),
  };
  const dark = {
    ...root, ...block(css, '[data-theme="dark"]'), ...glass, ...glassDark,
    ...axis('neutral', axes.neutral, ''), ...axis('neutral', axes.neutral, '[data-theme="dark"]'),
    ...axis('primary', axes.primary, ''), ...axis('primary', axes.primary, '[data-theme="dark"]'),
  };
  return { light: resolveAll(light), dark: resolveAll(dark) };
}

/** Everything a consumer can observe without data-neutral: soft and glass in both themes, plus,
 *  per palette, the values that palette changes.
 *  @param {string} css @param {string[]} palettes @returns {Snapshot} */
export function snapshot(css, palettes) {
  const soft = scopes(css, { neutral: null, primary: null, glass: false });
  const glass = scopes(css, { neutral: null, primary: null, glass: true });
  /** @type {(m: Scope, base: Scope) => Scope} */
  const diff = (m, base) => Object.fromEntries(Object.entries(m).filter(([k, v]) => base[k] !== v));
  /** @type {Record<string, Themed>} */
  const out = {};
  for (const p of palettes) {
    const s = scopes(css, { neutral: null, primary: p, glass: false });
    out[p] = { light: diff(s.light, soft.light), dark: diff(s.dark, soft.dark) };
  }
  return { soft, glass, palettes: out };
}
