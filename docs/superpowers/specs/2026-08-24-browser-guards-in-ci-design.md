# Freeday — Browser guards in CI (Design Spec)

- **Status:** Approved, ready for implementation
- **Date:** 2026-08-24
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 1.52.1
- **Scope:** CI only, with no component, token, or adapter change

---

## 1. Problem

The repository has two test suites and CI runs one of them.

| suite | tests | runs in CI |
|---|---|---|
| `npm test` (`node --test`) | 59 | yes |
| `npm run test:browser` (18 specs) | 58 | **no** |

`.github/workflows/publish.yml` runs `node --test`, `node tokens/build.mjs` and
`npm run typecheck:react`, then publishes. The browser suite is absent, so every guard that needs a
real engine runs only when a human remembers to run it locally:

- paint order of stacked overlays, asserted in pixels (`overlay-stack.mjs`, #046)
- a chart's accessible subtree, asserted against the AX tree (`chart-a11y.mjs`, #047)
- the user-activation matrix that decides who owns Escape (`overlay-stack.mjs`, #048)
- focus, theming, control heights, crowding, adapter parity, and the other 15 specs

Automating releases through OIDC (1.52.0) sharpened this: a tag now publishes to npm without a
human in the loop, and the strongest guards are the ones that loop skips.

### 1.1 The failure mode this must not have

Every browser spec opens with:

```js
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
```

With no Chrome, all 58 tests are **skipped**, `node --test` exits 0, and CI is green having
verified nothing. Any design that merely "adds a job" can produce a permanently green,
permanently empty check. Refusing to run must be louder than passing.

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Browser suite runs on **every push/PR to `main`** *and* gates `npm publish` | Feedback at commit time; a tag whose guards are red never reaches npm. Public repo → Actions minutes are free, so the cheaper options buy nothing. |
| 2 | CI engine = **the runner's preinstalled Google Chrome stable** | It is the engine consumers actually run. Local development stays on Chromium 133 from the puppeteer cache, so the two engines `COMPONENTS.md` names are both genuinely exercised. |
| 3 | The suite must **fail**, never skip, when Chrome is missing on CI | See §1.1. |
| 4 | One definition of the test steps, reused | Two copies of a test list drift; the copy that runs at release time is the one that matters. |

### Accepted consequence of decision 2

When Google ships a Chrome whose behaviour differs, CI goes red with no offending commit. That is
intended: `overlay-stack.mjs` says so in its own assertion message: *"a changed row is news about
the browser, not a regression in the kit"*. A pinned-old engine would keep CI quiet and reproduce
exactly the blind spot that produced note #048, where the kit measured 133 and the consumer measured
151.

## 3. Design

### 3.1 `.github/workflows/ci.yml` (new)

A reusable workflow, so the release path and the push path cannot diverge.

```yaml
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  workflow_call:        # publish.yml calls this same job
```

Steps, in order, building first because the browser fixtures load `dist/`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 22, matching `publish.yml`)
3. `npm ci`
4. `node tokens/build.mjs`
5. `node --test` for the 59 unit tests
6. `npm run typecheck:react`
7. **Chrome precheck:** `CHROME_BIN=/usr/bin/google-chrome` (the path Google Chrome stable occupies
   on the `ubuntu-latest` image), then `test -x "$CHROME_BIN"`, failing the job with a message that
   names the path if it is not there
8. `npm run test:browser`, with that same `CHROME_BIN` exported to the step

### 3.2 `.github/workflows/publish.yml` (edited)

```yaml
jobs:
  test:
    uses: ./.github/workflows/ci.yml
  publish:
    needs: test
    ...unchanged...
```

The publish job keeps its own `npm ci` and build, because a called workflow is a separate job on a separate
runner and shares no filesystem. Its duplicated `node --test` and `typecheck:react` steps are
removed, since `needs: test` now covers them.

### 3.3 `browser/harness.mjs` (edited)

Two facts about launching a browser that the harness currently assumes away:

```js
// chrome-headless-shell is headless by construction. A normal Chrome binary is not: on a runner
// with no display it looks for one and dies. Teaching the harness the difference is also what
// makes CHROME_BIN=<any local Chrome> work for engine comparisons like the one #048 needed.
const isShell = chrome.includes('headless-shell');
const flags = [
  ...(isShell ? [] : ['--headless=new']),
  ...(process.env.CI ? ['--no-sandbox'] : []),
  ...
];
```

`--no-sandbox` is scoped to `CI` so a developer's machine keeps the sandbox. Whether the GitHub
runner needs it at all is unknown from here; see §5.

## 4. Testing

The change *is* test infrastructure, so verification is behavioural, not unit:

1. **Locally, before pushing,** the full browser suite must pass against both engines:
   - `npm run test:browser` (Chromium 133, puppeteer cache): 58/58 today
   - `CHROME_BIN=<Chrome 151> npm run test:browser`: 58/58, already measured 2026-08-24
2. **On CI,** the run must report **58 passed, 0 skipped**. A green run with skips is a failed
   implementation of this spec, not a pass.
3. **The anti-skip guard must be proven, not assumed:** one deliberate run with `CHROME_BIN`
   pointing at a non-existent path must fail the job. Without that, §1.1 is a claim, not a
   property.
4. **The gate must be proven:** a tag whose browser suite fails must not publish.

## 5. Risks

| Risk | Handling |
|---|---|
| Runner Chrome needs `--no-sandbox`, or does not | Cannot be settled from a laptop. Implement on a branch, read the real run, adjust. |
| Chrome absent from a future runner image | The §3.1 precheck turns it into a loud failure; the path can then be pinned or installed. |
| Browser suite is slower than the unit suite (~19s locally) | Acceptable, since it runs on a hosted runner, in parallel with nothing else, on a free tier. |
| A future Chrome changes a documented behaviour | Intended, per §2. The fix is to re-measure and correct the docs, exactly as 1.52.1 did. |

## 6. Out of scope

- A two-engine CI matrix, decided against; local covers 133.
- Refreshing `HANDOFF.md` / `NEXT-UP.md`, both stale at v1.34.0 while the kit is at 1.52.1. Real,
  worth doing, and a separate piece of work rather than something smuggled into a CI change.
- bUnit / bBlazor component tests in CI (`NEXT-UP.md` #5), unchanged and still demand-driven.

## 7. Definition of done

- `ci.yml` exists, runs on push/PR, and its run for the merge commit is green with 58 browser tests
  passed and 0 skipped.
- `publish.yml` shows `needs: test`, and a release tag publishes only after that job is green.
- A deliberately broken `CHROME_BIN` has been shown to fail the job at least once.
- `CHANGELOG.md` records it under the release that carries it.
