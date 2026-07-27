/// <reference types="vite/client" />

// The `@cahyo-dimas/freeday` core bundle is a side-effect import (registers window.Freeday*);
// it ships no types, so declare it as an untyped side-effect module.
declare module '@cahyo-dimas/freeday';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
