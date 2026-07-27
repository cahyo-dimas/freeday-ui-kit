# Freeday × React — invoice example

A real invoice screen that uses Freeday components in React through the
`@cahyo-dimas/freeday/react` hook. Same pattern as the Vue example — React-rendered markup is
enhanced by Freeday's enhancers, and the (bubbling) `fdy-*` events are caught at the root to update
React state.

> **Want to use Freeday in your own React project?** Follow
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §React — install from npm
> (`npm i @cahyo-dimas/freeday`), not `file:../..` like this example.

## Run

```bash
cd examples/react-faktur
npm install     # links `@cahyo-dimas/freeday` from the repo root (file:../..) + React/Vite
npm run dev     # open the URL Vite prints
```

`npm run build` for a production build, `npm run typecheck` to check types.

## Core pattern

```tsx
import { useFreeday } from '@cahyo-dimas/freeday/react';
const root = useRef<HTMLDivElement>(null);
useFreeday(root);            // hydrate [data-fdy-*] in this subtree, on mount + every commit

// fdy-* events bubble → one set of listeners at the root is enough:
useEffect(() => {
  const el = root.current!;
  const onCascade = (e: Event) => setCategory((e as CustomEvent).detail.path);
  el.addEventListener('fdy-cascade-change', onCascade);
  return () => el.removeEventListener('fdy-cascade-change', onCascade);
}, []);
```

Inputs are left **uncontrolled** — the enhancer owns the DOM value (the mask writes straight to
`.value`; form validation reads through the Constraint Validation API). React state holds the values
that arrive via events; text values are read from `FormData` on `fdy-form-valid`. No component is
re-implemented — the enhancer stays the source of truth. See
[`../../docs/integrations.md`](../../docs/integrations.md) for the library map and other patterns.
