# reference/: input material, not shipped output

Source material the kit was built **from**, and wireframe references used **while** building screens
with it. Nothing in this folder is part of the published package: `files` in `package.json` lists
shipped paths one by one, so these never reach the npm tarball, and they are not part of the live
docs site either. They are kept in the repo as provenance and as a working reference.

| File | What it is |
|---|---|
| `foundation-design-system.html` | The origin artifact Freeday was ported from (2026-07-21). Historical, since all 44 components have been ported, so this is a provenance record, not a to-do list. Its `@font-face` rules point at **dead UUID resources** (leftovers from the tool that exported it) — there are **no embedded font files here to extract**; it renders via the Google Fonts CDN it preconnects to. |
| `layout-patterns.png` | 15 web-app layout archetypes, as low-fidelity wireframes. Generated with Claude at the author's request, so it carries no third-party rights. Use it to pick a screen shape *before* reaching for components; the mapping below says what each shape is built from. |

---

## The 15 archetypes

`layout-patterns.png` is the wireframe. The mapping of each archetype to Freeday's primitives now
ships with the package, in [`USAGE.md` §7b](../USAGE.md#7b-composition-pick-the-screens-shape-first),
so a consuming agent can read it from `node_modules`.
