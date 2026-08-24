/* Freeday — browser interaction harness (dev-only, zero runtime dependency).
 *
 * Drives a real headless Chrome over the DevTools Protocol to guard the class of
 * focus / blur / pointer bugs that `node --test` (jsdom-less, no layout) cannot see —
 * the ones that actually shipped: combo mouse-select (v1.6.1 vanilla, v1.13.1 adapters)
 * and datetime disabled/invalid propagation timing (v1.14.0). Trusted `Input.*` gestures
 * are mandatory: a synthetic `el.click()` skips the real focusout that hides those bugs
 * (see [[verify-interactive-ui-with-real-mouse]]).
 *
 * NOT part of the default `node --test` gate or CI — it needs a Chrome binary and lives
 * outside test/ on purpose. Run with `npm run test:browser`; it auto-skips when no Chrome
 * is found (set CHROME_BIN to point at one). Uses the isolated `chrome-headless-shell`
 * from the puppeteer cache because the machine's regular Chrome, when running, refuses to
 * bind a fresh --headless debug port.
 */
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { parse, compileScript } from 'vue/compiler-sfc';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Locate a headless Chrome binary, or null when none is available (→ tests skip). */
export function findChrome() {
  const env = process.env.CHROME_BIN;
  if (env !== undefined && env !== '' && existsSync(env)) return env;
  const base = join(homedir(), '.cache', 'puppeteer', 'chrome-headless-shell');
  if (!existsSync(base)) return null;
  for (const version of readdirSync(base)) {
    const versionDir = join(base, version);
    let inner;
    try {
      inner = readdirSync(versionDir);
    } catch {
      continue;
    }
    for (const name of inner) {
      const bin = join(versionDir, name, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

async function readDevToolsPort(userDataDir) {
  const portFile = join(userDataDir, 'DevToolsActivePort');
  for (let i = 0; i < 120; i++) {
    try {
      const raw = await readFile(portFile, 'utf8');
      const port = raw.split('\n')[0].trim();
      if (port !== '') return Number(port);
    } catch {
      /* not written yet */
    }
    await sleep(50);
  }
  throw new Error('Chrome never wrote DevToolsActivePort');
}

async function firstPageTarget(port) {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && typeof t.webSocketDebuggerUrl === 'string');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* devtools http not up yet */
    }
    await sleep(75);
  }
  throw new Error('no CDP page target');
}

/**
 * Launch Chrome on `fileUrl`, hand a driver to `fn`, then always tear the browser down.
 * The driver exposes just enough CDP to open a control and click it like a person would.
 */
export async function withPage(fileUrl, fn) {
  const chrome = findChrome();
  if (chrome === null) throw new Error('no Chrome binary (set CHROME_BIN)');
  const userDataDir = await mkdtemp(join(tmpdir(), 'fdy-cdp-'));
  /* chrome-headless-shell is headless by construction; a normal Chrome binary is not, and on a
     machine with no display it goes looking for one and dies. Telling the two apart is also what
     lets CHROME_BIN point at any installed Chrome — which is how #048 was settled, by running the
     same fixtures against a second engine. --no-sandbox only under CI: a developer keeps the
     sandbox, a hosted runner usually cannot have it. */
  const headless = chrome.includes('headless-shell') ? [] : ['--headless=new'];
  const sandbox = process.env.CI ? ['--no-sandbox'] : [];

  const proc = spawn(
    chrome,
    [
      ...headless,
      ...sandbox,
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1000,900',
      fileUrl,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );

  let ws = null;
  try {
    const port = await readDevToolsPort(userDataDir);
    const wsUrl = await firstPageTarget(port);
    ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP socket error')), { once: true });
    });

    let nextId = 0;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    const cmd = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });

    const evalJS = async (expression) => {
      const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.result && r.result.exceptionDetails) {
        throw new Error('page eval threw: ' + JSON.stringify(r.result.exceptionDetails.exception));
      }
      return r.result && r.result.result ? r.result.result.value : undefined;
    };

    const waitFor = async (expression, { timeout = 4000, interval = 50 } = {}) => {
      const deadline = Date.now() + timeout;
      for (;;) {
        if (await evalJS(`Boolean(${expression})`)) return true;
        if (Date.now() > deadline) return false;
        await sleep(interval);
      }
    };

    const centerOf = (selector) =>
      evalJS(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null; const r = el.getBoundingClientRect();
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`,
      );

    const clickAt = async (x, y) => {
      await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(40);
      await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(60);
    };

    /* A click is aimed at coordinates, so the target must have stopped moving before they are
       measured. The combo listbox animates in from translateY(-4px), and a click measured mid-flight
       lands 4px off — usually still inside the option, occasionally in the padding between two of
       them, which is a test that fails once a fortnight on a loaded runner and never on a laptop.
       The wait walks the ANCESTORS too: the animation runs on the listbox, not on the option being
       clicked. Short timeout, then click anyway — an element under a permanently animating parent
       (a spinner, a shimmer) must not hang the suite. */
    const ANIMATION_SETTLE_MS = 600; // longer than --dur-slow; kit animations are all shorter

    const stillMoving = (selector) => `(function () {
      var el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return true;
      for (var n = el; n; n = n.parentElement) {
        var running = n.getAnimations ? n.getAnimations() : [];
        for (var i = 0; i < running.length; i++) {
          if (running[i].playState === 'running') return true;
        }
      }
      return false;
    })()`;

    const clickCenter = async (selector) => {
      await waitFor(`!${stillMoving(selector)}`, { timeout: ANIMATION_SETTLE_MS });
      const c = await centerOf(selector);
      if (c === null) throw new Error('cannot click missing element: ' + selector);
      await clickAt(c.x, c.y);
    };

    /* A real key, not a synthetic KeyboardEvent — only a trusted one moves focus, which is the whole
       point when the claim under test is about tab order. */
    /* A key without its virtual-key code is delivered to the page but not acted on by the browser:
       Escape with vkCode 0 reaches a keydown listener yet never closes a native <dialog>, so a
       dismissal guard written with it passes for the wrong reason and reports a broken kit as fine. */
    const VK = { Tab: 9, Enter: 13, Escape: 27, Space: 32, End: 35, Home: 36,
                 ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
    const pressKey = async (key, { shift = false } = {}) => {
      const vk = VK[key] || 0;
      const params = { key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: shift ? 8 : 0 };
      await cmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params });
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
      await sleep(40);
    };

    /* The ACCESSIBLE NAME as the browser computes it — not textContent. CSS generated content never
       appears in textContent, so a tick painted through ::after is invisible to a DOM-level assert
       while a screen reader still reads it. Two kit features now hinge on that difference
       (.fdy-label--required and the combo's selected tick), so the guard has to ask the engine. */
    const axName = async (selector) => {
      await cmd('DOM.enable');
      await cmd('Accessibility.enable');
      const doc = await cmd('DOM.getDocument', { depth: -1 });
      const root = doc.result && doc.result.root ? doc.result.root.nodeId : null;
      if (root === null) throw new Error('no DOM root');
      const found = await cmd('DOM.querySelector', { nodeId: root, selector });
      const nodeId = found.result ? found.result.nodeId : 0;
      if (!nodeId) throw new Error('axName: no element for ' + selector);
      const ax = await cmd('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const nodes = (ax.result && ax.result.nodes) || [];
      const self = nodes[nodes.length - 1];
      return self && self.name ? self.name.value : null;
    };

    /* The VIEWPORT the page believes it has. Media queries and matchMedia('change') both respond
       to it, so this is what makes a responsive contract testable at all — and the only way to
       exercise the moment a layout CROSSES a breakpoint, which is where an app shell can strand an
       `inert` attribute on content nobody can reach any more. */
    const setViewport = async (width, height) => {
      await cmd('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: false,
      });
      await sleep(120); // let the media query settle before anything is measured
    };

    /* Every AX node UNDER an element, ignored ones included — the only instrument that can tell
       "the spec says this subtree is presentational" apart from "the browser actually prunes it".
       role="img" is Children Presentational per ARIA, but a UA is free to keep the nodes and leave
       the skipping to the AT, and a source read cannot see which one you got. */
    const axSubtree = async (selector) => {
      await cmd('DOM.enable');
      await cmd('Accessibility.enable');
      const doc = await cmd('DOM.getDocument', { depth: -1 });
      const root = doc.result && doc.result.root ? doc.result.root.nodeId : null;
      if (root === null) throw new Error('no DOM root');
      const found = await cmd('DOM.querySelector', { nodeId: root, selector });
      const nodeId = found.result ? found.result.nodeId : 0;
      if (!nodeId) throw new Error('axSubtree: no element for ' + selector);
      const q = await cmd('Accessibility.queryAXTree', { nodeId });
      return ((q.result && q.result.nodes) || []).map((n) => ({
        role: n.role ? n.role.value : null,
        name: n.name ? n.name.value : '',
        ignored: n.ignored === true,
      }));
    };

    /* The PIXEL the browser actually painted at a point.
     *
     * The only honest way to ask "is this on top?" once a modal <dialog> is involved. The obvious
     * instrument, elementFromPoint, answers a different question: a modal dialog makes the rest of
     * the document inert, so a hit test anywhere outside it returns the dialog whatever the paint
     * order is — it reports the dialog as "on top" of an element that is plainly visible above it.
     * Compositing cannot be argued with.
     *
     * Clipped to 1x1 so the PNG is one pixel: with no left or upper neighbour every PNG filter
     * type reduces to the identity, so the scanline is [filter, R, G, B(, A)] and needs no
     * unfiltering pass. scale 1 keeps one CSS pixel one device pixel.
     */
    const pixelAt = async (x, y) => {
      const shot = await cmd('Page.captureScreenshot', {
        format: 'png',
        clip: { x, y, width: 1, height: 1, scale: 1 },
      });
      const data = shot.result && shot.result.data;
      if (!data) throw new Error('pixelAt: no screenshot came back');
      const png = Buffer.from(data, 'base64');
      let offset = 8; // past the 8-byte signature
      const chunks = [];
      while (offset < png.length) {
        const length = png.readUInt32BE(offset);
        const type = png.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
        offset += 12 + length; // length + type + data + CRC
      }
      const raw = inflateSync(Buffer.concat(chunks));
      return { r: raw[1], g: raw[2], b: raw[3] };
    };

    /* Where a selector is on screen, for pixelAt. */
    const centerXY = async (selector) => {
      const c = await centerOf(selector);
      if (c === null) throw new Error('centerXY: no element for ' + selector);
      return c;
    };

    return await fn({ evalJS, waitFor, clickCenter, pressKey, axName, axSubtree, pixelAt, centerXY, setViewport });
  } finally {
    if (ws !== null) {
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    }
    proc.kill();
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

const vueSfcPlugin = {
  name: 'vue-sfc',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const src = await readFile(args.path, 'utf8');
      const { descriptor } = parse(src, { filename: args.path });
      const id = 'fdy' + Buffer.from(args.path).toString('hex').slice(0, 8);
      const script = compileScript(descriptor, { id, inlineTemplate: true });
      return { contents: script.content, loader: script.lang === 'ts' ? 'ts' : 'js', resolveDir: dirname(args.path) };
    });
  },
};

/**
 * Bundle the Vue/React mount entries (framework runtime inlined) into self-contained
 * IIFEs the fixtures load over file:// — no import maps, no dev server. Written to
 * browser/.build/ (gitignored). Call once before the adapter specs run.
 */
export async function buildEntries() {
  await esbuild.build({
    entryPoints: [
      join(HERE, 'entries', 'vue-combo.js'),
      join(HERE, 'entries', 'react-combo.tsx'),
      join(HERE, 'entries', 'vue-table-pageindex.js'),
      join(HERE, 'entries', 'react-table-pageindex.tsx'),
      join(HERE, 'entries', 'vue-cfl-clear.js'),
      join(HERE, 'entries', 'react-cfl-clear.tsx'),
      join(HERE, 'entries', 'vue-cal-drill.js'),
      join(HERE, 'entries', 'react-cal-drill.tsx'),
      join(HERE, 'entries', 'vue-table-pager-off.js'),
      join(HERE, 'entries', 'vue-table-pagesize.js'),
      join(HERE, 'entries', 'vue-cfl-multi.js'),
      join(HERE, 'entries', 'react-cfl-multi.tsx'),
      join(HERE, 'entries', 'vue-table-label-hidden.js'),
      join(HERE, 'entries', 'react-table-label-hidden.tsx'),
      join(HERE, 'entries', 'vue-app-shell.js'),
    ],
    outdir: join(HERE, '.build'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"production"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    plugins: [vueSfcPlugin],
  });
}
