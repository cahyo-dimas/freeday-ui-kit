# reference/ — input material, not shipped output

Source material the kit was built **from**, and wireframe references used **while** building screens
with it. Nothing in this folder is part of the published package: `files` in `package.json` lists
shipped paths one by one, so these never reach the npm tarball, and they are not part of the live
docs site either. They are kept in the repo as provenance and as a working reference.

| File | What it is |
|---|---|
| `foundation-design-system.html` | The origin artifact Freeday was ported from (2026-07-21). Historical: all 44 components have been ported, so this is a provenance record, not a to-do list. Its `@font-face` rules point at **dead UUID resources** (leftovers from the tool that exported it) — there are **no embedded font files here to extract**; it renders via the Google Fonts CDN it preconnects to. |
| `layout-patterns.png` | 15 web-app layout archetypes, as low-fidelity wireframes. Generated with Claude at the author's request, so it carries no third-party rights. Use it to pick a screen shape *before* reaching for components; the mapping below says what each shape is built from. |

---

## The 15 archetypes → Freeday

Freeday deliberately owns **components + tokens, not layout** — so for most archetypes the *frame* is
yours (your grid/flex layer) and the kit fills it. The honest split per archetype:

| # | Archetype | Freeday gives you | You build |
|---|---|---|---|
| 1 | **Dashboard / admin** | `.fdy-app` · `.fdy-page` · `.fdy-stats`/`.fdy-stat` · `.fdy-card` · `data-fdy-chart` · `.fdy-datatable` | nothing — fully covered, see [`docs/reference-screen.html`](../docs/reference-screen.html) |
| 2 | **Master-detail** | list = `.fdy-datatable` + `.fdy-table__row--activatable`; detail = `.fdy-card` + `.fdy-dl` + `.fdy-tabs`; narrow screens = `.fdy-drawer` | the two-pane split |
| 3 | **Kanban board** | cards = `.fdy-card--interactive` / `--button`; labels = `.fdy-chip--tone-N`; counts = `.fdy-badge` | the column grid **and** drag-and-drop (no DnD in the kit) |
| 4 | **Feed / timeline** | `.fdy-timeline` (event feed) · `.fdy-card` (items) · `.fdy-avatar` · `.fdy-skeleton` while loading | the column widths |
| 5 | **Chat / messaging** | conversation list = `.fdy-nav`; unread = `.fdy-badge-ov`; composer = `.fdy-textarea` + `.fdy-btn`; `.fdy-avatar` | the bubbles and the scroll-to-bottom behaviour |
| 6 | **Canvas / whiteboard** | chrome only: `.fdy-appbar` · `.fdy-btn-group` · `.fdy-fab` · `.fdy-menu` · `.fdy-tooltip` | the canvas itself |
| 7 | **Calendar / scheduler** | range filter = `.fdy-daterange`; events = `.fdy-chip` / `.fdy-badge`; day detail = `.fdy-drawer` | the month grid — there is **no** calendar-view component (`.fdy-cal__grid` / `.fdy-cal__day` are datepicker internals, not public layout) |
| 8 | **Document editor** | `.fdy-app` shell · outline = `.fdy-tree` · `.fdy-toolbar` + `.fdy-btn-group` · `.fdy-kbd` for shortcuts | the editing surface |
| 9 | **Media / streaming** | tiles = `.fdy-card` · rails = `.fdy-carousel` · `.fdy-skeleton` · playback = `.fdy-progress` | the poster grid |
| 10 | **E-commerce account** | `.fdy-page-section` · `.fdy-dl` · orders = `.fdy-table` · status = `.fdy-badge` · `.fdy-accordion` | nothing much — mostly covered |
| 11 | **Analytics / BI** | `.fdy-stats` · `data-fdy-chart` (sparkline/bar/line/area/donut, palette `--chart-1`…`8`) · `.fdy-filterbar` · `.fdy-daterange` | the tile grid |
| 12 | **Point of sale** | `.fdy-app--nav-collapsed` for screen space · product tiles = `.fdy-card--button` · cart = `.fdy-table` + `.fdy-table__num` · totals = `.fdy-stat` · `.fdy-fab` to pay · `data-density="compact"` | the two-column till layout |
| 13 | **Wizard / multi-step** | `.fdy-stepper` · `.fdy-step-panels` · `.fdy-step-nav` · `.fdy-form-grid` | nothing — fully covered |
| 14 | **File manager** | folders = `.fdy-tree` · upload = `.fdy-dropzone` + `.fdy-filelist` + `.fdy-file` · actions = `.fdy-menu` · `.fdy-breadcrumb` | the icon grid |
| 15 | **Community / forum** | threads = `.fdy-card` · `.fdy-avatar--tone-N` · tags = `.fdy-chip` · `.fdy-pagination` · replies = `.fdy-timeline` | the thread list layout |

Rule of thumb from that table: **if an archetype needs a shape the kit has no component for, build the
shape and fill it with kit components — never invent a `fdy-` class for it.** The complete list of
classes that do exist is [`COMPONENTS.md`](../COMPONENTS.md).
