# Left icon rail (replaces right-edge "Add lane" form)

## Problem

The "Add lane" control is a form rendered as the last item in `.board`'s horizontally-scrolling lane row (`Board.jsx`, `board__add-lane`). Once there are a few lanes it sits off-screen and has to be scrolled to. It also reads as "one more lane-shaped box" rather than a board-level control.

## Decision

Replace it with a persistent, fixed-position left rail containing only the add-lane control for now (explicitly not a lane list, stats, or filters — those were considered and deferred; add them later without redesigning the rail if/when they're actually needed).

## Layout

- New `Rail` component (presentational, in `src/components/`), fixed position, flush to the viewport's left edge.
- Runs from `top: var(--header-height-px)` to the bottom of the viewport (full remaining height), independent of `.board`'s own scroll container — same relationship `Meadow` already has as a fixed sibling of `.board`.
- Width 56px at default sizes, 44px under the existing 480px breakpoint (`Board.css`'s current mobile breakpoint). Stays visible and flush-left at all sizes; it does not collapse into the header.
- `z-index` placed under the header's (`10`) so the header visually caps the rail, but above `.board`'s content.
- `.board`'s left padding increases by the rail's width (via a new `--rail-width-px` custom property, following the same pattern `--header-height-px`/`--meadow-height-px` already use) so lane content never renders underneath it.

## Visual treatment

Reuses the header's existing visual vocabulary rather than inventing a new one:

- Background `var(--surface)`.
- Right edge carries `var(--rule-organic)` as a vertical hairline (`background-image`, mirroring the header's own bottom-edge treatment), so the two chrome pieces read as one family.
- A single circular add-lane button near the top of the rail, ~40px diameter: `--accent-bg` fill, `--accent-border` ring, the same fill-sweep hover animation and `--transition-lift` the header's `.header__nav-item--active` already defines (reused, not reinvented).
- Icon is a plain "+" — no new icon set is introduced anywhere in this change.
- `aria-label="Add lane"` on the button (no visible text label fits at this width; this is also the accessible name and doubles as the tooltip via `title`).

## Interaction

Clicking the button opens a small anchored popover (new but minimal UI pattern — first popover in the codebase) containing exactly the input + submit button the current `board__add-lane` form has today, just relocated and re-anchored to the rail button instead of a modal. Rejected alternative: reusing `CardModal`'s centered-modal shell, which was judged too heavy for a single text input. This is a deliberate deviation from "always reuse existing patterns" (CardModal), justified because the form is a single field and a full modal overlay is disproportionate to it; called out explicitly per CLAUDE.md's instruction to flag pattern deviations.

Popover styling: `var(--surface)` panel, `var(--shadow)`, `var(--radius-md)`, closes on outside click or Escape, same as the eventual expectation for any lightweight overlay in this app (no existing popover to match against, so this sets the pattern for any future one).

## Removed

- `board__add-lane` form block deleted from `Board.jsx` (JSX) and `Board.css` (styles) entirely — no dead code left behind.

## Out of scope

- No lane list, stats, filters, or other rail content. Only the add-lane control ships now.
- No change to drag-and-drop, scroll-snap, or lane measurement logic in `Board.jsx` — the rail sits outside `.board`'s scroll container and none of that math references board width in a way this affects.
- No new icon set/library introduced.

## Testing

- Component test for `Rail`: renders the add-lane button, opens/closes the popover, calls the existing `createLane` mutator path on submit (same behavior `handleCreateLane` in `Board.jsx` already covers, just relocated).
- Existing Board tests that reference `board__add-lane` need updating to the new rail-based selector/flow.
- E2E: any spec that currently creates a lane through the old right-edge form (if any use it directly rather than a helper) needs to target the new rail button + popover instead.
