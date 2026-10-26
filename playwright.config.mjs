/* Freeday. WebKit gate, a SECOND browser suite beside the 206-test CDP harness in browser/.
 *
 * Why a second suite instead of a wider first one: browser/harness.mjs speaks the Chrome DevTools
 * Protocol to `chrome-headless-shell`, and CDP is Chromium only. Teaching it WebKit means
 * rewriting all 206 tests against a different driver, which is a large change to working code.
 * So the CDP suite keeps owning depth (paint order, AX trees, the user-activation matrix) and this
 * one owns the handful of behaviours that only a WebKit engine can show at all.
 *
 * Those behaviours are not hypothetical. Five releases in one day patched four of them, each found
 * by an app owner on an iPhone 7 after the kit had already shipped:
 *
 *   #057  iOS Safari synthesises `click` from a tap only on elements it reads as interactive, so a
 *         plain <div> backdrop with a click handler and no `cursor:pointer` could not be tapped at
 *         all. Reproducible in no Chromium, with a mouse click or with touchscreen.tap().
 *   #088/#089/#090  WebKit clamps transition duration to 0.000001s under Reduce Motion, and at that
 *         duration the transition never runs: the property stays at its START value. The drawer
 *         scrim stayed dark while still swallowing taps, and a checkbox tick was never painted
 *         even though the input really was checked.
 *
 * `devices['iPhone 7']` is 375x667 with touch, taken from the consuming app's own config: it is
 * the device the reports came from, and its width puts the shell in drawer mode and the bottom nav
 * on screen, so the layout path under test is the one the reports describe.
 *
 * NOT wired into `npm test`. `node --test` globs `*.test.*` and `test/**`, and these files are
 * `webkit/*.spec.mjs`, so the default gate neither runs them nor needs to know about them.
 * `npm run test:webkit` runs them on purpose, and CI runs them in a job of their own.
 *
 * Running this on a mac14-arm64 laptop will fail at launch, and that is not a configuration
 * mistake. Playwright ships a FROZEN WebKit for that platform ("does not receive updates anymore")
 * and every newPage() on it answers `Protocol error (Page.overrideSetting): Unknown setting:
 * PushAPIEnabled`. The engine is gated to CI by the workflow rather than by this file, because a
 * config that silently drops its only project would turn a broken engine into a green run. Drop
 * that gate once a developer machine is new enough for a WebKit that is not frozen.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.FREEDAY_WEBKIT_PORT ?? 4178);
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './webkit',
  outputDir: './webkit/.report/artifacts',
  /* webkit/preflight.mjs refuses to start on an engine that cannot open a page, so a frozen or
   * missing WebKit costs one error line rather than eleven 30-second timeouts. It exits non-zero
   * in both cases, on the laptop as well as in CI, because a suite that reports "I could not run"
   * as success is the skipped guard ci.yml already warns about. */
  globalSetup: './webkit/preflight.mjs',
  /* One worker and no retries. Four spec files take seconds, so parallelism buys nothing, and a
   * retry would convert a real WebKit flake into a green run with a footnote nobody reads. The CI
   * gate reads `flaky` out of the JSON report and fails on it for the same reason. */
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  /* The JSON report is what the CI gate asserts against. A Playwright run that matched no files
   * still exits 0, so "the job was green" and "the guards ran" have to be two separate facts. */
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'webkit/.report/webkit.json' }]]
    : [['list']],
  /* Traces and screenshots on a red run only. This is the one suite nobody can reproduce on the
   * machine it was written on, so a WebKit-only failure that leaves nothing behind is a failure
   * that can only be chased by pushing commits; ci.yml uploads webkit/.report/ when it goes red. */
  use: { baseURL: ORIGIN, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'webkit', use: { ...devices['iPhone 7'] } }],
  /* The fixtures are static HTML that loads dist/, so there is nothing to build and nothing to
   * mock; webkit/serve.mjs exists only because Safari refuses a parent-directory subresource over
   * file://. `reuseExistingServer` off in CI so a stale process cannot serve a stale dist/. */
  webServer: {
    command: 'node webkit/serve.mjs',
    url: `${ORIGIN}/browser/fixtures/vanilla-app-shell.html`,
    env: { FREEDAY_WEBKIT_PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
