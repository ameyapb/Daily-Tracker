# Daily Activity Tracker — Implementation Plan

Build broken into phases, ordered so the highest-risk/blocking dependencies
(ground rules, then credentials, then environment) are resolved before any
feature work starts. See `PROJECT_PLAN.txt` for the full spec these phases
implement.

## Completed phases (0-8.6, 10-12)

- **Phase 0** — `CLAUDE.md` written (project summary, Claude Code instructions).
- **Phase 1** — Supabase credentials collected; `.env` / `.env.example` created.
- **Phase 2** — Repo initialized; Vite + React scaffolded; `@supabase/supabase-js`
  and `@dnd-kit/*` installed; plain React state chosen over a state library.
- **Phase 3** — Supabase schema created (`lanes`, `cards`, `cards_archive`,
  system lanes seeded, RLS policies). Documented in `CLAUDE.md`.
- **Phase 4** — Data layer (`supabaseClient.js`, `data/lanes.js`,
  `data/cards.js`, `data/archive.js`) with tests, Supabase client mocked.
- **Phase 5** — Board UI: lane layout, create/rename/delete, reordering,
  DELAYED lane visual treatment.
- **Phase 6** — Board UI: card component, create/edit modal, drag-and-drop
  between lanes, manual status control.
- **Phase 7** — Status automation: `remind_at`-based auto-DELAYED, system-lane
  moves, daily COMPLETED reset/archive.
- **Phase 8** — Reminders: polling hook, blocking queued modal, snooze
  durations, reminder sound.
- **Phase 8.1-8.6** — "Paper Planner" visual redesign: design tokens/typography
  (`@fontsource/fraunces|inter|ibm-plex-mono`), board/lane restyle, card
  restyle (folded-corner completed treatment), modal restyle, copy pass,
  responsive/accessibility pass (focus-visible, AA contrast, reduced-motion).
- **Phase 10** — Woodland theme: `lottie-react` installed, `Meadow.jsx` fixed
  120px bottom strip with hopping "Squeeze bunny" rabbits
  (`WOODLAND_RABBIT_COUNT`), `usePrefersReducedMotion` hook added, meadow
  strip verified never to cover board content.
- **Phase 11** — Woodland idle behaviors: `useBushIdleEvent` +
  `BushIdleRabbit` (baby-rabbit-from-bush, `WOODLAND_BUSH_COUNT`), game-UI
  chrome tokens added (`--radius-sm/md/pill`, `--bounce`) applied across
  board/lane/card/modal CSS.
- **Phase 12** — Card/column micro-interactions: drag-overlay lift
  (`.card--overlay`), lane idle sway (`lane-idle-sway`, paused while
  dragging), completion celebration (`useCompletionCelebration` +
  "Rabbit In A Hat" Lottie on transition into COMPLETED), final
  reduced-motion sweep + `matchMedia` test stub.

## Phase 9 — Polish & deploy

- [ ] Empty/loading/error states for board and modals
- [ ] Push repo to GitHub
- [ ] Deploy to Vercel, connected to the GitHub repo
- [ ] Wire `.env` vars into Vercel project settings
- [ ] Manual end-to-end verification pass against the Feature List in
      `PROJECT_PLAN.txt` section 4

## Design review — why the board still doesn't read "cute" (pre-Phase 13 notes)

Reviewed against the `frontend-design` skill before planning further phases.

- All three Lottie animations are wired correctly; the completion celebration
  (`rabbit-in-a-hat.json`) only fires on a live transition into COMPLETED, so
  it's invisible unless a completion happens in-session (discoverability gap,
  see Phase 15) — not a wiring bug.
- Dark mode's `#211c14` brown-black base reads muddy/swampy and clashes with
  the meadow's green strip; light mode's cream/terracotta is closer to
  "storybook" but still muted (see Phase 13).
- The woodland motif is confined to the 120px `Meadow` strip; everything above
  it (lane headers, card chrome, status pills, modals) still uses hairline
  rules, mono badges, and a dotted-grid background — the "broadsheet" generic
  AI-design cluster, disconnected from the meadow motif (see Phase 13-14).
- The completed-card folded corner and DELAYED sticky-note flag are neutral
  geometric devices unconnected to the meadow motif (see Phase 14).
- Motion budget is almost entirely spent at the bottom strip plus generic
  `--bounce` hover lifts with nothing subject-specific (see Phase 15).

## Phase 13 — Palette and type pass: from "Paper Planner" to "Storybook Meadow"

Goal: shift the token system so the woodland motif is the page's actual
identity, not a footer decoration. Retire the muddy dark mode. No component
structure changes, only token values plus the selectors that hardcode a look
the new tokens should drive instead (dotted-grid background, mono badges).

- [x] Shift `:root` light `--accent` from terracotta to a dusty rose/blush
      (`#d9738c`), demoting terracotta out of the active token set (no
      component referenced it as a standalone token, so nothing needed a
      secondary-token migration). Confirmed AA contrast against
      `--surface`/`--bg`: `--accent-text` (the text-use shade, `#b03a5b`)
      hits 4.97:1 / 5.41:1; `--accent` itself (borders/large elements only,
      same pattern the old terracotta pair already used) is 2.64:1 / 2.87:1.
- [x] Replaced the dark-mode `#211c14` base with a deep forest/moonlit-meadow
      green-black (`--bg: #16241d`); re-derived `--surface`/`--rule`/
      `--shadow`/`--accent`/`--delayed`/`--completed`; re-ran contrast (all
      text pairings clear 5:1+, see calculations logged during
      implementation).
- [x] Replaced the dotted radial-gradient board background with a layered
      CSS gradient (soft rose/green radial washes plus a vertical
      `--bg`-to-`--surface` linear wash), CSS-only, using existing tokens.
- [x] Switched `.card__status` and `.lane__badge` to `--sans`; `.counter`
      (in `index.css`, currently unused by any component) switched too for
      consistency. `--mono` stays on `.card__reminder` and the
      `ReminderModal` snooze controls (genuinely tabular/duration content).
- [x] Updated `CLAUDE.md`'s token list and theming note for the renamed
      accent values, the new dark-mode base, and the badge font change.

## Phase 14 — Woodland chrome: bring the signature motif into cards and lanes

Goal: extend the woodland vocabulary into existing chrome (not a second
theme) so the page reads as one cohesive object.

- [x] Replaced the completed-card folded-corner triangle with a small
      leaf/sprout mark: a `clip-path` leaf silhouette (`--completed` fill)
      pinned to the card's top-right corner via `.card--completed::after`.
- [x] Replaced the DELAYED lane's sticky-note header flag with a wilted-leaf
      motif: an elongated teardrop-leaf `clip-path`, rotated 35 degrees
      around its stem point so it visibly droops/hangs beside the lane
      name, distinct from the upright completed-card sprout.
- [x] Softened lane/card hairline borders toward an organic divider:
      `--rule-organic` (a fade-at-the-edges gradient, replacing a flat
      `border-bottom`/`border-right`) on `.lane__header` and `.lane`;
      `--rule-warm` (`color-mix` of `--rule` toward `--accent`) on
      `.card`'s full-perimeter border, since a card needs a closed edge
      rather than a fading one. Both new tokens in `index.css`, dark-mode
      safe since `color-mix`/`var()` recompute per theme automatically.
- [x] Status pill shape pass: `--radius-petal` (asymmetric corner radii,
      sharp on one diagonal pair/fully round on the other) on
      `.card__status` and `.lane__badge`, replacing `--radius-pill`. A
      fixed-point `clip-path` was ruled out since status labels vary
      widely in width (`TODO` vs `IN PROGRESS`) and would clip
      unpredictably; asymmetric border-radius scales with any label width.
- [x] Re-ran contrast and reduced-motion checks: no new animations were
      added (all changes are static shape/color), so the existing
      reduced-motion override needed no changes; all text colors are
      unchanged from Phase 13's verified values, only decorative
      (non-text) colors are new.

## Phase 15 — Fixing the invisible third animation + spreading motion budget

- [x] Fixed the actual bug behind "invisible third animation": it wasn't a
      discoverability/design question, it never played on a live completion
      either. `Board` renders each lane's cards through a separate
      `cardsByLaneId`-filtered subtree, so a card transitioning into
      COMPLETED (and moving into the COMPLETED system lane) unmounted its
      `Card` in the old lane and mounted a new one in the system lane's
      subtree; `useCompletionCelebration`'s ref-based edge-trigger lived
      inside that remounted component and so never saw the transition.
      Replaced it with `justCompletedCardId` state tracked centrally in
      `useCards` (set by `setCardStatus`/`updateCard` whenever the target
      status is COMPLETED, self-clearing after
      `RABBIT_IN_A_HAT_ANIMATION_DURATION_MS`), threaded down through
      `Board` -> `Lane` -> `Card` as `isCelebratingCompletion`, which
      survives the cross-subtree remount. `useCompletionCelebration.js` and
      its test were deleted; `useCards.test.js` and `Card.test.jsx` updated.
- [ ] Consider a small idle-state signal on lanes or the add-card control
      hinting motion exists beyond the meadow strip.
- [ ] Re-confirm every new/changed motion is covered by the existing
      reduced-motion override or hook gating.

## Phase 16 — Optional: external library evaluation (ask before adding)

Only pursue if Phases 13-15 don't achieve the desired result with
CSS/existing `lottie-react` assets alone. No new dependency without asking
first.

- [ ] Evaluate `framer-motion` only for spring-physics transitions CSS can't
      express cleanly (e.g. card "settling" bounce on drop).
- [ ] Evaluate a lightweight SVG icon set for Phase 14's leaf/sprout motifs
      if CSS shapes fall short, scoped narrowly.
