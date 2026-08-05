# OS Notifications for Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a reminder fires, also raise a native OS-level browser notification (via the `Notification` API) alongside the existing in-app blocking modal and beep, so a fired reminder is noticed even when the tracker tab is in the background.

**Architecture:** A new dependency-free `src/notifications.js` module (mirroring the existing `src/reminderSound.js` pattern) wraps `Notification` support-detection, one-time permission request, and notification display. Two call sites integrate it additively: `useReminderQueue.js` fires an OS notification for each newly-fired card alongside the existing `playReminderSound()` call, and `CardModal.jsx` requests permission (fire-and-forget) when a card is saved with a reminder set.

**Tech Stack:** React (hooks), Vitest + `@testing-library/react`, native browser `Notification` API (no new npm dependency).

## Global Constraints

- No new npm dependency - native `Notification` API only.
- No service worker, no push notifications while the tab is fully closed.
- No change to `ReminderModal`'s visual design, queueing, or snooze/complete flow.
- No change to `setCardStatus`/status transition logic, the DB schema, or any `data/` layer mutator.
- No visibility-state gating of when the OS notification fires - it always fires unconditionally, even if the tab is already focused.
- `requestNotificationPermissionIfNeeded()` must only ever prompt once (only when `Notification.permission === 'default'`); no separate "have we asked" flag in app state or Supabase - rely on the browser's own persisted permission state.
- Every function in `notifications.js` must no-op (never throw) when `Notification` is unsupported, matching how `reminderSound.js` guards on `AudioContextClass` existing.

---

### Task 1: `src/notifications.js` module with unit tests

**Files:**
- Create: `src/notifications.js`
- Test: `src/notifications.test.js`

**Interfaces:**
- Consumes: nothing (only the global `window.Notification`).
- Produces (for Task 2 and Task 3 to import):
  - `isNotificationSupported(): boolean`
  - `requestNotificationPermissionIfNeeded(): void`
  - `showReminderNotification(card: { name: string, description?: string | null }): void`

This task builds the whole module test-first, in three steps (support check, permission request, show notification), since each has independent branch coverage per the spec's Testing section.

- [ ] **Step 1: Write the failing tests for `isNotificationSupported`**

Create `src/notifications.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isNotificationSupported, requestNotificationPermissionIfNeeded, showReminderNotification } from './notifications'

function installMockNotification({ permission, requestPermission } = {}) {
  const NotificationMock = vi.fn()
  NotificationMock.permission = permission
  NotificationMock.requestPermission = requestPermission ?? vi.fn()
  window.Notification = NotificationMock
  return NotificationMock
}

describe('isNotificationSupported', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('returns true when Notification exists on window', () => {
    installMockNotification({ permission: 'default' })
    expect(isNotificationSupported()).toBe(true)
  })

  it('returns false when Notification does not exist on window', () => {
    delete window.Notification
    expect(isNotificationSupported()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/notifications.test.js`
Expected: FAIL with "Failed to resolve import ./notifications" (the module doesn't exist yet).

- [ ] **Step 3: Write `isNotificationSupported` and rerun**

Create `src/notifications.js`:

```javascript
export function isNotificationSupported() {
  return 'Notification' in window
}
```

Run: `npx vitest run src/notifications.test.js`
Expected: PASS (2 tests).

- [ ] **Step 4: Write the failing tests for `requestNotificationPermissionIfNeeded`**

Append to `src/notifications.test.js`:

```javascript
describe('requestNotificationPermissionIfNeeded', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('does nothing when Notification is unsupported', () => {
    delete window.Notification
    expect(() => requestNotificationPermissionIfNeeded()).not.toThrow()
  })

  it('requests permission when permission is default', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'default', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('does not request permission when already granted', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'granted', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('does not request permission when already denied', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'denied', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run tests to verify the new ones fail**

Run: `npx vitest run src/notifications.test.js`
Expected: FAIL - `requestNotificationPermissionIfNeeded` is not exported yet.

- [ ] **Step 6: Implement `requestNotificationPermissionIfNeeded` and rerun**

Add to `src/notifications.js`:

```javascript
const NOTIFICATION_PERMISSION = {
  DEFAULT: 'default',
  GRANTED: 'granted',
  DENIED: 'denied',
}

export function requestNotificationPermissionIfNeeded() {
  if (!isNotificationSupported()) return
  if (window.Notification.permission !== NOTIFICATION_PERMISSION.DEFAULT) return
  window.Notification.requestPermission()
}
```

Run: `npx vitest run src/notifications.test.js`
Expected: PASS (6 tests).

- [ ] **Step 7: Write the failing tests for `showReminderNotification`**

Append to `src/notifications.test.js`:

```javascript
describe('showReminderNotification', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('does nothing when Notification is unsupported', () => {
    delete window.Notification
    expect(() => showReminderNotification({ name: 'Water plants' })).not.toThrow()
  })

  it('does nothing when permission is default', () => {
    const NotificationMock = installMockNotification({ permission: 'default' })
    showReminderNotification({ name: 'Water plants' })
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('does nothing when permission is denied', () => {
    const NotificationMock = installMockNotification({ permission: 'denied' })
    showReminderNotification({ name: 'Water plants' })
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('constructs a Notification with the card name and description when granted', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderNotification({ name: 'Water plants', description: 'Use the blue can' })
    expect(NotificationMock).toHaveBeenCalledWith('Water plants', { body: 'Use the blue can' })
  })

  it('omits body when the card has no description', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderNotification({ name: 'Water plants', description: null })
    expect(NotificationMock).toHaveBeenCalledWith('Water plants', { body: undefined })
  })

  it('wires onclick to focus the window and close the notification', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    const notificationInstance = { onclick: null, close: vi.fn() }
    NotificationMock.mockImplementation(() => notificationInstance)
    window.focus = vi.fn()

    showReminderNotification({ name: 'Water plants' })
    notificationInstance.onclick()

    expect(window.focus).toHaveBeenCalledTimes(1)
    expect(notificationInstance.close).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 8: Run tests to verify the new ones fail**

Run: `npx vitest run src/notifications.test.js`
Expected: FAIL - `showReminderNotification` is not exported yet.

- [ ] **Step 9: Implement `showReminderNotification` and rerun**

Add to `src/notifications.js`:

```javascript
export function showReminderNotification(card) {
  if (!isNotificationSupported()) return
  if (window.Notification.permission !== NOTIFICATION_PERMISSION.GRANTED) return

  const notification = new window.Notification(card.name, { body: card.description ?? undefined })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
```

Run: `npx vitest run src/notifications.test.js`
Expected: PASS (12 tests total).

- [ ] **Step 10: Run the full suite to confirm no regressions**

Run: `npm run test`
Expected: All files pass, test count increased by 12.

- [ ] **Step 11: Commit**

```bash
git add src/notifications.js src/notifications.test.js
git commit -m "feat: add Notification API wrapper module"
```

---

### Task 2: Fire OS notification alongside the reminder sound in `useReminderQueue`

**Files:**
- Modify: `src/hooks/useReminderQueue.js:1-25`
- Test: `src/hooks/useReminderQueue.test.js`

**Interfaces:**
- Consumes: `showReminderNotification(card)` from `../notifications` (Task 1).
- Produces: no change to `useReminderQueue`'s existing return shape (`{ firedCards, snoozeCard, dismissCard }`).

- [ ] **Step 1: Write the failing test**

Add this import at the top of `src/hooks/useReminderQueue.test.js` (alongside the existing imports):

```javascript
vi.mock('../notifications', () => ({
  showReminderNotification: vi.fn(),
}))
```

Place this `vi.mock` call before the `const { useReminderQueue } = await import('./useReminderQueue')` line, since Vitest hoists `vi.mock` calls to the top of the file automatically, but the mocked module must be registered before the dynamic import that (transitively) pulls in `useReminderQueue.js`.

Then add a new `import { showReminderNotification } from '../notifications'` import and these two test cases inside the `describe('useReminderQueue', ...)` block:

```javascript
  it('shows an OS notification once per newly-fired card alongside the sound', () => {
    const cardOne = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const cardTwo = { id: 'card-2', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [cardOne, cardTwo], updateCard: vi.fn() },
    })

    expect(showReminderNotification).toHaveBeenCalledTimes(2)
    expect(showReminderNotification).toHaveBeenCalledWith(cardOne)
    expect(showReminderNotification).toHaveBeenCalledWith(cardTwo)
  })

  it('does not re-show a notification on a subsequent poll for an already-acknowledged card', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { rerender } = renderHook(({ cards }) => useReminderQueue(cards, vi.fn()), {
      initialProps: { cards: [card] },
    })

    expect(showReminderNotification).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_POLL_INTERVAL_MS)
    })
    rerender({ cards: [card] })

    expect(showReminderNotification).toHaveBeenCalledTimes(1)
  })
```

Also add `beforeEach(() => { showReminderNotification.mockClear() })` to the existing `beforeEach` block (alongside the existing `vi.useFakeTimers()` / `vi.setSystemTime(NOW)` calls) so call counts don't leak between tests.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useReminderQueue.test.js`
Expected: FAIL - `showReminderNotification` was never called (0 calls, expected 2 / 1).

- [ ] **Step 3: Implement the call site**

In `src/hooks/useReminderQueue.js`, add the import and call `showReminderNotification` for each newly-fired card:

```javascript
import { useCallback, useRef, useState } from 'react'
import { REMINDER_POLL_INTERVAL_MS, isCardReminderDue } from '../data/constants'
import { playReminderSound } from '../reminderSound'
import { showReminderNotification } from '../notifications'
import { usePolling } from './usePolling'

export function useReminderQueue(cards, updateCard) {
  const [firedCardIds, setFiredCardIds] = useState([])
  const acknowledgedRemindAtByCardId = useRef(new Map())

  const checkForFiredReminders = useCallback(() => {
    const now = Date.now()
    const newlyFiredCards = cards.filter((card) => {
      if (!isCardReminderDue(card, now)) return false
      return acknowledgedRemindAtByCardId.current.get(card.id) !== card.remind_at
    })

    if (newlyFiredCards.length > 0) {
      setFiredCardIds((currentIds) => [
        ...new Set([...currentIds, ...newlyFiredCards.map((card) => card.id)]),
      ])
      playReminderSound()
      newlyFiredCards.forEach((card) => showReminderNotification(card))
    }
  }, [cards])

  usePolling(checkForFiredReminders, REMINDER_POLL_INTERVAL_MS)

  // ... rest of the file is unchanged (acknowledge, snoozeCard, dismissCard, firedCards, return)
```

Note: this restructures the existing `.filter().map()` chain into `newlyFiredCards` (full card objects) instead of `newlyFiredCardIds`, since `showReminderNotification` needs the card object, not just its id. `.map((card) => card.id)` moves inline into the `setFiredCardIds` call to preserve the exact same dedup behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useReminderQueue.test.js`
Expected: PASS (all 14 tests: 12 existing + 2 new).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm run test`
Expected: All files pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useReminderQueue.js src/hooks/useReminderQueue.test.js
git commit -m "feat: raise an OS notification when a reminder fires"
```

---

### Task 3: Request notification permission on card save when a reminder is set

**Files:**
- Modify: `src/components/CardModal.jsx:1-4, 71-82`
- Test: `src/components/CardModal.test.jsx`

**Interfaces:**
- Consumes: `requestNotificationPermissionIfNeeded()` from `../notifications` (Task 1).
- Produces: no change to `CardModal`'s props or `onSave` payload shape.

- [ ] **Step 1: Write the failing test**

Add near the top of `src/components/CardModal.test.jsx`:

```javascript
vi.mock('../notifications', () => ({
  requestNotificationPermissionIfNeeded: vi.fn(),
}))
```

Add `import { requestNotificationPermissionIfNeeded } from '../notifications'` to the imports, and add `requestNotificationPermissionIfNeeded.mockClear()` to the existing `beforeEach` block.

Add these two test cases inside the `describe('CardModal', ...)` block:

```javascript
  it('requests notification permission on save when a reminder is set', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Task name'), { target: { value: 'Deadline task' } })
    fireEvent.click(screen.getByLabelText('At a specific time'))
    const dateInput = document.querySelector('input[type="datetime-local"]')
    fireEvent.change(dateInput, { target: { value: '2026-08-05T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(requestNotificationPermissionIfNeeded).toHaveBeenCalledTimes(1)
  })

  it('does not request notification permission on save when no reminder is set', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Task name'), { target: { value: 'No reminder task' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(requestNotificationPermissionIfNeeded).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/CardModal.test.jsx`
Expected: FAIL - `requestNotificationPermissionIfNeeded` was never called (0 calls, expected 1) on the first new test; the second new test passes trivially (already 0 calls), so only the first is a true failing test at this point.

- [ ] **Step 3: Implement the call site**

In `src/components/CardModal.jsx`, add the import and call it from `handleSubmit`:

```javascript
import { useEffect, useState } from 'react'
import { CARD_STATUS, CARD_STATUS_OPTIONS, STATUS_LABEL } from '../data/constants'
import { useArmedAction } from '../hooks/useArmedAction'
import { requestNotificationPermissionIfNeeded } from '../notifications'
import './CardModal.css'
```

```javascript
  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    const remindAt = computeRemindAt()
    if (remindAt) requestNotificationPermissionIfNeeded()

    onSave({
      name: trimmedName,
      description: description.trim() || null,
      remindAt,
      status,
    })
  }
```

This is fire-and-forget by construction: `requestNotificationPermissionIfNeeded()` is synchronous and void-returning (Task 1), so calling it plainly here doesn't block or affect `onSave`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CardModal.test.jsx`
Expected: PASS (all tests: existing + 2 new).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm run test`
Expected: All files pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/CardModal.jsx src/components/CardModal.test.jsx
git commit -m "feat: request notification permission when saving a card with a reminder"
```

---

### Task 4: Manual verification and lint/build check

No new files. This task confirms the feature works end-to-end in a real browser and that the full toolchain is clean, per CLAUDE.md's verification-before-completion requirement.

**Files:** none (verification only).

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run the full test suite one more time**

Run: `npm run test`
Expected: All files/tests pass (existing count + 16 new: 12 in `notifications.test.js`, 2 in `useReminderQueue.test.js`, 2 in `CardModal.test.jsx`).

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual browser verification**

Start the dev server against the test project: `npm run dev:test` (background). Using Playwright per CLAUDE.md's "Viewing the app / UI feedback" section, write a throwaway `.mjs` script inside the project directory that:

1. Launches Chromium with notification permission pre-granted (`browser.newContext({ permissions: ['notifications'] })`), so the flow can be exercised without a manual OS permission dialog.
2. Navigates to the local dev URL.
3. Creates a card with a relative reminder set to fire in ~10-15 seconds (1 minute is the smallest unit available in the UI - either accept that wait or temporarily note that the E2E-scale check is: create a card, save, and directly assert `Notification.permission` flipped from `'default'` toward a requested state via `page.evaluate(() => Notification.permission)`).
4. Confirms no console/page errors occurred during save.

Delete the script when done; do not commit it.

- [ ] **Step 5: Confirm no regressions in existing reminder UX**

In the same manual pass, verify the existing modal+beep still fire (no visual/behavioral change) by observing that `ReminderModal` still appears for an overdue card, per the spec's explicit "not instead of them" requirement.

No commit for this task - it's verification only, not a code change.
