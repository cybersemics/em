import { nanoid } from 'nanoid'
import React, { useMemo, useState } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import Gesture from '../@types/Gesture'
import { GESTURE_GLOW_BLUR, GESTURE_GLOW_COLOR } from '../constants'
import getGestureGeometry from './GestureDiagram/getGestureGeometry'
import GestureArrowhead from './GestureDiagram/types/GestureArrowhead'
import GestureGeometry from './GestureDiagram/types/GestureGeometry'
import GestureSegment from './GestureDiagram/types/GestureSegment'

interface GestureDiagramProps {
  /** Length of the SVG arrowhead marker. */
  arrowSize?: number
  /** Solid stroke color or legacy gradient endpoint. */
  color?: string
  /** Maximum rendered height in pixels. */
  maxHeight?: number
  /** Number of semantic gesture directions to highlight. */
  highlight?: number
  /** Gesture directions, or null for the cancel gesture. */
  path: Gesture | null
  /** Orthogonal offset used to separate reversing directions. */
  reversalOffset?: number
  /** Nominal gesture extent in SVG user units. */
  size?: number
  /** Base gesture stroke width. */
  strokeWidth?: number
  /** Runtime styles applied to the SVG element. */
  style?: React.CSSProperties
  /** Explicit SVG viewBox; when omitted, the rendered gesture is measured automatically. */
  viewBox?: `${number} ${number} ${number} ${number}`
  /** Maximum rendered width in pixels. */
  maxWidth?: number
  /** Applies the positional adjustment used by GestureContainer. */
  inGestureContainer?: boolean
  /** Panda CSS overrides applied to the outer element. */
  cssRaw?: SystemStyleObject
  /** Whether to render the gesture with rounded corners. */
  rounded?: boolean
  /** If true, the cancel gesture will have the same styling as the other gestures. Otherwise, there are additional sizing and margin styles applied. */
  styleCancelAsRegularGesture?: boolean
  /** Which kind of arrowhead to draw. 'none' skips the marker entirely. */
  arrowhead?: GestureArrowhead
  /** When true, renders a drop-shadow glow filter on all path segments. Default: true. */
  glow?: boolean
  /** When true (default), renders gradient strokes via <defs> + GradientStyleBlock. When false, uses solid strokes from highlightColor/color. */
  useGradient?: boolean
  /** Stroke color for highlighted segments when useGradient=false. Default: token('colors.vividHighlight'). */
  highlightColor?: string
}

type ArcGestureSegment = Extract<GestureSegment, { kind: 'arc' }>

/** Generate a list of pre-computed gradients for the special case of the mobile command universe question mark diagram. */
const MobileCommandUniverseGradients = () => (
  <>
    <radialGradient
      cx={29.7}
      cy={13.5}
      r={33.3}
      id={`rdld-gradient-0`}
      key={`rdld-gradient-0`}
      gradientUnits='userSpaceOnUse'
    >
      <stop offset='0%' className={`rdld-gradient-0-start`} />
      <stop offset='100%' className={`rdld-gradient-0-stop`} />
    </radialGradient>
    <linearGradient id={`rdld-gradient-1`} key={`rdld-gradient-1`} gradientUnits='userSpaceOnUse'>
      <stop offset='0%' className={`rdld-gradient-1-start`} />
      <stop offset='100%' className={`rdld-gradient-1-stop`} />
    </linearGradient>
    <radialGradient
      cx={54}
      cy={40.5}
      r={18.5}
      id={`rdld-gradient-2`}
      key={`rdld-gradient-2`}
      gradientUnits='userSpaceOnUse'
    >
      <stop offset='0%' className={`rdld-gradient-2-start`} />
      <stop offset='100%' className={`rdld-gradient-2-stop`} />
    </radialGradient>
    <linearGradient
      x1={45}
      y1={58.5}
      x2={45}
      y2={72}
      id={`rdld-gradient-3`}
      key={`rdld-gradient-3`}
      gradientUnits='userSpaceOnUse'
    >
      <stop offset='0%' className={`rdld-gradient-3-start`} />
      <stop offset='100%' className={`rdld-gradient-3-stop`} />
    </linearGradient>
  </>
)

/** Generates radial gradients for curved segments of the gesture. */
const ArcGradient = ({
  index,
  extendedPath,
  segment,
}: {
  index: number
  extendedPath: Gesture
  segment: ArcGestureSegment
}) => {
  return (
    <radialGradient
      cx={segment.from.x}
      cy={segment.from.y}
      r={segment.radius}
      id={`${extendedPath}-gradient-${index}`}
      key={`${extendedPath}-gradient-${index}`}
      gradientUnits='userSpaceOnUse'
    >
      <stop offset='0%' className={`${extendedPath}-gradient-${index}-start`} />
      <stop offset='100%' className={`${extendedPath}-gradient-${index}-stop`} />
    </radialGradient>
  )
}

/** Generate CSS rules defining the colors for the gradients that are applied to gesture diagram path segments. */
const GradientStyleBlock = ({ color, highlight, path }: { color?: string; highlight?: number; path: Gesture }) => {
  const index = path === 'rdl' ? 3 : path === 'ldr' ? 2 : undefined
  // The initial path segment should start at 25% opacity. Subsequent path segmenets should start at 50% opacity.
  // The final path segment should start at 75% opacity.
  const stopColors = Array.from(path).map((_, i) => (i === 0 ? 25 : path.length > 2 && i === path.length - 1 ? 75 : 50))

  return (
    <style>
      {stopColors.map((startPercent, i) => {
        const stopPercent = i === path.length - 1 ? 100 : stopColors[i + 1]

        // Highlight the segment if its index is less than the highlight index.
        // Special Case: Highlight the extended segment and all segments after it.
        const stopColor =
          highlight != null && (i < highlight || highlight === path.length || (highlight === index && i === index))
            ? token('colors.vividHighlight')
            : color || token('colors.fg')

        return `
            .${path}-gradient-${i}-start { stop-color: color-mix(in srgb, ${stopColor} ${startPercent}%, ${token('colors.bg')}) }
            .${path}-gradient-${i}-stop { stop-color: color-mix(in srgb, ${stopColor} ${stopPercent}%, ${token('colors.bg')}) }
          `
      })}
    </style>
  )
}

/** Serializes one canonical segment as an independently renderable SVG path. */
const segmentPathData = (segment: GestureSegment, path: Gesture) =>
  segment.kind === 'line'
    ? path === 'rdld'
      ? `M ${segment.from.x},${segment.from.y} L ${segment.to.x},${segment.to.y}`
      : `M ${segment.from.x} ${segment.from.y} l ${segment.to.x - segment.from.x} ${segment.to.y - segment.from.y}`
    : segment.kind === 'arc'
      ? `M ${segment.from.x} ${segment.from.y} A ${segment.radius} ${segment.radius} 0 0 ${segment.sweepFlag} ${segment.to.x} ${segment.to.y}`
      : `M ${segment.from.x},${segment.from.y} Q ${segment.control.x},${segment.control.y} ${segment.to.x},${segment.to.y}`

/** Serializes consecutive canonical segments as one continuous SVG path. */
const gesturePathData = (segments: readonly GestureSegment[]) =>
  segments.reduce((pathData, segment, i) => {
    const rdld = segments[0]?.kind === 'quadratic'
    return `${pathData}${i === 0 ? `M ${segment.from.x}${rdld ? ',' : ' '}${segment.from.y} ` : ' '}${
      segment.kind === 'line'
        ? `L ${segment.to.x}${rdld ? ',' : ' '}${segment.to.y}`
        : segment.kind === 'arc'
          ? `A ${segment.radius} ${segment.radius} 0 0 ${segment.sweepFlag} ${segment.to.x} ${segment.to.y}`
          : `Q ${segment.control.x},${segment.control.y} ${segment.to.x},${segment.to.y}`
    }`
  }, '')

type GesturePathProps = {
  arrowhead: 'filled' | 'outlined' | 'none'
  color?: string
  dropShadow?: string
  geometry: GestureGeometry
  highlight?: number
  highlightColor?: string
  id: string
  strokeWidth: number
  useGradient: boolean
}

/** Renders the gesture path as SVG path element(s). */
const GesturePath = ({
  arrowhead,
  color,
  dropShadow,
  geometry,
  highlight,
  highlightColor,
  id,
  strokeWidth,
  useGradient,
}: GesturePathProps) => {
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
  const markerEnd = arrowhead !== 'none' ? `url(#${id})` : undefined
  const activeColor = highlightColor ?? token('colors.vividHighlight')
  const inactiveColor = color ?? token('colors.fg')

  // Combined-path rendering for straight, solid-color paths. Using a single <path>
  // with strokeLinejoin='round' avoids overlapping round caps at joints, which
  // become visible as blobs/beads when strokeWidth is large relative to segment length.
  if (!useGradient && segments[0]?.kind === 'line' && path !== 'rdld') {
    if (allHighlighted || noneHighlighted) {
      return (
        <path
          d={gesturePathData(segments)}
          stroke={allHighlighted ? activeColor : inactiveColor}
          markerEnd={markerEnd}
          {...commonPathProps}
        />
      )
    }

    return (
      <>
        <path d={gesturePathData(segments.slice(0, highlight))} stroke={activeColor} {...commonPathProps} />
        <path
          d={gesturePathData(segments.slice(highlight))}
          stroke={inactiveColor}
          markerEnd={markerEnd}
          {...commonPathProps}
        />
      </>
    )
  }

  // Combined-path rendering for the rdld (Command Universe) solid-color special case.
  if (!useGradient && path === 'rdld') {
    if (allHighlighted || noneHighlighted) {
      return (
        <path
          d={gesturePathData(segments)}
          stroke={allHighlighted ? activeColor : inactiveColor}
          {...commonPathProps}
        />
      )
    }

    return (
      <>
        {highlight! > 0 && (
          <path d={gesturePathData(segments.slice(0, highlight))} stroke={activeColor} {...commonPathProps} />
        )}
        <path d={gesturePathData(segments.slice(highlight))} stroke={inactiveColor} {...commonPathProps} />
      </>
    )
  }

  // Per-segment rendering for gradient or rounded paths.
  return (
    <>
      {segments.map((segment, i) => {
        const stroke = useGradient
          ? `url(#${geometry.extendedPath}-gradient-${i})`
          : highlight != null && (i < highlight || highlight === path.length)
            ? activeColor
            : inactiveColor
        return (
          <path
            d={segmentPathData(segment, path)}
            key={i}
            stroke={stroke}
            {...commonPathProps}
            markerEnd={i === segments.length - 1 && path !== 'rdld' && arrowhead !== 'none' ? markerEnd : undefined}
          />
        )
      })}
    </>
  )
}

/** Renders an SVG representation of a gesture.
 *
 * @param path Any combination of l/r/u/d,or null for a cancel gesture (X).
 * @param size The length of each segment of the gesture.
 * @param arrowSize The length of the arrow marker.
 * @param reversalOffset The amount of orthogonal distance to offset a vertex when there is a reversal of direction to avoid segment overlap.
 */
const GestureDiagram = ({
  arrowSize,
  color,
  maxHeight,
  highlight,
  path,
  reversalOffset,
  size = 50,
  strokeWidth = 1.5,
  style,
  viewBox,
  maxWidth,
  inGestureContainer,
  cssRaw,
  rounded,
  styleCancelAsRegularGesture,
  arrowhead = 'filled',
  glow = true,
  useGradient = true,
  highlightColor,
}: GestureDiagramProps) => {
  const [id] = useState(nanoid())

  // match signaturePad shadow in TraceGesture component
  // TODO: Why isn't this working?
  const dropShadow = glow
    ? `drop-shadow(0 0 ${(GESTURE_GLOW_BLUR * 2) / 3}px ${token(`colors.${GESTURE_GLOW_COLOR}` as const)})`
    : undefined

  arrowSize = arrowSize ? +arrowSize : strokeWidth * 5
  reversalOffset = reversalOffset ? +reversalOffset : size * 0.3

  const geometry = useMemo(
    () =>
      path === null
        ? null
        : getGestureGeometry(path, {
            reversalOffset: reversalOffset!,
            rounded,
            size,
          }),
    [path, reversalOffset, rounded, size],
  )

  // If path is null, render a cancel gesture svg
  if (path === null) {
    return (
      <svg
        width={styleCancelAsRegularGesture ? size / 2 : 20}
        height={styleCancelAsRegularGesture ? size / 2 : 24}
        className={css(inGestureContainer && { position: 'relative', top: '10px' }, cssRaw)}
        style={{
          ...style,
          ...(arrowhead === 'none'
            ? {}
            : styleCancelAsRegularGesture
              ? { paddingLeft: size / 10, paddingRight: size / 3 }
              : { marginTop: '12px', marginBottom: '20px', marginLeft: '20px' }),
        }}
        viewBox='0 0 24 24'
      >
        <path
          d='M9.2725 0.714111C7.51965 3.8284 5.38488 6.62757 3.32706 9.53916C2.78228 10.31 2.34409 10.9449 1.86001 11.742C1.61923 12.1385 1.24853 12.6919 1.15146 13.1773C1.13411 13.264 1.17847 13.2863 1.25138 13.2681C1.67295 13.1627 2.15668 12.9113 2.52768 12.7276C7.4968 10.2679 11.7666 6.68876 16.4261 3.73452C18.1996 2.61011 20.1063 1.47669 22.1308 0.863996C22.8342 0.651122 22.5133 1.3142 22.3443 1.74968C21.91 2.86867 21.1473 3.86772 20.4094 4.80188C18.9097 6.70051 16.9227 8.26976 15.0181 9.74354C12.4635 11.7203 9.78768 13.554 7.29674 15.6118C6.3193 16.4192 5.37795 17.2552 4.47618 18.1462C4.01607 18.6008 3.51334 19.0404 3.18172 19.6042C3.0095 19.8969 3.10278 19.9327 3.39519 19.9221C4.08649 19.897 4.79822 19.8572 5.47541 19.7086C7.05389 19.3623 8.53153 18.5857 10.0219 17.9872C11.5619 17.3688 13.1128 16.7992 14.632 16.1296C17.0018 15.085 19.356 14.0449 21.4995 12.5777C22.2937 12.0341 23.0976 11.5068 23.884 10.9517C24.1828 10.7408 24.8514 10.0682 24.8514 10.4339C24.8514 10.8715 24.3341 11.4593 24.1247 11.7874C23.4648 12.8219 22.7443 13.8086 21.99 14.776C20.5168 16.6656 18.6452 17.9367 16.6759 19.2726C15.9788 19.7455 15.2156 20.2057 14.5821 20.7669C14.4752 20.8616 14.332 21.0133 14.2777 21.153C14.1713 21.4267 14.8675 21.199 15.1589 21.1621C16.8507 20.9478 18.5347 20.6994 20.2277 20.4989'
          stroke={
            highlight != null && highlight > 0
              ? (highlightColor ?? token('colors.vividHighlight'))
              : (color ?? token('colors.fg'))
          }
          strokeWidth={1.25}
          strokeLinecap='round'
          fill='none'
          style={styleCancelAsRegularGesture || !dropShadow ? undefined : { filter: dropShadow }}
        />
      </svg>
    )
  }

  const { extendedPath, segments } = geometry!

  /** Crop the viewbox to the diagram and adjust the svg element's height when first rendered. */
  const onRef = (el: SVGGraphicsElement | null) => {
    if (!el) return

    if (!viewBox) {
      const bbox = el.getBBox()
      if (arrowhead === 'none') {
        // Without an arrowhead the path has no directional asymmetry, so we use
        // a single uniform padding value on all four sides.

        // Only pad enough to keep the stroke from being clipped at the SVG edge.
        // Half the stroke diameter sits outside the path centerline on each side.
        const pad = strokeWidth / 2
        el.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`)
      } else {
        // When an arrowhead is present the geometry is asymmetric — the marker
        // protrudes past the path end — so padding differs per axis.
        el.setAttribute(
          'viewBox',
          `${bbox.x - arrowSize! - strokeWidth * 4} ${bbox.y - arrowSize! - strokeWidth * 2} ${
            +bbox.width + +arrowSize! * (arrowhead === 'outlined' ? 2 : 5) + +strokeWidth * 8
          } ${+bbox.height + +arrowSize! * 2 + +strokeWidth * 4}`,
        )
      }
    }
  }

  return (
    <span
      className={css({ display: 'inline-block' }, cssRaw)}
      style={{ width: `${maxWidth ?? size}px`, height: `${maxHeight ?? size}px` }}
    >
      <svg
        className={css(inGestureContainer && { position: 'relative', top: '10px' }, { width: '100%', height: '100%' })}
        style={style}
        ref={onRef}
        viewBox={viewBox}
      >
        <defs>
          {arrowhead !== 'none' && (
            <marker
              id={id}
              viewBox='0 0 10 10'
              refX={rounded ? '0' : '5'}
              refY='5'
              markerWidth={arrowSize! * (arrowhead === 'outlined' ? 2 : 1)}
              markerHeight={arrowSize! * (arrowhead === 'outlined' ? 3 : 1)}
              markerUnits='userSpaceOnUse'
              orient='auto-start-reverse'
            >
              <path
                d={
                  arrowhead === 'filled'
                    ? 'M 0 0 L 10 5 L 0 10 z'
                    : arrowhead === 'outlined'
                      ? 'M 0 0 L 5 5 L 0 10'
                      : undefined
                }
                fill={
                  arrowhead === 'outlined'
                    ? 'none'
                    : highlight != null && highlight >= path.length
                      ? (highlightColor ?? token('colors.vividHighlight'))
                      : (color ?? token('colors.fg'))
                }
                stroke={arrowhead === 'outlined' ? (color ?? token('colors.fg')) : 'none'}
                strokeWidth={arrowhead === 'outlined' ? strokeWidth / 3 : 0}
                style={dropShadow ? { filter: dropShadow } : undefined}
              />
            </marker>
          )}
          {useGradient && (
            <>
              {extendedPath === 'rdld' ? (
                <MobileCommandUniverseGradients />
              ) : (
                segments.map((segment, i) => {
                  return segment.kind === 'arc' ? (
                    <ArcGradient
                      key={`${extendedPath}-gradient-${i}`}
                      index={i}
                      extendedPath={extendedPath}
                      segment={segment}
                    />
                  ) : (
                    <linearGradient
                      id={`${extendedPath}-gradient-${i}`}
                      key={`${extendedPath}-gradient-${i}`}
                      gradientUnits='userSpaceOnUse'
                      x1={segment.from.x}
                      x2={segment.to.x}
                      y1={segment.from.y}
                      y2={segment.to.y}
                    >
                      <stop offset='0%' className={`${extendedPath}-gradient-${i}-start`} />
                      <stop offset='100%' className={`${extendedPath}-gradient-${i}-stop`} />
                    </linearGradient>
                  )
                })
              )}
            </>
          )}
        </defs>

        {useGradient && <GradientStyleBlock color={color} highlight={highlight} path={extendedPath} />}

        <GesturePath
          arrowhead={arrowhead}
          color={color}
          dropShadow={dropShadow}
          geometry={geometry!}
          highlight={highlight}
          highlightColor={highlightColor}
          id={id}
          strokeWidth={strokeWidth}
          useGradient={useGradient}
        />
      </svg>
    </span>
  )
}

const GestureDiagramMemo = React.memo(GestureDiagram)
GestureDiagramMemo.displayName = 'GestureDiagram'

export default GestureDiagramMemo
