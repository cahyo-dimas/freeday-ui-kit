# Freeday: Sortable groups, the shared "move" contract (Design Spec)

- **Status:** Draft 2026-11-27, awaiting owner review.
- **Date:** 2026-11-27
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 3.27.0. Target release: **3.28.0** (minor, additive).
- **Scope:** one enhancer (`src/freeday-sortable.js`), its stylesheet, the Vue and React `.d.ts`,
  COMPONENTS.md, browser tests. No typed wrapper: sortable stays raw markup + `useFreeday`.
- **Feature 0 of the owner's four (NEXT-UP §5).** Kanban (1), event calendar (2) and resource
  scheduler (3) build on this contract and get their own specs.

---

## 1. Problem

`data-fdy-sortable` reorders the children of ONE list, by pointer drag or by ↑/↓ on the handle.
COMPONENTS.md says outright: *"Not in the kit: scrolling the page while a drag nears its edge, and
moving items between lists."* A kanban board needs both, and so does any "assign to group" screen.
An app that writes them itself writes the hard half alone: the keyboard path, the announcements,
focus after a framework re-render, and a veto that reaches the user before the drop instead of after.

## 2. Decisions

1. **A group is the value of the existing attribute.** `data-fdy-sortable="board"` joins every list
   with the same value. An empty value (today's markup) is a list on its own and behaves exactly as
   in 3.27.0. No new attribute, nothing for existing apps to change.
2. **Keyboard in a group is lift-then-drop.** Space or Enter lifts, arrows move the landing mark
   (←/→ across lists), Space or Enter drops, Escape returns. One event per move. Immediate arrows
   would commit every list passed on the way: moving a card from column 1 to column 3 would store it
   in column 2 first, firing that status's side effects. Ungrouped lists keep immediate ↑/↓.
   (Owner's choice, 2026-11-27.)
3. **The veto comes before the drop.** A new `fdy-sort-check` asks the app when a gesture first
   reaches another list; a refused list is marked and its reason shown and announced while the item
   is still held. A veto discovered only on drop makes the card bounce back for no visible reason.
   A server that refuses later (asynchronously) stays the app's job: revert state, show a toast.
4. **One move event.** `fdy-sort-change` keeps its name, its cancelability and its 3.27.0 detail,
   and gains `fromList`, `toList`, `fromOrder`. Cancelled, the app moves its state; not cancelled,
   the kit moves the element. Same rule as today.
5. **A programmatic path for WCAG 2.5.7.** `FreedaySortable.move(item, toList, index)` runs the same
   check → change → announce → refocus path, so an app's "Move to…" menu or "Move up" buttons get the
   contract without a drag. The kit's own "Move to…" menu arrives with the kanban (feature 1).

## 3. Markup contract

```html
<ul class="fdy-sortable" data-fdy-sortable="board" data-key="queued" data-label="Queued">
  <li data-key="c1" data-label="Oil change">
    <button class="fdy-sortable__handle" type="button">…icon…</button> Oil change
  </li>
</ul>
<ul class="fdy-sortable" data-fdy-sortable="board" data-key="done" data-label="Done"></ul>
```

- **List:** `data-key` names it in events (`fromList`/`toList`); `data-label`, else `aria-label`, is
  what announcements call it. Both optional for an ungrouped list. In a group `data-key` is required:
  initialising a grouped list without one throws a TypeError naming the group, since events that
  cannot say which list an item went to are useless to the app.
- **Items:** unchanged (`data-key`, `data-label`, `data-fdy-sort-fixed`).
- **Empty-state text** ("No cards yet") goes OUTSIDE the list. Every element child of the list is an
  item. Grouped lists get a minimum height from the kit's CSS, so an empty one remains a target.
- **Group order** is document order. It decides what ←/→ reach.

## 4. Events

### `fdy-sort-check`: may the item enter this list?

Dispatched on the candidate list, bubbling, not cancelable, the first time a gesture (drag, lift or
`move()`) reaches a list of the same group other than the item's own. Its answer is kept for the rest
of that gesture, so a handler runs once per list per gesture, not per pointer move.

```ts
interface FdySortCheckDetail {
  key: string;            // the item
  fromList: string;       // its list's data-key
  toList: string;         // the candidate's data-key
  refuse(reason: string): void;  // TypeError on an empty reason: a refusal owes the user a why
}
```

Not dispatched for a move within one list: reordering does not change which list an item is in.

### `fdy-sort-change`: the move

Dispatched on the **destination** list, bubbling, cancelable. One listener on the board wrapper
receives every move.

```ts
interface FdySortChangeDetail {
  key: string; from: number; to: number;
  order: string[];            // destination list, after the move (unchanged meaning)
  fromList: string | null;    // the list's data-key; null when it has none
  toList: string | null;
  fromOrder: string[];        // source list after the item left; equals `order` within one list
}
```

Not cancelled, the kit moves the element (into the destination at `to`). Cancelled, the DOM is left
as it was and the app reorders its state. Either way the kit announces and, after a keyboard or
`move()` path, puts focus on the moved item's handle, found by `data-key` in the destination list.

## 5. Behaviour

### 5.1 Where an item may land

- Within one list: unchanged. A move may not shift a `data-fdy-sort-fixed` item.
- Across lists, fixed means **"keeps its end"**:
  - a fixed item never leaves its list;
  - an arriving item may not land above the run of fixed items at the start of the destination,
    nor below the run at its end;
  - a fixed item in the middle of the destination does not block an arriving item.
- A list with `data-disabled` is neither source nor destination.
- A list of another group, or an ungrouped list, is never a destination.
- A list refused by `fdy-sort-check` is not a destination for the rest of the gesture.

### 5.2 Pointer

- Hit testing walks up from `elementFromPoint` to the nearest list of the item's group.
- Over an item: before or after it by the vertical midpoint, as today.
- Over the list but no item (an empty list, or the space under the last card of a tall column):
  the end of the list. Marked `is-drop-into` on an empty list, `is-drop-after` on the last item
  otherwise.
- Over a refused list: `is-drop-refused` on the list, no landing mark, `cursor: not-allowed`, and the
  reason in a `.fdy-sortable__refusal` pill the kit places at the top of that list (fixed
  position, styled with the tooltip's tokens). Released there, nothing moves and no change fires.
- Escape cancels, as today. `pointercancel` cancels.

### 5.3 Auto-scroll

While a pointer drag is active, if the pointer is inside the edge band of a scrollable ancestor of
the element under it, or of the viewport, that container scrolls toward the edge:

- Band: the smaller of 48px and 15% of the container's size on that axis.
- Speed: proportional to how deep into the band the pointer is, up to 16px per frame.
- Both axes: vertical for a long column, horizontal for a wide board.
- Driven by `requestAnimationFrame`, so it keeps scrolling while the pointer is still. After each
  step the landing mark is recomputed from the last pointer position.
- Stops on drop, cancel, or the pointer leaving the band.

The keyboard path needs no band: each step calls `scrollIntoView({block:'nearest',
inline:'nearest'})` on the marked item or list.

### 5.4 Keyboard in a group (lift-then-drop)

| Key on a handle | Not lifted | Lifted |
|---|---|---|
| Space / Enter | lift | drop at the mark (on a refused list: repeat the reason, stay lifted) |
| ↑ / ↓ | nothing (ungrouped lists: move one step, as today) | move the mark within the current list |
| ← / → | nothing | mark the previous / next list of the group, same position clamped to its length; skips disabled lists, does NOT skip refused ones |
| Escape | nothing | return, no event |

- Lifted: `is-lifted` on the item, `is-sorting` on its list, the landing mark as for a drag.
- Nothing in the DOM moves until the drop, so the handle keeps focus throughout.
- Focus leaving the handle cancels the lift. So does the lifted item or the marked list leaving the
  DOM (a realtime re-render): the lift is cancelled and announced, and no change fires for an item
  that no longer exists.
- Refused lists are landed on, not skipped, so a keyboard user hears why the column is closed
  instead of finding it silently missing.

### 5.5 `FreedaySortable.move(item, toList, index)`

`item` is an item element, `toList` a list element of the same group (or the item's own list),
`index` the destination position. Returns `true` when a change was dispatched, `false` when the move
is not allowed (5.1) or refused (in which case the reason is announced). Throws a TypeError for an
item that is not in a sortable list or a `toList` that is not a sortable list.

## 6. Strings

Read from the **source** list, overridable with `data-fdy-text-<kebab-key>` as today.

| Key | Default |
|---|---|
| `handle` | Move {label}. Drag, or press the up and down arrow keys. (unchanged, ungrouped) |
| `handleGroup` | Move {label}. Drag, or press Space to lift it. |
| `lifted` | {label} lifted. {list}, position {position} of {total}. Arrow keys move it, Space drops it, Escape cancels. |
| `over` | {list}, position {position} of {total}. |
| `moved` | {label} moved to position {position} of {total}. (unchanged) |
| `movedTo` | {label} moved to {list}, position {position} of {total}. |
| `cancelled` | Move cancelled. {label} is back in {list}, position {position}. |

A refusal is announced as the app's reason, verbatim.

## 7. Styles (`src/components/sortable.css`)

- `[data-fdy-sortable]:not([data-fdy-sortable=""])` gets a minimum height of `var(--control-h)`.
  Not `:empty`, which whitespace and Vue's `<!--v-if-->` comments defeat.
- `.is-lifted`: same treatment as `.is-dragging`.
- `.is-drop-into`: an inset ring of `var(--focus-ring-width)` in `var(--color-primary)`.
- `.is-drop-refused`: `cursor: not-allowed`, muted content.
- `.fdy-sortable__refusal`: the tooltip's surface, ink, radius and shadow tokens, position fixed.
- Tokens only; no hex, no px in CSS.

## 8. Compatibility

An ungrouped list (`data-fdy-sortable` with no value) runs the 3.27.0 code path unchanged: same
keys, same strings, same event detail plus the three new fields (`fromList`/`toList` = the
container's `data-key` or null, `fromOrder` = `order`). Every sortable list in Ronda is ungrouped
(checked 2026-11-27) and needs no change. The five existing tests in `browser/sortable.mjs` stay as they are,
as the regression guard.

## 9. Tests

New fixture `browser/fixtures/vanilla-sortable-group.html`: three grouped lists (one empty), one
grouped list whose `fdy-sort-check` refuses with a reason, one disabled grouped list, one ungrouped
list, and a scroll container shorter than its content. New spec `browser/sortable-group.mjs`:

1. A drag across lists moves the element; the detail carries the right `fromList`, `toList`,
   `fromOrder`, `order`.
2. A drop on the empty list, and on the space below the last item, lands at the end.
3. A refused list shows `is-drop-refused` and the pill with the reason; releasing there changes
   nothing; `fdy-sort-check` ran once for that list in the gesture.
4. Keyboard: Space, →, →, ↓, Space produces exactly one change; Escape and blur return with none;
   ←/→ skip the disabled list and land on the refused one, where Space repeats the reason.
5. Fixed "keeps its end": an arriving item cannot land above a leading fixed run or below a
   trailing one; a fixed item cannot leave.
6. Auto-scroll: a drag held at the bottom edge of the scroll container raises `scrollTop`, and the
   item lands against one that started out of view.
7. `FreedaySortable.move()` dispatches the same check and change, and returns false on a refusal.
8. Vue: a cancelled cross-list change moves the item between two state arrays, and focus follows
   `data-key` into the destination list.

Each new case is shown red on 3.27.0 before the code lands. The unit, typecheck, bUnit and full
browser gates run as for every release.

## 10. Out of scope

- A typed wrapper. Sortable stays raw markup + `useFreeday`; the kanban (feature 1) gets wrappers.
- The kit's "Move to…" menu (feature 1).
- Nested lists, copying instead of moving, and a ghost image that follows the pointer.
- Touch-specific long-press to start a drag. The handle already has `touch-action: none`.
