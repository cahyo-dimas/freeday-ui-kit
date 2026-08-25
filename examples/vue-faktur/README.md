# Freeday × Vue 3: invoice example

A real invoice screen that uses Freeday components in Vue 3 through the `@cahyo-dimas/freeday/vue`
adapter. It shows the integration contract end to end: Vue-rendered markup is enhanced by
Freeday's enhancers, and `fdy-*` events flow back into Vue state.

> **Want to use Freeday in your own Vue project?** Follow
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §Vue 3, install from npm
> (`npm i @cahyo-dimas/freeday`), not `file:../..` like this example.

## Run

```bash
cd examples/vue-faktur
npm install     # links `@cahyo-dimas/freeday` from the repo root (file:../..) + Vue/Vite
npm run dev     # open the URL Vite prints
```

`npm run build` for a production build, `npm run typecheck` to check types (`vue-tsc`).

## What it proves

| Freeday component | On screen | Contract to Vue |
|---|---|---|
| Form validation | invoice form | `<form data-fdy-validate @submit.prevent @fdy-form-valid="onValid">` |
| Input mask | PO number (`PO-####/AA`) | `@fdy-mask` → `detail.raw` |
| Cascade select | product category | `@fdy-cascade-change` → `detail.value/path` |
| Date picker | due date | `@fdy-datepicker-change` → `detail.value` |
| Select (combo) | status | `@fdy-change` → `detail.value` |
| Table · card · badge · app-shell | item table + layout | `fdy-*` classes directly |

## Core pattern

One composable hydrates every enhancer in the component's subtree, once on mount and on each
update (idempotent):

```ts
import { useFreeday } from '@cahyo-dimas/freeday/vue';
const root = ref<HTMLElement | null>(null);
useFreeday(root);          // <div ref="root"> ...[data-fdy-*]... </div>
```

Freeday events are ordinary bubbling `CustomEvent`s, so plain native `v-on` is enough
(`@fdy-cascade-change`); then read `event.detail` (typed in `@cahyo-dimas/freeday/vue`). No
component is re-implemented; the enhancer stays the source of truth. See
[`../../docs/integrations.md`](../../docs/integrations.md) for the library map and other framework
patterns (React/Blazor).
