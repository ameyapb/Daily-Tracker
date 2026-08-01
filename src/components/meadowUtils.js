export function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

export function randomTiming(durationRangeMs, delayRangeMs) {
  return {
    durationMs: randomInRange(durationRangeMs.MIN, durationRangeMs.MAX),
    delayMs: randomInRange(delayRangeMs.MIN, delayRangeMs.MAX),
  }
}
