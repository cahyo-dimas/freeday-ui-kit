/// <reference types="vite/client" />

// The `foundry` core bundle is a side-effect import (registers window.Foundry*);
// it ships no types, so declare it as an untyped side-effect module.
declare module 'foundry';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
