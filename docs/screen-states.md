# Freeday — the screens and states every app needs

A checklist for **starting an app from scratch**, and for reviewing one before release. Most of
these screens have no ticket. Nobody asks for "the page after a session expires" until a user
hits a blank screen. Build them from the start, with the rest of the app.

Each entry says what the user has to be told and which Freeday pieces build it. Every class named
here exists in the kit (a test holds this file to that). Where the kit has no piece, the entry says
so. **Do not invent a class to fill the gap.** Layout, such as centring a block on the page, belongs
to your app's own layer (COMPONENTS.md, hard rule on layout).

The middle part follows the "UI stack" idea: every data screen has five states (ideal, empty,
loading, partial, error), and the ideal one is the only one a design usually shows.


## A. System pages

A system page replaces the whole screen body. Build it as one `.fdy-page` holding one `.fdy-state`,
inside the app's normal frame when the user is signed in (so the navigation still works) and
without it when they are not. Every system page answers three questions: **what happened, whose
fault it is, and what to do now.** "Error" answers none of them.

```html
<div class="fdy-page">
  <div class="fdy-state">
    <span class="fdy-state__icon" aria-hidden="true"><!-- icon --></span>
    <h1 class="fdy-state__title">Page not found</h1>
    <p class="fdy-state__text">The address may be mistyped, or the page was moved.</p>
    <div class="fdy-state__actions">
      <a class="fdy-btn" href="/">Back to home</a>
    </div>
  </div>
</div>
```

The state's title is the page's only `<h1>` here, so it takes the `h1` element. It keeps
`.fdy-state__title`, the role that belongs to this block.

| # | Page | When | Tell the user | Primary action |
|---|---|---|---|---|
| 1 | **404 Not found** | No route matches, or the record no longer exists | The address is wrong, or the item was moved or deleted. For a deleted record, say that it was deleted. | Back to home, or back to the list the record came from |
| 2 | **403 Forbidden** | Signed in, but this role may not open it | Which permission is missing, and who can grant it | Back. Optionally "Ask for access" |
| 3 | **401 Session expired** | Not signed in, or the token expired | The session ended. **Nothing is lost** if that is true. | Sign in again, then **return to the same page** |
| 4 | **500 Server error** | The server failed | It is our fault, not theirs. Give a reference code they can quote. | Try again |
| 5 | **503 Maintenance** | Planned downtime | When it will be back | None, or a status page link |
| 6 | **Offline** | No network | What still works offline, and that it retries by itself | Try again |
| 7 | **Link expired or invalid** | A reset, invite or verification link is used late or twice | The link is no longer valid, and why (expired, already used) | Send a new link |
| 8 | **429 Too many attempts** | Rate limited, for example a wrong PIN | How long to wait, as a time, not "later" | None until the wait ends |
| 9 | **Unsupported browser** | A required feature is missing | Which browser versions work | None |

Notes:

- **401 and 403 are different pages.** Sending an expired session to "Forbidden" tells a user who
  is allowed in that they are not. Sending a forbidden user to the sign-in page loops forever.
- The 401 path is the one most often broken. Keep the requested URL, sign the user in, and send
  them back to it. If a form was open, say whether its input survived.
- Use `.fdy-state--danger` for 500 and offline, where something failed. Do not use it for 404 or
  403, where nothing broke.
- A system page inside the app frame keeps the frame's one primary button rule: the page's own
  action is the primary, and the frame has none.
- **Kit gap:** the kit has no offline detection. Listen to the browser's `online` / `offline`
  events in the app. For a short drop, a `Freeday.toast({ variant: 'warning', timeout: 0, key:
  'offline' })` that `Freeday.dismiss('offline')` removes on reconnect is often enough; use the
  full page only when nothing on the screen can work.


## B. States inside a data screen

These replace one data area (a table, a list, a card), not the page. Put the `.fdy-state` inside
the card or section it replaces, so the page header and its actions stay usable.

### 10. Ideal

The data as designed. Design it last, after the four below, because those decide whether the
layout survives real data.

### 11. Empty: three different screens

One "No data" message for all three is the most common defect on this list. Each one needs
different words and a different action:

| Kind | Cause | Words | Action |
|---|---|---|---|
| **First use** | Nothing created yet | What will appear here, and why it is useful | Create the first one (the screen's primary button) |
| **No match** | A search or filter emptied it | Nothing matches *this filter*; name the filter | Clear the filter. A "Create" button is wrong here, since the data exists. |
| **All done** | Everything was handled | Confirmation that the work is finished | Usually none |

- `FdyTable` tells the first two apart for you: its empty slot (`empty` in React, the `empty` slot
  in Vue, `EmptyTemplate` in Blazor) receives `filtered` and `clearFilters`.
- In a small card or dashboard widget, use `.fdy-state--compact`.

### 12. Loading: pick by how long, and by what is waiting

| What is waiting | Use |
|---|---|
| Content whose shape is known (a list, a card, a profile) | `.fdy-skeleton` sized like the real content, so nothing jumps when it lands |
| A table | `FdyTable`'s `loading` (the in-table row, `.fdy-table__state`) |
| One button's action, a short one | Disable the button and put a `.fdy-spinner--sm` in it |
| A long job with a known end (upload, import) | `.fdy-progress` with a real percentage |
| A long job with no known end | `.fdy-progress--indeterminate`, plus words saying what is happening |
| An action the user must not interrupt or repeat (posting, paying) | `Freeday.busy({ caption })`, which also blocks double submission |

- A fast answer gets no spinner, because a flash of one reads as a glitch. `Freeday.busy()` waits
  120 ms before it appears for this reason; give your own loading UI the same delay.
- After about ten seconds, say so ("This is taking longer than usual"). A spinner with no end looks
  the same as a hung app.

### 13. Partial

Some data arrived and some did not, or there is very little of it.

- **A section failed and the rest loaded:** show the rest, and put a `.fdy-state--compact
  .fdy-state--danger` with a retry action where the failed part would be. Do not fail the whole
  page for one widget.
- **Very little data:** a list of one row should still look intentional. Do not stretch it to fill
  a layout designed for fifty rows.
- **Stale data:** if what is shown is cached or old, say how old ("Updated 10 minutes ago").

### 14. Load error: not the same as empty

**A failed request must never render as empty or as zero.** "No payments" when the request failed
tells the user there is nothing to do, which is the opposite of what happened.

- In a data area, use `.fdy-state.fdy-state--danger` with "Try again" in `__actions`. In a widget,
  use the `--compact` form.
- Say whose problem it is. "Could not reach the server" is ours. "You are offline" is the device's.
- Keep the detail (status, request id) available for support, but out of the headline.


## C. Feedback on actions

| # | Moment | Use | Rule |
|---|---|---|---|
| 15 | **Success** | `Freeday.toast({ variant: 'success' })` | Name the thing ("INV-1042 saved"), not just "Saved". For an action that ends a flow (a payment), use a confirmation page or `.fdy-state` instead, because a toast is gone before it is read. |
| 16 | **Destructive confirm** | `Freeday.confirm({ tone: 'danger', details })` | Put the consequence in numbers ("3 schedules are deleted with it"), not "Are you sure?". Name the button for the action ("Delete order"), not "OK". |
| 17 | **Unsaved changes** | `Freeday.confirm` in the router's leave hook | `return isDirty() ? Freeday.confirm({ … }) : true`. Also handle the tab closing (`beforeunload`). |
| 18 | **Form validation** | `data-fdy-validate`, `.fdy-help--error` | The message sits under the field it belongs to, not in one alert at the top. Say how to fix it ("At least 8 characters"), not only that it is wrong. |
| 19 | **Submitting** | Disabled button with `.fdy-spinner--sm`, or `Freeday.busy()` | The second click must do nothing. A double-submitted payment is the expensive version of this bug. |

- Errors from the server after submit (a duplicate code, a rejected payment) go in a
  `.fdy-alert--danger` above the form, and the field it concerns also gets `aria-invalid`.
- Status is never colour-only. Every toast, alert and badge carries words.


## D. Account flows

The kit has **no ready-made sign-in screen or auth layout**, by design, because every app's identity
model differs. Build these from `.fdy-card`, `.fdy-field` and `data-fdy-validate`, centred by your
own layout.

| # | Screen | What it must get right |
|---|---|---|
| 20 | **Sign in** | Say which part was wrong only when that is safe: "Wrong username or password" does not reveal which accounts exist. Show the caps-lock state. After sign-in, return to the page the user asked for (see 401). |
| 21 | **Sign up** | Ask only for what is needed now. Show password rules **before** the user types, not after a failure. |
| 22 | **Forgot / reset password** | The request page says "If that account exists, a link is on its way", whether or not it exists. The reset link expires; its expired page is item 7. |
| 23 | **Verify email or OTP** | Say where the code went (a masked address or number). Offer resend with a visible countdown, and accept a pasted code. |
| 24 | **Onboarding / first run** | Short, skippable, and it ends in the first-use empty state (11) with its create action. `.fdy-stepper` for a multi-step setup. |
| 25 | **Profile and settings** | Each change saves visibly (a toast, or a saved state on the section). Changing the email or password asks for the current password. |
| 26 | **Sign out** | Lands on the sign-in page with "You have signed out", so a shared device is visibly signed out. |


## E. Element states

| # | State | Kit |
|---|---|---|
| 27 | hover, focus, active, disabled, read-only, invalid | Built into every control. Your job is to not remove them: never `outline: none` without a replacement, and never style a disabled control so it looks enabled. |

- **Disabled versus hidden:** hide an action the user can never take. Disable an action they could
  take once something changes, and say what has to change (a `.fdy-help` line or a tooltip).
- Read-only shows the value as text, so it can be selected and copied. It is not a disabled input.


## Before release

Walk every data screen through: ideal · first-use empty · no-match empty · loading · load error ·
one row · a very long name · a phone width. Then walk the app through: 404 · 403 · an expired
session mid-form · offline · a double click on every submit button.
