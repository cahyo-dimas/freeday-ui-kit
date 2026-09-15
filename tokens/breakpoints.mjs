// Freeday breakpoint scale in px, mirrors src/components/breakpoints.css utilities
// (sm/md/lg/xl). CSS @media can't read custom properties, so this is the JS-side
// source of the scale for matchMedia / app @media alignment. The CSS-side answer to the
// same problem is dist/freeday.media.css (`@cahyo-dimas/freeday/media`), a @custom-media
// sheet GENERATED from this object, so the two halves cannot disagree.
//
// `nav` and `filterbar` are not part of the sm/md/lg/xl ramp. Each mirrors one hard-wired rule in
// the kit, and each must be used INSTEAD of the nearest ramp step — that is the whole reason they
// are named here rather than left to be discovered by reading the stylesheet.
//
// `nav` is the width at which .fdy-app switches the sidebar from an off-canvas drawer (below) to a
// static column (at and above), hard-wired in src/components/app-shell.css. Anything that has to
// agree with the shell, a matchMedia guard deciding whether the nav toggle sets --nav-open or
// --nav-collapsed, a utility-framework variant, must use THIS number, not md. Aligning such code to
// md (960) leaves 721–959px broken: the sidebar is already static while the script still thinks it
// is an overlay.
//
// `filterbar` is the width at which .fdy-filterbar stacks every field full-width, hard-wired in
// src/components/filterbar.css. It is deliberately not sm: 640 is a real phone-landscape width and
// moving it would reflow every filter bar in every consuming app. An app rule that has to fire in
// lockstep with the stack — releasing a growing field's max-width, say — must use THIS number.
// Aligning it to sm (600) leaves 600–640px broken: the kit has already stacked the fields while the
// app still caps one of them, so it sits visibly narrower than the fields under it. Raised from
// IDU_AI_DOC_SAPB1_CLIENT and IDU_AI_DOC_SAAS (#058 §1).
export const breakpoints = { nav: 721, filterbar: 640, sm: 600, md: 960, lg: 1280, xl: 1920 };
