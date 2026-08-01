# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-user daily activity tracker, structured like a Kanban board: freeform user-created lanes hold cards (task name, optional description, optional reminder, status TODO/IN PROGRESS/COMPLETED/DELAYED). Status is independent of lane — dragging a card between lanes never changes its status. Two system lanes (DELAYED, COMPLETED) sit alongside user lanes and a card moves into the matching one automatically when its status becomes DELAYED or COMPLETED; DELAYED persists, COMPLETED resets daily (archived, not deleted). Reminders fire as an in-app blocking modal (no backend push, no service worker) via a client-side poll against `remind_at`. See `PROJECT_PLAN.txt` for the full original spec and `IMPL_PLAN.md` for the phased build-out and current progress.

## Claude Code Instructions

- Make surgical, minimal diffs — don't refactor what isn't broken, but if you see code repeating in 2+ places, extract something reusable.
- ALWAYS FOLLOW DRY — never repeat even a single line of logic; extract duplicated expressions into a named constant, helper, or shared module.
- NEVER USE MAGIC NUMBERS OR STRINGS — polling intervals, snooze durations, status values, lane type identifiers, and other literals that carry meaning must live in a named constant, not be scattered inline.
- Naming — use long, self-explanatory names for functions and variables. No abbreviations unless universally understood (e.g. `id`, `url`).
- Write modular code — keep functions and components small and single-purpose; split a file when it starts covering more than one concern rather than letting it grow unbounded.
- Always add tests for new logic (data-layer functions, status transitions, reminder scheduling, and other non-trivial behavior); update existing tests when you change behavior they cover.
- No unnecessary comments — don't restate what the code already says. Only comment to explain a non-obvious constraint, workaround, or subtle invariant (e.g. why a status transition is guarded a particular way).
- No emojis and no em dashes (—) in code, commit messages, or this file.
- Get rid of dead code as soon as you see it — don't comment it out or leave it "just in case".
- Never introduce new libraries or dependencies without asking first.
- Never change core architecture (lane/card/status model, system-lane behavior, Supabase schema) without asking first.
- Always use existing patterns in `data/` for new Supabase queries — don't invent a second way to read/write the same table.
- If a proposed approach conflicts with an existing pattern in this codebase, call it out before implementing and prefer the existing pattern unless there's a clear, documented reason to change.
- If a task or request is vague or ambiguous, ask a single clarifying question before writing code to avoid rework.
- Follow the UX decisions already resolved in `PROJECT_PLAN.txt` section 5 (no system-lane transition animation, DELAYED lane visually flagged, blocking reminder modal with queuing, card modal for create/edit, plain lane headers) rather than re-deriving them.
- Keep business logic (status transitions, reminder firing, archiving) out of presentational components.
- Keep this file updated in the same change whenever architecture, conventions, or workflow steps change in later phases.

## Commands

- `npm run dev` - start the Vite dev server
- `npm run build` - production build
- `npm run lint` - oxlint
- `npm run preview` - preview a production build locally
- `npm run test` - run the Vitest suite once
- `npm run test:watch` - run Vitest in watch mode
- `npm run test:e2e` - run the Playwright E2E suite (requires `.env.test`, see Testing section)
- `npm run test:e2e:ui` - run Playwright in UI mode

## Architecture Overview

### Supabase schema

**`lanes`** — organizational and system lanes.
- `id` uuid PK, `name` text, `position` integer (sort order, system lanes seeded at `-2`/`-1` so they sort before user lanes)
- `is_system` boolean, `system_type` text nullable, constrained to `delayed` / `completed`
- Check constraint ties `is_system` and `system_type` together (system lanes must have a `system_type`, user lanes must not)
- Unique partial index on `system_type` (excluding nulls) guarantees exactly one lane per system type
- The two system lane rows are seeded once via migration; the app looks them up by `system_type` at runtime rather than hardcoding their ids

**`cards`**
- `id` uuid PK, `lane_id` FK to `lanes` (cascade delete), `name`, `description` nullable, `remind_at` timestamptz nullable
- `status` text, check constrained to `TODO` / `IN_PROGRESS` / `COMPLETED` / `DELAYED`, default `TODO`
- `position` integer (sort order within a lane), `created_at`, `completed_at` nullable
- Status transitions and the accompanying lane move (into DELAYED/COMPLETED system lanes) are the data layer's responsibility (`data/cards.js`), not a DB trigger — both fields are set together in the same update

**`cards_archive`** — append-only mirror of `cards` for completed-card history.
- Same fields as `cards` plus `original_card_id` (not a FK, since the source row is deleted) and `archived_at`
- `lane_id` is a nullable FK with `on delete set null` since the original lane may later be deleted
- Populated by the daily COMPLETED-lane reset logic (Phase 7), never updated/deleted afterward

**RLS**: enabled on all three tables with permissive `for all using (true) with check (true)` policies for the `anon` role. This is intentional for a single-user, no-auth app using the publishable key directly — not an oversight.

### Data layer

`src/supabaseClient.js` creates the single Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. All table access goes through `src/data/`:

- `data/constants.js` - shared literals (`CARD_STATUS`, `SYSTEM_LANE_TYPE`, the mapping between them, `STATUS_LABEL` display strings, `CARD_STATUS_OPTIONS`, `STATUS_AUTOMATION_POLL_INTERVAL_MS`, `REMINDER_POLL_INTERVAL_MS`, `SNOOZE_DURATION_MS`, `SNOOZE_DURATION_OPTIONS`). Any new status, system-lane-type, or polling-interval/duration literal belongs here, not inline.
- `data/lanes.js` - CRUD and reorder for `lanes`, plus `fetchSystemLane(systemType)` which looks up a system lane by type rather than a hardcoded id.
- `data/cards.js` - CRUD, `moveCardToLane` (lane only, status untouched), `reorderCard`, and `setCardStatus` (the only path that transitions status - when the new status is DELAYED/COMPLETED it looks up the matching system lane and sets `lane_id`, `status`, and `completed_at` together in one update).
- `data/archive.js` - `fetchArchivedCards` and `archiveCard` for `cards_archive`, plus `isFromPreviousLocalDay(isoString, now)`, the local-calendar-day comparison used by the daily COMPLETED reset (deliberately calendar-day, not a rolling 24h window, so the reset lines up with when the user actually expects "today" to end).

New Supabase queries should be added to the matching file in `data/` rather than called ad hoc from components.

### UI layer

- `src/hooks/` - stateful hooks that own loading/mutating a resource and wrap the matching `data/` module (e.g. `useLanes.js` wraps `data/lanes.js`, `useCards.js` wraps `data/cards.js`). Components consume these hooks rather than calling `data/` directly, keeping data fetching and business logic (e.g. computing the next lane's/card's `position`) out of presentational components. `useCards`'s `updateCard` splits status changes out from other field updates and routes status changes through `setCardStatusRequest` (never a plain field update), since only that path performs the system-lane move. `useStatusAutomation(cards, setCardStatus)` runs on mount and on a `STATUS_AUTOMATION_POLL_INTERVAL_MS` interval, flipping any TODO/IN_PROGRESS card whose `remind_at` has passed to DELAYED via the same `setCardStatus` path the manual status control uses, so the system-lane move happens the same way either way. `useDailyCompletedReset(lanes, cards, deleteCard)` runs once per mount (guarded by a ref, not an interval - the reset only needs to fire once when the board is opened on a new day) and archives-then-deletes any card sitting in the COMPLETED system lane whose `completed_at` is from a previous local calendar day. `useReminderQueue(cards, updateCard)` polls on a `REMINDER_POLL_INTERVAL_MS` interval for TODO/IN_PROGRESS cards whose `remind_at` has passed, tracks each card's last-acknowledged `remind_at` in a ref (so a still-overdue card isn't re-queued every poll) and exposes `firedCards`/`snoozeCard`/`dismissCard`; `snoozeCard` updates `remind_at` to now-plus-duration via the plain `updateCard` field-update path (not a status change) and clears the fired state; it fires `playReminderSound` (`src/reminderSound.js`, a Web Audio API beep with no bundled audio asset) once per newly-fired batch, not on every poll.
- `src/components/` - presentational components, one concern per file, with a co-located `*.css` file (e.g. `Board.jsx` / `Board.css`). Components read state and call hook-provided mutators; they don't talk to Supabase or `data/` directly.
- `Board` renders lanes left-to-right and owns the create-lane form, the card create/edit modal, the reminder modal, and a single dnd-kit `DndContext` covering both lane reordering and card dragging (within a lane and across lanes) — drag items are discriminated by a `type` field (`LANE_DRAG_TYPE` / `CARD_DRAG_TYPE` in `dragTypes.js`) in each draggable's `data` payload, not by separate nested contexts. `Lane` renders a single lane's header (rename via double-click, delete, drag handle), its card list (droppable + sortable), and an "+ Add card" control; it is drag-disabled for system lanes (`lane.is_system`). Only user lanes participate in lane reordering; system lanes are always rendered in their fixed position after user lanes. `Card` is a sortable card summary (name, status badge, description preview, formatted reminder time) that opens `CardModal` on click. `CardModal` holds create/edit fields (name, description, status, reminder) — reminder input toggles between relative (amount + unit, computed off `Date.now()` at save time) and absolute (`datetime-local`) modes. `ReminderModal` is the fired-reminder queue's UI: a centered blocking overlay (no click-outside-to-dismiss, per the UX decisions) with one row per fired card rather than one modal per reminder, each row offering the fixed `SNOOZE_DURATION_OPTIONS` buttons plus a custom-minutes input, and a Complete button that routes through `setCardStatus` the same as the manual status control.
- Status/reminder display strings and the reminder relative-unit-to-milliseconds mapping are named constants (`STATUS_LABEL`, `CARD_STATUS_OPTIONS`, `SNOOZE_DURATION_MS`, `SNOOZE_DURATION_OPTIONS` in `data/constants.js`; `RELATIVE_UNIT_TO_MS` in `CardModal.jsx`) rather than inline literals.
- Theme tokens (colors, fonts) live as CSS custom properties in `src/index.css` under `:root` (light) and the `prefers-color-scheme: dark` media query. Lane/card-specific accent tokens (e.g. `--delayed-accent`) follow the same pattern rather than hardcoding colors in component CSS.

### Testing

Vitest with React Testing Library (`jsdom` environment, configured in `vite.config.js`, setup file at `src/test/setup.js`). Vitest is pinned at `^4.1.10` (bumped from 3.2.7 in Phase 6) because vitest 3.2.7 bundles an internal `vite-node` on vite 7, which silently drops the React JSX transform when the top-level `vite` is 8 (any `.test.jsx` component test fails with "React is not defined"); vitest 4.x supports vite 8 directly. `@testing-library/dom` is an explicit devDependency since it's a peer dependency of `@testing-library/react`/`jest-dom` that isn't auto-installed under `--legacy-peer-deps`. Test files live next to the code they cover as `*.test.js` / `*.test.jsx`. Mock `supabaseClient.js` rather than hitting a real Supabase project in tests. Hooks in `src/hooks/` mock the `data/` module they wrap (not `supabaseClient.js`) and use `@testing-library/react`'s `renderHook`/`act`/`waitFor`. Presentational components with real logic (`Card`, `CardModal`) get rendered directly with `@testing-library/react`'s `render`/`screen`/`fireEvent`.

**Known dev-machine constraint.** This repo is developed on an 8GB-RAM Windows machine that's typically down to 2-3GB free (WSL, Docker, VS Code, etc. resident), so `npm run test` (full suite, 12+ files) can hit a JS heap OOM in the middle of a run (`FATAL ERROR: ... JavaScript heap out of memory`, worker fork exits) purely from system memory pressure, not a code defect. Signature of the memory-pressure case: the crash lands during jsdom/environment setup with `0ms` reported test time for the file in flight, and which file trips it varies by what else is resident at the time - it is not reliably the same file twice. Before concluding a new hook/component test has a real leak, isolate it (`npx vitest run <file>`) and rerun a few times; if it passes standalone and the only failures are OOM crashes (not assertion failures) when run alongside the rest of the suite, treat it as this known constraint rather than a bug, note it to the user, and move on rather than iterating further on it.

**End-to-end (Playwright).** Config at `playwright.config.js`, specs in `e2e/*.spec.js`. Unlike Vitest, these drive a real browser against the real Vite dev server and a real (dedicated, free-tier) Supabase project reserved for testing — never the production project referenced by `.env`. Credentials for that project live in `.env.test` (gitignored; `.env.test.example` documents the shape). `playwright.config.js` boots the dev server itself via `vite --mode test`, which makes Vite load `.env.test` over `.env`. `e2e/testDbClient.js` builds a Node-side Supabase client from `.env.test` (parsed manually, no `dotenv` dependency) and exposes `resetTestDatabase()`, which deletes all cards, archived cards, and user-created lanes but leaves the two system lanes alone; `e2e/global-setup.js` runs it once before the suite, and the `page` fixture in `e2e/fixtures.js` runs it again before every test so specs never depend on run order. Tests run with `workers: 1` and `fullyParallel: false` since every test shares one database and the board queries all lanes/cards globally, so concurrent tests would corrupt each other's state. dnd-kit drag interactions are driven with raw `page.mouse` move/down/up sequences (not HTML5 drag events, which dnd-kit doesn't use). `e2e/**` and `playwright.config.js` are excluded from oxlint's `react/rules-of-hooks` via `ignorePatterns` in `.oxlintrc.json`, since Playwright's fixture `use` callback is not a React hook and the directory has no React/JSX to lint. E2E specs cover lane CRUD, card CRUD, drag-and-drop between lanes, and status transitions that move a card into a system lane; they don't yet cover reminders or the daily COMPLETED reset since those (Phases 7-8 in `IMPL_PLAN.md`) aren't implemented.
