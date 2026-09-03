import { useCallback } from 'react'
import GestureArrowhead from './types/GestureArrowhead'

/** Measures rendered gesture content and applies its automatic SVG viewBox. */
const useGestureViewBox = ({
  arrowSize,
  arrowhead,
  fillContainer,
  size,
  strokeWidth,
  viewBox,
}: {
  /** Length of the conventional SVG arrowhead marker. */
  arrowSize: number
  /** Arrowhead style used to select the required padding. */
  arrowhead: GestureArrowhead
  /** Whether the measured bounds should be framed as a square. */
  fillContainer: boolean
  /** Minimum centerline extent for square framing. */
  size: number
  /** Base gesture stroke width. */
  strokeWidth: number
  /** Explicit viewBox that disables automatic measurement. */
  viewBox?: `${number} ${number} ${number} ${number}`
}) =>
  useCallback(
    (element: SVGGraphicsElement | null) => {
      if (!element || viewBox) return

      // getBBox measures the paths that were actually rendered, including the geometry-based chevron.
      const bounds = element.getBBox()
      if (fillContainer) {
        // A shared square extent keeps Command Universe gestures consistently scaled despite different directions.
        const pad = arrowSize + strokeWidth * 4
        const side = Math.max(bounds.width, bounds.height, size) + pad * 2
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        element.setAttribute('viewBox', `${centerX - side / 2} ${centerY - side / 2} ${side} ${side}`)
        return
      }

      if (arrowhead === 'none') {
        // Half the stroke sits outside the measured centerline on every side.
        const pad = strokeWidth / 2
        element.setAttribute(
          'viewBox',
          `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`,
        )
        return
      }

      // SVG markers are not included in the default bounding box, so retain main's asymmetric marker allowance.
      const outlined = arrowhead === 'outlined' || arrowhead === 'outlined-wide'
      element.setAttribute(
        'viewBox',
        `${bounds.x - arrowSize - strokeWidth * 4} ${bounds.y - arrowSize - strokeWidth * 2} ${
          bounds.width + arrowSize * (outlined ? 2 : 5) + strokeWidth * 8
        } ${bounds.height + arrowSize * 2 + strokeWidth * 4}`,
      )
    },
    [arrowSize, arrowhead, fillContainer, size, strokeWidth, viewBox],
  )

export default useGestureViewBox
