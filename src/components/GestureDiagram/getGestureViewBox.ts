import getGestureBounds from './getGestureBounds'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'
import GestureSizing from './types/GestureSizing'

/** Frames completed geometry without measuring the rendered SVG. */
const getGestureViewBox = (
  geometry: GestureGeometry,
  {
    arrowSize,
    arrowhead,
    strokeWidth,
    size,
    sizing = 'legacy',
  }: {
    /** Length of the conventional SVG marker, also used in framing padding. */
    arrowSize: number
    /** Arrowhead presentation used to select padding. */
    arrowhead: GestureArrowhead
    /** Base gesture stroke width. */
    strokeWidth: number
    /** Minimum centerline extent in uniform framing. */
    size: number
    /** Whether to use legacy padding or centered square framing. */
    sizing?: GestureSizing
  },
): `${number} ${number} ${number} ${number}` => {
  const bounds = getGestureBounds(geometry)
  if (sizing === 'uniform') {
    const pad = arrowSize + strokeWidth * 4
    const side = Math.max(bounds.width, bounds.height, size) + pad * 2
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    return `${centerX - side / 2} ${centerY - side / 2} ${side} ${side}`
  }

  if (arrowhead === 'none') {
    const pad = strokeWidth / 2
    return `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`
  }

  // Preserve the existing conventional-marker allowance, which is outside the centerline bounds.
  const outlined = arrowhead === 'outlined' || arrowhead === 'outlined-wide'
  return `${bounds.x - arrowSize - strokeWidth * 4} ${bounds.y - arrowSize - strokeWidth * 2} ${
    bounds.width + arrowSize * (outlined ? 2 : 5) + strokeWidth * 8
  } ${bounds.height + arrowSize * 2 + strokeWidth * 4}`
}

export default getGestureViewBox
