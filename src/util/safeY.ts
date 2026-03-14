/** Helper function that calculates y values that account for the safe area inset. */
const safeY = (px: number) => `calc(${px}px + env(safe-area-inset-top))`

export default safeY
