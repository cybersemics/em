/** Get thought space. */
export const getThoughtSpacing = (distance: number, depth: number): number => {
  let spacing = 0

  if (distance === 0 || (distance === 1 && depth !== 0)) {
    spacing = 20
  }

  if (distance === 1 && depth === 0) {
    spacing = 5
  }

  return spacing
}
