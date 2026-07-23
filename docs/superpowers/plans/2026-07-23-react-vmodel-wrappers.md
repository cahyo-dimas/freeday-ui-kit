# React v-model (Controlled) Wrappers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React adapter (`freeday/react`) to parity with the Vue adapter by shipping typed, controlled React components — `FdyCombo`, `FdyDatepicker`, `FdyCfl`, `FdyChart` — over the kit's existing CSS classes, so React apps stop falling back to native `<select>` / `<input type="date">`.

**Architecture:** Mirror the Vue wrappers 1:1. They do **not** wrap the vanilla enhancers (that would fight React's DOM); they **re-implement** the WAI-ARIA APG interaction natively over the kit's `.fdy-*` CSS classes. The controlled pattern is React-idiomatic: `value` prop + `onChange(value)` callback (replacing Vue's `v-model` = `modelValue` + `update:modelValue`). A shared `usePopover` hook lifts dropdowns into the top layer via the native Popover API (escaping card/scroll clipping), ported straight from `adapters/vue/usePopover.ts`. Components ship as **`.tsx` source** (symmetry with Vue's source-shipped `.vue`), consumed via the existing `freeday/react` export and transpiled by the consumer's bundler.

**Tech Stack:** React ≥18 (optional peer), TypeScript (strict), the kit's `dist/freeday.css` + `dist/freeday.js` (for `window.FreedayChart`). No new runtime dependencies. Verification via `tsc --noEmit` + `vite build` of `examples/react-faktur` + headless render — the repo's existing strategy (no jsdom/RTL unit-test toolchain is introduced).

## Global Constraints

- **Zero new runtime dependencies.** React and Vue are optional peers (`package.json` `peerDependenciesMeta`). Nothing new in `dependencies`.
- **React floor:** `>=18` (already the `react` peer). Use React 18 built-ins: `useId`, `useRef`, `useState`, `useEffect`, `useMemo`, `useCallback`.
- **TypeScript strict, explicit types.** Every function has an explicit return type; no `any`; no untyped collections. Match the style of `adapters/vue/components/*.vue`.
- **Kit CSS classes only.** Components touch Tier-2/3 `.fdy-*` classes exclusively — **no raw hex or px** in the components (kit's hard rule). Reuse the exact class names the Vue components use.
- **Controlled, no internal model state.** The value lives with the caller: `value` in, `onChange(value)` out. Components never own the model value.
- **A11y parity with Vue.** Same roles / `aria-*` / keyboard contract as the Vue component being ported (WAI-ARIA APG). This is a hard acceptance criterion per task.
- **Source-shipped `.tsx`.** Consumed via `freeday/react`; document `transpilePackages: ['freeday']` for Next.js consumers (Vite transpiles node_modules `.tsx` when the package is a source dep).
- **`dist/` committed & deterministic.** Adapters are NOT built into `dist/` (they ship as source, per `package.json` `files`); the token build (`node tokens/build.mjs`) still must produce a no-diff `dist/`.
- **On version bump, sync ALL public version refs** — the install command + version label in `docs/index.html` (hero eyebrow, `#install-cmd`, footer), `README.md`, `docs/getting-started.md`, `HANDOFF.md`, `CHANGELOG.md` — as part of the release, and re-push so the live Pages site updates. (See memory: sync-docs-on-version-bump.)
- **Public repo.** No client/company names, no internal emails in code, comments, commits, or docs.
- **Behavior spec = the Vue source.** For each component, `adapters/vue/components/FdyX.vue` is the canonical, in-repo behavior spec to port line-for-line. Keep prop names, ARIA wiring, keyboard maps, and edge cases identical; only translate the framework idioms.

---

## File Structure

**Create:**
- `adapters/react/usePopover.ts` — top-layer dropdown positioning hook (port of `adapters/vue/usePopover.ts`).
- `adapters/react/components/FdyChart.tsx` — reactive chart wrapper over `window.FreedayChart`.
- `adapters/react/components/FdyCombo.tsx` — APG select-only combobox (canonical reference component).
- `adapters/react/components/FdyDatepicker.tsx` — single-date calendar.
- `adapters/react/components/FdyCfl.tsx` — controlled async choose-from-list (`<dialog>`).
- `adapters/react/tsconfig.json` — typecheck-only config (`noEmit`, `jsx: react-jsx`, `strict`) so each component has a per-task red/green gate.

**Modify:**
- `adapters/react/index.js` — re-export the four components + `usePopover` alongside `useFreeday`.
- `adapters/react/index.d.ts` — add component prop interfaces + re-export declarations.
- `package.json` — add a `typecheck:react` script; `./react` export already resolves correctly (verify, no change expected).
- `examples/react-faktur/src/*` — swap native controls for the wrappers (integration proof).
- `docs/index.html` — React integration card copy (React now ships typed controlled components); version refs at release.
- `docs/integrations.md`, `docs/getting-started.md` — React wrapper usage.
- `CHANGELOG.md`, `HANDOFF.md` — release notes + status.

**Test/verify (no new test files — repo strategy):**
- Per task: `npx tsc -p adapters/react/tsconfig.json --noEmit` (types) — the red/green gate.
- Integration: `examples/react-faktur` `vite build` + headless screenshot.
- Gate: `npm test` (kit's `node --test`, must stay 9/9).

---

## API mapping (Vue → React), applied uniformly

| Vue | React |
|---|---|
| `defineProps<{ modelValue: T; ... }>()` | `props: { value: T; ...; onChange: (value: T) => void }` |
| `emit('update:modelValue', v)` + `emit('change', v)` | `props.onChange(v)` (single callback) |
| `useId()` | React `useId()` |
| `ref<X>(null)` (template ref) | `useRef<X>(null)` |
| `ref(false)` (reactive state) | `useState<boolean>(false)` |
| `computed(() => …)` | plain derived const, or `useMemo` if expensive |
| `watch(open, …, {flush:'post'})` | `useEffect(() => {…}, [open])` |
| `onMounted` / `onBeforeUnmount` | `useEffect(() => { …; return () => {…} }, [])` |
| `usePopover(panel, trigger, open)` (composable) | `usePopover(panelRef, triggerRef, open)` (hook, same signature) |
| `:class="{ 'x': cond }"` | `className={cond ? 'base x' : 'base'}` |
| `@keydown`, `@click` | `onKeyDown`, `onClick` |
| `popover="manual"` attr | `popover="manual"` (React 19 types it; for React 18 add to the element via `{...{ popover: 'manual' }}` or the `usePopover` sets it imperatively — see Task 2) |

Props kept identical to Vue (names, optionality): `id?`, `ariaLabelledby?`, `placeholder?`, `disabled?`, `invalid?`, `describedby?`.

---

### Task 1: Typecheck harness for the React adapter

**Files:**
- Create: `adapters/react/tsconfig.json`
- Modify: `package.json` (add `typecheck:react` script)

**Interfaces:**
- Produces: the command `npx tsc -p adapters/react/tsconfig.json --noEmit` that every later task uses as its test gate.

- [ ] **Step 1: Write the typecheck config**

Create `adapters/react/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["react"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 2: Add the script**

In `package.json` `"scripts"`, add:

```json
"typecheck:react": "tsc -p adapters/react/tsconfig.json --noEmit"
```

- [ ] **Step 3: Install typecheck-only devDeps locally (not committed to deps)**

Run: `npm i -D typescript @types/react` (dev-only; `package.json` keeps zero runtime deps — these live under `devDependencies`).
Expected: `typescript` + `@types/react` appear under `devDependencies`.

- [ ] **Step 4: Run the gate on the existing adapter**

Run: `npm run typecheck:react`
Expected: PASS (only `useFreeday.js` exists; `allowJs` is off so it's skipped — 0 errors).

- [ ] **Step 5: Commit**

```bash
git add adapters/react/tsconfig.json package.json package-lock.json
git commit -m "chore(react): add typecheck-only tsconfig for adapter components"
```

---

### Task 2: `usePopover` React hook

**Files:**
- Create: `adapters/react/usePopover.ts`
- Test: `npm run typecheck:react`

**Interfaces:**
- Produces: `export function usePopover(panelRef: RefObject<HTMLElement | null>, triggerRef: RefObject<HTMLElement | null>, open: boolean): void` — anchors `panelRef` to `triggerRef` in the top layer while `open` is true. Panel element must carry `popover="manual"`.

- [ ] **Step 1: Write the hook (full code)**

Create `adapters/react/usePopover.ts` — a direct port of `adapters/vue/usePopover.ts`, swapping Vue's `watch` for `useEffect([open])`:

```ts
import { useEffect, type RefObject } from 'react';

// React port of adapters/vue/usePopover.ts. Lifts a dropdown panel into the top layer via the
// native Popover API so it escapes any ancestor overflow clip (a .fdy-card, a scroll container),
// then positions it `fixed` against its trigger (flip above when there's no room below; match the
// trigger width). Degrades to the panel's own [hidden]/absolute CSS where Popover is unavailable.

interface PopoverElement extends HTMLElement {
  showPopover(): void;
  hidePopover(): void;
}

const GAP = 4; // ~ --space-1
const supported: boolean =
  typeof HTMLElement !== 'undefined'
  && typeof (HTMLElement.prototype as Partial<PopoverElement>).showPopover === 'function';

function place(panel: HTMLElement, trigger: HTMLElement): void {
  const r: DOMRect = trigger.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.margin = '0';
  panel.style.inset = 'auto';
  panel.style.minWidth = `${r.width}px`;
  const ph: number = panel.offsetHeight;
  const pw: number = panel.offsetWidth;
  const vw: number = document.documentElement.clientWidth;
  const vh: number = document.documentElement.clientHeight;
  const below: number = vh - r.bottom - GAP;
  const above: number = r.top - GAP;
  const top: number = ph <= below || below >= above ? r.bottom + GAP : Math.max(GAP, r.top - GAP - ph);
  let left: number = r.left;
  if (left + pw > vw - GAP) left = Math.max(GAP, vw - GAP - pw);
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
}

export function usePopover(
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useEffect((): void | (() => void) => {
    const panel: PopoverElement | null = panelRef.current as PopoverElement | null;
    const trigger: HTMLElement | null = triggerRef.current;
    if (!supported || panel === null || trigger === null) return;

    function reposition(): void {
      if (panel !== null && trigger !== null && panel.matches(':popover-open')) place(panel, trigger);
    }

    if (open) {
      if (!panel.matches(':popover-open')) panel.showPopover();
      place(panel, trigger);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      return (): void => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
        if (panel.matches(':popover-open')) panel.hidePopover();
      };
    }
    return;
  }, [open, panelRef, triggerRef]);
}
```

> **React 18 `popover` attribute note:** `popover="manual"` is valid HTML but React 18's JSX types may not know it. In each component that renders a popover panel, set it imperatively in a mount effect (`panel.setAttribute('popover', 'manual')`) OR spread `{...{ popover: 'manual' }}` on the element. FdyCombo (Task 3? no — Task 4) uses the imperative form; reuse it.

- [ ] **Step 2: Run the gate**

Run: `npm run typecheck:react`
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
git add adapters/react/usePopover.ts
git commit -m "feat(react): add usePopover hook (top-layer dropdown positioning)"
```

---

### Task 3: `FdyChart` (warm-up — no popover, no keyboard)

**Files:**
- Create: `adapters/react/components/FdyChart.tsx`
- Test: `npm run typecheck:react`

**Interfaces:**
- Consumes: `window.FreedayChart.update(el)` (from `dist/freeday.js`).
- Produces: `export function FdyChart(props: FdyChartProps): JSX.Element`, and `export interface FdyChartSeries { label: string; values: number[]; role?: string }`.

Port of `adapters/vue/components/FdyChart.vue`. A `<div>` carrying the renderer's `data-*` API; a mount+update effect calls `window.FreedayChart.update(el)`; children are the accessible fallback.

- [ ] **Step 1: Write the component (full code)**

Create `adapters/react/components/FdyChart.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

export interface FdyChartSeries {
  label: string;
  values: number[];
  role?: string;
}

export interface FdyChartProps {
  type: 'line' | 'area' | 'bar' | 'sparkline' | 'donut';
  series?: ReadonlyArray<FdyChartSeries>;
  values?: ReadonlyArray<number>;
  labels?: ReadonlyArray<string>;
  format?: 'number' | 'percent' | 'currency';
  stacked?: boolean;
  legend?: 'auto' | 'always' | 'none';
  colors?: ReadonlyArray<string>;
  color?: string;
  center?: string | number;
  'aria-label'?: string;
  children?: ReactNode;
}

interface FreedayChartApi { update: (el: HTMLElement) => void; }
function chartApi(): FreedayChartApi | null {
  const api: FreedayChartApi | undefined = (window as unknown as { FreedayChart?: FreedayChartApi }).FreedayChart;
  return api !== undefined && typeof api.update === 'function' ? api : null;
}

export function FdyChart(props: FdyChartProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  const isCartesian: boolean =
    props.type === 'line' || props.type === 'area' || (props.type === 'bar' && (props.series !== undefined || props.stacked === true));
  const rootClass: string =
    props.type === 'sparkline' ? 'fdy-sparkline'
    : props.type === 'donut' ? 'fdy-donut'
    : props.type === 'bar' && !isCartesian ? 'fdy-bars'
    : '';

  useEffect((): void => {
    const el: HTMLDivElement | null = rootRef.current;
    const api: FreedayChartApi | null = chartApi();
    if (el === null || api === null) return;
    api.update(el);
    el.dataset.fdyChartReady = '1'; // claim it so the global auto-init won't render it again
  }, [props.type, props.series, props.values, props.labels, props.format, props.stacked, props.legend, props.colors, props.color, props.center]);

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-fdy-chart={props.type}
      data-series={props.series !== undefined ? JSON.stringify(props.series) : undefined}
      data-values={props.values !== undefined ? props.values.join(',') : undefined}
      data-labels={props.labels !== undefined ? props.labels.join(',') : undefined}
      data-fdy-format={props.format ?? undefined}
      data-fdy-stacked={props.stacked === true ? '' : undefined}
      data-fdy-legend={props.legend ?? undefined}
      data-fdy-colors={props.colors !== undefined ? props.colors.join(',') : undefined}
      data-fdy-color={props.color ?? undefined}
      data-fdy-center={props.center !== undefined ? String(props.center) : undefined}
      aria-label={props['aria-label']}
      role="img"
    >
      {props.children}
    </div>
  );
}
```

- [ ] **Step 2: Run the gate** — `npm run typecheck:react` → PASS.
- [ ] **Step 3: Commit**

```bash
git add adapters/react/components/FdyChart.tsx
git commit -m "feat(react): add FdyChart wrapper (reactive, typed, 0-dep)"
```

---

### Task 4: `FdyCombo` (canonical reference component)

**Files:**
- Create: `adapters/react/components/FdyCombo.tsx`
- Test: `npm run typecheck:react`

**Interfaces:**
- Consumes: `usePopover` (Task 2).
- Produces: `export function FdyCombo<T extends string>(props: FdyComboProps<T>): JSX.Element` and `export interface FdyComboProps<T extends string>`. This component is the **pattern exemplar**: Tasks 5–6 reuse its ref/state/keyboard/outside-click/popover structure.

Port of `adapters/vue/components/FdyCombo.vue` (232 lines) — keep every ARIA attribute, the keyboard map (ArrowUp/Down, Home/End, Enter/Space, Escape, Tab, typeahead), outside-click, and focusout behavior identical.

- [ ] **Step 1: Write the component (full code)**

Create `adapters/react/components/FdyCombo.tsx`:

```tsx
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

export interface FdyComboOption<T extends string> {
  value: T;
  label: string;
}

export interface FdyComboProps<T extends string> {
  value: T;
  options: ReadonlyArray<FdyComboOption<T>>;
  onChange: (value: T) => void;
  id?: string;
  ariaLabelledby?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedby?: string;
}

export function FdyCombo<T extends string>(props: FdyComboProps<T>): JSX.Element {
  const baseId: string = useId();
  const buttonId: string = props.id ?? `${baseId}-btn`;
  const listboxId: string = `${baseId}-listbox`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<number>(-1);

  usePopover(listboxRef, buttonRef, open);

  // Popover attr for React 18 (JSX may not type it): set once on mount.
  useEffect((): void => {
    listboxRef.current?.setAttribute('popover', 'manual');
  }, []);

  const isDisabled: boolean = props.disabled === true;
  const isInvalid: boolean = props.invalid === true;
  const selectedIndex: number = useMemo(
    (): number => props.options.findIndex((o: FdyComboOption<T>): boolean => o.value === props.value),
    [props.options, props.value],
  );
  const selectedLabel: string = selectedIndex >= 0 ? props.options[selectedIndex].label : (props.placeholder ?? '');
  const isPlaceholder: boolean = selectedIndex < 0;
  const activeDescendant: string | undefined = open && highlighted >= 0 ? optionId(highlighted) : undefined;

  const setHighlight = (index: number): void => {
    const len: number = props.options.length;
    setHighlighted(len === 0 ? -1 : ((index % len) + len) % len);
  };
  const openList = (): void => {
    if (isDisabled || open) return;
    setOpen(true);
    const start: number = selectedIndex >= 0 ? selectedIndex : 0;
    const len: number = props.options.length;
    setHighlighted(len === 0 ? -1 : ((start % len) + len) % len);
  };
  const closeList = (focusButton: boolean): void => {
    setOpen(false);
    setHighlighted(-1);
    if (focusButton) buttonRef.current?.focus();
  };
  const toggle = (): void => { if (open) closeList(false); else openList(); };
  const choose = (index: number): void => {
    const opt: FdyComboOption<T> | undefined = props.options[index];
    if (opt === undefined) return;
    if (opt.value !== props.value) props.onChange(opt.value);
    closeList(true);
  };

  // Type-to-select: buffer keystrokes for 500ms and jump to the first matching label.
  const typedRef = useRef<string>('');
  const typedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeahead = (char: string): void => {
    typedRef.current += char.toLowerCase();
    if (typedTimer.current !== null) clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout((): void => { typedRef.current = ''; }, 500);
    const match: number = props.options.findIndex((o: FdyComboOption<T>): boolean =>
      o.label.toLowerCase().startsWith(typedRef.current));
    if (match >= 0) { if (!open) setOpen(true); setHighlight(match); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isDisabled) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (open) setHighlight(highlighted + 1); else openList(); break;
      case 'ArrowUp': e.preventDefault(); if (open) setHighlight(highlighted - 1); else openList(); break;
      case 'Home': if (open) { e.preventDefault(); setHighlight(0); } break;
      case 'End': if (open) { e.preventDefault(); setHighlight(props.options.length - 1); } break;
      case 'Enter':
      case ' ': e.preventDefault(); if (open && highlighted >= 0) choose(highlighted); else openList(); break;
      case 'Escape': if (open) { e.preventDefault(); closeList(true); } break;
      case 'Tab': if (open) closeList(false); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key);
    }
  };

  const onFocusout = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next: EventTarget | null = e.relatedTarget;
    if (rootRef.current !== null && !(next instanceof Node && rootRef.current.contains(next))) closeList(false);
  };

  // Close when a pointer lands outside the whole combo.
  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closeList(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  useEffect((): (() => void) => (): void => {
    if (typedTimer.current !== null) clearTimeout(typedTimer.current);
  }, []);

  return (
    <div
      ref={rootRef}
      className={isInvalid ? 'fdy-combo fdy-combo--error' : 'fdy-combo'}
      data-value={props.value}
      onKeyDown={onKeyDown}
      onBlur={onFocusout}
    >
      <button
        id={buttonId}
        ref={buttonRef}
        type="button"
        className={open ? 'fdy-combo__button is-open' : 'fdy-combo__button'}
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeDescendant}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
        onClick={toggle}
      >
        <span className={isPlaceholder ? 'fdy-combo__value fdy-combo__value--placeholder' : 'fdy-combo__value'}>{selectedLabel}</span>
      </button>
      <ul id={listboxId} ref={listboxRef} className="fdy-combo__listbox" role="listbox" hidden={!open}>
        {props.options.map((opt: FdyComboOption<T>, i: number): JSX.Element => (
          <li
            id={optionId(i)}
            key={opt.value}
            className={i === highlighted ? 'fdy-combo__option is-highlighted' : 'fdy-combo__option'}
            role="option"
            aria-selected={opt.value === props.value}
            onClick={(): void => choose(i)}
            onMouseMove={(): void => setHighlight(i)}
          >
            <span className="fdy-combo__check">{opt.value === props.value ? '✓' : ''}</span>{opt.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Run the gate** — `npm run typecheck:react` → PASS.
- [ ] **Step 3: Verify ARIA parity by inspection**

Compare against `adapters/vue/components/FdyCombo.vue` template (lines 188–231): confirm identical `role`, `aria-haspopup`, `aria-controls`, `aria-expanded`, `aria-activedescendant`, `aria-labelledby`, `aria-invalid`, `aria-describedby`, `aria-selected`, and class names. Fix any drift.

- [ ] **Step 4: Commit**

```bash
git add adapters/react/components/FdyCombo.tsx
git commit -m "feat(react): add FdyCombo (controlled APG select-only combobox)"
```

---

### Task 5: `FdyDatepicker` (single-date calendar)

**Files:**
- Create: `adapters/react/components/FdyDatepicker.tsx`
- Test: `npm run typecheck:react`

**Interfaces:**
- Consumes: `usePopover` (Task 2); the open/close + outside-click + focusout structure from `FdyCombo` (Task 4).
- Produces: `export function FdyDatepicker(props: FdyDatepickerProps): JSX.Element`, `export interface FdyDatepickerProps`.

**Props (identical to Vue, `modelValue` → `value` + `onChange`):**
```ts
export interface FdyDatepickerProps {
  value: string | null;                 // ISO YYYY-MM-DD or null
  onChange: (value: string) => void;
  min?: string; max?: string; locale?: string;
  placeholder?: string; disabled?: boolean; invalid?: boolean;
  describedby?: string; id?: string; ariaLabelledby?: string;
}
```

**Port recipe — `adapters/vue/components/FdyDatepicker.vue` is the line-for-line spec (333 lines):**

- [ ] **Step 1: Port the pure helpers verbatim.** Copy `pad`, `toISO`, `parseISO`, `startOfDay`, `startOfMonth`, `sameDay`, `addDays`, and any `clamp`/`inRange` helpers (Vue lines 45–90+) into the `.tsx` unchanged — they are framework-agnostic pure functions. Keep the `DayCell` interface (Vue lines 15–25).

- [ ] **Step 2: Port the calendar-grid derivation.** Translate the Vue `computed` that builds the 6×7 `DayCell[]` for the visible month (`outside`/`today`/`selected`/`disabled`/`focusable`, min/max clamping, `Intl.DateTimeFormat(locale)` for `ariaLabel` and the header month label) into a `useMemo` keyed on `[viewMonth, props.value, props.min, props.max, props.locale]`. `viewMonth` is `useState<Date>` initialised from `parseISO(props.value) ?? new Date()` at month start.

- [ ] **Step 3: Port state + open/close.** `open` = `useState`; reuse the FdyCombo structure exactly: `usePopover(popoverRef, triggerRef, open)`, imperative `popover="manual"` on mount, outside-`mousedown` effect gated on `open`, `onBlur` focusout close. The trigger is the `.fdy-datepicker` input-styled button showing `displayValue` (formatted `value` via `Intl`, or `placeholder`).

- [ ] **Step 4: Port the calendar keyboard map.** Mirror Vue's grid keyboard (Arrows move day, PageUp/PageDown change month, Home/End week bounds, Enter/Space select the focused day, Escape closes). Keep a `focusedDate` state for roving focus inside the grid; clamp to min/max. Selecting calls `props.onChange(toISO(day))` then closes and returns focus to the trigger.

- [ ] **Step 5: Render the markup** using the exact `.fdy-datepicker` / `.fdy-cal__*` classes from `src/components/datepicker.css` (match the Vue template's class names, `role="dialog"`/`role="grid"`/`gridcell`, `aria-modal` if the Vue uses it, `aria-selected`, `aria-label` per day). Panel carries `popover="manual"` + `hidden={!open}`.

- [ ] **Step 6: Run the gate** — `npm run typecheck:react` → PASS.

- [ ] **Step 7: Parity check** — diff ARIA + keyboard against `FdyDatepicker.vue`; the day-cell `aria-label`s and disabled/min-max behavior must match. Fix drift.

- [ ] **Step 8: Commit**

```bash
git add adapters/react/components/FdyDatepicker.tsx
git commit -m "feat(react): add FdyDatepicker (controlled single-date calendar)"
```

---

### Task 6: `FdyCfl` (controlled async choose-from-list)

**Files:**
- Create: `adapters/react/components/FdyCfl.tsx`
- Test: `npm run typecheck:react`

**Interfaces:**
- Produces: `export function FdyCfl<Row extends Record<string, unknown>>(props: FdyCflProps<Row>): JSX.Element`, `export interface FdyCflProps<Row>`, `export interface CflColumn<Row>`, `export interface CflPage<Row>`.

**Props (identical to Vue, `modelValue` → `value` + `onChange`):**
```ts
export interface CflColumn<Row> { key: keyof Row & string; label: string }
export interface CflPage<Row> { rows: Row[]; hasMore: boolean }
export interface FdyCflProps<Row extends Record<string, unknown>> {
  value: Row | null;
  onChange: (value: Row) => void;
  fetchPage: (query: string, page: number) => Promise<CflPage<Row>>;
  columns: ReadonlyArray<CflColumn<Row>>;
  display: (row: Row) => string;
  rowKey: (row: Row) => string;
  pageSize?: number;
  placeholder?: string; disabled?: boolean; invalid?: boolean;
  describedby?: string; id?: string; ariaLabelledby?: string;
}
```

**Port recipe — `adapters/vue/components/FdyCfl.vue` is the line-for-line spec (354 lines):**

- [ ] **Step 1: Render the closed field** — the `.fdy-input-group` with a read-only `.fdy-input` showing `props.value ? props.display(props.value) : ''` (placeholder otherwise) and the trailing `.fdy-input-group__btn` magnifier that opens the dialog. Reuse the Vue template's classes/ARIA exactly.

- [ ] **Step 2: Native `<dialog>` open/close.** `dialogRef = useRef<HTMLDialogElement>(null)`; open = `dialogRef.current?.showModal()`, close = `.close()`. On open, focus the search input and reset `query=''`, `page=0`. `<dialog>` gives focus-trap + Esc + backdrop for free (no popover needed here — CFL is dialog-based).

- [ ] **Step 2: State model** — port these as `useState`: `query`, `rows: Row[]`, `page`, `hasMore`, `loading`, `error: Error | null`, `activeIndex`. Add an in-flight guard `const reqIdRef = useRef(0)` for the out-of-order fetch protection (Vue uses a token; in React use an incrementing ref).

- [ ] **Step 3: The controlled fetch effect.** A `load(query, page, append)` async fn: increment `reqIdRef.current`, capture the token, set `loading`, `await props.fetchPage(query, page)`, and **only apply the result if the token still matches** `reqIdRef.current` (drops stale responses). On error set `error`. Debounce `query` changes (~250ms) before calling `load(query, 0, false)`. Optional in-memory cache keyed by `query|page` (mirror Vue's cache).

- [ ] **Step 4: Results + states.** Render the four states exactly as Vue: **loading** (spinner/skeleton), **empty** (no rows), **error** (message + retry button that re-calls `load`), and **rows** (a dense sticky-header `<table>` of `columns`; each row commits on click → `props.onChange(row)` + close). "Load more" appends the next page when `hasMore`.

- [ ] **Step 5: Keyboard** — mirror Vue: type in search to filter (server-side via `fetchPage`), ArrowDown enters the list, Up/Down move `activeIndex`, Enter picks the active row, Esc closes. Wire the search input's `aria-controls`/`aria-activedescendant` only when rows exist (Vue gates this via `hasRows`).

- [ ] **Step 6: Run the gate** — `npm run typecheck:react` → PASS.
- [ ] **Step 7: Parity check** vs `FdyCfl.vue` (states, out-of-order guard, single-commit-on-click, ARIA). Fix drift.
- [ ] **Step 8: Commit**

```bash
git add adapters/react/components/FdyCfl.tsx
git commit -m "feat(react): add FdyCfl (controlled async choose-from-list)"
```

---

### Task 7: Barrel exports + public types

**Files:**
- Modify: `adapters/react/index.js`
- Modify: `adapters/react/index.d.ts`
- Verify: `package.json` `./react` export (expected: no change).

**Interfaces:**
- Produces: `freeday/react` exporting `useFreeday`, `usePopover`, `FdyCombo`, `FdyDatepicker`, `FdyCfl`, `FdyChart` + all their prop/type interfaces.

- [ ] **Step 1: Update `adapters/react/index.js`**

```js
export { useFreeday } from './useFreeday.js';
export { usePopover } from './usePopover.ts';
export { FdyCombo } from './components/FdyCombo.tsx';
export { FdyDatepicker } from './components/FdyDatepicker.tsx';
export { FdyCfl } from './components/FdyCfl.tsx';
export { FdyChart } from './components/FdyChart.tsx';
```

> The consumer's bundler resolves the `.ts`/`.tsx` sources (Vite/Next transpile them). This mirrors the Vue `index.js` re-exporting `.vue` files.

- [ ] **Step 2: Update `adapters/react/index.d.ts`** — add re-export declarations + the public prop interfaces so `freeday/react` is fully typed:

```ts
export { usePopover } from './usePopover';
export { FdyCombo, type FdyComboProps, type FdyComboOption } from './components/FdyCombo';
export { FdyDatepicker, type FdyDatepickerProps } from './components/FdyDatepicker';
export { FdyCfl, type FdyCflProps, type CflColumn, type CflPage } from './components/FdyCfl';
export { FdyChart, type FdyChartProps, type FdyChartSeries } from './components/FdyChart';
```

Keep the existing `useFreeday` declaration and the `Fdy*Detail` event interfaces (still valid for enhancer-based usage).

- [ ] **Step 3: Verify the package export** — confirm `package.json` `"./react"` still points `types` → `./adapters/react/index.d.ts`, `default` → `./adapters/react/index.js`. No change expected.

- [ ] **Step 4: Run the gate** — `npm run typecheck:react` → PASS.
- [ ] **Step 5: Commit**

```bash
git add adapters/react/index.js adapters/react/index.d.ts
git commit -m "feat(react): export FdyCombo/Datepicker/Cfl/Chart + usePopover from freeday/react"
```

---

### Task 8: Integration proof — wire into `examples/react-faktur`

**Files:**
- Modify: `examples/react-faktur/src/*` (the invoice screen)
- Test: `vite build` + headless screenshot

**Interfaces:**
- Consumes: `freeday/react` (all four components).

- [ ] **Step 1: Read the current example** — inspect `examples/react-faktur/src/` to find the native `<select class="fdy-input">` (status) and any date/native controls, plus where `dist/freeday.css` + `dist/freeday.js` are loaded.

- [ ] **Step 2: Replace native controls** — swap the status `<select>` for `<FdyCombo value={status} options={STATUS_OPTS} onChange={setStatus} ariaLabelledby="lbl-status" />`; add an invoice-date `<FdyDatepicker value={date} onChange={setDate} />`; add a customer `<FdyCfl value={cust} onChange={setCust} fetchPage={fetchCustomers} columns={...} display={r => r.name} rowKey={r => r.code} />` backed by a local mock `fetchPage`; add a small `<FdyChart type="sparkline" values={[…]} aria-label="…" />`. Keep the controlled state in the parent component.

- [ ] **Step 3: Install + build**

Run: `cd examples/react-faktur && npm i && npx vite build`
Expected: build succeeds, 0 type errors (Vite transpiles the `.tsx` wrappers from the local package).

- [ ] **Step 4: Headless render check**

Run a headless Chrome screenshot of `examples/react-faktur/dist/index.html` (as HANDOFF documents for the Vue/React examples). Verify: the combo opens a themed listbox (not an OS menu), the datepicker calendar renders, the CFL dialog lists mock rows and commits on click, the sparkline draws. Save the screenshot under the scratchpad and eyeball it.

- [ ] **Step 5: Commit**

```bash
git add examples/react-faktur/src examples/react-faktur/dist
git commit -m "docs(react): use FdyCombo/Datepicker/Cfl/Chart in the react-faktur example"
```

---

### Task 9: Docs + release (v1.5.0)

**Files:**
- Modify: `docs/index.html` (React card copy + version refs), `docs/integrations.md`, `docs/getting-started.md`, `CHANGELOG.md`, `HANDOFF.md`, `package.json` (version).

- [ ] **Step 1: Docs — React now has typed controlled components.** Update the React integration card in `docs/index.html` (`fw.react` string + its EN i18n in the `<script>` I18N map) to mention `FdyCombo`/`FdyDatepicker`/`FdyCfl`/`FdyChart` (parallel to the Vue card). Update `docs/integrations.md` + `docs/getting-started.md` with a React usage snippet (controlled `value`/`onChange`) and the Next.js `transpilePackages: ['freeday']` note.

- [ ] **Step 2: CHANGELOG** — add `## [1.5.0] — <date>` with an **Added**: "React adapter parity — typed controlled components `FdyCombo` / `FdyDatepicker` / `FdyCfl` / `FdyChart` + `usePopover`, over the same kit CSS (APG a11y, top-layer dropdowns via Popover API). React apps no longer need native `<select>`/`<input type=date>` fallbacks." Note it's non-breaking (additive).

- [ ] **Step 3: HANDOFF** — update "Di mana kita sekarang" to v1.5.0 and note React now has `v-model`-equivalent controlled components (Vue+React parity).

- [ ] **Step 4: Version bump + sync ALL refs.** Bump `package.json` to `1.5.0`. Update every public version string: `docs/index.html` hero eyebrow `Design System · v1.4.1` → `v1.5.0`, `#install-cmd` `#v1.4.1` → `#v1.5.0`, footer `v1.4.1` → `v1.5.0`; `README.md` + `docs/getting-started.md` install commands. (Memory: sync-docs-on-version-bump — do it in this release, not a follow-up.)

- [ ] **Step 5: Rebuild + test gate**

Run: `node tokens/build.mjs && npm test`
Expected: `dist/` unchanged (deterministic; adapters aren't in the token build) and `node --test` **9/9 PASS**.

- [ ] **Step 6: Commit + tag**

```bash
git add -A
git commit -m "release: v1.5.0 — React adapter parity (FdyCombo/Datepicker/Cfl/Chart)"
git tag v1.5.0
```

- [ ] **Step 7: Push + verify live** — push `main` + tag; after Pages rebuilds, `curl` the live docs and confirm the React card mentions the new components and the install command reads `v1.5.0`.

---

## Self-Review

**Spec coverage (improvement-notes #1 "Framework component wrappers with v-model — Vue + React"):**
- Vue already shipped `FdyCombo`/`FdyDatepicker`/`FdyCfl`/`FdyChart` (v1.2/v1.4). This plan delivers the **React** equivalents → closes the "React + rest" half. Tasks 2–7 build them; Task 8 proves them in `react-faktur`; Task 9 documents + releases. ✔
- The broader wish-list names (`FdySelect`, `FdyDateRange`, `FdyCascade`, `FdyAutocomplete`) exceed Vue's current set — **out of scope** for *parity*; add them later, and to Vue simultaneously, so the two adapters stay symmetric. Noted, not silently dropped.
- CFL "controlled component (`fetchPage` + cache)" requirement → Task 6 (out-of-order guard, states, retry, pagination, optional cache). ✔
- Dropdown clipping (v1.4.1 Popover work) → `usePopover` (Task 2) carried into Combo/Datepicker. ✔

**Placeholder scan:** Tasks 2–4 + 7 ship full code. Tasks 5–6 are **ports of an in-repo canonical source** (`FdyDatepicker.vue`, `FdyCfl.vue`) — the recipes give the exact props, the React-specific translations (out-of-order ref guard, `useMemo` grid, `<dialog>` control), and cite the Vue file as the line-for-line behavior spec, not "TODO/implement later." Acceptable for a port; the executor has the full source to translate.

**Type consistency:** `value`/`onChange(value)` is uniform across all four; `usePopover(panelRef, triggerRef, open)` signature is identical in Task 2 and its callers (Tasks 4–5); prop interfaces exported in Task 7 match the names defined in Tasks 3–6 (`FdyComboProps`, `FdyDatepickerProps`, `FdyCflProps`, `FdyChartProps`, `FdyComboOption`, `CflColumn`, `CflPage`, `FdyChartSeries`).

**Test strategy note:** deliberately uses the repo's existing gates (typecheck + example build + headless), not a new jsdom/RTL unit-test stack — consistent with HANDOFF ("examples diverifikasi headless") and the project's "no new unit tests by default" convention.
