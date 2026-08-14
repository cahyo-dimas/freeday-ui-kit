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
  const proc = spawn(
    chrome,
    [
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

    const clickCenter = async (selector) => {
      const c = await centerOf(selector);
      if (c === null) throw new Error('cannot click missing element: ' + selector);
      await clickAt(c.x, c.y);
    };

    /* A real key, not a synthetic KeyboardEvent — only a trusted one moves focus, which is the whole
       point when the claim under test is about tab order. */
    const pressKey = async (key, { shift = false } = {}) => {
      const params = { key, code: key, windowsVirtualKeyCode: key === 'Tab' ? 9 : 0, modifiers: shift ? 8 : 0 };
      await cmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params });
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
      await sleep(40);
    };

    return await fn({ evalJS, waitFor, clickCenter, pressKey });
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
