# Freeday: Sortable groups, the shared "move" contract (Design Spec)

- **Status:** Draft 2026-11-27, awaiting owner review.
- **Date:** 2026-11-27
- **Owner:** Cahyo D. Kurnianto (Inti Data Utama)
- **Kit version at writing:** 3.27.0. Target release: **3.28.0** (minor, additive).
- **Scope:** one enhancer (`src/freeday-sortable.js`), its stylesheet, one function in the Blazor
  bridge (`adapters/blazor/freeday-blazor.js`), the Vue and React `.d.ts`, COMPONENTS.md, browser
  tests. No typed wrapper: sortable stays raw markup + `useFreeday` / `FreedayBlazor.initAll`.
- **Feature 0 of the owner's four (NEXT-UP §5).** Kanban (1), event calendar (2) and resource
  scheduler (3) build on this contract and get their own specs.

---

## 1. Problem

`data-fdy-sortable` reorders the children of ONE list, by pointer drag or by ↑/↓ on the handle.
COMPONENTS.md says outright: *"Not in the kit: scrolling the page while a drag nears its edge, and
moving items between lists."* A kanban board needs both, and so does any "assign to group" screen.
An app that writes them itself writes the hard half alone: the keyboard path, the announcements,
focus after a framework re-render, and a veto that reaches the user before the drop instead of after.

A second gap, older than this feature: **a Blazor app cannot use sortable correctly today.** The
kit moves the element unless `fdy-sort-change` is cancelled, and the bridge's `FreedayBlazor.on`
forwards events to .NET asynchronously, too late to cancel. So under Blazor the kit always moves
DOM that Blazor owns.

## 2. Decisions

1. **A group is the value of the existing attribute.** `data-fdy-sortable="board"` joins every list
   on the page with the same value. An empty value (today's markup) is a list on its own and
   behaves exactly as in 3.27.0. No new attribute, nothing for existing apps to change.
2. **Keyboard in a group is lift-then-drop.** Activating the handle lifts, arrows move the landing
   mark (←/→ across lists), activating again drops, Escape returns. One event per move. Immediate
   arrows would commit every list passed on the way: moving a card from column 1 to column 3 would
   store it in column 2 first, firing that status's side effects. Ungrouped lists keep immediate ↑/↓.
   (Owner's choice, 2026-11-27.)
3. **The veto comes before the drop, in two forms.** A veto discovered only on drop makes the card
   bounce back for no visible reason, so a refused list is marked, and its reason shown and
   announced, while the item is still held.
   - **Declarative, any stack:** `data-fdy-sort-refuse="Column full (5/5)"` on a list refuses every
     arriving item with that reason. The app binds it to its own state (a WIP limit).
   - **Per item, JavaScript stacks:** `fdy-sort-check` asks the app when a gesture first reaches a
     list, and the handler calls `detail.refuse(reason)`. For rules that depend on the item (this
     card may not skip review). It has to answer synchronously, so it is not available to Blazor;
     Blazor's per-item rules arrive with the kanban wrapper (feature 1), as data.
   A server that refuses later (asynchronously) stays the app's job: revert state, announce, toast.
4. **One move event.** `fdy-sort-change` keeps its name, its cancelability and its 3.27.0 detail,
   and gains `fromList`, `toList`, `fromOrder`. Cancelled, the app moves its state; not cancelled,
   the kit moves the element. Same rule as today.
5. **Blazor gets a synchronous cancel.** `FreedayBlazor.sortOn(element, dotNetRef, method)` cancels
   `fdy-sort-change` in the same turn and forwards the detail, so a Blazor app reorders its list and
   Blazor re-renders. This closes the old gap for ungrouped lists too.
6. **A programmatic path for WCAG 2.5.7.** `FreedaySortable.move(item, toList, index)` runs the same
   refuse → check → change → announce → refocus path, so an app's "Move to…" menu or "Move up"
   buttons get the contract without a drag. It is also the dependable path for screen-reader users,
   whose browse mode may not pass arrow keys to the page (5.4). The kit's own "Move to…" menu
   arrives with the kanban (feature 1).

## 3. Markup contract

```html
<ul class="fdy-sortable" data-fdy-sortable="board" data-key="queued" data-label="Queued">
  <li data-key="c1" data-label="Oil change">
    <button class="fdy-sortable__handle" type="button">…icon…</button> Oil change
  </li>
</ul>
<ul class="fdy-sortable" data-fdy-sortable="board" data-key="done" data-label="Done"
    data-fdy-sort-refuse="Done is full (5 of 5).">…</ul>
```

- **List:** `data-key` names it in events (`fromList`/`toList`); `data-label`, else `aria-label`, is
  what announcements call it. Both optional for an ungrouped list. In a group `data-key` is
  required: events that cannot say which list an item went to are useless to the app. `initAll`
  initialises every other list first, then reports a TypeError naming the group through
  `reportError` (an uncaught error: console, `window.onerror`). Not a synchronous throw: `useFreeday`
  and `FreedayBlazor.initAll` call every enhancer in one loop, and a throw from this one would leave
  every enhancer after it unhydrated.
- **`data-fdy-sort-refuse`** on a grouped list: arriving items are refused with this text as the
  reason. An empty value refuses with the `refused` string (§6). Read at the moment a gesture
  reaches the list and again at drop, so a binding that changes mid-gesture is honoured.
- **Items:** unchanged (`data-key`, `data-label`, `data-fdy-sort-fixed`).
- **Empty-state text** ("No cards yet") goes OUTSIDE the list. Every element child of the list is an
  item. Grouped lists get a minimum height from the kit's CSS, so an empty one remains a target.
- **Group scope is the page.** Two boards on one page need two group names. The value is matched
  through `CSS.escape`, so any string is safe.
- **Group order** is document order. It decides what ←/→ reach.

## 4. Events

### `fdy-sort-check`: may the item enter this list?

Dispatched on the candidate list, bubbling, not cancelable, the first time a gesture (drag, lift or
`move()`) reaches a list of the same group other than the item's own, and only if
`data-fdy-sort-refuse` has not already refused it. Its answer is kept for the rest of that gesture,
so a handler runs once per list per gesture, not per pointer move. Each `move()` call is its own
gesture.

```ts
interface FdySortCheckDetail {
  key: string;            // the item
  fromList: string;       // its list's data-key
  toList: string;         // the candidate's data-key
  refuse(reason: string): void;
}
```

`refuse()` takes effect the moment it is called. An empty reason does not undo it: the kit uses the
`refused` string. (A TypeError would be useless here: an exception thrown inside an event listener
is reported to the console and swallowed by `dispatchEvent`, so the kit would never see the
refusal and the move would go through.) For the same reason, a handler that throws before calling
`refuse()` refuses nothing; the error reaches the console.

Not dispatched for a move within one list: reordering does not change which list an item is in.

### `fdy-sort-change`: the move

Dispatched on the **destination** list, bubbling, cancelable. One listener on the board wrapper
receives every move.

```ts
interface FdySortChangeDetail {
  key: string;
  from: number;               // index in the source list before the move
  to: number;                 // index in the destination list after the move
  order: string[];            // destination list, after the move (unchanged meaning)
  fromList: string | null;    // the list's data-key; null when it has none
  toList: string | null;
  fromOrder: string[];        // source list after the item left; equals `order` within one list
}
```

Not cancelled, the kit moves the element. Cancelled, the DOM is left as it was and the app moves its
state. Either way the kit announces the move. The announcement says the move happened; if the app's
server then refuses, the app reverts and announces that itself.

### Focus after a keyboard or `move()` path

The kit puts focus on the moved item's handle, found by `data-key` in the **destination** list. A
framework renders when it renders: Vue and React before the next task, Blazor after an interop round
trip. So the kit does not look once on a timer. It looks immediately, then watches the destination
list (MutationObserver) until an element with that key appears, for at most 2 seconds. If it never
appears (the app reverted), focus is left on the source handle while it is still in the document.
It never takes focus from a user who has moved on: it acts only while focus is still where it was
when the move was made, on the source handle, or lost to `<body>` (the focused element removed).

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
- A refused list (`data-fdy-sort-refuse` or `refuse()`) is not a destination for the rest of the
  gesture.
- These rules are checked again at the drop, against the DOM as it is then: a list disabled, refused
  or removed mid-gesture is not dropped into.

### 5.2 Pointer

- The handle holds pointer capture, as today, so every move reaches the source list's listeners
  wherever the pointer is. Hit testing walks up from `elementFromPoint` to the nearest list of the
  item's group.
- Over an item: before or after it by the vertical midpoint, as today.
- Over a grouped list but no item (an empty list, or the space under the last card of a tall
  column): the end of the list. An ungrouped list keeps 3.27.0's rule, items only. Marked `is-drop-into` on an empty list, `is-drop-after` on the last item
  otherwise.
- Over a refused list: `is-drop-refused` on the list (its content muted), no landing mark, and the
  reason in a `.fdy-sortable__refusal` pill the kit places at the top of the list's visible part,
  clamped into the viewport. The pill has `pointer-events: none`, or hit testing would find it
  instead of the list underneath. Released there, nothing moves and no change fires. The reason is
  announced once per list per gesture. No cursor change: the handle holds pointer capture, and a
  captured pointer shows the capturing element's cursor, not the list's.
- Escape cancels, as today. `pointercancel` cancels.

### 5.3 Auto-scroll

While a pointer drag is active, for each axis the kit finds the nearest ancestor of the element
under the pointer (ending at the viewport) that can still scroll toward the edge the pointer is
near, and scrolls it:

- Band: the smaller of 48px and 15% of the container's size on that axis.
- Speed: proportional to how deep into the band the pointer is, up to 16px per frame.
- Both axes, independently: a long column scrolls vertically while the wide board around it
  scrolls horizontally.
- Driven by `requestAnimationFrame`, so it keeps scrolling while the pointer is still. After each
  step the landing mark is recomputed from the last pointer position.
- Stops on drop, cancel, or the pointer leaving every band.

The keyboard path needs no band: each step calls `scrollIntoView({block:'nearest',
inline:'nearest'})` on the marked item or list.

### 5.4 Keyboard in a group (lift-then-drop)

| On a handle | Not lifted | Lifted |
|---|---|---|
| Activate (Space, Enter) | lift | drop at the mark (on a refused list: repeat the reason, stay lifted) |
| ↑ / ↓ | nothing (ungrouped lists: move one step, as today) | move the mark within the current list |
| ← / → | nothing | mark the previous / next list of the group, same position clamped to its length; skips disabled lists, does NOT skip refused ones. Mirrored when the board's computed `direction` is `rtl`, so the arrow points where the mark goes |
| Escape | nothing | return, no event |

- **Lift and drop hang off the button's activation (`click` with `detail === 0`), not off a
  `keydown` for Space or Enter.** A screen reader in browse mode activates a button with a
  synthesized click and never sends the key. A real pointer click (`detail >= 1`) is a press
  without travel and does nothing, as today.
- Screen readers in browse mode may also keep the arrow keys for their own cursor. The lift
  announcement still tells the user where they are, and `move()` (an app's "Move to…" control) is
  the path that never depends on key pass-through.
- Lifted: `is-lifted` on the item, `is-sorting` on its list, the landing mark as for a drag.
- Nothing in the DOM moves until the drop, so the handle keeps focus throughout.
- Focus leaving the handle cancels the lift. So does the lifted item or the marked list leaving the
  DOM (a realtime re-render): the lift is cancelled and announced, and no change fires for an item
  that no longer exists.
- Refused lists are landed on, not skipped, so a keyboard user hears why the column is closed
  instead of finding it silently missing.
- Lists of one group stacked vertically are still reached with ←/→; ↑ at the top of a list stays
  there.

### 5.5 `FreedaySortable.move(item, toList, index)`

`item` is an item element, `toList` a list element of the same group (or the item's own list),
`index` the destination position. Returns `true` when a change was dispatched, `false` when the move
is not allowed (5.1) or refused (the reason is then announced). Throws a TypeError for an item that
is not in a sortable list or a `toList` that is not a sortable list. Focus follows as in §4.

### 5.6 `FreedayBlazor.sortOn(element, dotNetRef, methodName)`

Listens for `fdy-sort-change` on `element`, calls `preventDefault()` in the same turn, and forwards
the detail (JSON-safe, as `on()` does) to the `[JSInvokable]` method. Returns a token for
`FreedayBlazor.off`. A Blazor app moves the item in its own collection there and Blazor renders it;
focus follows by `data-key` (§4). The per-item check is not bridged (§2.3).

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
| `refused` | {list} does not take {label}. (used only when a refusal gives no reason) |

A refusal with a reason is announced as the app's reason, verbatim.

## 7. Styles (`src/components/sortable.css`)

- `[data-fdy-sortable]:not([data-fdy-sortable=""])` gets a minimum height of `var(--control-h)`.
  Not `:empty`, which whitespace and Vue's `<!--v-if-->` comments defeat.
- `.is-lifted`: same treatment as `.is-dragging`.
- `.is-drop-into`: an inset ring of `var(--focus-ring-width)` in `var(--color-primary)`.
- `.is-drop-refused`: muted content.
- `.fdy-sortable__refusal`: the tooltip's surface, ink, radius and shadow tokens, `position: fixed`,
  `pointer-events: none`.
- Tokens only; no hex, no px in CSS.

## 8. Compatibility

An ungrouped list (`data-fdy-sortable` with no value) runs the 3.27.0 code path unchanged: same
keys, same strings, same event detail plus the three new fields (`fromList`/`toList` = the
container's `data-key` or null, `fromOrder` = `order`). One deliberate change reaches it: focus
after a keyboard step now waits for the item to appear (§4) instead of looking once on a timer,
which only matters to a stack that renders later than the next task. Every sortable list in Ronda
is ungrouped (checked 2026-11-27) and needs no change. The five existing tests in
`browser/sortable.mjs` stay as the regression guard, with one edit: the first compares the event
detail with `deepEqual`, so its expected object gains `fromList: null, toList: null, fromOrder`.
Under the type policy this is `### Added`, not breaking: no existing field changes type.

## 9. Tests

New fixture `browser/fixtures/vanilla-sortable-group.html`: three grouped lists (one empty), one
grouped list refused by `data-fdy-sort-refuse`, one whose `fdy-sort-check` refuses one item key
with a reason, one disabled grouped list, one ungrouped list, and a scroll container shorter than
its content. New spec `browser/sortable-group.mjs`:

1. A drag across lists moves the element; the detail carries the right `from`, `to`, `fromList`,
   `toList`, `fromOrder`, `order`.
2. A drop on the empty list, and on the space below the last item, lands at the end.
3. Refusal: both lists show `is-drop-refused` and the pill with the reason; releasing there changes
   nothing; `fdy-sort-check` ran once for its list in the gesture; a handler calling `refuse('')`
   still refuses, with the `refused` string.
4. Keyboard: activate, →, →, ↓, activate produces exactly one change; Escape and blur return with
   none; ←/→ skip the disabled list and land on the refused one, where activating repeats the
   reason. Lift also works from `handle.click()` (a `detail === 0` click, as a screen reader
   sends), and a pointer click without travel does not lift.
5. Fixed "keeps its end": an arriving item cannot land above a leading fixed run or below a
   trailing one; a fixed item cannot leave.
6. Auto-scroll: a drag held at the bottom edge of the scroll container raises `scrollTop`, and the
   item lands against one that started out of view.
7. `FreedaySortable.move()` dispatches the same check and change, returns false on a refusal, and
   puts focus on the moved handle when the app re-renders 300ms later (the late-render case).
8. Vue: a cancelled cross-list change moves the item between two state arrays, and focus follows
   `data-key` into the destination list.
9. Blazor bridge: with `freeday-blazor.js` and a stub `dotNetRef`, `sortOn` leaves the DOM unmoved
   and forwards the detail.

WebKit (`webkit/sortable-group.spec.mjs`, in the existing WebKit job): a cross-list pointer drag and
an auto-scroll on the same fixture. Pointer capture, `elementFromPoint` under capture and scrolling
during a drag are where engines have differed, and Safari on iPad is a real target for a kit app.

Each new case is shown red on 3.27.0 before the code lands. The unit, typecheck, bUnit and full
browser gates run as for every release.

## 10. Out of scope

- A typed wrapper. Sortable stays raw markup; the kanban (feature 1) gets wrappers in all three
  stacks, including Blazor's per-item rules.
- The kit's "Move to…" menu (feature 1).
- Nested lists, copying instead of moving, and a ghost image that follows the pointer.
- Touch-specific long-press to start a drag. The handle already has `touch-action: none`.
