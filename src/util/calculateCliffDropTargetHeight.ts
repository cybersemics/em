/**
 * Calculates the height of a drop target at the cliff, decreasing with depth depth. This makes it easier to drop a thought at the desired level. Returns height in ems.
 */
const calculateCliffDropTargetHeight = ({ cliff = 0, depth }: { cliff?: number; depth?: number }) => {
  if (depth === undefined) return 0

  // Calculate dynamic height: increase as depth decreases
  const baseHeight = 1
  const heightIncrease = 0.5
  const dropTargetHeight = cliff === 0 ? baseHeight : baseHeight + heightIncrease * (-cliff - depth)

  return dropTargetHeight
}

export default calculateCliffDropTargetHeight
