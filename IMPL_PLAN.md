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

## Phase 8.1 — Design tokens & typography foundation ("Paper Planner")

Visual/UX-only redesign phase (no architecture, data, or behavior changes).
Direction: a warm, tactile analog-planner aesthetic — cream/paper background,
ink-dark text, terracotta accent, index-card cards — chosen from three
options presented via the frontend-design skill. Distinctiveness comes from
materiality (paper grain, folded-corner completed cards, a washi-tape flag
on the DELAYED lane, ledger-style rules), not palette alone.

- [x] `npm install @fontsource/fraunces @fontsource/inter
      @fontsource/ibm-plex-mono`; import needed weights (Fraunces 500/600,
      Inter 400/500/600, IBM Plex Mono 400/500) in `main.jsx`
- [x] Replace scaffold color/type tokens in `src/index.css` (`:root` and the
      dark-mode media query) with the Paper Planner token set (`--bg`,
      `--surface`, `--ink`, `--ink-muted`, `--rule`, `--accent`,
      `--accent-bg`, `--delayed`, `--delayed-bg`, `--completed`,
      `--completed-bg`, `--shadow`); grep for old token names
      (`--text`, `--text-h`, `--border`, `--code-bg`, `--delayed-accent*`)
      across all `.css` files to confirm nothing is left dangling
- [x] Update `<title>` in `index.html` from `vite-scaffold` to the app name
- [x] Add a faint paper-grain/dot-grid texture background layer to `.board`
      in `Board.css` (CSS gradient only, no image asset)
- [x] Update `CLAUDE.md`'s Architecture Overview theming note to describe
      the new token set

## Phase 8.2 — Board & lane visual redesign

- [x] Restyle `Lane.css`: ledger-style hairline dividers between lanes
      instead of individually boxed lanes; header stays text-only per
      `PROJECT_PLAN.txt` section 5, using the new type tokens
- [x] Restyle the DELAYED lane's flagged treatment (`Lane.jsx`/`Lane.css`,
      `lane--delayed`) as a washi-tape-style header accent rather than a
      plain colored border
- [x] Restyle the lane count badge (`lane__badge`) using the mono font
- [x] Restyle `board__add-lane` form controls with the new tokens

## Phase 8.3 — Card visual redesign

- [x] Restyle `Card.css` for an index-card look (surface color, warm
      shadow, considered border/corner treatment)
- [x] Add a folded-corner treatment for COMPLETED-status cards (CSS-only
      pseudo-element, gated on the existing `card__status--completed`
      modifier, no new data)
- [x] Restyle status badges with the new accent/delayed/completed tokens;
      reminder timestamp switches to the mono font

## Phase 8.4 — Modal redesign (CardModal, ReminderModal)

- [x] Restyle `CardModal.css` with new tokens, display font heading,
      refined form field spacing/borders
- [x] Restyle `ReminderModal.css` (the blocking reminder surface) with
      reinforced urgency framing via the delayed/accent tokens; refine row
      and snooze button styling
- [x] No change to modal behavior, queuing logic, or DOM roles/aria-labels
      (existing tests assert on these)

## Phase 8.5 — Copy & empty-state pass

- [x] Tighten UI copy (button labels, placeholders) toward plain-spoken,
      active-voice wording per the frontend-design skill's writing guidance
- [x] Cross-reference with Phase 9's empty/loading/error states bullet —
      8.5 covers copy tone, Phase 9 covers whether the states exist

## Phase 8.6 — Responsive & accessibility pass

- [x] Verify visible keyboard focus states with the new tokens
      (global `:focus-visible` ring added in `index.css`, replacing
      per-component `outline: none`-only `:focus` rules)
- [x] Verify WCAG AA color contrast (ink-on-cream, ink-on-surface,
      badge text-on-bg) in both light and dark variants (added
      `--accent-text` token for accent-as-text usage, which fell
      short of 4.5:1 in light mode; everything else already passed)
- [x] Smoke-check horizontal board scroll and lane width at narrow
      viewport widths (desktop-first app, no dedicated mobile layout)
      (verified via Playwright at 375px/600px: `.board` scrolls
      horizontally, fixed-width lanes never compress)
- [x] Respect `prefers-reduced-motion` for any new hover/transition
      affordances (global reduced-motion override in `index.css`)

## Phase 9 — Polish & deploy

- [ ] Empty/loading/error states for board and modals
- [ ] Push repo to GitHub
- [ ] Deploy to Vercel, connected to the GitHub repo
- [ ] Wire `.env` vars into Vercel project settings
- [ ] Manual end-to-end verification pass against the Feature List in
      `PROJECT_PLAN.txt` section 4

## Phase 10 — Woodland theme: meadow strip + hopping rabbits

Visual/atmosphere-only addition (no data, architecture, or interaction-model
changes). Direction: a "polished indie game UI" woodland scene layered under
the existing board, built with hand-picked free Lottie animations (rabbits,
grass/bush) played via `lottie-react`. Board usability is not affected: the
meadow is a fixed-position 120px strip pinned to the bottom of the viewport,
board content scrolls independently above/behind it.

- [x] `npm install lottie-react` (new dependency, approved by the user for
      this phase)
- [x] Source free-license rabbit Lottie assets from LottieFiles (user
      browsed and supplied `.lottie` files directly, since LottieFiles
      blocks automated fetching and licensing needs a human check); all
      three arrived in this same session and are stored under
      `src/assets/lottie/`, but only `Squeeze bunny` is used in Phase 10 -
      `Baby Rabbit` and `Rabbit In A Hat` are held for Phase 11/12 (see
      those phases for their mapping). Every `.lottie` file is a dotLottie
      zip (`manifest.json` + one `animations/*.json`, pure vector, no
      embedded raster images); either unzip to get the raw Lottie JSON for
      `lottie-react`'s `Lottie` component, or add
      `@lottiefiles/dotlottie-react`'s `DotLottieReact` component to load
      `.lottie` files directly (new dependency, ask first if going that
      route instead of unzipping)
      - `Squeeze bunny _(.lottie` - 512x512, ~2s loop (60 frames @ 30fps),
        2 layers, simple idle/squeeze hop. **Used for:** the main looping
        rabbit(s) in the meadow strip, repeated at staggered
        speed/position/delay per `WOODLAND_RABBIT_COUNT`.
- [x] `src/components/Meadow.jsx` / `Meadow.css` — fixed-position bottom
      strip (120px tall, full viewport width, above all other content via
      z-index but never intercepting board pointer events outside its own
      strip), grass background layer plus several independently animated
      "Squeeze bunny" instances (`lottie-react` `Lottie` components)
      hopping/idling across the strip on staggered loops
      (`WOODLAND_RABBIT_COUNT`, per-rabbit speed/delay as named constants
      in `src/components/meadowConstants.js`, not inline literals). Wired
      to the real "Squeeze bunny" animation (`squeeze-bunny.json`, unzipped
      from the dotLottie asset). Found and fixed a real bug along the way:
      `lottie-react` 2.4.1 has no package.json `exports` field, so Vite
      resolved its `main` (a UMD/CJS bundle) instead of `module` (the ESM
      build); CJS-to-ESM interop then wrapped the whole module as
      `default`, so `import Lottie from 'lottie-react'` silently resolved
      to the module object instead of the component, crashing the render
      with "Element type is invalid". Fixed via a `resolve.alias` in
      `vite.config.js` pointing `lottie-react` at its ESM build directly.
- [x] Mount `Meadow` once at the `Board` root, sibling to the existing board
      content, not nested inside the scrollable `.board` element
- [x] Respect `prefers-reduced-motion`: rabbits render statically (or the
      strip is hidden) rather than looping, consistent with the existing
      reduced-motion override in `index.css`. Added `usePrefersReducedMotion`
      (`src/hooks/usePrefersReducedMotion.js`) since this is the first
      JS-driven (not CSS-driven) animation in the app — Lottie plays via
      its own JS render loop, so the existing global CSS
      `animation-duration: 0.01ms !important` override has no effect on it;
      the hook gates `Lottie`'s `loop`/`autoplay` props directly, alongside
      a CSS override on the wrapper's separate hop-across-strip animation.
- [x] Verify the meadow strip never covers interactive board content (card
      modal, reminder modal, last lane row) at common viewport heights;
      board remains fully usable with the strip present. Verified via a
      Playwright screenshot pass: `.board` gets bottom padding equal to the
      meadow height so lane content never sits under the strip; modal
      z-indices (100, 200) are already above the meadow's (10).

## Phase 11 — Woodland theme: idle behaviors + game-UI chrome polish

- [x] Add idle-behavior variety to the meadow using `Baby Rabbit.lottie`
      (800x800, ~6.5s loop, rabbit emerging from a pit; already downloaded
      to `src/assets/lottie/` in Phase 10's asset-sourcing pass, unused
      until now): fires on a random per-instance interval rather than
      looping continuously, positioned near a bush graphic. Unzipped to
      `src/assets/lottie/baby-rabbit.json` (same dotLottie-to-raw-JSON
      approach as `squeeze-bunny.json` in Phase 10). New
      `src/hooks/useBushIdleEvent.js` schedules a one-shot play on a
      random `RABBIT_IDLE_BEHAVIOR_INTERVAL_MS` delay (an existing but
      previously-unused constant in `meadowConstants.js`), holds it
      playing for `BABY_RABBIT_ANIMATION_DURATION_MS`, then reschedules;
      gated on `!prefersReducedMotion` the same way the hopping rabbits
      are. `Meadow.jsx` renders `WOODLAND_BUSH_COUNT` (new constant)
      `BushIdleRabbit` instances, each owning its own hook call so timings
      are independent per bush. The bush itself is a CSS-only radial
      gradient cluster (`.meadow__bush`, `Meadow.css`), consistent with
      the no-image-asset grass background from Phase 10; the Lottie only
      renders while `isPlaying` is true rather than being mounted
      continuously, so idle GPU/JS cost between fires is zero.
- [x] Considered `Rabbit In A Hat.lottie` (1080x1080, ~5.5-8s,
      magician-style pop reveal; also downloaded in Phase 10, unused until
      now) as a second, rarer random idle-variety event here instead of
      Phase 12. Decided against: it reads more like a reward/reveal than
      ambient background motion, so it fits Phase 12's completion-sparkle
      moment (tied to a card entering COMPLETED) better than a random
      timer in Phase 11. Still unzipped to
      `src/assets/lottie/rabbit-in-a-hat.json` now so Phase 12 can wire it
      directly without a repeat extraction step; not imported/rendered
      anywhere yet.
- [x] Passed over existing board chrome (lane headers, buttons, badges,
      modals) to nudge the "Paper Planner" look toward the whimsical
      game-UI direction requested. Extended (not replaced) the token
      system in `src/index.css`: `--radius-sm` (8px, form controls/small
      buttons), `--radius-md` (12px, modals), `--radius-pill` (999px,
      status/count badges), `--bounce` (a spring-like cubic-bezier) for
      hover transitions. Applied across `Board.css`, `Lane.css`,
      `Card.css`, `CardModal.css`, `ReminderModal.css` in place of the
      previous scattered `4px`/`6px`/`999px` literals, plus a small
      `translateY`/`scale` hover lift on buttons using `--bounce` (color
      values themselves are unchanged). Card lift-on-drag and lane
      idle-motion stay out of scope here per Phase 12.
- [x] Cross-checked contrast/focus-visible states still pass after the
      token tweaks: no color values changed (only radius/transition
      additions), so the Phase 8.6 contrast pass still holds; the global
      `:focus-visible` ring in `index.css` uses `outline`, unaffected by
      `border-radius`; new hover transforms use `transition`/`transform`,
      already covered by the existing global reduced-motion override.

## Phase 12 — Woodland theme: card/column micro-interactions + sparkles

- [x] Card lift-on-drag treatment: `.card--overlay` (the `DragOverlay`
      card) uses an elevated shadow plus `rotate(2deg) scale(1.04)` via
      CSS only, no new drag logic; the dragged source card already went
      `visibility: hidden` (existing dnd-kit pattern), so the overlay is
      the sole lifted element.
- [x] Subtle idle motion on lane columns: a `lane-idle-sway` CSS keyframe
      (small looping `translateY`/`rotate`) on `.lane`, with per-lane
      randomized duration/delay (`LANE_IDLE_SWAY_DURATION_MS`,
      `LANE_IDLE_SWAY_DELAY_MS` in `meadowConstants.js`) set as inline
      CSS custom properties from `Lane.jsx` so lanes don't sway in
      lockstep. Paused via a `lane--dragging` modifier while dnd-kit is
      actively transforming that lane, so the two transforms never fight;
      covered by the existing global `prefers-reduced-motion` CSS
      override, no extra JS gating needed.
- [x] Completion celebration: new `useCompletionCelebration(status,
      enabled)` hook (edge-triggered off a status prop change via a ref,
      not a timer) fires once when a card transitions into COMPLETED.
      `Card` plays the previously-unzipped "Rabbit In A Hat" Lottie
      (`rabbit-in-a-hat.json`) for `RABBIT_IN_A_HAT_ANIMATION_DURATION_MS`
      (~5.6s, derived from the clip's own frame count/rate), positioned
      as a small overlay pinned to the card's bottom-right corner
      (`.card__celebration`, `pointer-events: none`). Gated on
      `usePrefersReducedMotion()` and disabled for the `isOverlay` drag
      preview so it never plays twice for one transition.
- [x] Final `prefers-reduced-motion` sweep: idle sway and the overlay
      lift are both plain CSS `transform`/`animation`, already covered by
      `index.css`'s global reduced-motion override; the Lottie
      celebration and the Phase 11 woodland strip both gate explicitly in
      JS via the same `usePrefersReducedMotion()` hook. Added a
      `window.matchMedia` stub to `src/test/setup.js` so any component
      test that mounts a tree using the hook doesn't crash under jsdom
      (previously only exercised by the hook's own test, which sets its
      own mock).
