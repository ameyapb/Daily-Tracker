# Live Drag Reflow: Cross-Lane Drag Visual Bug - Handoff (Update 4, RESOLVED)

## Update 4 (2026-08-04): lane reordering root-caused and fixed

Update 3 claimed lane dragging was fixed. It was not - the user reported that dragging a lane still "goes to the beginning, too fast and not controlled", and that the neighbouring lane never moved aside to make space. Both reproduced and were fixed this session. Three distinct causes, none of which was the double-transform issue Update 3 blamed:

1. **`closestCenter` ranks by the dragged element's rect, not the cursor** (`core.esm.js` line 331), and the dragged lane was included as a candidate for itself. A lane is ~300px wide, so its own slot stayed the nearest target until the pointer had travelled half a lane width. Measured: parked 150px left of the start, `over` resolved only to the dragged lane and a system lane, never the neighbour under the cursor - hence "no space is made".
2. **`computeLiveLaneOrder` applied `arrayMove` to its own previous result.** dnd-kit re-fires for the same hovered target continuously, so one neighbour compounded into several slots of movement. Note the pre-existing unit test at `Board.dragReflow.test.js` actively asserted this stepping behaviour was correct, which is a large part of why the bug survived several sessions - the test encoded the bug.
3. **Scroll-snap yanked the board mid-drag** (the actual "flies to the beginning"). Reordering lanes changes which element `scroll-snap-type: x proximity` treats as the snap target; measured a 760px `scrollLeft` jump in a single frame, after which every pointer reading mapped to the wrong lane. Most visible under `prefers-reduced-motion` (which the E2E fixture enables), where framer-motion's `layout` is off and the DOM reorders instantly.

Fix: lane reflow now runs from `onDragMove` against slot geometry frozen at drag start, in board content coordinates, offset by the grab point, indexed against visual order; plus `.board--dragging { scroll-snap-type: none }`. See CLAUDE.md's UI layer section for the full description. Verified 12/12 scripted drags (both motion modes, both directions, single and multi-slot, no snap-back), 189 unit tests, 12 E2E tests including two new lane-reordering regression specs.

**A note for future sessions:** rect-based collision detection is fundamentally unstable while live reflow is moving the same rects. If lane dragging regresses, do not reach for a different dnd-kit collision strategy - that path was tried three times here and each variant fixed some cases while breaking others. The frozen-geometry approach exists specifically to break that feedback loop.

---

# Update 3 (superseded in part by Update 4 above - its lane-dragging claims were wrong)

**Status: Fixed and confirmed by the user via manual testing.** All four symptoms below (card snap-back on drop, sibling overlap, card duplication on cross-lane drop, non-smooth lane dragging) were root-caused and fixed in one session using instrumented Playwright repro scripts (frame-by-frame transform/DOM sampling, not just screenshots). Unit suite 183/183, E2E suite 10/10 (including the previously-flaky empty-lane-drop test, which turned out to be the same root cause as the card-duplication bug below, not a separate issue). Kept for reference/history; no further action needed unless a new regression appears.

## Update 3: the actual fix (this session)

The "Update 2" fix (removing the `isAnyCardDragging` gate on `Card`'s `layout` prop) was real but incomplete, as Update 2 itself already suspected. Four distinct root causes remained, found via direct instrumentation rather than guessing:

**1. Card snapped back to its original position on drop (the main "flaky" symptom).** `Board.jsx`'s `handleDragEnd` had `if (!over || active.id === over.id) return`. Once live reflow moves the dragged card to its new slot in the DOM, dnd-kit's collision detection can resolve `over` to the dragged card's *own* (hidden) node - so `active.id === over.id` fires even though the reflow correctly computed a new order, and the guard threw that order away. Confirmed with a frame-by-frame trace: `liveCardOrder` held the correct final order (`A2,A3,A4,A1`) right up to the drop, then the DOM and DB both reverted to `A1,A2,A3,A4`. Fix: when a live order override exists, it is now the source of truth and commits regardless of what `over` resolved to; `handleCardDragEnd` and `handleDragEnd`'s lane-drag branch were restructured around that.

**2. Sibling card overlap during drag.** Confirmed via per-frame `getComputedStyle().transform` sampling: two systems were both writing `transform` to the same card node - dnd-kit's `useSortable` transform (via inline `style.transform`) and framer-motion's `layout` FLIP animation. Since live reflow actually reorders the DOM, framer-motion's FLIP is sufficient on its own; dnd-kit's transform was double-counting the offset (observed as one card sitting exactly one card-height off from where it should be). Fix: `Card.jsx` no longer applies `transform`/`transition` from `useSortable` to its style at all (kept only `visibility` for hiding the dragged original).

**3. Lane dragging not smooth (literal teleporting, not just "feels off").** Measured directly: a sibling lane visited only 2 distinct DOM positions across 143 sampled frames, with a single 760px jump - no interpolation at all. Two causes: (a) the same double-transform issue as card dragging, same fix (removed `transform`/`transition` from `Lane.jsx`'s style); (b) the `isAnyLaneDragging` gate on `Lane`'s `layout` prop, structurally identical to the already-fixed `isAnyCardDragging` gate on `Card`, disabling FLIP for every lane during any lane drag - removed. The idle-sway CSS pause (`.lane--dragging`/`.lane--sway-paused`) also had to change from `animation-play-state: paused` to `animation: none`, since a paused CSS animation still applies its last keyframe's `transform` and would otherwise fight framer-motion for the same property.

**4. Card rendered twice after a cross-lane drop (this session's version of the old "Bug 1: duplicate/orphaned card" from Update 1/2, which the earlier session couldn't reproduce).** This turned out to be the same root cause as the deferred "empty lane drop silently fails" bug from Update 2 - not a separate issue. Once fix #1 above made cross-lane live-reflow drops commit correctly via `reorderCardsInLane`, a latent bug in `useCards.js` surfaced: `reorderCardsInLane` filtered `otherCards` by `card.lane_id !== laneId`, but a card that just moved into the lane still carried its *old* `lane_id` in the stale `cards` closure - so it was kept in `otherCards` AND added again via the reordered list, rendering twice (confirmed: DB had exactly one row in the correct lane, DOM had two visible `.card` nodes in the old lane). Fixed by excluding by card id (not `lane_id`) and explicitly stamping `lane_id: laneId` onto every card in the reordered result, since by definition every card in that list now belongs to that lane.

All four fixes are in `src/components/Board.jsx`, `src/components/Card.jsx`, `src/components/Lane.jsx`, `src/components/Lane.css`, `src/hooks/useCards.js`. A regression test for fix #4 was added to `src/hooks/useCards.test.js` (confirmed to fail against the pre-fix code before being left in place passing). No new dependencies, no schema changes, no architecture changes.

---

**Everything below (Update 2 and Update 1) is superseded and kept only for history. Do not re-derive from it - the above is the complete, current picture.**

## What was fixed (commit not yet made as of this writing - check `git diff` / `git log` to confirm current state)

**Root cause of the sibling-overlap glitch (former Bug 2):** `src/components/Card.jsx`'s `motion.div` had `layout={!isOverlay && !isDragging && !isAnyCardDragging}` - the `isAnyCardDragging` condition predates the live-reflow feature entirely (added in commit `e7a9776`, the original framer-motion animation commit, before `computeLiveCardOrder`/live-reflow existed). It disabled framer-motion's FLIP reflow animation for **every card in every lane** whenever *any* card anywhere was being dragged. That made sense under the old "snap on drop" design (nothing needed to animate mid-drag), but directly conflicts with live-reflow's whole purpose, which removes/reinserts cards from lanes' rendered lists *during* the drag. With `layout` disabled, only dnd-kit's own `useSortable` `transform`/`transition` was left active on non-dragged siblings - and that system computes transforms assuming a stable sortable list, not one whose membership is changing every render, so it produced a transient (single-frame, ~20-40ms) but visually obvious overlap between sibling cards and the lane's quick-add row.

**Fix applied:** `src/components/Card.jsx` - changed `layout={!isOverlay && !isDragging && !isAnyCardDragging}` to `layout={!isOverlay && !isDragging}`. This let framer-motion's own reflow animation run during drags instead of leaving dnd-kit's sortable transform to fight the changing list alone. Verified via a rapid-frame-capture Playwright repro (12 screenshots at 20ms intervals during the exact "drag within lane then cross into another lane" sequence that had reproduced the bug) - clean across multiple runs, no overlap frame. The now-dead `isAnyCardDragging` prop was removed from `Card`/`Lane`/`Board` and the two `Card.test.jsx` tests that referenced it were updated/removed.

**Also fixed (unrelated, discovered while verifying the above didn't break other tests):**
- `src/index.css`'s reduced-motion override was missing `animation-iteration-count: 1 !important` alongside `animation-duration: 0.01ms !important` - an `infinite` iteration count at near-zero duration can still cause a real browser to keep progressing through keyframe states rather than freezing, which made Playwright's actionability check ("element is not stable") flake on lanes with the idle-sway animation running. Added the iteration-count override.
- `e2e/fixtures.js` - added `await page.emulateMedia({ reducedMotion: 'reduce' })` to the shared `page` fixture. Discovered that `playwright.config.js`'s `use.reducedMotion: 'reduce'` (the "normal" way to configure this) silently does not apply through `@playwright/test`'s managed browser/context in this environment/version (Playwright 1.62.1) - confirmed via a minimal repro spec that a raw `chromium.launch()` + `newContext({ reducedMotion: 'reduce' })` script honors it correctly but the test-runner's fixture-provided `page` does not, regardless of whether the setting is at top-level `use`, project-level `use`, or an inline `test.use()` override. `page.emulateMedia()` called explicitly on the fixture's `page` does work reliably. This is worth re-examining if the Playwright version is ever upgraded - the config-based approach may start working and the explicit `emulateMedia` call could then be redundant (harmless either way, but worth knowing).

## What is NOT fixed - confirmed still broken by direct user testing

The user manually tested against the running dev server after the above fix and reported:
- **"Moving card still creates flaky effect"** - the fix above addressed one specific, narrow repro (drag-within-lane-then-cross-into-another-lane causing a single-frame sibling overlap), but the user's broader hands-on experience of dragging cards is still not smooth. There is more going on than the one root cause found here. Do not assume the `isAnyCardDragging` fix was sufficient - it was necessary but evidently not the whole picture.
- **"Moving lanes is not smooth"** - lane dragging was not the focus of this session's investigation at all (all repro work targeted card dragging). `Lane.jsx` has its own, separate `layout={!isOverlay && !isDragging && !isAnyLaneDragging}` gate (note: NOT touched by this session's fix, which only changed `Card.jsx`) - worth checking whether the same class of bug exists there, since it's structurally the same pattern (a `motion.div layout` gated off by "is anything of this type being dragged").

## A separate, real bug found and deliberately NOT fixed (out of scope, user agreed to defer)

**Dragging a card into a completely empty lane can silently fail** - the card snaps back to its original lane instead of moving. Root-caused (partially): `Board.jsx`'s `handleDragEnd` has `if (!over || active.id === over.id) return` - when this fires, dnd-kit's `over` resolved to the dragged card's own (hidden) DOM element instead of the empty target lane's droppable. Confirmed via direct instrumentation of `handleDragEnd` (`over.id === active.id`, `type: 'card'`) in multiple failing runs. This reproduces intermittently (roughly 40-100% depending on run, no clean deterministic trigger found) in both a standalone Playwright repro script and the real `dragAndDrop.spec.js` E2E test. Two mitigation attempts (a fixed settle delay before `mouse.up()`, extra tiny pointer moves at the final position before release) did NOT reliably fix it - collision detection still sometimes prefers the stale/hidden dragged-card element over the empty lane. This needs a real fix to `Board.jsx`'s `DndContext` collision detection (currently `closestCenter` with `MeasuringStrategy.BeforeDragging`), not a test-timing workaround. Likely candidates to investigate: excluding the active draggable from collision candidates, a custom collision detection strategy, or measuring droppables continuously instead of only `BeforeDragging`.

## Recommended next steps for a fresh session

1. Use `superpowers:systematic-debugging` again, starting from the user's own report ("card dragging still flaky", "lane dragging not smooth") rather than re-deriving the already-fixed sibling-overlap bug.
2. Get a precise repro of what "flaky" means now - ask the user to describe or screen-record the specific motion that looks wrong, since the obvious symptom (sibling overlap) is already fixed and confirmed gone in scripted repros. The remaining issue may be more about *feel* (animation timing/easing, `LAYOUT_REFLOW_TRANSITION` in `meadowConstants.js`) than a hard visual bug.
3. Check whether `Lane.jsx`'s `isAnyLaneDragging` gate on its own `layout` prop has the same category of issue as the `Card.jsx` one just fixed, given the user separately flagged lane dragging as not smooth.
4. The empty-lane-drop bug (see above) is real, root-caused, but unfixed and out of scope by the user's own choice this session - pick it up separately if it comes up again, don't rediscover it from scratch.
5. Re-run `npm run test` and `npm run test:e2e` after any further fix. As of this session: unit suite 182/182 passing; E2E suite has one known-flaky pre-existing failure (`dragAndDrop.spec.js`'s cross-lane-to-empty-lane test, tied to the empty-lane-drop bug above) that is NOT a regression from anything fixed this session - confirmed by testing the identical failure against the original unmodified code before any changes.

---

# Original handoff (Update 1) - kept for reference, largely superseded above

**Status:** Bug confirmed, root cause partially diagnosed, no committed fix yet. Written to hand off to a fresh session.

**Reported symptom (user):** "when I try to drag card from 1 lane to another - things are very weird."

**Context:** This is a follow-up to `2026-08-01-live-drag-reflow-plan.md` (Tasks 1-4 of that plan are implemented and committed on `main`, all unit/E2E tests passed at the time). The live-reflow feature makes lanes/cards visually slide out of the way *during* a drag (via `onDragOver` -> `computeLiveLaneOrder`/`computeLiveCardOrder` -> `liveLaneOrder`/`liveCardOrder` state in `Board.jsx`), instead of only snapping into place on drop. That work is what introduced this bug - it did not exist before that plan.

## Current repo state

- `main` is clean and matches the last commit (`5690fde docs: document live drag reflow...`). No fix is committed.
- There is **one stashed WIP** (`git stash list` -> `stash@{0}: WIP on main: 5690fde ...`) containing an incomplete, non-working exploratory fix attempt (see "What was tried" below). It touches `src/components/Board.jsx`, `src/components/Card.jsx`, `src/components/Lane.jsx`, `src/components/Card.css`, `src/components/dragTypes.js`. **Do not blindly `git stash pop` and trust it** - it was a dead end (see below), but it may still be useful as a reference for what doesn't work. Inspect with `git stash show -p stash@{0}` before deciding whether to reuse any of it.

## Confirmed bugs (reproduced with Playwright against the live dev server, screenshots taken and inspected)

### Bug 1: Duplicate/orphaned card rendering during a cross-lane drag

Investigated further in the follow-up session: did not reproduce as a persistent duplicate under the Bug 2 fix. What looked like a duplicate was most likely the same transient single-frame glitch as Bug 2, now fixed, plus test-script timing artifacts (checking DOM state before an in-flight mutation had resolved). Not fully ruled out as a distinct issue, but no reproducible evidence of it surviving the Bug 2 fix.

### Bug 2: Overlapping/glitching sibling cards in the source lane during cross-lane drag - FIXED (see "Update 2" above for the actual root cause and fix)

The original theory in this section (`isAnyCardDragging` gate on `layout`, and dnd-kit re-parenting a single sortable instance) was on the right track but not fully confirmed until the follow-up session's rapid-frame-capture repro. See "Update 2" above for the confirmed mechanism and applied fix.

## What was tried and abandoned (in the dropped stash, do not assume it's right)

Attempted a "distinct inert placeholder" fix for Bug 1 - a more invasive rewrite involving a separate placeholder sortable id. Abandoned because it broke drop-target resolution without fixing the actual sibling-overlap glitch. Still sitting in `git stash@{0}` as of the follow-up session (not resolved or popped) - not reused by the follow-up session's actual fix, which was a one-line change instead. Safe to drop this stash if it's still around and no one has referenced it since.
