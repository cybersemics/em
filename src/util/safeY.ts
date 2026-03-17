/** Returns a CSS calc expression that offsets a pixel value by the device's safe area top inset (e.g. notch).
 *  Pass directly to a CSS property like `top` or `margin-top`.
 */
const safeY = (px: number) => `calc(${px}px + env(safe-area-inset-top))`

export default safeY
