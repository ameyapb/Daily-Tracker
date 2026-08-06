export const MEADOW_STRIP_HEIGHT_PX = 120

export const WOODLAND_RABBIT_COUNT = 4

export const RABBIT_HOP_DURATION_MS = {
  MIN: 6000,
  MAX: 11000,
}

export const RABBIT_HOP_DELAY_MS = {
  MIN: 0,
  MAX: 4000,
}

export const RABBIT_IDLE_BEHAVIOR_INTERVAL_MS = {
  MIN: 8000,
  MAX: 16000,
}

export const BOAT_IDLE_INTERVAL_MS = {
  MIN: 180000,
  MAX: 360000,
}

export const BOAT_INITIAL_DELAY_MS = 2000

export const BOAT_VIGNETTE_ASSETS_PATH = '/lottie/cute-bunnies-in-the-boat/'

export const BOAT_VIGNETTE_IMAGE_FILENAMES = ['image_0.png', 'image_1.png']

// lottie-web's SVG renderer visibly corrupts frames under real-time autoplay when
// scaled down close to the meadow strip's ~120px height (confirmed in isolation,
// unrelated to app CSS). Rendering at this larger, safe scale and cropping the
// vertical window with an overflow:hidden wrapper avoids the renderer bug.
export const BOAT_VIGNETTE_RENDER_WIDTH_PX = 600

export const BOAT_VIGNETTE_RENDER_HEIGHT_PX = 300

// The render size above is dictated by the renderer bug, not by how large the
// boat should look. Scaling the composited result down (rather than rendering
// small) keeps lottie-web rasterizing at its safe size while letting the boat
// sit at roughly the same visual scale as the strip's rabbits and bushes.
export const BOAT_VIGNETTE_DISPLAY_SCALE = 0.6

// The clip's drawn artwork does not fill its frame: it occupies this fraction
// of the frame height, with transparent padding above (sky) and below (water).
// Measured off the rendered SVG rather than assumed, since positioning the boat
// by the frame's centre leaves it floating well above the grass.
export const BOAT_VIGNETTE_INK_BOTTOM_FRACTION = 0.822

// How far the hull sits above the strip's bottom edge, so the boat reads as
// sitting on the grass line rather than flush against the viewport edge.
export const BOAT_VIGNETTE_GRASS_INSET_PX = 12

// Solved so the artwork's bottom lands GRASS_INSET above the strip bottom. The
// wrapper's own bottom already sits level with the strip bottom, so the only
// slack to remove is the empty box below the ink (the box's unscaled height
// minus where the scaled ink actually ends), plus the inset.
export const BOAT_VIGNETTE_RENDER_TOP_OFFSET_PX =
  BOAT_VIGNETTE_RENDER_HEIGHT_PX *
    (1 - (1 - BOAT_VIGNETTE_DISPLAY_SCALE) / 2 - BOAT_VIGNETTE_DISPLAY_SCALE * BOAT_VIGNETTE_INK_BOTTOM_FRACTION) +
  BOAT_VIGNETTE_GRASS_INSET_PX

export const WOODLAND_BUSH_COUNT = 2

export const COMPLETION_BUSH_LEFT_PERCENT = 75

export const BABY_RABBIT_ANIMATION_DURATION_MS = 6540

// How long the outer viewport takes to carry the boat across the screen via CSS
// translateX. A full-width crossing in roughly the clip's own 5.9s length reads
// as speeding rather than drifting, so the crossing is deliberately much slower
// than the clip and the clip loops (rather than freezing) for the whole trip.
export const BOAT_CSS_DRIFT_DURATION_MS = 34000

// The hold time useBoatIdleEvent keeps the vignette mounted for one appearance.
// Tied to the CSS crossing rather than the clip length so the boat unmounts once
// it has actually left the screen, not partway across.
export const BOAT_DRIFT_DURATION_MS = BOAT_CSS_DRIFT_DURATION_MS

export const FIREFLY_COUNT = 5

export const FIREFLY_DRIFT_DURATION_MS = {
  MIN: 6000,
  MAX: 10000,
}

export const FIREFLY_TWINKLE_DURATION_MS = {
  MIN: 2000,
  MAX: 4000,
}

export const LANE_IDLE_SWAY_DURATION_MS = {
  MIN: 5000,
  MAX: 8000,
}

export const LANE_IDLE_SWAY_DELAY_MS = {
  MIN: 0,
  MAX: 3000,
}

export const RABBIT_IN_A_HAT_ANIMATION_DURATION_MS = 5567

export const ADD_CARD_IDLE_NUDGE_DURATION_MS = {
  MIN: 60000,
  MAX: 100000,
}

export const ADD_CARD_IDLE_NUDGE_DELAY_MS = {
  MIN: 0,
  MAX: 20000,
}

export const LAYOUT_REFLOW_TRANSITION = {
  duration: 0.25,
  ease: 'easeOut',
}

export const CARD_DROP_SETTLE_TRANSITION = {
  type: 'spring',
  stiffness: 500,
  damping: 24,
}

export const CARD_DROP_SETTLE_FLAG_DURATION_MS = 400

export const REDUCED_MOTION_LAYOUT_TRANSITION = {
  duration: 0,
}
