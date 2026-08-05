# App header with HOME nav

## Problem

The app currently has no persistent chrome above the board - `App.jsx` renders only `<Board />`. There's nowhere to put app-level navigation or, in the future, a user profile control. We need a header bar now that holds a HOME tab, structured so a profile control (top-right) and other nav/options (top-left/center) can be added later without restructuring.

## Scope

- New `src/components/Header.jsx` + co-located `Header.css`.
- New `src/components/headerConstants.js` holding `HEADER_HEIGHT_PX`.
- `Board.jsx` - render `Header` as a sibling to `.board` (same pattern as `Meadow`), and pad `.board`'s top by `HEADER_HEIGHT_PX` so header content never overlaps the first lane row.
- No routing, no profile UI, no auth - those are explicitly future work. HOME is inert today.
- No changes to `data/`, hooks, lane/card/status model, or any existing component's behavior.

## Architecture

`Header` is purely presentational, no hook, no props needed for this phase - it owns no state and reads nothing from Supabase.

**Layout:** a `<header className="header">`, fixed to the viewport top, full width, three-region flex layout mirroring where future chrome will live:

- `.header__left` - app title "Daily Tracker" (plain text, not a link)
- `.header__nav` - a `<nav>` containing the HOME item
- `.header__right` - empty, reserved for a future profile/menu control

HOME is a `<button type="button" className="header__nav-item header__nav-item--active">HOME</button>` with a no-op `onClick` (explicitly not an `<a href="#">`, since it isn't a link to anywhere yet). It's styled as the active/selected nav item since it's the only, current view. It's a real button (not `disabled`) so it stays focusable and keyboard/AT-visible, consistent with the rest of the app's accessibility posture - `disabled` would strip it from the tab order for no benefit.

**Sibling-strip pattern (matching `Meadow`):** `Header` is rendered from `Board.jsx`'s top-level returned fragment as a sibling to the `.board` div, not nested inside it, so it never scrolls with board content. `HEADER_HEIGHT_PX` (`headerConstants.js`) is consumed in two places: `Header.css` sets the bar's fixed `height`, and `Board.jsx` adds it to `.board`'s existing top padding via a CSS custom property (`--header-height-px`), the same mechanism already used for `--meadow-height-px` at the bottom. This keeps the "reserve space for a fixed sibling strip" convention in one place rather than inventing a second approach.

**Styling:** uses existing tokens only, no new colors/fonts.
- Background: `var(--surface)`
- Bottom edge: `border-image` / `background-image: var(--rule-organic)` treatment matching `.lane`/`.lane__header`'s organic-edge convention, rather than a flat `border-bottom`
- Title: `var(--display)` (Fraunces), same family as `h1`/`h2`
- HOME nav item: reuses the `--accent` / `--accent-bg` / `--accent-border` pairing already established by `.board__add-lane-button`, so the active tab reads as accented/selected using the existing pattern rather than a new one
- Corners/radius: `var(--radius-sm)` for the HOME pill, matching other small interactive controls

**Why a new `headerConstants.js` rather than adding to `meadowConstants.js`:** `meadowConstants.js` already holds a mix of meadow-strip and card/lane micro-interaction timings (per its own doc comment: "not just the meadow proper"), but a header bar is a distinct layout concern from either. A small dedicated file keeps `HEADER_HEIGHT_PX` discoverable without growing an already-overloaded file further, and matches the project's stated preference to split a file when it starts covering more than one concern.

## Data flow

None. No props in, no events out except the intentionally-inert HOME click handler. No hook required.

## Error handling

None applicable - no async operations, no mutations, no external calls.

## Testing

`Header.test.jsx` (RTL, matching the style of other presentational component tests):
- Renders "Daily Tracker" title text.
- Renders a "HOME" button.
- Clicking HOME does not throw and does not call any navigation/mutation (there is nothing to assert it *does*, since it's intentionally inert - the test just confirms the click is safe).

No E2E coverage needed for this phase - nothing stateful or interactive enough to warrant a Playwright spec yet; revisit once HOME/profile become functional.

## Future work (explicitly out of scope now)

- Profile control in `.header__right`.
- Additional nav items in `.header__nav` (would need real routing/view-switching, which doesn't exist yet).
- Making HOME functional once there's more than one view.
