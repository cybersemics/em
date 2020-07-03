// @ts-nocheck

/** Returns the opposite direction of the given direction l/r/d/u. */
export const oppositeDirection = dir => ({
  l: 'r',
  r: 'l',
  u: 'd',
  d: 'u'
}[dir])
