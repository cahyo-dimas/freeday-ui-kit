# Freeday v1.1 "Precision" Visual Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift Freeday's visual POV to "Precision" (crisp geometry, rationed elevation, stronger type hierarchy, teal as functional accent) — token-first, visually-only, non-breaking — and ship it as `v1.1.0`.

**Architecture:** Freeday is token-driven; the build (`tokens/build.mjs`) is fully value-driven (a generic `flatten` walk), so editing `tokens/tokens.json` cascades to all 44 components with no build change. ~80% of the polish is token deltas (radius/elevation/type/motion); the rest is targeted component-CSS work (teal accent placement, state consistency) touching a known short list of files. The WCAG contrast regression test (`test/contrast.test.mjs`) is the hard gate for any color-touching change.

**Tech Stack:** Pure CSS + W3C DTCG `tokens.json`; Node build (`node tokens/build.mjs`); `node --test` for the contrast regression suite. No bundler, no runtime framework, no new dependencies.

**Note on granularity (design polish, not logic):** Token tasks below carry exact JSON diffs. Component-CSS tasks specify the exact token-based pattern, the exact file list, and per-file acceptance criteria; the implementer reads each target file and applies the pattern (existing CSS is not reproduced here). Visual verification is by loading `docs/index.html` in light + dark, since there is no committed screenshot harness. The automated per-task gate is: `node tokens/build.mjs` succeeds + `npm test` green + `dist/` rebuild is deterministic.

## Global Constraints

*(Every task implicitly includes these — copied verbatim from the spec §6/§3.6.)*

- Component CSS touches **Tier-2/3 tokens only** — zero raw hex/px values.
- **WCAG AA** maintained in light + dark. `test/contrast.test.mjs` **must stay green** — it is the gate for any color-touching change.
- `prefers-reduced-motion` honored — no new always-on motion.
- **No API/class/token renames:** `fdy-` prefix, `--color-*`/`--space-*`/`--radius-*`/etc., JS `window.Freeday*` all stable. Visually-only ⇒ non-breaking for consumers.
- `dist/` stays committed & deterministic (rebuild = no diff).
- **Identity + a11y shields unchanged:** all color ramps (azure/slate/teal/red/amber/green/blue) and every `color.*` semantic mapping; `control-border` = slate-500; `focus-ring` = azure-600/400; `focus-ring-width` = 2px; `space.*` 4px scale; `control.h`; `bw`.
- Release target: **`v1.1.0`**.

---

### Task 0: Baseline & safety net

**Files:**
- Read only: `tokens/tokens.json`, `test/contrast.test.mjs`
- Capture: baseline screenshots → scratchpad (not committed)

- [ ] **Step 1: Confirm a green starting point**

Run: `node tokens/build.mjs && npm test`
Expected: build writes `dist/*`; tests print `# pass 9`, `# fail 0`.

- [ ] **Step 2: Confirm build determinism**

Run: `node tokens/build.mjs && git diff --stat dist/`
Expected: empty output (rebuild of an already-built tree yields no diff).

- [ ] **Step 3: Capture "before" reference**

Open `docs/index.html` in a browser (or headless browser if available). Capture the key surfaces in **both** light and dark (toggle top-right): buttons, inputs/combo, card, table, tabs, modal, menu/dropdown, toast, app-shell nav. Save to the scratchpad as `before-<surface>-<theme>.png`. These are the before/after reference; they are not committed.

- [ ] **Step 4: No commit** — Task 0 changes nothing in the repo.

---

### Task 1: Token engine — radius, motion, tracking (zero color risk)

**Files:**
- Modify: `tokens/tokens.json` (`radius`, `dur`, `tracking`)

**Interfaces:**
- Produces: crisper `--radius-*`, snappier `--dur-base`/`--dur-slow`, new `--tracking-tighter` — consumed by all components (automatically) and Task 3 (typography).

- [ ] **Step 1: Tighten the radius ramp**

In `tokens/tokens.json`, replace the `radius` object:
```json
"radius": { "xs": { "$value": "3px" }, "sm": { "$value": "4px" }, "md": { "$value": "6px" }, "lg": { "$value": "10px" }, "xl": { "$value": "14px" }, "full": { "$value": "999px" } },
```
(was `4/6/8/12/16/999`.)

- [ ] **Step 2: Snappier motion**

Replace the `dur` object:
```json
"dur": { "fast": { "$value": "120ms" }, "base": { "$value": "180ms" }, "slow": { "$value": "280ms" } },
```
(was `120/200/320`; `fast` unchanged.)

- [ ] **Step 3: Add the tighter tracking primitive**

Replace the `tracking` object (add `tighter`):
```json
"tracking": { "tighter": { "$value": "-0.03em" }, "tight": { "$value": "-0.02em" }, "normal": { "$value": "0" }, "wide": { "$value": "0.06em" } },
```

- [ ] **Step 4: Rebuild**

Run: `node tokens/build.mjs`
Expected: writes `dist/freeday.tokens.css`, `dist/freeday.css`, `dist/freeday.bundle.css`, `dist/*.js`. Confirm `--radius-md: 6px;` and `--tracking-tighter: -0.03em;` appear in `dist/freeday.tokens.css`.

- [ ] **Step 5: Test (must stay green — no color changed)**

Run: `npm test`
Expected: `# pass 9`, `# fail 0`. (Radius/motion/tracking are not in the contrast graph.)

- [ ] **Step 6: Visual check** — reload `docs/index.html`; corners are crisper, transitions snappier. Nothing broken in light or dark.

- [ ] **Step 7: Commit**

```bash
git add tokens/tokens.json dist/
git commit -m "feat(tokens): Precision radius + snappier motion + tighter tracking"
```

---

### Task 2: Token engine — rationed elevation (overlays)

**Files:**
- Modify: `tokens/tokens.json` (`shadow.3`, `shadow.4`)

**Interfaces:**
- Produces: crisper, more-present overlay shadows `--shadow-3` (menu/dropdown/popover) and `--shadow-4` (modal). Resting shadows (`--shadow-1`/`-2`/`-lift*`) unchanged.

- [ ] **Step 1: Crisp the overlay shadows**

In `tokens/tokens.json`, replace the `shadow.3` and `shadow.4` entries (keep `1`, `2`, `lift`, `lift-hover` as-is):
```json
"3": { "$value": "0 4px 16px -2px rgba(16,14,30,.14),0 1px 3px rgba(16,14,30,.10)", "$dark": "0 6px 20px -2px rgba(0,0,0,.6),0 1px 3px rgba(0,0,0,.5)" },
"4": { "$value": "0 24px 48px -12px rgba(16,14,30,.26),0 2px 8px rgba(16,14,30,.10)", "$dark": "0 28px 56px -12px rgba(0,0,0,.72),0 2px 8px rgba(0,0,0,.5)" },
```

- [ ] **Step 2: Rebuild** — Run: `node tokens/build.mjs`. Confirm the new `--shadow-3`/`--shadow-4` values in `dist/freeday.tokens.css`.

- [ ] **Step 3: Test** — Run: `npm test`. Expected: `# pass 9`, `# fail 0` (shadows are not color-graph pairings).

- [ ] **Step 4: Visual check** — reload `docs/index.html`; open a dropdown/menu, the modal, and a toast in light + dark. Overlays read as clearly floating with a defined edge; resting cards unchanged.

- [ ] **Step 5: Commit**

```bash
git add tokens/tokens.json dist/
git commit -m "feat(tokens): Precision rationed elevation — crisper overlay shadows"
```

---

### Task 3: Typography hierarchy (weight + tracking, not size)

**Files:**
- Modify: `src/base.css` (heading rules) — read it first to locate current heading/display declarations.

**Interfaces:**
- Consumes: `--font-display`, `--weight-bold` (700), `--tracking-tighter` (Task 1), `--leading-snug`.
- Produces: headings render as Sora / 700 / tighter tracking / snug leading; body unchanged.

- [ ] **Step 1: Read the current heading styles**

Run: `grep -nE 'h1|h2|h3|h4|font-display|--font-display|letter-spacing|font-weight' src/base.css`
Note the existing heading selectors and which token vars they use.

- [ ] **Step 2: Apply the Precision heading treatment**

In `src/base.css`, set headings (the existing `h1,h2,h3,h4` / display classes) to:
```css
font-family: var(--font-display);
font-weight: var(--weight-bold);      /* 700 */
letter-spacing: var(--tracking-tighter);
line-height: var(--leading-snug);
```
Do **not** change any `font-size` (size ramp stays). Body/`p`/label rules untouched. Use only token vars — no raw values.

- [ ] **Step 3: Rebuild** — Run: `node tokens/build.mjs`. Confirm the heading block appears in `dist/freeday.css`.

- [ ] **Step 4: Test** — Run: `npm test`. Expected: `# pass 9`, `# fail 0` (no color changed).

- [ ] **Step 5: Visual check** — reload `docs/index.html`; headings read heavier and tighter, clear hierarchy over body; body text unchanged; light + dark both fine.

- [ ] **Step 6: Commit**

```bash
git add src/base.css dist/
git commit -m "feat(type): Precision heading hierarchy — Sora 700 + tighter tracking"
```

---

### Task 4: Teal as functional accent + contrast guards

**Files:**
- Modify (read each first): `src/components/app-shell.css` (active nav item), `src/components/tabs.css` (active tab indicator), `src/components/table.css` (selected row), `src/components/combo.css`, `src/components/cascade.css`, `src/components/autocomplete.css` (selected/active option)
- Modify: `test/contrast.test.mjs` (add teal pairings)

**Interfaces:**
- Consumes: `--color-accent` (teal-600 light / teal-400 dark), `--color-accent-hover` (teal-700 / teal-300).
- Produces: teal marks active/selected state consistently; new contrast assertions guard it.

- [ ] **Step 1: Add teal contrast assertions FIRST (guard before use)**

In `test/contrast.test.mjs`, after the existing `add(...)` block (around line 57), append:
```js
for (const s of SURF) add('--color-accent', s, AA_UI, `teal accent indicator on ${s}`);
```
Rationale: teal is used as a **non-text indicator** (left-border / underline / check / selected-row rail), so 3:1 (`AA_UI`) is the correct threshold. teal-600 on white ≈ 3.75:1 → passes. **Do not use `--color-accent` as body text** (fails 4.5:1); if a teal text treatment is ever wanted, use `--color-accent-hover` (teal-700 ≈ 5.48:1) and add an `AA_TEXT` assertion for it.

- [ ] **Step 2: Run the test to confirm the new guard passes**

Run: `npm test`
Expected: still `# pass 9`, `# fail 0` (assertions grew; teal-on-surface pairings meet 3:1 in light and dark).

- [ ] **Step 3: Place teal accent per component**

For each file, read it, find the active/selected state, and express the indicator with `--color-accent` (token only, no raw hex):
- `app-shell.css` — active nav item: left rail / text-accent via `--color-accent` (indicator), keep label text at `--color-text` for AA.
- `tabs.css` — active tab underline/indicator → `--color-accent`.
- `table.css` — selected row: left accent rail or subtle accent, using `--color-accent`.
- `combo.css`, `cascade.css`, `autocomplete.css` — active/selected option marker (check / rail) → `--color-accent`.
Keep all **text** foregrounds on their existing AA-passing tokens; teal is decoration/indicator only.

- [ ] **Step 4: Rebuild** — Run: `node tokens/build.mjs`.

- [ ] **Step 5: Test** — Run: `npm test`. Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 6: Visual check** — reload `docs/index.html`; the active nav item, active tab, selected table row, and selected combo/cascade/autocomplete option all show a consistent teal marker in light + dark. Teal never appears as low-contrast text.

- [ ] **Step 7: Commit**

```bash
git add src/components/ test/contrast.test.mjs dist/
git commit -m "feat(components): teal functional accent for active/selected state + contrast guard"
```

---

### Task 5: Cross-component state consistency

**Files:**
- Modify (read each first): `src/components/button.css`, `input.css`, `combo.css`, `cascade.css`, `chip.css`, `menu.css`, `tabs.css`, `pagination.css`, `selection.css`, `table.css`

**Interfaces:**
- Consumes: `--color-surface-2`, `--color-border-strong`, `--color-text`, `--color-primary-soft`, `--focus-ring`.
- Produces: a uniform hover / active / disabled / focus-visible treatment across interactive components.

- [ ] **Step 1: Apply the shared state pattern per file**

For each interactive component, express the four states with tokens only (no raw hex/px):
- **hover:** background → `--color-surface-2` (or border → `--color-border-strong`); text darkens toward `--color-text`.
- **active/pressed:** decisive — e.g. background `--color-primary-soft`, or a 1px inset, no soft float.
- **disabled** (`[disabled]` / `[aria-disabled="true"]`): `opacity: .5; cursor: not-allowed;`.
- **focus-visible:** `outline: var(--focus-ring-width) solid var(--focus-ring); outline-offset: 2px;` — consistent everywhere (keep existing where already correct).
Preserve each component's existing structure; only normalize the state rules.

- [ ] **Step 2: Rebuild** — Run: `node tokens/build.mjs`.

- [ ] **Step 3: Test** — Run: `npm test`. Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 4: Visual + keyboard check** — reload `docs/index.html`; tab through buttons, inputs, combo, chips, menu, tabs, pagination, table rows in light + dark. Hover/active/disabled/focus read consistently; focus ring visible on every control.

- [ ] **Step 5: Commit**

```bash
git add src/components/ dist/
git commit -m "feat(components): unified hover/active/disabled/focus states (Precision)"
```

---

### Task 6: Audit, changelog & release v1.1.0

**Files:**
- Modify: `CHANGELOG.md`, `package.json` (version — via `npm version`)

- [ ] **Step 1: Impeccable audit pass**

Review `docs/index.html` (light + dark) against the impeccable "absolute bans" (no side-stripe borders, gradient text, decorative glassmorphism, hero-metric template, identical card grids) and the AI-slop test. Fix any regression introduced by Tasks 1–5 using tokens only; rebuild + `npm test` after any fix.

- [ ] **Step 2: Final before/after review**

Recapture the Task 0 surfaces (light + dark) and compare to the `before-*` baseline. Confirm the Precision intent landed and nothing regressed.

- [ ] **Step 3: Write the CHANGELOG entry**

Prepend a `## [1.1.0] — <today>` section to `CHANGELOG.md` summarizing: crisper radius, rationed elevation, Precision type hierarchy, teal functional accent, unified interaction states — all non-breaking, AA-gated.

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): v1.1.0 — Precision visual polish"
```

- [ ] **Step 4: Confirm a clean tree, then bump+tag**

Run: `git status --porcelain` → must be empty (npm version requires a clean tree).
Run: `npm version minor -m "release: v%s — Precision visual polish"`
Expected: the `version` lifecycle script rebuilds `dist/` and `git add dist`; npm creates the version commit (`package.json` 1.0.0→1.1.0 + dist) and tags `v1.1.0`.

- [ ] **Step 5: Final verification**

Run: `npm test`
Expected: `# pass 9`, `# fail 0`. Then `git tag -l | grep v1.1.0` shows the tag. Do **not** push — leave that to the user.

---

## Self-Review

**Spec coverage:**
- §3.1 radius → Task 1 ✓ · §3.2 elevation → Task 2 ✓ · §3.3 typography → Task 3 ✓ · §3.5 motion → Task 1 ✓ · §3.6 unchanged identity/a11y → Global Constraints + no task alters them ✓
- §4 teal functional accent → Task 4 ✓ · §5 cross-component states → Task 5 ✓ · §6 guardrails → Global Constraints + per-task test gates ✓ · §7 verification/delivery → Task 0 baseline + per-task gates + Task 6 release ✓ · §8 out-of-scope → no task adds components/rebrand/renames ✓
- §3.4 borders/surfaces (usage discipline) → folded into Task 4/5 component reads (consistent visible border + value-step depth); no token value change, consistent with spec.

**Placeholder scan:** Token tasks carry exact JSON. Component tasks carry an exact token-based pattern + exact file list + acceptance criteria (existing CSS intentionally not reproduced — implementer reads each file). No "TBD/TODO/handle edge cases". Visual verification is a concrete action (load docs light+dark) given no committed screenshot harness.

**Type/name consistency:** Token names used downstream (`--radius-md`, `--tracking-tighter`, `--shadow-3/4`, `--color-accent`, `--color-accent-hover`, `--color-primary-soft`, `--focus-ring`) all exist in `tokens.json` or are created in Task 1. Contrast-test symbols (`SURF`, `AA_UI`, `add`) match `test/contrast.test.mjs`.
