// Freeday breakpoint scale in px — mirrors src/components/breakpoints.css utilities
// (sm/md/lg/xl). CSS @media can't read custom properties, so this is the JS-side
// source of the scale for matchMedia / app @media alignment.
export const breakpoints = { sm: 600, md: 960, lg: 1280, xl: 1920 };
