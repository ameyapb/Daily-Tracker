export function nextPosition(items, startingPosition) {
  const positions = items.map((item) => item.position)
  if (positions.length === 0) return startingPosition
  return Math.max(...positions) + 1
}

export function reorderAndDiff(items, orderedIds) {
  const itemById = new Map(items.map((item) => [item.id, item]))

  const reordered = orderedIds.map((id, index) => ({
    ...itemById.get(id),
    position: index,
  }))

  const changed = reordered.filter((item) => itemById.get(item.id).position !== item.position)

  return { reordered, changed }
}
