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
    filledChevron = false,
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
    /** Whether the renderer paints 'filled' as a geometry chevron instead of an SVG marker. Only affects the rdld glyph, which has no chevron of its own. */
    filledChevron?: boolean
  },
): `${number} ${number} ${number} ${number}` => {
  const strokeRadius = (strokeWidth * 1.5) / 2
  // A filled arrowhead can be either a chevron drawn in the gesture geometry or an SVG marker at the line end.
  // The rdld glyph draws neither, so it takes the padding of the gestures listed beside it.
  // A rounded gesture has no chevron and draws the marker, so it keeps the marker padding.
  const useChevronPadding =
    arrowhead === 'filled' && (geometry.chevron !== null || (filledChevron && geometry.path === 'rdld'))
  // Retain the conventional-marker allowance. Arrowhead-free and filled-chevron diagrams need only stroke padding here.
  const markerPadding = arrowhead === 'none' || useChevronPadding ? strokeRadius : arrowSize + strokeWidth * 4
  const halfSpan = strokeWidth * 1.5 * chevronSize
  // getChevron places each leg half the depth behind the centerline endpoint.
  const halfDepth = halfSpan / (2 * Math.max(Math.tan((chevronApexAngle * Math.PI) / 360), 0.01))
  // Add space around the SVG so chevron tips are not cut off. The viewBox stays centered, so both edges get the same padding.
  const chevronPadding =
    arrowhead === 'outlined-wide'
      ? // The two outlined legs can extend beyond opposite sides of an axis. Reserve a full tip-distance at each edge.
        Math.hypot(halfSpan, halfDepth) + strokeRadius
      : useChevronPadding
        ? // The filled triangle extends beyond one side only. Split its tip-distance between both edges.
          Math.hypot(halfSpan, halfDepth) / 2 + strokeRadius
        : 0
  const side = size + 2 * Math.max(markerPadding, chevronPadding)
  const bounds = getGestureBounds(geometry)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  return `${centerX - side / 2} ${centerY - side / 2} ${side} ${side}`
}

export default getGestureViewBox
