import getGestureBounds from './getGestureBounds'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'

/** Frames completed geometry without measuring the rendered SVG. */
const getGestureViewBox = (
  geometry: GestureGeometry,
  {
    arrowSize,
    arrowhead,
    strokeWidth,
  }: {
    /** Length of the conventional SVG marker, also used in wide-chevron padding. */
    arrowSize: number
    /** Arrowhead presentation used to select padding. */
    arrowhead: GestureArrowhead
    /** Base gesture stroke width. */
    strokeWidth: number
  },
): `${number} ${number} ${number} ${number}` => {
  const bounds = getGestureBounds(geometry)
  if (arrowhead === 'outlined-wide') {
    const pad = arrowSize + strokeWidth * 4
    return `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`
  }

  if (arrowhead === 'none') {
    const pad = strokeWidth / 2
    return `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`
  }

  // Preserve the existing conventional-marker allowance, which is outside the centerline bounds.
  const outlined = arrowhead === 'outlined'
  return `${bounds.x - arrowSize - strokeWidth * 4} ${bounds.y - arrowSize - strokeWidth * 2} ${
    bounds.width + arrowSize * (outlined ? 2 : 5) + strokeWidth * 8
  } ${bounds.height + arrowSize * 2 + strokeWidth * 4}`
}

export default getGestureViewBox
