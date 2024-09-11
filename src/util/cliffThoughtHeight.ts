/**
 * Calculates the height of a drop target at the cliff, decreasing with depth depth. This makes it easier to drop a thought at the desired level. Returns height in ems.
 */
const calculateCliffThoughtsHeight = ({ deepestDepth, depth }: { deepestDepth?: number; depth?: number }) => {
  if (depth === undefined) return 0

  // Calculate dynamic height: increase as depth decreases
  const baseHeight = 1
  const heightIncrease = 0.5
  const dynamicHeight = baseHeight + heightIncrease * ((deepestDepth || depth) - depth)

  return dynamicHeight
}

export default calculateCliffThoughtsHeight
