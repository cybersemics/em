import { token } from '../../../styled-system/tokens'
import GestureArrowhead from './types/GestureArrowhead'

interface ArrowheadMarkerProps {
  /** Length of the marker in SVG user units. */
  arrowSize: number
  /** Solid fallback color for the marker. */
  color?: string
  /** Drop-shadow filter shared with the gesture stroke. */
  dropShadow?: string
  /** Color used when the complete gesture is highlighted. */
  highlightColor?: string
  /** Whether the complete gesture is highlighted. */
  highlighted: boolean
  /** Stable identifier shared by one GestureDiagram instance. */
  instanceId: string
  /** Marker shape to define, or none to omit it. */
  kind: GestureArrowhead
  /** Whether the gesture uses the legacy rounded-arc topology. */
  rounded?: boolean
  /** Base gesture stroke width. */
  strokeWidth: number
}

/** Defines the conventional SVG marker referenced by a gesture renderer. */
const ArrowheadMarker = ({
  arrowSize,
  color,
  dropShadow,
  highlightColor,
  highlighted,
  instanceId,
  kind,
  rounded,
  strokeWidth,
}: ArrowheadMarkerProps) => {
  if (kind === 'none') return null

  const outlined = kind === 'outlined'
  const markerColor = highlighted ? (highlightColor ?? token('colors.vividHighlight')) : (color ?? token('colors.fg'))

  return (
    <marker
      id={`${instanceId}-arrowhead`}
      viewBox='0 0 10 10'
      refX={rounded ? '0' : '5'}
      refY='5'
      markerWidth={arrowSize * (outlined ? 2 : 1)}
      markerHeight={arrowSize * (outlined ? 3 : 1)}
      markerUnits='userSpaceOnUse'
      orient='auto-start-reverse'
    >
      <path
        d={outlined ? 'M 0 0 L 5 5 L 0 10' : 'M 0 0 L 10 5 L 0 10 z'}
        fill={outlined ? 'none' : markerColor}
        stroke={outlined ? markerColor : 'none'}
        strokeWidth={outlined ? strokeWidth / 3 : 0}
        style={dropShadow ? { filter: dropShadow } : undefined}
      />
    </marker>
  )
}

export default ArrowheadMarker
