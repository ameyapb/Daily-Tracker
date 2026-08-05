# Browser (OS) notifications for reminders

## Problem

Reminders currently fire as an in-app blocking modal (`ReminderModal`) plus a Web Audio beep (`playReminderSound`). Both only get noticed if the tracker tab is focused (or at least visible/audible) at the moment the reminder fires. In practice the tab is usually open in a background tab/window most of the day, so a reminder firing there is easy to miss entirely until the user happens to switch back.

Desired behavior: when a reminder fires, also raise a native OS-level notification (via the browser `Notification` API) so it's visible even when the tracker tab isn't focused, in addition to the existing modal/beep - not instead of them.

## Scope

- New `src/notifications.js` module wrapping the `Notification` API.
- `useReminderQueue.js` - fire an OS notification alongside the existing sound when a reminder newly fires.
- `CardModal.jsx` - request notification permission at the point the user first expresses intent to use a reminder (saving a card with `remind_at` set).
- No changes to: `ReminderModal`'s queue/snooze/complete UI or logic, `setCardStatus`/status transition logic, the DB schema, or any `data/` layer mutator.
- No service worker, no push notifications while the tab is fully closed - confirmed out of scope, since the tab is normally kept open in the background during the day and this app deliberately has no backend push (per CLAUDE.md).

## Architecture

New module `src/notifications.js`, structured the same way as the existing `src/reminderSound.js` (a small, dependency-free wrapper, no new library):

- `isNotificationSupported()` - `'Notification' in window`.
- `requestNotificationPermissionIfNeeded()` - calls `Notification.requestPermission()` only when `Notification.permission === 'default'` (i.e. never yet asked). No-op if unsupported, already granted, or already denied - so it only ever prompts once, never nags.
- `showReminderNotification(card)` - no-ops unless `Notification.permission === 'granted'`. Otherwise constructs `new Notification(card.name, { body: card.description ?? undefined })` and wires `onclick` to `window.focus()` plus closing the notification.

Integration is additive at two call sites:

1. **`useReminderQueue.js`** - in `checkForFiredReminders`, after updating `firedCardIds` with newly-fired cards, call `showReminderSummaryNotification(count)` with the total number of currently-unacknowledged fired cards (not just the newly-fired ones), alongside the existing `playReminderSound()` call. `acknowledge()` (called by both `dismissCard` and `snoozeCard`) also recomputes the remaining unacknowledged count afterward: closes the tracked notification if it reaches 0, otherwise re-shows the summary with the updated count. The modal queue state (`firedCardIds`, `acknowledge`, `snoozeCard`, `dismissCard`) is untouched by this; the notification is a pure side effect layered on top of the same "newly fired"/"acknowledged" tracking that already exists.
2. **`CardModal.jsx`** - on save (create or edit), if the saved card has `remind_at` set, call `requestNotificationPermissionIfNeeded()`. Fire-and-forget (not awaited into the save flow, doesn't block or affect save success/failure). If the user denies or the browser doesn't support notifications, the app falls back silently to the existing modal+beep with no error surfaced and no repeated prompting.

Because permission is browser/site-scoped and persists across sessions, `requestNotificationPermissionIfNeeded()`'s internal `Notification.permission === 'default'` check is sufficient to avoid re-prompting - no separate "have we asked before" flag needs to be stored in app state or Supabase.

### Revision (2026-08-05): batched summary notification instead of one per card

The original design (below, "Multiple cards firing in the same poll tick") deliberately let OS notifications stack one-per-card, on the assumption they'd only ever fire once each. In practice, `useStatusAutomation` transitions overdue cards to DELAYED one at a time on mount, and each transition changes the `cards` reference, which re-triggers `useReminderQueue`'s polling effect (its callback depends on `[cards]`). Because `showReminderNotification` had no memory of "already shown," every one of those re-renders re-fired a fresh OS notification for every still-unacknowledged overdue card - with N overdue cards (e.g. several overdue test cards after not opening the tracker for a day), this produced roughly N rounds of stacked notifications, each requiring its own dismissal.

Fix: `showReminderNotification(card)` is replaced with `showReminderSummaryNotification(count)`, which always uses a fixed `tag: 'reminder-summary'` on the `Notification` options. Browsers replace an existing notification sharing a tag rather than stacking a new one, so no matter how many times `checkForFiredReminders` re-runs, at most one OS notification is ever visible, showing a generic count ("You have 3 reminders due" / "You have 1 reminder due"). `useReminderQueue` keeps the returned `Notification` instance in a ref so `acknowledge()` can close it once the unacknowledged count reaches 0, or re-show it with a lower count otherwise. No per-card name is included in the notification body - this was an explicit simplicity tradeoff (see edge cases) rather than an oversight.

## Edge cases

- **Permission denied.** `showReminderSummaryNotification` checks `permission === 'granted'` before constructing anything, so a denied/default permission state is a silent no-op - existing modal+beep behavior is completely unaffected.
- **Unsupported browser.** `isNotificationSupported()` guards `requestNotificationPermissionIfNeeded`; `showReminderSummaryNotification` itself also tolerates `Notification` being undefined by checking support first, mirroring how `reminderSound.js` already guards on `AudioContextClass` existing.
- **Multiple cards firing in the same poll tick, or across successive re-renders.** `useReminderQueue` already batches newly-fired cards into one array before updating state; the OS side now shows a single tagged summary notification reflecting the total unacknowledged count (see "Revision" above) rather than one notification per card, while the modal still queues all of them into the single combined `ReminderModal` as today. No card names are included in the summary - accepted tradeoff for simplicity and to avoid an unbounded-length notification body when many cards fire at once.
- **Tab already focused when a reminder fires.** Per design decision, the OS notification still fires unconditionally (not gated on `document.visibilityState`) to keep the logic simple - the tradeoff (an occasionally redundant notification while already looking at the modal) was accepted explicitly in favor of not adding visibility-tracking logic.
- **Clicking the notification.** Only focuses the tab (`window.focus()`) and closes itself; it does not snooze/complete directly. The already-queued `ReminderModal` is what the user interacts with after the tab regains focus - no duplicate action path to keep in sync with the modal's own snooze/complete logic. Unchanged by the summary-notification revision.
- **Permission requested with no reminder set.** `CardModal`'s save handler only calls `requestNotificationPermissionIfNeeded()` when the saved card's `remind_at` is non-null, so saving a card without a reminder never triggers the browser permission prompt.

## Testing

- `notifications.js` gets its own unit test file (`notifications.test.js`), mocking the global `Notification` constructor/`permission`/`requestPermission`, covering: no-op when unsupported, no-op when already granted/denied, prompts once when `default`, `showReminderSummaryNotification` constructs with the correct singular/plural body text and a fixed `tag` only when granted, returns the instance, and does nothing (returns undefined) otherwise.
- `useReminderQueue.test.js`: asserts `showReminderSummaryNotification` (mocked) is called with the correct total unacknowledged count when one or several cards fire together; is called again with an updated (lower) count - not a fresh unrelated notification - when one card is dismissed/snoozed while others remain fired; is not re-called with a stale/duplicate count on a subsequent poll where nothing new fired; and that the tracked notification's `.close()` is called once the last unacknowledged card is dismissed/snoozed. Also covers the original pileup scenario directly: multiple `cards`-reference changes in quick succession (simulating `useStatusAutomation`'s one-at-a-time transitions) still result in only one visible summary notification, not one per re-render.
- `CardModal.test.jsx` gets cases asserting `requestNotificationPermissionIfNeeded` (mocked) is called on save when `remind_at` is set, and not called when it's left unset.

## Out of scope / explicitly not changing

- No service worker, no push notifications while the tab is fully closed.
- No change to `ReminderModal`'s visual design, queueing, or snooze/complete flow.
- No new npm dependency - native `Notification` API only.
- No visibility-state gating of when the OS notification fires (see edge cases).
- No card names in the notification body - generic count only, per the 2026-08-05 revision above.
