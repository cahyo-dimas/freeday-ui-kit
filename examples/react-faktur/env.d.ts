/// <reference types="vite/client" />

// The `foundry` core bundle is a side-effect import (registers window.Foundry*);
// it ships no types, so declare it as an untyped side-effect module.
declare module 'foundry';
