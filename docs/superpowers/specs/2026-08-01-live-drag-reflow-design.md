# Live drag reflow (Trello/Jira-style "make way" animation)

## Problem

Lane reordering and card drag-and-drop already use dnd-kit (`useSortable`, `DragOverlay`) and framer-motion (`motion.div` with `layout`), but the reorder only happens in `onDragEnd`. During the drag itself, sibling lanes/cards do not move out of the way - the dragged item's overlay just floats over static neighbors, and everything snaps into place only after drop. Confirmed via Playwright against the running dev server: dragging a lane sideways shows the overlay overlapping stationary neighbor lanes with no gap opening ahead of the cursor.

Desired behavior: standard Trello/Jira-style live reflow - as the dragged lane or card crosses a neighbor, that neighbor visibly slides out of the way in real time, using this app's existing bouncy "Storybook Meadow" spring/easing rather than a flat/instant snap.

## Scope

- Lane reordering (`Board`'s lane `DndContext` usage, `Lane.jsx`).
- Card drag-and-drop, both reordering within a lane and moving across lanes (`Card.jsx`, `Lane.jsx`'s droppable body).
- No changes to: status-transition logic (`setCardStatus`, `moveCardOutOfSystemLane`), the DB schema, `data/` layer mutators, or the DragOverlay/idle-sway/celebration systems already in place.

## Architecture

dnd-kit fires `onDragOver` every time the dragged item's collision target changes, before drop. Today `Board` only wires `onDragStart` / `onDragEnd` / `onDragCancel`. Adding `onDragOver` lets the visual list reorder live while the persisted reorder (existing `reorderUserLanes` / `reorderCardsInLane` / `moveCardToLane` calls) still only fires once, at drop - exactly as today.

Two new pieces of **local-only** state in `Board`, decoupled from `useLanes`/`useCards`:

- `liveLaneOrder` - `null` when not dragging a lane, otherwise the array of user lane ids in their live (in-progress) order.
- `liveCardOrder` - `null` when not dragging a card, otherwise `{ laneId, cardIds }` describing the live order/membership of the lane currently under the cursor (and, when the source lane differs from the target, an implicit removal from the source lane's list).

`Board` renders lanes/cards derived from these overrides when present, falling back to the real `lanes`/`cards` state otherwise. Because `Lane`/`Card` are already `motion.div` with `layout` and existing transition configs (`LAYOUT_REFLOW_TRANSITION`, `CARD_DROP_SETTLE_TRANSITION`), no new animation code is needed in either component - reordering the list they render from is sufficient to trigger the existing slide animation.

Flow:

1. `onDragStart` - unchanged (sets `activeDragCard`/`activeDragLane` for the `DragOverlay`).
2. `onDragOver` - compute the reordered list the same way the current `onDragEnd` handlers already do (reusing `arrayMove`), but write it to `liveLaneOrder`/`liveCardOrder` instead of calling a persisting mutator. Only recompute when the collision target's index actually changes (guard against redundant writes on every pointer-move).
3. `onDragEnd` - use the live override state (`liveLaneOrder`/`liveCardOrder`) as the final order, since by drop time it already reflects every crossing made during the drag; call the existing mutators (`reorderUserLanes`, `reorderCardsInLane`, `moveCardToLane`, `setCardStatus`, `moveCardOutOfSystemLane`) with that order exactly as today. Clear both override states after the mutator call resolves (success or failure).
4. `onDragCancel` - clear both override states without calling any mutator. Render falls back to real `lanes`/`cards`, which is the rollback: the override was always visual-only, so discarding it is the entire rollback mechanism.
5. Mutation failure (existing `runMutation`/`mutationError` path) - the calling handler's catch block also clears the override, so a failed Supabase write reverts the visual order the same way cancel does, consistent with existing optimistic-update-with-rollback behavior elsewhere in the hooks.

## Edge cases

- **System lanes excluded from lane reordering.** `liveLaneOrder` is computed over `userLanes` only, mirroring the existing `handleLaneDragEnd` scoping. System lanes never participate in the live reorder and stay in their fixed trailing position.
- **Card dropped onto a system lane.** This remains a status transition (`setCardStatus`/`moveCardOutOfSystemLane`), not a reorder - unchanged from today's `onDragEnd` logic. The live gap/insertion animation can still apply visually as the card crosses the system lane, but the commit path is untouched.
- **No thrashing on back-and-forth movement.** `onDragOver` recomputation is gated on the collision target's index actually changing, not fired on every pointer-move, so rapid small movements near a boundary don't restart animations repeatedly.
- **Empty target lane.** Dropping into a lane with no cards has no siblings to slide - the existing droppable-zone styling on `lane__body` is sufficient feedback; no new empty-state handling required.
- **Cross-lane card drag.** The source lane's remaining cards close the gap left behind, and the target lane's cards open a gap at the cursor's position, both live, both via the same `liveCardOrder` override (source lane's card list has the dragged card's id absent while dragging over a different lane).

## Testing

`handleLaneDragEnd` and `handleCardDragEnd` in `Board.jsx` are already standalone functions outside the component, unit-tested independently of rendering. The new `onDragOver` reorder logic will be extracted the same way (e.g. `computeLiveLaneOrder(active, over, lanes)`, `computeLiveCardOrder(active, over, cards, lanes)`) so it can be unit tested with the same pattern: given `active`/`over`/current lists, assert the resulting order. Cover: crossing a neighbor mid-lane-list, crossing into a system lane (no-op for lane reorder), crossing between two user lanes for cards, dropping into an empty lane, and the boundary/no-thrashing guard (same index -> no recompute).

Existing Playwright E2E drag-and-drop specs are unaffected structurally (same final `onDragEnd` commit contract) but should be re-run to confirm live reflow doesn't break final drop positions.

## Out of scope / explicitly not changing

- Visual style of the slide (spring stiffness/easing) - reuses existing `meadowConstants.js` values; only added if manual testing during implementation shows the existing values feel wrong for continuous drag-reflow specifically (as opposed to the one-shot drop-settle they were tuned for).
- Any change to status transition rules, system lane behavior, or the Supabase schema.
