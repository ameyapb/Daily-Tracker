# Meadow variety: boat vignette + fireflies

## Problem

The meadow strip (`Meadow.jsx`) currently loops exactly two Lottie clips forever: `squeeze-bunny.json` (hopping across, `WOODLAND_RABBIT_COUNT` instances) and `baby-rabbit.json` (bush-peek idle event, `WOODLAND_BUSH_COUNT` ambient instances plus one completion-triggered instance). After extended viewing the strip reads as repetitive: same two motions, same species, no ambient texture beyond the grass gradient.

## Decision

Add two independent layers of variety, each addressing a different flavor of sameness:

1. **A new self-contained animated scene** (boat + two bunnies + swaying lantern) that drifts across the strip as a rare ambient event, giving the strip a third, visually distinct motion type beyond hop-across and bush-peek.
2. **A CSS-only firefly layer** (no new asset) that runs continuously, giving the strip ambient texture between the discrete creature events.

Both are purely additive: no changes to existing rabbit hop-across or bush-idle behavior, and no new reactive triggers beyond what exists today (the completion bush stays as the only event tied to app state).

## Boat vignette

### Asset

Source is `src/assets/lottie/Cute bunnies in the boat.lottie` (already provided), a dotLottie zip containing:
- `animations/12345.json` - the animation itself: one composition (`comp_0`, referenced by a single top-level "boat" layer) with a swaying lantern (raster, `image_0.png`), lantern stick/hull highlight (raster, `image_1.png`), boat hull front/back outlines (vector shape layers), and two bunny sub-compositions (`comp_1`, `comp_3`, vector). Canvas is 1500x750 (2:1 aspect), 25fps, frames 0-148 (~5.9s loop).
- `images/image_0.png`, `images/image_1.png` - the two raster assets the animation references by relative path (`p: "image_0.png"`, `e: 1`).

This differs from the existing three clips (`squeeze-bunny.json`, `baby-rabbit.json`, `rabbit-in-a-hat.json`), which are pure vector with no external image references and so need no `assetsPath`.

### Wiring

- Unzip and commit the raw animation JSON as `src/assets/lottie/cute-bunnies-in-the-boat.json`, matching the existing naming convention (source `.lottie` kept alongside the unzipped JSON, same as the other three).
- Copy the two PNGs to a new `public/lottie/cute-bunnies-in-the-boat/image_0.png` and `image_1.png`. This is the first use of `public/` for anything beyond `favicon.svg`/`icons.svg`; Vite serves `public/` contents unprocessed at the site root, so at runtime they resolve to `/lottie/cute-bunnies-in-the-boat/image_0.png` etc.
- Pass `lottie-react`'s `assetsPath="/lottie/cute-bunnies-in-the-boat/"` prop on the `Lottie` instance rendering this clip so `lottie-web` resolves the animation's relative image references against that URL. This is the only clip in the codebase needing `assetsPath`; the other three continue to omit it.

### Behavior: rare ambient drift

- New component, e.g. `BoatVignette`, mounted once in `Meadow.jsx` alongside the existing rabbit/bush rendering.
- Fires on its own randomized idle interval, independent of and concurrent with the rabbit-hop and bush-peek timers - new constants in `meadowConstants.js`: `BOAT_IDLE_INTERVAL_MS` (a `{ MIN, MAX }` range, following the existing `RABBIT_IDLE_BEHAVIOR_INTERVAL_MS` shape, tuned to "every few minutes" rather than the bushes' ~8-16s) and `BOAT_DRIFT_DURATION_MS` (how long one crossing takes, tens of seconds).
- Driven by a new `useBoatIdleEvent` hook, modeled on `useBushIdleEvent`: after a random `BOAT_IDLE_INTERVAL_MS` delay it flips `isPlaying` to `true`, holds it for `BOAT_DRIFT_DURATION_MS`, then flips back to `false` and reschedules. Implemented as its own hook rather than a generalized shared one - `useBushIdleEvent`'s hold duration is a fixed clip length (`BABY_RABBIT_ANIMATION_DURATION_MS`) while the boat's hold duration is the drift duration (independent of the clip's own ~5.9s loop length, which repeats during the hold), and `useBushIdleEvent` additionally supports an external `triggerSignal` the boat has no use for; forcing both into one hook would need a branchy parameterization for behavior that reads more clearly as two small hooks. Revisit only if a third consumer needs the same shape.
- While `isPlaying`, `BoatVignette` renders the `Lottie` instance (conditionally mounted, not just hidden, matching `BushIdleRabbit`'s pattern) with `loop` on (so the ~5.9s internal animation repeats for as much of the drift as it lasts) and a CSS `translateX` drift animation moving it from the strip's left edge to past its right edge over `BOAT_DRIFT_DURATION_MS`, one-directional (no bounce-and-flip return trip like the rabbits' hop-across keyframe).
- Rendered at a fixed strip-relative height preserving the clip's 2:1 aspect ratio (wider than tall, distinct from the square rabbit/bush sprites); exact size to be tuned visually against `MEADOW_STRIP_HEIGHT_PX` during implementation.
- Gated on `usePrefersReducedMotion()` exactly like the rest of the strip: when reduced motion is preferred, the boat never plays (no drift, no Lottie loop) - consistent with the hopping rabbits going fully static rather than partially animating.
- Purely ambient: no reactive trigger tie-in. The completion bush remains the only app-state-driven animation in the meadow.

## Fireflies (CSS-only ambient layer)

- New small presentational piece - `Firefly.jsx` + `Firefly.css` if the styling grows past a handful of rules, otherwise folded directly into `Meadow.jsx`/`Meadow.css` (decide at implementation time based on actual size, per the "split when a file covers more than one concern" guidance rather than pre-emptively splitting a two-rule component).
- Renders `FIREFLY_COUNT` (new constant in `meadowConstants.js`, small, e.g. 3-6) small radial-gradient dots absolutely positioned within the strip at randomized locations, reusing `randomInRange`/`randomTiming` from `meadowUtils.js` (the same helpers `useRabbitTimings`/`useBushPositions` already use) rather than inventing new randomization logic.
- Each firefly combines two independent CSS animations, randomized per-instance the same way rabbit hop timing is (duration/delay as inline custom properties or style values, set from JS):
  - A slow drift (small-radius random-path translate).
  - An opacity twinkle/pulse.
- New timing constants: `FIREFLY_DRIFT_DURATION_MS`, `FIREFLY_TWINKLE_DURATION_MS` (each a `{ MIN, MAX }` range, matching the existing constant shapes).
- Color: a warm glow tone distinct from `--completed`/`--completed-bg` (which the grass and bushes already use), so fireflies read as their own atmospheric layer rather than blending into the grass. Exact token/value (existing `--accent` family vs. a new one-off value) decided during implementation, consistent with the "new tokens follow `--<concept>`/`--<concept>-bg` pairing" rule if a new token is warranted.
- Always on, both light and dark themes, both loops running continuously (no idle-event gating like the boat or bushes) - simplest option, matches how the hopping rabbits are also always-on regardless of theme.
- Gated on `usePrefersReducedMotion()`: static (visible, non-animating) dots when reduced motion is preferred, matching the rest of the strip's reduced-motion treatment (visible but frozen, not hidden).

## Out of scope

- No other new creatures beyond the boat vignette.
- No time-of-day/weather system; fireflies are unconditional.
- No changes to existing rabbit hop-across or bush-idle (ambient or completion-triggered) behavior.
- No new reactive triggers; the boat and fireflies are both ambient-only.

## Testing

- `useBoatIdleEvent` gets the same unit-test treatment as `useBushIdleEvent` (fake timers, asserting the play/hold/reschedule cycle and that `enabled: false` clears pending timers and stays idle).
- Firefly randomization helpers, if extracted into a function separate from JSX, get unit coverage the same way `meadowUtils.js`'s existing helpers do.
- No E2E coverage needed - `Meadow` is `aria-hidden` and purely atmospheric, consistent with the existing rabbits/bushes having none.

## Documentation

Update CLAUDE.md's UI-layer section once implemented: note the new `public/lottie/` convention for clips needing `assetsPath`, and fold the boat/firefly behavior into the existing `Meadow` paragraph alongside the rabbit-hop/bush-idle description.
