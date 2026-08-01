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
- [x] Added an idle-state signal to the add-card control: `add-card-idle-nudge`
      CSS `@keyframes` on `.lane__add-card` (`Lane.css`), a small
      translateY/scale bounce that occupies only the last ~4% of a long
      (60-100s, randomized per lane) cycle so the control spends almost all
      its time still - an occasional hint rather than a continuous loop,
      matching this phase's "spreading motion budget" goal without adding
      visual noise. Timing constants (`ADD_CARD_IDLE_NUDGE_DURATION_MS`,
      `ADD_CARD_IDLE_NUDGE_DELAY_MS`) added to `meadowConstants.js`,
      randomized per-lane in `Lane.jsx` via the same `randomInRange` +
      CSS-custom-property pattern already used for `lane-idle-sway`.
      CSS-only, no new dependency (framer-motion considered and explicitly
      deferred to a separate follow-up rather than adopted inline here).
- [x] Re-confirmed every new/changed motion is covered: audited all CSS
      `@keyframes`/`transition` usage (all auto-neutralized by the global
      `prefers-reduced-motion` override in `index.css`) and all JS-driven
      motion (every `lottie-react` usage and `useBushIdleEvent`'s timer
      chain, all explicitly gated on `usePrefersReducedMotion()`). No gaps
      found, including the new `add-card-idle-nudge` animation.

## Phase 16 — `framer-motion`: physics-based transitions CSS can't express

Decided after a design review against the `frontend-design` skill (2026-08-01):
CSS keyframes cover loops (idle sway, nudges) well but can't do FLIP-style
layout reflow or spring physics reacting to state changes, which is the
actual gap between the current "functional Kanban" feel and a "premium"
one. Split into two independently shippable sub-phases so each fits one
session. `npm install framer-motion` happens at the start of 16a (not
before) since it's the first sub-phase that needs it.

Known risk to watch in both sub-phases: `Card`'s root element is already a
dnd-kit `useSortable` node with `setNodeRef` and an inline
`transform`/`transition` style driving drag positioning. Converting it to
`motion.div` means two systems (dnd-kit's drag transform, framer-motion's
`layout`/spring animation) touch the same element's transform. Framer
motion's `layout` animation must be disabled/inert while dnd-kit reports
`isDragging` for that card, so they don't fight over the transform during
an actual drag - only apply the spring settle after dnd-kit hands control
back (on drag end).

### Phase 16a — Layout reflow: cards animate into their new position

The bigger win: today, adding/removing/reordering a card snaps every other
card in the column to its new slot with no transition. `framer-motion`'s
`layout` prop handles this automatically (measures before/after position,
animates the delta) for every add/remove/reorder/cross-lane move, which
CSS cannot do without manual FLIP measurement code.

- [x] `npm install framer-motion` (explicit user confirmation obtained
      first per `CLAUDE.md`'s "never introduce new libraries without
      asking"). Installed as `^12.43.0`.
- [x] Converted `Card`'s root `div` (`src/components/Card.jsx`) to
      `motion.div` with `layout`, keeping the existing dnd-kit `setNodeRef`/
      `attributes`/`listeners` wiring unchanged. The `layout` animation is
      disabled not just while the card's own `isDragging` is true but
      whenever any card anywhere is being dragged (`isAnyCardDragging`,
      threaded from `Board`'s `activeDragCard` through `Lane`), since
      dnd-kit's `useSortable` also applies a live inline `transform` to
      every *other* sortable item while a drag is in progress (to preview
      the reorder), not just the one actively dragged - letting
      framer-motion's `layout` run at the same time on those siblings would
      have fought dnd-kit's transform on the same element. `layout`
      re-enables once the drag ends so framer-motion measures the
      before/after position and animates the settle.
      Reduced-motion: `CARD_REDUCED_MOTION_TRANSITION` (`{ duration: 0 }`
      in `meadowConstants.js`) is used as the `layout` transition when
      `usePrefersReducedMotion()` is true, consistent with how every other
      animation in the codebase is gated.
- [x] Card lists already reflow together: `Lane.jsx`'s `.lane__body` map
      renders every card as a sibling `motion.div` inside the same
      `SortableContext`, so framer-motion's `layout` animates all of them
      on any add/remove/reorder, not just the card that moved. Verified
      visually (see manual verification below).
- [x] Verified no regression to `card--overlay` (drag-preview `isOverlay`
      render still sets `layout={false}`, skips `setNodeRef`/
      `attributes`/`listeners` exactly as before) or the
      `isCelebratingCompletion` Lottie overlay (still absolutely positioned
      inside the same wrapper element, now a `motion.div` instead of a
      plain `div`, which doesn't change its CSS positioning context).
- [x] Updated `Card.test.jsx`: existing 11 assertions (status display,
      click-to-open, celebration overlay, etc.) all still pass unchanged
      against the `motion.div` wrapper; added 3 new tests covering that the
      card still renders and stays clickable with `isJustDropped` and
      `isAnyCardDragging` set.
- [x] Manual verification: added a card mid-lane, deleted a card mid-lane,
      and dragged a card to a different lane in the running dev server;
      neighboring cards slide into place rather than snapping, in both
      normal and reduced-motion (`prefers-reduced-motion: reduce`) states.

### Phase 16b — Drop-settle spring

Smaller, builds on 16a: when a dragged card is released, it currently
lands in its final position with no follow-through (only `.card--overlay`,
the in-flight ghost, has visual treatment; the landing itself is a plain
snap once dnd-kit hands back layout control). A spring
(`type: "spring"`, tuned bounce) on that landing moment reads as a
physical "settle" rather than a stop.

- [x] Tuned a spring transition (`CARD_DROP_SETTLE_TRANSITION = { type:
      'spring', stiffness: 500, damping: 24 }` in `meadowConstants.js`)
      applied to `Card`'s `layout` transition specifically on drag-end,
      distinct from `CARD_LAYOUT_REFLOW_TRANSITION` (`{ duration: 0.25,
      ease: 'easeOut' }`), the plain-tween transition 16a uses for ordinary
      add/remove/reorder reflow - the drop reads as more energetic than a
      routine reflow.
- [x] The spring only fires on the just-dropped card's own landing:
      `Board`'s `handleDragEnd` records the dropped card's id in
      `justDroppedCardId` state (cleared after
      `CARD_DROP_SETTLE_FLAG_DURATION_MS`, a named constant, via a guarded
      `setTimeout` that only clears if the id hasn't already changed), threaded
      down through `Lane` to each `Card` as `isJustDropped`. Only the
      matching card gets `CARD_DROP_SETTLE_TRANSITION`; unrelated cards
      that reflow at the same time keep 16a's ordinary
      `CARD_LAYOUT_REFLOW_TRANSITION`.
- [x] Reduced-motion: `CARD_REDUCED_MOTION_TRANSITION` takes precedence
      over `isJustDropped` in `Card.jsx`'s transition selection, so the
      settle spring is skipped the same way as 16a's layout transition.
- [x] Manual verification: dragged a card within a lane and to another
      lane in the running dev server; the release has a visible
      settle/bounce rather than an abrupt stop in normal motion, and a
      plain, instant snap in reduced-motion.

### Deferred, not scheduled

Considered during the design review and intentionally left out of 16a/16b
- revisit only if a future session specifically wants more motion budget:

- Exit animations (`AnimatePresence`) for cards leaving the board entirely
  (completion jumping subtrees, daily archive reset) - would pair with the
  existing rabbit-in-a-hat celebration but risks fighting the cross-subtree
  remount Phase 15 already had to work around; needs its own investigation
  before committing to a design.
- `whileTap` squash feedback on `.lane__add-card` / `.lane__delete` - minor
  polish, existing `--bounce` hover treatment already covers most of this
  ground.
- A lightweight SVG icon set for Phase 14's leaf/sprout motifs, if the
  existing CSS `clip-path` shapes ever fall short - unrelated to
  `framer-motion`, no current evidence CSS shapes are actually
  insufficient.
