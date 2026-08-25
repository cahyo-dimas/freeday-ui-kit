import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* Drift guard for the agent-facing docs.
 *
 * COMPONENTS.md is read as an API contract — by people and by coding agents that have no other
 * source of truth for what exists. A class named there that the CSS never defines is worse than a
 * missing entry: it invites markup that silently does nothing. Same for the reference screen, which
 * gets copied wholesale.
 *
 * Scope, deliberately narrow: it verifies fully-written class names (`.fdy-x` in prose,
 * `class="fdy-x"` in HTML). Bare part/modifier shorthand (`__body`, `--ghost`) carries no block
 * context and is not resolvable mechanically, so it is not checked. */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

/* Block classes that are structural hooks only: the kit's own reference markup puts them on the
 * wrapper element, but no CSS rule and no enhancer targets them (their __elements carry the styling).
 * Documenting them keeps our markup identical to the live docs. If one ever gains a rule, drop it
 * from here — the guard should then verify it for real. */
const STRUCTURAL_HOOKS = new Set(['fdy-pagination']);

/** Every class the kit actually defines: CSS selectors + classes the enhancers query or set. */
const knownClasses = () => {
  const found = new Set(STRUCTURAL_HOOKS);
  for (const m of read('dist/freeday.css').matchAll(/\.(fdy-[a-zA-Z0-9_-]+)/g)) found.add(m[1]);
  for (const f of readdirSync(join(root, 'src')).filter(f => f.endsWith('.js'))) {
    for (const m of read(`src/${f}`).matchAll(/(fdy-[a-zA-Z0-9_-]+)/g)) found.add(m[1]);
  }
  return found;
};

/** `-N` is the docs' placeholder for a numbered scale (`--tone-N`); check the first real member. */
const resolvePlaceholder = c => c.replace(/-N$/, '-1');

/** Class names written out in full in a Markdown doc: `.fdy-card__title`. */
const classesInMarkdown = src =>
  [...src.matchAll(/(?<![\w-])\.(fdy-[a-zA-Z0-9_-]+)/g)].map(m => resolvePlaceholder(m[1]));

/** Class names inside class="…" attributes in an HTML doc. */
const classesInHtml = src =>
  [...src.matchAll(/class="([^"]*)"/g)]
    .flatMap(m => m[1].split(/\s+/))
    .filter(c => c.startsWith('fdy-'));

const DOCS = [
  ['COMPONENTS.md', classesInMarkdown],
  ['USAGE.md', classesInMarkdown],
  ['docs/agent-onboarding.md', classesInMarkdown],
  ['reference/README.md', classesInMarkdown],
  ['docs/reference-screen.html', classesInHtml],
];

for (const [file, extract] of DOCS) {
  test(`${file}: every fdy- class it names exists in the kit`, () => {
    const known = knownClasses();
    const used = [...new Set(extract(read(file)))];
    const missing = used.filter(c => !known.has(c));
    assert.deepEqual(missing, [], `not defined by the kit: ${missing.join(', ')}`);
    assert.ok(used.length > 0, 'extraction found no classes at all — the regex or the file changed');
  });
}

test('COMPONENTS.md covers every component stylesheet', () => {
  const doc = read('COMPONENTS.md');
  const files = readdirSync(join(root, 'src/components')).filter(f => f.endsWith('.css'));
  /* One representative class per stylesheet must appear in the reference: the block class named
   * after the file, or a documented alias for the ones whose file name is not a class. */
  const alias = {
    'app-shell': 'fdy-app', selection: 'fdy-check', 'description-list': 'fdy-dl',
    composition: 'fdy-page', breakpoints: 'fdy-hide-below', 'form-grid': 'fdy-form-grid',
    'file-upload': 'fdy-dropzone', datetimepicker: 'fdy-datetimepicker', cfl: 'fdy-cfl__row',
    combo: 'fdy-combo', chart: 'fdy-donut', states: 'fdy-state', table: 'fdy-table',
    button: 'fdy-btn',
  };
  const missing = files
    .map(f => f.replace(/\.css$/, ''))
    .filter(name => !doc.includes(alias[name] ?? `fdy-${name}`));
  assert.deepEqual(missing, [], `component stylesheets absent from COMPONENTS.md: ${missing.join(', ')}`);
});

test('breakpoints: nav mirrors the shell switch in app-shell.css', async () => {
  const { breakpoints } = await import('../tokens/breakpoints.mjs');
  const css = read('src/components/app-shell.css');
  /* The shell hard-wires its own switch; `nav` exists so consumers stop copying the number.
   * If the CSS ever moves, this fails instead of drifting silently. */
  const min = css.match(/@media \(min-width:\s*(\d+)px\)/);
  const max = css.match(/@media \(max-width:\s*(\d+)px\)/);
  assert.ok(min && max, 'app-shell.css should carry both shell media queries');
  assert.equal(breakpoints.nav, Number(min[1]), 'breakpoints.nav must equal the min-width switch');
  assert.equal(Number(max[1]), breakpoints.nav - 1, 'the max-width query must be nav - 1');
});

/* The typed wrappers are English, and now the suite says so.
 *
 * COMPONENTS.md's language caveat draws one line: the vanilla ENHANCERS write Indonesian, the
 * Vue/React/Blazor components are English throughout. That is the sentence an English app adopts the
 * wrappers on — and `FdyCfl` broke it in nine strings, `FdyCascade` in two and `FdyAutocomplete` in
 * one, none of which a reader of the docs could have predicted (#009, from a consuming app that
 * rendered its forms and read them).
 *
 * Matched by WORD, not by a list of components, so a new adapter is covered the day it lands.
 * Blazor is included even though it was the stack that had it right — the guard is about the
 * promise, not about who broke it.
 */
/* The ENHANCERS need this guard for a reason that OUTLIVED the language question.
 *
 * Until 2.0.0 the enhancers defaulted to Indonesian, and this guard existed because both promises —
 * an Indonesian raw path and an English Blazor one, which reaches these same enhancers through
 * `FreedayBlazor.initAll` — could only hold if every string was overridable. The default is English
 * now and that tension is gone, but the invariant is not: a string written straight into the DOM is
 * unreachable from outside whatever language it is in, and the next app to need Indonesian back
 * (`data-fdy-text-*`) can only have it where this holds.
 *
 * So the invariant is placement: a user-facing string lives in that file's `TEXT` table, which
 * `textOf()` reads through, and nowhere else. A literal written straight into a `textContent` or an
 * `aria-label` further down is unreachable from outside and fails here.
 *
 * This is #013 §2 and #015's "still open", and it is scoped by SINK rather than by a word list —
 * #015's lesson was that a word list cannot see `pencarian` behind `\bcari\b`, and a second list
 * would have the same hole one affix over. */
test('an enhancer string is overridable, not hard-coded (#016)', () => {
  const SINK = /(\.textContent\s*=|setAttribute\('(aria-label|title|placeholder)'|\.placeholder\s*=)/;
  const offenders = [];

  for (const file of readdirSync(join(root, 'src')).filter(f => /^freeday-.*\.js$/.test(f))) {
    const src = read(`src/${file}`);
    /* The table's own span, so its entries are not read as hard-coded strings. */
    const open = src.indexOf('var TEXT = {');
    const close = open === -1 ? -1 : src.indexOf('};', open);

    src.split('\n').forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      if (!SINK.test(line)) return;
      const at = src.split('\n').slice(0, i).join('\n').length;
      if (open !== -1 && at > open && at < close) return;
      /* A `textOf(root, 'key')` call is the overridable path, so its KEY is not a hard-coded
       * string. Erased from the line rather than skipping the line, so a literal concatenated
       * beside a legitimate lookup is still caught. */
      const scan = line.replace(/textOf\([^)]*\)/g, '');
      for (const m of scan.matchAll(/'([^']{2,80})'/g)) {
        const text = m[1];
        /* A literal is PROSE when it carries two or more consecutive letters and no code
         * punctuation. That drops `aria-label` and `fdy-x` (markup), ` · ` (a separator glyph),
         * and the code fragment a line with three quotes hands the matcher between strings two
         * and three — none of which a translator would ever be given. */
        if (!/[A-Za-z]{2,}/.test(text)) continue;
        if (/[;=()]/.test(text)) continue;
        if (/^[a-z-]+$/.test(text) || text.startsWith('&') || text.startsWith('fdy-')) continue;
        offenders.push(`src/${file}:${i + 1}  ${text.trim()}`);
      }
    });
  }

  assert.deepEqual(offenders, [],
    'these go straight into the DOM and no consumer can change them — move them into TEXT and read with textOf():\n' + offenders.join('\n'));
});

test('every path speaks English (#009, and #006 from 2.0.0)', () => {
  /* Unambiguous Indonesian only. No `data` (English too), no `di`/`ke` (substrings of everything) —
     a guard that cries wolf gets an exemption list, and an exemption list is how this came back. */
  /* Roots, not whole words. The first version of this guard listed `cari` with a \b on each
     side and sailed straight past `Buka pencarian` — the CFL trigger's aria-label, and the one
     string a screen-reader user meets FIRST on every picker in the app. Indonesian derives by
     affix (peN-, -an, meN-, di-), so a word-boundary list will always miss the derived forms. */
  const INDONESIAN = /\b(pilih|memilih|pilihan|tutup|batal|simpan|hapus|cari|pencarian|mencari|buka|membuka|memuat|muat|hasil|klik|baris|semua|dipilih|kolom|tidak|sebelumnya|berikutnya|menampilkan|tanggal|bulan|tahun|halaman|kembali|tambah|ubah)\b/i;
  const offenders = [];
  const scan = (dir, filePattern, skipComments) => {
    for (const file of readdirSync(join(root, dir))) {
      if (!filePattern.test(file)) continue;
      const src = read(`${dir}/${file}`);
      src.split('\n').forEach((line, i) => {
        /* The enhancers carry long prose comments, including ones that QUOTE the Indonesian a
           migrating app puts back through data-fdy-text-*. Explaining the hatch must not read as
           using it. */
        if (skipComments && /^\s*(\*|\/\/|\/\*)/.test(line)) return;
        // String literals and template text only — a URL or an identifier is not a user-visible string.
        for (const m of line.matchAll(/'([^']{2,60})'|"([^"]{2,60})"|>([^<>{}]{2,60})</g)) {
          const text = m[1] ?? m[2] ?? m[3];
          if (INDONESIAN.test(text)) offenders.push(`${dir}/${file}:${i + 1}  ${text.trim()}`);
        }
      });
    }
  };

  for (const dir of ['adapters/vue/components', 'adapters/react/components', 'adapters/blazor']) {
    scan(dir, /\.(vue|tsx|razor|cs)$/, false);
  }
  /* The enhancers joined this promise in 2.0.0. Before that they were deliberately Indonesian, and
     an app mixing the two paths — which a Blazor app does by construction, since
     FreedayBlazor.initAll runs every enhancer — read as two products. */
  scan('src', /^freeday-.*\.js$/, true);

  assert.deepEqual(offenders, [],
    'COMPONENTS.md promises English on every path, enhancers included:\n' + offenders.join('\n'));
});

test('the column contract reaches all three typed adapters (#026)', () => {
  /* `FdyTableColumn` in adapters/core/table-model.d.ts is the contract. Vue and React consume that
     file directly, so TypeScript keeps them honest; Blazor RE-DECLARES it in C#, which is a hand
     copy and therefore the one surface that can silently fall behind — #026 shipped `labelHidden`
     to Vue and React and left Blazor without it. One-directional on purpose: Blazor may hold MORE
     (Cell has no TS twin, it is a slot there), so this asserts coverage, never equality — which is
     also why it needs no exemption list. */
  const contract = read('adapters/core/table-model.d.ts')
    .match(/export interface FdyTableColumn<T>\s*\{([\s\S]*?)\n\}/)[1]
    .matchAll(/^\s{2}([a-zA-Z]+)\??:/gm);
  const props = [...contract].map(m => m[1]);
  assert.ok(props.length >= 10, `parsed only ${props.length} contract props — the interface moved`);

  const blazor = read('adapters/blazor/TableTypes.cs');
  const surface = blazor.match(/class FdyTableColumn<TRow>\s*\{([\s\S]*?)\n\}/)[1];
  const missing = props
    .map(p => p[0].toUpperCase() + p.slice(1))
    .filter(P => !new RegExp(`\\b${P}\\b\\s*\\{\\s*get;`).test(surface));

  assert.deepEqual(missing, [],
    'declared in the TS contract, absent from Blazor\'s FdyTableColumn — a Blazor app cannot ask for it:\n' +
    missing.join('\n'));
});

test('a hidden column label is rendered, not dropped (#026)', () => {
  /* The type surface above can be satisfied by a property nothing reads. Each of the three tables
     renders its own header, so each has to spend the flag on `.fdy-visually-hidden`: the cell looks
     empty and the column is still announced. Both header branches matter — a sortable column puts
     its label inside the sort button, a plain one does not — so this counts TWO uses per adapter. */
  const TABLES = [
    ['adapters/vue/components/FdyTable.vue', 'labelHidden'],
    ['adapters/react/components/FdyTable.tsx', 'labelHidden'],
    ['adapters/blazor/FdyTable.razor', 'LabelHidden'],
  ];
  const offenders = [];
  for (const [file, flag] of TABLES) {
    const header = read(file).match(/<thead>[\s\S]*?<\/thead>/);
    if (!header) { offenders.push(`${file}: no <thead> found — the header markup moved`); continue; }
    const uses = [...header[0].matchAll(new RegExp(`${flag}[^\\n]*fdy-visually-hidden`, 'g'))].length;
    if (uses < 2) offenders.push(`${file}: ${flag} reaches .fdy-visually-hidden ${uses}x in <thead>, expected both branches`);
  }
  assert.deepEqual(offenders, [],
    'a column label that is hidden must still be in the DOM for assistive tech:\n' + offenders.join('\n'));
});

/* The shipped vocabulary, pinned whole.
 *
 * The word-list guard above is the right instrument for "did a translation slip back in", and it is
 * also the wrong one on its own: it missed `Lanjut` and `Selesai` in the stepper and `Mengunggah…`
 * in upload during the 2.0.0 flip, because a list only knows the words someone thought to add. Its
 * own comment already says as much about `pencarian` hiding behind `\bcari\b`.
 *
 * So the complete set is asserted instead. This is a snapshot, deliberately: every string a reader
 * of the raw path can see is here, and changing one has to be a decision somebody made on purpose
 * and can see in a diff — which is the whole cost of getting a default language wrong twice.
 */
test('the enhancers ship exactly these strings (#006)', () => {
  const tables = {};
  for (const file of readdirSync(join(root, 'src')).filter(f => /^freeday-.*\.js$/.test(f))) {
    const src = read(`src/${file}`);
    const open = src.indexOf('var TEXT = {');
    if (open === -1) continue;
    const body = src.slice(open, src.indexOf('};', open));
    const entries = {};
    for (const m of body.matchAll(/(\w+):\s*'([^']*)'/g)) entries[m[1]] = m[2];
    if (Object.keys(entries).length > 0) tables[file] = entries;
  }

  assert.deepEqual(tables, {
    'freeday-carousel.js': {
      position: '{n} of {total}',
      slide: 'Slide {n}',
    },
    'freeday-cascade.js': {
      back: 'Back one level',
      submenu: '{label}, submenu',
    },
    'freeday-cfl.js': {
      selected: '{n} selected',
    },
    'freeday-form.js': {
      invalid: 'Invalid.',
      max: 'Too large.',
      maxlength: 'Too long.',
      min: 'Too small.',
      minlength: 'Too short.',
      mismatch: 'Values don’t match.',
      pattern: 'Doesn’t match the required format.',
      required: 'Required.',
      step: 'Not a valid step.',
      type: 'Invalid format.',
    },
    'freeday-mask.js': {
      hide: 'Hide password',
      show: 'Show password',
    },
    'freeday-stepper.js': {
      done: 'Done',
      next: 'Next',
    },
    'freeday-table.js': {
      close: 'Close',
      filter: 'Filter column',
      filterEnum: 'Show values',
      filterRange: 'Value range',
      filterText: 'Contains text',
      filterTextPlaceholder: 'Contains…',
      info: 'Showing {from}–{to} of {total}',
      next: 'Next',
      prev: 'Previous',
      reset: 'Reset',
      rows: '{n} rows',
      selected: '{n} selected',
    },
    'freeday-toast.js': {
      close: 'Close',
    },
    'freeday-upload.js': {
      badType: 'Unsupported file type.',
      done: 'Uploaded',
      progress: 'Upload progress for {name}',
      remove: 'Remove {name}',
      tooBig: 'Over the {max} limit.',
      uploading: 'Uploading…',
      waiting: 'Waiting for the server…',
    },
  }, 'a user-facing string changed — if that was deliberate, update this table in the same commit');
});

/* Every public version stamp, checked against package.json.
 *
 * NEXT-UP's release runbook already says the right thing — don't work from a memorised list of
 * files, `git grep` the old version — and it was still missed three times running: docs/index.html
 * shipped `v1.51.0` in its eyebrow and footer through 1.52.0, 1.52.1 and 1.53.0, and
 * getting-started.md told people to install `^1.34.0` for eighteen releases. A runbook step is a
 * thing a person has to remember; this is the same grep, run by the suite.
 *
 * Only PREFIXED forms count — `v1.2.3` and `^1.2.3`. A bare `1.4.11` is WCAG's success criterion,
 * which the runbook warns about by name and which no release should ever touch.
 */
test('the public version stamps match package.json', () => {
  const version = JSON.parse(read('package.json')).version;
  const stale = [];
  for (const file of ['README.md', 'README.id.md', 'docs/index.html', 'docs/getting-started.md']) {
    read(file).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/[v^](\d+\.\d+\.\d+)/g)) {
        if (m[1] !== version) stale.push(`${file}:${i + 1}  ${m[0]} (package.json says ${version})`);
      }
    });
  }
  assert.deepEqual(stale, [],
    'these are what a reader sees on the live docs and in an install command:\n' + stale.join('\n'));
});
