import { token } from '../../../styled-system/tokens'
import serializeGesturePath from './serializeGesturePath'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'
import GestureSegment from './types/GestureSegment'

type ArcGestureSegment = Extract<GestureSegment, { kind: 'arc' }>

interface SolidGestureRendererProps {
  /** Marker style attached to the final rendered path. */
  arrowhead: GestureArrowhead
  /** Color of the unhighlighted gesture. */
  color?: string
  /** Drop-shadow filter applied to the gesture paths. */
  dropShadow?: string
  /** Canonical shape to paint. */
  geometry: GestureGeometry
  /** Number of semantic directions to paint with the highlight color. */
  highlight?: number
  /** Color of highlighted directions. */
  highlightColor?: string
  /** Stable identifier shared by one GestureDiagram instance. */
  instanceId: string
  /** Base gesture stroke width. */
  strokeWidth: number
}

/** Serializes a legacy rounded segment, which is always a circular arc. */
const serializeArc = (segment: ArcGestureSegment) =>
  `M ${segment.from.x} ${segment.from.y} A ${segment.radius} ${segment.radius} 0 0 ${segment.sweepFlag} ${segment.to.x} ${segment.to.y}`

/**
 * Paints the solid, binary highlight treatment used by the Gesture Menu.
 * GestureDiagram selects this renderer when `useGradient` is false.
 * Unlike either gradient renderer, it uses continuous paths and discrete active/inactive colors.
 */
const SolidGestureRenderer = ({
  arrowhead,
  color,
  dropShadow,
  geometry,
  highlight,
  highlightColor,
  instanceId,
  strokeWidth,
}: SolidGestureRendererProps) => {
  const { path, segments } = geometry
  const commonPathProps = {
    strokeWidth: strokeWidth * 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
    style: dropShadow ? { filter: dropShadow } : undefined,
  }
  const allHighlighted = highlight != null && highlight >= path.length
  const noneHighlighted = highlight == null || highlight === 0
  const markerEnd = arrowhead === 'none' ? undefined : `url(#${instanceId}-arrowhead)`
  const activeColor = highlightColor ?? token('colors.vividHighlight')
  const inactiveColor = color ?? token('colors.fg')

  // A single path prevents rounded caps from overlapping into visible beads at joins.
  if (segments[0]?.kind === 'line' && path !== 'rdld') {
    if (allHighlighted || noneHighlighted) {
      return (
        <path
          d={serializeGesturePath(segments)}
          stroke={allHighlighted ? activeColor : inactiveColor}
          markerEnd={markerEnd}
          {...commonPathProps}
        />
      )
    }

    // Extended geometry such as rdl → rddl still belongs to three semantic directions.
    const highlighted = segments.filter(segment => segment.gestureIndex < highlight!)
    const remaining = segments.slice(highlighted.length)
    return (
      <>
        <path d={serializeGesturePath(highlighted)} stroke={activeColor} {...commonPathProps} />
        <path d={serializeGesturePath(remaining)} stroke={inactiveColor} markerEnd={markerEnd} {...commonPathProps} />
      </>
    )
  }

  // The Command Universe question mark combines its quadratic and line segments into one path.
  if (path === 'rdld') {
    if (allHighlighted || noneHighlighted) {
      return (
        <path
          d={serializeGesturePath(segments)}
          stroke={allHighlighted ? activeColor : inactiveColor}
          {...commonPathProps}
        />
      )
    }

    const highlighted = segments.filter(segment => segment.gestureIndex < highlight!)
    const remaining = segments.slice(highlighted.length)
    return (
      <>
        {highlighted.length > 0 && (
          <path d={serializeGesturePath(highlighted)} stroke={activeColor} {...commonPathProps} />
        )}
        <path d={serializeGesturePath(remaining)} stroke={inactiveColor} {...commonPathProps} />
      </>
    )
  }

  // Legacy rounded gestures are independent arcs and cannot use the continuous line serializer.
  return (
    <>
      {(segments as readonly ArcGestureSegment[]).map((segment, index) => (
        <path
          d={serializeArc(segment)}
          key={index}
          stroke={highlight != null && segment.gestureIndex < highlight ? activeColor : inactiveColor}
          {...commonPathProps}
          markerEnd={index === segments.length - 1 ? markerEnd : undefined}
        />
      ))}
    </>
  )
}

export default SolidGestureRenderer
