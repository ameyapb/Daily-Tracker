# Card glow border

## Problem

Cards (`Card.jsx` / `Card.css`) currently use a flat 1px `--rule-warm` border and a plain drop shadow. The user saw a Uiverse.io button component ([`spotty-horse-48`](https://uiverse.io/StealthWorm/spotty-horse-48)) with a glowing multi-color gradient border, a hover-triggered glow, and a twinkling star-field texture, and wants cards to feel more "premium/polished" in a similar way. That source component is a dark sci-fi/space aesthetic (near-black interior, purple-pink-blue neon gradient, rotating star field) which is stylistically opposite the app's warm "Storybook Meadow" direction, so this reinterprets the *technique* (gradient border via double-background, hover glow, sparkle texture) in the existing meadow palette rather than adopting the source's colors or motion.

## Decision

Add a gradient border, hover glow, and static sparkle marks to every card, at rest, using only existing design tokens (`--accent`, `--completed`, `--delayed`) plus a small number of new one-off tokens for the gradient/glow itself. No new dependencies, no new Supabase/data-layer changes - this is CSS-only work in `Card.css` (and a token addition in `index.css`).

Key departures from the source component, decided during brainstorming:
- **Card interior stays the current light cream `--surface`** - not darkened. The gradient border must read clearly against a light card and a light-to-medium page background, not a near-black one.
- **Gradient uses existing meadow tokens** (`--accent` / `--completed` / `--delayed`), not a new arbitrary palette, so the effect reads as part of this app rather than bolted on.
- **No continuous animation at rest.** The source animates `background-position` in an infinite 5s loop even when idle. This app's CLAUDE.md reserves continuous ambient motion for the `Meadow` strip; cards are meant to stay calm. The gradient border is static at rest and only shifts as a one-off transition on hover.
- **Sparkle is static, not an animated star field.** A few small fixed sparkle marks baked into the card, always visible, never animating - avoids adding continuous motion to every card on a busy board simultaneously.
- **Applies uniformly to every card, every status, both themes**, replacing the current flat border. The existing status pill and DELAYED/COMPLETED leaf marks are untouched and keep communicating status; the gradient border is purely decorative and independent of status.

## Gradient border

- Reuses the double-background technique from the source: two layered `background-image` values - a flat `var(--surface)` fill clipped to `content-box`, and a `linear-gradient` clipped to `border-box` - so the gradient only shows in the border ring, not behind the card content.
- New token in `index.css`, `--card-glow-gradient`, a `linear-gradient` cycling `--accent -> --completed -> --delayed -> --accent`. Defined once per theme (light/dark media query) alongside the existing token blocks, since it references theme-dependent custom properties and picking up each theme's actual accent/completed/delayed values is the point (matching how `--rule-warm` already recomputes per theme via `color-mix`).
- Replaces the current `border: 1px solid var(--rule-warm)` with a ~2px equivalent via the background-clip technique (border width becomes the gap between the two clipped layers, e.g. `padding`-driven or a `border: 2px solid transparent` base with the two background layers doing the visual work - exact CSS mechanics finalized during implementation, matching the source's own approach).
- **At rest:** fixed `background-position` (e.g. `0% 50%`), no animation running.
- **On hover:** `background-position` transitions once to a different fixed point (e.g. `100% 50%`) using `--bounce` as the timing function, consistent with the card's existing hover transform transition. Not an infinite keyframe - it settles and stays there until the hover ends, then transitions back.

## Hover glow

- Adds a soft `box-shadow` (blurred, low-opacity, colored via `--accent`) on `:hover`, layered alongside the existing `box-shadow: var(--shadow)` rather than replacing it, and alongside the existing `translateY(-2px) scale(1.01)` transform - same hover trigger, additive effect, no new state.
- Tuned low-intensity: reads as "polish" against the cream surface, not a neon glow. Exact blur radius/opacity finalized visually during implementation.
- No new token required unless the glow color needs distinct alpha tuning from `--accent-border`/`--accent-bg`; reuse those if they fit, add one new one-off value only if neither does.

## Sparkle marks

- One to three small fixed sparkle shapes (4-point star via `clip-path`, same technique as the existing `.card--completed::after` leaf mark) positioned in a card corner/edge.
- Static: rendered once, never animated, always visible - no keyframe, no JS, no interaction with `usePrefersReducedMotion()` needed since nothing moves.
- Color: low-contrast tint of `--accent` or `--ink-muted` (final choice made visually during implementation) so it reads as texture, not as another status signal.
- Positioned to not collide with the existing status pill (top-right-ish, per-status) or the completed leaf mark (top-right corner) - likely bottom-left or scattered along the top edge; exact placement finalized during implementation.

## Interaction with existing card states

- `.card--overlay` (drag preview) keeps its current distinct treatment (elevated shadow, rotate/scale) - not in scope for the gradient border/glow, consistent with it already being visually distinct from a resting card.
- `.card--completed::after` (leaf mark) and the status pill (`.card__status` and its modifiers) are unchanged.
- Reduced motion: the hover-triggered gradient shift and glow are short one-off CSS transitions on existing hover-triggered properties, the same category of motion already present on `.card:hover` today (transform, box-shadow, border-color). The global `animation-duration: 0.01ms !important` override in `index.css` already handles this class of transition consistently with the rest of the app; no new reduced-motion branching needed.

## Out of scope

- No changes to card interior background/text colors.
- No animated/rotating star-field texture (the sparkle is static).
- No continuous/always-on animation on cards (contrast with the `Meadow` strip's fireflies, which are deliberately always-on - cards are not the meadow).
- No changes to `CardModal`, lane styling, or any other component.
- No new npm dependencies.
