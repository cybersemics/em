import getGestureBounds from './getGestureBounds'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'

/** Centers the completed gesture at a scale determined by size and arrow settings, never by the path. */
const getGestureViewBox = (
  geometry: GestureGeometry,
  {
    arrowSize,
    arrowhead,
    strokeWidth,
    size,
    chevronSize = 2.2,
    chevronApexAngle = 80,
  }: {
    /** Length of the conventional SVG marker. */
    arrowSize: number
    /** Requested arrowhead style, including for glyphs that omit their arrowhead. */
    arrowhead: GestureArrowhead
    /** Base gesture stroke width. The renderers draw at 1.5 times this value. */
    strokeWidth: number
    /** Longest centerline dimension before corners and arrowheads. */
    size: number
    /** Chevron half-span as a multiple of the rendered stroke width. */
    chevronSize?: number
    /** Interior angle at the chevron apex, in degrees. */
    chevronApexAngle?: number
  },
): `${number} ${number} ${number} ${number}` => {
  const strokeRadius = (strokeWidth * 1.5) / 2
  // Retain the conventional-marker allowance. Arrowhead-free diagrams need only stroke padding.
  const markerPadding = arrowhead === 'none' ? strokeRadius : arrowSize + strokeWidth * 4
  const halfSpan = strokeWidth * 1.5 * chevronSize
  // getChevron places each leg half the depth behind the centerline endpoint.
  const halfDepth = halfSpan / (2 * Math.max(Math.tan((chevronApexAngle * Math.PI) / 360), 0.01))
  const chevronPadding = arrowhead === 'outlined-wide' ? Math.hypot(halfSpan, halfDepth) + strokeRadius : 0
  const side = size + 2 * Math.max(markerPadding, chevronPadding)
  const bounds = getGestureBounds(geometry)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  return `${centerX - side / 2} ${centerY - side / 2} ${side} ${side}`
}

export default getGestureViewBox
