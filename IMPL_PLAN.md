# Daily Activity Tracker — Implementation Plan

Build broken into phases, ordered so the highest-risk/blocking dependencies
(ground rules, then credentials, then environment) are resolved before any
feature work starts. Each phase is a checkable task list. See
`PROJECT_PLAN.txt` for the full spec these phases implement.

## Phase 0 — CLAUDE.md (write first, before any other step)

- [x] Read the sibling `CLAUDE.md` files under `D:\first_app` (chatroom_v1,
      cloud_kitchen, context_compressor, dota_2_helper, ks8_learning,
      stock_algo) for house style/conventions
- [x] Write `CLAUDE.md` for this repo: project summary, Claude Code
      instructions (DRY, no magic numbers/strings, ask before new
      dependencies, ask before architecture changes, no dead code, surgical
      diffs)
- [x] Add a Commands section (dev server, build, lint — fill in once those
      exist)
- [x] Add an Architecture Overview section (stub for now, filled in as the
      structure is built in later phases)
- [x] Keep this file updated in the same change whenever architecture,
      conventions, or workflow steps change in later phases

## Phase 1 — Credentials & environment handoff (blocking on the user)

- [x] Ask the user to create a Supabase project (or supply an existing one)
      and hand over the Project URL and publishable (anon-equivalent) API key
- [x] Create `.env` in the repo root with `VITE_SUPABASE_URL` /
      `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase's current name for the
      client-safe key formerly called "anon")
- [x] Create `.env.example` with placeholder values (safe to commit)
- [x] Confirm Node/npm toolchain versions available in the dev environment
      (Node v23.6.1, npm 10.9.2 — no WSL in this environment; later phases
      use native Windows/PowerShell tooling instead)

## Phase 2 — One-time repo/environment setup

- [x] `git init` in `D:\first_app\daily_tracker`
- [x] Create `.gitignore` (node_modules, `.env`, dist/build output, editor
      files)
- [x] Scaffold Vite + React app (`npm create vite@latest . -- --template
      react`)
- [x] Install core dependencies: `@supabase/supabase-js`, a drag-and-drop
      library (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- [x] Evaluate whether a lightweight state tool (e.g. React Query) is
      needed, or plain React state/context suffices (per non-goals: avoid
      Redux-scale ceremony) — decided plain React state/context is
      sufficient at this scale; no new dependency added
- [x] Verify `npm run dev` boots a blank Vite app before continuing

## Phase 3 — Supabase schema

- [x] Design and create `lanes` table (id, name, position, is_system,
      system_type nullable [`delayed`/`completed`])
- [x] Design and create `cards` table (id, lane_id, name, description,
      remind_at nullable, status, position, created_at, completed_at
      nullable)
- [x] Design and create `cards_archive` table (mirrors `cards`,
      append-only, for completed-card history that survives the daily
      COMPLETED-lane reset)
- [x] Seed the two system lanes (DELAYED, COMPLETED) as fixed rows
- [x] Apply schema via Supabase migration (`create_lanes_cards_archive_schema`,
      `add_anon_rls_policies`)
- [x] Document the schema in `CLAUDE.md`'s Architecture Overview once
      stable

## Phase 4 — Data layer (Supabase client wrappers)

- [x] `supabaseClient.js` — client init using `.env` vars
- [x] `data/lanes.js` — CRUD + reorder for lanes
- [x] `data/cards.js` — CRUD + move/reorder for cards, status transitions
- [x] `data/archive.js` — read/write for `cards_archive`
- [x] Tests for `data/constants.js`, `data/lanes.js`, `data/cards.js`,
      `data/archive.js` (Supabase client mocked via `src/test/supabaseMock.js`)

## Phase 5 — Board UI: lanes

- [x] Board layout component rendering lanes left-to-right
- [x] Create/rename/delete lane UI
- [x] Lane reordering (drag or up/down controls)
- [x] DELAYED lane visual treatment (accent color, count badge)
- [x] Plain/minimal styling for user lanes per UX decisions (text label
      only, no user-assignable color)

## Phase 6 — Board UI: cards

- [x] Card component (name, description preview, status indicator,
      reminder time if set)
- [x] Card create/edit modal (name, description, reminder — relative or
      absolute, status), opened from lane "+" or clicking a card
- [x] Drag-and-drop cards between lanes (status field untouched by lane
      moves)
- [x] Manual status change control on card/modal (including manual
      DELAYED)

## Phase 7 — Status automation & system lane transitions

- [x] Client-side check (on load / interval) that flips TODO/IN PROGRESS
      cards to DELAYED when `remind_at` has passed
- [x] Move-to-system-lane logic when status becomes DELAYED or COMPLETED
      (no animation per UX decisions — card is simply in the new lane on
      next render)
- [x] Daily COMPLETED-lane reset check (on load: if completed cards are
      from a previous day, archive them to `cards_archive` and clear from
      the visible board)

## Phase 8 — Reminders & notifications (in-app banner/modal)

- [x] Polling hook (setInterval 10–30s) comparing `now` to each card's
      `remind_at`
- [x] Centered blocking modal listing all newly-fired reminders (queue as
      one modal with a row per card, not one modal per reminder), each row
      with inline Snooze/Complete
- [x] Snooze duration options (5 min / 15 min / 1 hour fixed + custom
      duration input) that update `remind_at` and clear the fired state
- [x] Optional short sound via HTML5 Audio API when a reminder fires

## Phase 9 — Polish & deploy

- [ ] Empty/loading/error states for board and modals
- [ ] Push repo to GitHub
- [ ] Deploy to Vercel, connected to the GitHub repo
- [ ] Wire `.env` vars into Vercel project settings
- [ ] Manual end-to-end verification pass against the Feature List in
      `PROJECT_PLAN.txt` section 4
