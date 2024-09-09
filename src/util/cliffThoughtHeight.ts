/**
 * Calculate the height that cliff thoughts need to extend.
 */
export const calculateCliffThoughtsHeight = ({ deepestDepth, depth }: { deepestDepth?: number; depth?: number }) => {
  if (depth === undefined) return 0

  // Calculate dynamic height: increase as depth decreases
  const baseHeight = 1
  const heightIncrease = 0.2
  const dynamicHeight = baseHeight + heightIncrease * ((deepestDepth || depth) - depth)

  return dynamicHeight
}
