/** Returns the direction resulting from a 90 degree clockwise rotation. */
export const rotateClockwise = dir => ({
  l: 'u',
  r: 'd',
  u: 'r',
  d: 'l'
}[dir])
