# Browser interaction harness

Regression guards for the class of **focus / blur / pointer** bugs that `node --test`
cannot see, the ones that have actually shipped:

- **combo mouse-select:** pressing an option blurs the trigger, `focusout` closes the
  list, and the pick is lost before `click` lands. Fixed in the vanilla enhancer at
  v1.6.1 and (independently, same bug) in the Vue/React adapters at v1.13.1.
- **datetime state propagation:** a wrapper's `data-fdy-disabled` / `data-fdy-invalid`
  must reach **both** child triggers; a microtask reached only the date child, so the fix
  uses `setTimeout(0)` (v1.14.0).

These reproduce only under a **real, trusted** mouse gesture. A synthetic `el.click()`
skips the focusout and would pass against the buggy code, so the harness drives Chrome
over the DevTools Protocol (`Input.dispatchMouseEvent`). See the memory note
`verify-interactive-ui-with-real-mouse`.

## Run

```bash
npm run test:browser
```

Deliberately **not** part of the default `node --test` gate or CI: it needs a Chrome
binary, so it lives outside `test/` and isn't named `*.test.mjs`. When no Chrome is found
every spec **skips** (never fails) with a message. It uses the isolated
`chrome-headless-shell` from the puppeteer cache because a running desktop Chrome refuses
to bind a fresh `--headless` debug port; override the binary with `CHROME_BIN=/path/to/chrome`.

Dev-only deps (`vue`, `react`, `react-dom`, `esbuild`) are what let the adapters actually
render in a browser; none ship in the package (`files` in `package.json` excludes this
folder).

## Layout

| Path | What it is |
|---|---|
| `harness.mjs` | Chrome launch + CDP driver (`evalJS` / `waitFor` / `clickCenter`) and `buildEntries()` |
| `entries/*` | Tiny mount entries; esbuild bundles them (framework inlined) into self-contained IIFEs |
| `fixtures/*.html` | Pages loaded over `file://`: vanilla ones load `dist/freeday.js`, adapter ones load a built entry |
| `vanilla.mjs` | Specs for `dist/freeday.js` (datetime disabled/invalid, combo mouse-select) |
| `adapter.mjs` | Specs for the mounted Vue + React `FdyCombo` (mouse-select updates the bound value) |
| `.build/` | esbuild output, gitignored, rebuilt on demand |

## Adding a spec

1. Add a fixture under `fixtures/` (or an entry under `entries/` for an adapter).
2. Write the spec with `withPage(fixtureUrl, async (p) => { … })`; gate it with
   `{ skip }` from `findChrome()`.
3. **Prove it bites:** revert the fix, confirm the spec fails, restore. A guard that can't
   fail guards nothing.
