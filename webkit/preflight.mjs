/* Freeday. The WebKit suite refuses to start on an engine it cannot trust.
 *
 * Playwright's `globalSetup`, so a bad engine costs one error line instead of eleven. Without it,
 * running this suite on a mac14-arm64 laptop produces eleven separate 30-second timeouts, five
 * minutes of output whose real cause appears identically in every one of them:
 *
 *     browserContext.newPage: Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled
 *
 * That is the FROZEN WebKit. Playwright says so plainly when you install it ("You are using a
 * frozen webkit browser which does not receive updates anymore on mac14-arm64"), and the frozen
 * build cannot open a page at all under a current Playwright.
 *
 * It exits NON-ZERO, deliberately, including on the laptop where the cause is not the developer's
 * code. Exiting 0 with a note would make "WebKit is broken here" look exactly like "WebKit passed",
 * which is the failure mode ci.yml already names about the Chrome suite: a skipped guard is not a
 * passing guard. `npm test`, `npm run test:browser`, `npm run test:blazor` and `typecheck:react`
 * are untouched by this, so the laptop's own gate stays green; only the suite that cannot honestly
 * run says that it cannot run.
 *
 * The same check covers CI's opposite failure. If `playwright install webkit` did not happen, the
 * executable is missing and this fails before the first navigation rather than timing out eleven
 * times with the browser's absence nowhere in the message.
 *
 * Delete the frozen-build branch once a developer machine is new enough for a current WebKit.
 */
import { existsSync } from 'node:fs';
import { webkit } from 'playwright-core';

export default async function preflight() {
  let bin;
  try {
    bin = webkit.executablePath();
  } catch (err) {
    throw new Error(`Playwright cannot name a WebKit executable at all: ${err.message}`);
  }

  if (!existsSync(bin)) {
    throw new Error(
      `No WebKit at ${bin}. Run \`npx playwright install webkit\` first. `
      + 'Refusing to run: a suite that cannot open a WebKit page is not a WebKit guard.');
  }

  /* `_special` is how Playwright marks a pinned build for an OS it no longer ships a current
   * browser for. Matched on the path rather than on the error, so the refusal arrives before the
   * first 30-second timeout rather than after eleven of them. */
  if (/_special/.test(bin)) {
    throw new Error(
      `The WebKit at ${bin} is Playwright's FROZEN build for this OS and cannot open a page: `
      + 'every newPage() answers "Protocol error (Page.overrideSetting): Unknown setting: '
      + 'PushAPIEnabled". This suite runs on the ubuntu-latest runner in CI, which gets a current '
      + 'WebKit. Nothing is wrong with your working copy; this machine cannot host this suite. '
      + 'The other four gates (npm test, test:browser, test:blazor, typecheck:react) are unaffected.');
  }

  process.stdout.write(`freeday webkit suite: engine at ${bin}\n`);
}
