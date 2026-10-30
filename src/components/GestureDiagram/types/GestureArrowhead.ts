/**
 * Arrowhead style rendered at the end of a gesture.
 * 'filled' depends on the renderer.
 * - The solid renderer paints a filled chevron centered on the gesture's end, the counterpart of 'outlined-wide'.
 * - The gradient renderers and rounded gestures draw the triangle marker.
 */
type GestureArrowhead = 'filled' | 'outlined' | 'outlined-wide' | 'none'

export default GestureArrowhead
