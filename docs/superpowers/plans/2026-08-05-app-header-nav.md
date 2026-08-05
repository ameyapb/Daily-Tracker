# App Header with HOME Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, fixed app header (title + inert HOME nav item) above the board, structured so a future profile control and additional nav items can be added without restructuring.

**Architecture:** A new purely-presentational `Header` component, rendered by `Board.jsx` as a fixed-position sibling to `.board` (the same pattern `Meadow` already uses for the bottom strip). `Board`'s existing top padding grows by a new `--header-height-px` CSS custom property so board content never sits under the fixed header. No state, no hooks, no data layer changes.

**Tech Stack:** React (function component, JSX), CSS (custom properties, no new tokens), Vitest + React Testing Library.

## Global Constraints

- No routing, no profile UI, no auth in this phase — HOME is inert (no-op `onClick`), not `disabled` (stays focusable/keyboard/AT-visible).
- No changes to `data/`, hooks, lane/card/status model, or any existing component's behavior.
- Use only existing CSS custom properties (`--surface`, `--rule-organic`, `--display`, `--accent`/`--accent-bg`/`--accent-border`, `--radius-sm`) — no new colors or fonts.
- No magic numbers/strings: header height lives in a named constant in a new `headerConstants.js`, not inline.
- No abbreviations in names; long, self-explanatory identifiers per project convention.
- No comments that restate what code already says.

---

## File Structure

- Create `src/components/headerConstants.js` — holds `HEADER_HEIGHT_PX`.
- Create `src/components/Header.jsx` — presentational header component.
- Create `src/components/Header.css` — header styling.
- Create `src/components/Header.test.jsx` — RTL tests.
- Modify `src/components/Board.jsx` — render `Header` as a sibling to `.board`, extend the inline style object with `--header-height-px`.
- Modify `src/components/Board.css` — extend `.board`'s top padding to include `--header-height-px`.

---

### Task 1: Header height constant

**Files:**
- Create: `src/components/headerConstants.js`
- Test: none (a single literal export; covered indirectly by Task 2's tests asserting rendered layout is not meaningful here, so no dedicated test file — consistent with `meadowConstants.js`, which also has no test file)

**Interfaces:**
- Produces: `HEADER_HEIGHT_PX` (number, pixels) — consumed by `Header.jsx`, `Header.css` (via inline custom property), and `Board.jsx`.

- [ ] **Step 1: Create the constants file**

```javascript
export const HEADER_HEIGHT_PX = 56
```

56px keeps the fixed header thin relative to the 120px `MEADOW_STRIP_HEIGHT_PX` strip already reserved at the bottom — this is a task-completion board (Operate mode), so permanent chrome should cost as little vertical space as the title/nav actually need, not match the meadow strip's decorative footprint.

- [ ] **Step 2: Commit**

```bash
git add src/components/headerConstants.js
git commit -m "feat: add header height constant"
```

---

### Task 2: Header component

**Files:**
- Create: `src/components/Header.jsx`
- Create: `src/components/Header.css`
- Test: `src/components/Header.test.jsx`

**Interfaces:**
- Consumes: `HEADER_HEIGHT_PX` from `./headerConstants`.
- Produces: `Header` (named export, no props) — a `<header className="header">` rendered with a `--header-height-px` inline custom property, consumed by `Board.jsx` in Task 3.

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />)
    expect(screen.getByText('Daily Tracker')).toBeInTheDocument()
  })

  it('renders a HOME nav button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: 'HOME' })).toBeInTheDocument()
  })

  it('does not throw when HOME is clicked, and calls no handler', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Header />)

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'HOME' }))).not.toThrow()

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Header.test.jsx`
Expected: FAIL — `Header` module does not exist yet.

- [ ] **Step 3: Write the component**

```javascript
import { HEADER_HEIGHT_PX } from './headerConstants'
import './Header.css'

export function Header() {
  return (
    <header className="header" style={{ '--header-height-px': `${HEADER_HEIGHT_PX}px` }}>
      <div className="header__left">
        <span className="header__title">Daily Tracker</span>
      </div>
      <nav className="header__nav">
        <button type="button" className="header__nav-item header__nav-item--active" onClick={() => {}}>
          HOME
        </button>
      </nav>
      <div className="header__right" />
    </header>
  )
}
```

- [ ] **Step 4: Write the CSS**

```css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height-px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: var(--surface);
  background-image: var(--rule-organic);
  background-position: bottom;
  background-size: 100% 2px;
  background-repeat: no-repeat;
  box-sizing: border-box;
  z-index: 10;
}

.header__left,
.header__right {
  flex: 1 1 0;
  display: flex;
  align-items: center;
}

.header__right {
  justify-content: flex-end;
}

.header__title {
  font-family: var(--display);
  font-weight: 500;
  font-size: 20px;
  color: var(--ink);
}

.header__nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header__nav-item {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 6px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink-muted);
  cursor: pointer;
}

.header__nav-item--active {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent-text);
}

@media (max-width: 480px) {
  .header {
    padding: 0 12px;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/Header.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.jsx src/components/Header.css src/components/Header.test.jsx
git commit -m "feat: add Header component with inert HOME nav"
```

---

### Task 3: Mount Header in Board and reserve layout space

**Files:**
- Modify: `src/components/Board.jsx`
- Modify: `src/components/Board.css`

**Interfaces:**
- Consumes: `Header` from `./Header`, `HEADER_HEIGHT_PX` from `./headerConstants`.

- [ ] **Step 1: Import `Header` and `HEADER_HEIGHT_PX` in `Board.jsx`**

Add alongside the existing `Meadow`/`meadowConstants` imports (`src/components/Board.jsx:23-24`):

```javascript
import { Header } from './Header'
import { Meadow } from './Meadow'
import { MEADOW_STRIP_HEIGHT_PX, CARD_DROP_SETTLE_FLAG_DURATION_MS } from './meadowConstants'
import { HEADER_HEIGHT_PX } from './headerConstants'
```

- [ ] **Step 2: Extend the `.board` inline style with `--header-height-px`**

At `src/components/Board.jsx:479-484`, the returned JSX currently is:

```javascript
  return (
    <>
      <div
        className={`board${activeDragLane || activeDragCard ? ' board--dragging' : ''}`}
        style={{ '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px` }}
      >
```

Change the `style` prop to include both custom properties:

```javascript
  return (
    <>
      <Header />
      <div
        className={`board${activeDragLane || activeDragCard ? ' board--dragging' : ''}`}
        style={{
          '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px`,
          '--header-height-px': `${HEADER_HEIGHT_PX}px`,
        }}
      >
```

`Header` is rendered as a sibling immediately before `.board` inside the existing top-level fragment, mirroring how `<Meadow completionSignal={justCompletedCardId} />` (`src/components/Board.jsx:590`) is already rendered as a sibling immediately after `.board`'s closing tag, within the same fragment.

- [ ] **Step 3: Extend `.board`'s top padding in `Board.css`**

At `src/components/Board.css:1-11`, current rule:

```css
.board {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px calc(24px + var(--meadow-height-px));
  overflow-x: auto;
  min-height: 100svh;
  box-sizing: border-box;
  scroll-snap-type: x proximity;
  overflow-anchor: none;
}
```

Change the `padding` line's top value to add `--header-height-px`:

```css
.board {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: calc(24px + var(--header-height-px)) 24px calc(24px + var(--meadow-height-px));
  overflow-x: auto;
  min-height: 100svh;
  box-sizing: border-box;
  scroll-snap-type: x proximity;
  overflow-anchor: none;
}
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — all existing Board tests still pass (no behavior change to lanes/cards/drag), plus `Header.test.jsx`'s 3 tests.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Visual check in the browser**

Start the dev server (`npm run dev` or `npm run dev:test`) if not already running, then use a throwaway Playwright script per `CLAUDE.md`'s "Viewing the app / UI feedback" section (`.mjs` script inside the project directory, not scratchpad) to screenshot the board and confirm: the header renders full-width at the top with "Daily Tracker" on the left and an accented "HOME" pill, the first lane row is not covered by the header, and no console/page errors appear. Delete the throwaway script afterward.

- [ ] **Step 7: Commit**

```bash
git add src/components/Board.jsx src/components/Board.css
git commit -m "feat: mount Header above the board and reserve layout space"
```

---

## Self-Review Notes

- **Spec coverage:** `Header.jsx`/`Header.css` (spec lines 9, 19-36) done in Task 2; `headerConstants.js` (line 10) done in Task 1; `Board.jsx` sibling-render + padding (line 11, 27) done in Task 3; three-region flex layout, HOME as active pill, organic bottom edge, `--display` title, `--radius-sm` pill (lines 21-35) all in Task 2's CSS; test coverage (lines 48-51) in Task 2. No E2E spec, per line 53. Future work (lines 55-59) explicitly left untouched.
- **Placeholder scan:** none found — all steps carry full code.
- **Type/name consistency:** `HEADER_HEIGHT_PX` used identically across Task 1 (definition), Task 2 (`Header.jsx` inline style), and Task 3 (`Board.jsx` inline style). `--header-height-px` custom property name matches across `Header.css`, `Board.jsx`, and `Board.css`.
