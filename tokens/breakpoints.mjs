// Freeday breakpoint scale in px — mirrors src/components/breakpoints.css utilities
// (sm/md/lg/xl). CSS @media can't read custom properties, so this is the JS-side
// source of the scale for matchMedia / app @media alignment.
//
// `nav` is not part of the sm/md/lg/xl ramp: it is the width at which .fdy-app switches the
// sidebar from an off-canvas drawer (below) to a static column (at and above), hard-wired in
// src/components/app-shell.css. Anything that has to agree with the shell — a matchMedia guard
// deciding whether the nav toggle sets --nav-open or --nav-collapsed, a utility-framework
// variant — must use THIS number, not md. Aligning such code to md (960) leaves 721–959px
// broken: the sidebar is already static while the script still thinks it is an overlay.
export const breakpoints = { nav: 721, sm: 600, md: 960, lg: 1280, xl: 1920 };
