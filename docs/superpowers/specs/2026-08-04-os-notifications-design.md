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

1. **`useReminderQueue.js`** - in `checkForFiredReminders`, for each newly-fired card, call `showReminderNotification(card)` alongside the existing `playReminderSound()` call. The modal queue state (`firedCardIds`, `acknowledge`, `snoozeCard`, `dismissCard`) is untouched; the notification is a pure side effect layered on top of the same "newly fired" detection that already exists.
2. **`CardModal.jsx`** - on save (create or edit), if the saved card has `remind_at` set, call `requestNotificationPermissionIfNeeded()`. Fire-and-forget (not awaited into the save flow, doesn't block or affect save success/failure). If the user denies or the browser doesn't support notifications, the app falls back silently to the existing modal+beep with no error surfaced and no repeated prompting.

Because permission is browser/site-scoped and persists across sessions, `requestNotificationPermissionIfNeeded()`'s internal `Notification.permission === 'default'` check is sufficient to avoid re-prompting - no separate "have we asked before" flag needs to be stored in app state or Supabase.

## Edge cases

- **Permission denied.** `showReminderNotification` checks `permission === 'granted'` before constructing anything, so a denied/default permission state is a silent no-op - existing modal+beep behavior is completely unaffected.
- **Unsupported browser.** `isNotificationSupported()` guards `requestNotificationPermissionIfNeeded`; `showReminderNotification` itself also tolerates `Notification` being undefined by checking support first, mirroring how `reminderSound.js` already guards on `AudioContextClass` existing.
- **Multiple cards firing in the same poll tick.** `useReminderQueue` already batches newly-fired cards into one array before updating state; the notification loop iterates that same array, so each card gets its own OS notification (they stack natively in the OS tray) while the modal still queues all of them into the single combined `ReminderModal` as today.
- **Tab already focused when a reminder fires.** Per design decision, the OS notification still fires unconditionally (not gated on `document.visibilityState`) to keep the logic simple - the tradeoff (an occasionally redundant notification while already looking at the modal) was accepted explicitly in favor of not adding visibility-tracking logic.
- **Clicking the notification.** Only focuses the tab (`window.focus()`) and closes itself; it does not snooze/complete directly. The already-queued `ReminderModal` is what the user interacts with after the tab regains focus - no duplicate action path to keep in sync with the modal's own snooze/complete logic.
- **Permission requested with no reminder set.** `CardModal`'s save handler only calls `requestNotificationPermissionIfNeeded()` when the saved card's `remind_at` is non-null, so saving a card without a reminder never triggers the browser permission prompt.

## Testing

- `notifications.js` gets its own unit test file (`notifications.test.js`), mocking the global `Notification` constructor/`permission`/`requestPermission`, covering: no-op when unsupported, no-op when already granted/denied, prompts once when `default`, `showReminderNotification` constructs with correct title/body only when granted, and does nothing otherwise.
- `useReminderQueue.test.js` gets a case asserting `showReminderNotification` (mocked) is called once per newly-fired card alongside `playReminderSound`, and is not re-called on a subsequent poll for an already-acknowledged card (mirroring the existing "only fires once per remind_at" coverage for the sound).
- `CardModal.test.jsx` gets cases asserting `requestNotificationPermissionIfNeeded` (mocked) is called on save when `remind_at` is set, and not called when it's left unset.

## Out of scope / explicitly not changing

- No service worker, no push notifications while the tab is fully closed.
- No change to `ReminderModal`'s visual design, queueing, or snooze/complete flow.
- No new npm dependency - native `Notification` API only.
- No visibility-state gating of when the OS notification fires (see edge cases).
