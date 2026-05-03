import React, { useState } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import Direction from '../@types/Direction'
import Gesture from '../@types/Gesture'
import { GESTURE_GLOW_BLUR, GESTURE_GLOW_COLOR } from '../constants'
import createId from '../util/createId'

interface GestureDiagramProps {
  arrowSize?: number
  color?: string
  // override auto height
  maxHeight?: number
  // highlight the first n segments of the gesture diagram
  highlight?: number
  path: Gesture | null
  reversalOffset?: number
  size?: number
  strokeWidth?: number
  style?: React.CSSProperties
  // overrides the SVG's viewBox attribute
  // if not provided, viewBox will be calculated automatically
  // TODO: improve auto cropping so there is no excess space
  viewBox?: `${number} ${number} ${number} ${number}`
  // override auto width
  maxWidth?: number
  inGestureContainer?: boolean
  cssRaw?: SystemStyleObject
  /** Whether to render the gesture with rounded corners. */
  rounded?: boolean
  /** If true, the cancel gesture will have the same styling as the other gestures. Otherwise, there are additional sizing and margin styles applied. */
  styleCancelAsRegularGesture?: boolean
  /** Which kind of arrowhead to draw gesture diagrams with. By default, the arrowhead is filled.
   * 'outlined-wide' renders a continuous chevron whose apex sits at the path's natural tip and
   * whose legs splay backward, matching the spec mockup for the Mobile Command Universe. */
  arrowhead?: 'filled' | 'outlined' | 'outlined-wide'
  /** Apex interior angle in degrees for the 'outlined-wide' chevron. Smaller = sharper. Default 80. */
  chevronApexAngle?: number
  /** Half-span of the 'outlined-wide' chevron in multiples of the path stroke. Larger = longer chevron legs at a fixed apex angle. Default 2. */
  chevronSize?: number
  /** Radius (user-space units) of the rounded bend at each interior vertex when rendering a single-gradient straight gesture. 0 = sharp. Only applied to the single-gradient code path. */
  cornerRadius?: number
  /** Extra length (user-space units) added to just the last segment so there is more breathing room between the final bend and the arrowhead tip. Default 0. */
  tipExtension?: number
  /** When true, the wrapping span sizes itself to its parent (`width: 100%; height: 100%`) instead of using a fixed pixel size derived from `size`/`maxWidth`/`maxHeight`. Pair with a parent that constrains the aspect ratio. */
  fillContainer?: boolean
  /** Show a 1px blue debug outline around the diagram's bounding box. Off by default. */
  debugBorder?: boolean
  /** When supplied, the per-segment fade interpolates between these two colors instead of the default single-color → bg fade. The path starts near `from` and ends near `to` (the arrowhead). */
  gradient?: { from: string; to: string }
  /** Whether to apply the soft drop-shadow glow around the gesture. Defaults to true to preserve existing rendering. */
  glow?: boolean
}

/** Returns the direction resulting from a 90 degree clockwise rotation. */
const rotateClockwise = (dir: Direction) =>
  ({
    l: 'u',
    r: 'd',
    u: 'r',
    d: 'l',
  })[dir]

/** Returns the opposite direction of the given direction l/r/d/u. */
const oppositeDirection = (dir: Direction) =>
  ({
    l: 'r',
    r: 'l',
    u: 'd',
    d: 'u',
  })[dir]

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

/** Calculates the coordinates for a curved segment that can be consumed by other functions. */
const generateArcCoordinates = (index: number, pathDirs: Direction[], size: number) => {
  const radius = size * 0.4
  const center = { x: 50, y: 50 }

  /** Determine base angle based on first direction and second direction. */
  const getBaseAngle = (first: Direction, second: Direction): number => {
    if (first === 'l' || first === 'r') {
      return second === 'u' ? 90 : -90
    } else {
      return second === 'r' ? 0 : 180
    }
  }

  const clockwise = rotateClockwise(pathDirs[0]) === pathDirs[1]
  const sweepFlag = clockwise ? 1 : 0
  const baseAngle = getBaseAngle(pathDirs[0], pathDirs[1])

  // Calculate total angle and segment angle based on path length
  const totalAngle = (pathDirs.length - 1) * (clockwise ? 90 : -90)
  const segmentAngle = totalAngle / pathDirs.length

  // Calculate angles for this segment
  const [startAngle, endAngle] = [baseAngle + index * segmentAngle, baseAngle + (index + 1) * segmentAngle]

  // Convert angles to radians
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  // Calculate points
  const startX = center.x + radius * Math.cos(startRad)
  const startY = center.y + radius * Math.sin(startRad)
  const endX = center.x + radius * Math.cos(endRad)
  const endY = center.y + radius * Math.sin(endRad)

  return { startX, startY, radius, sweepFlag, endX, endY }
}

/** Generates radial gradients for curved segments of the gesture. */
const ArcGradient = ({ index, extendedPath, size }: { index: number; extendedPath: Gesture; size: number }) => {
  const { startX, startY, radius } = generateArcCoordinates(index, Array.from(extendedPath) as Direction[], size)
  return (
    <radialGradient
      cx={startX}
      cy={startY}
      r={radius}
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
const GradientStyleBlock = ({
  color,
  gradient,
  highlight,
  path,
}: {
  color?: string
  gradient?: { from: string; to: string }
  highlight?: number
  path: Gesture
}) => {
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

        // When `gradient` is supplied, fade between the two given colors per segment instead of
        // the default single-color → bg fade. Higher percentages weight `to`, so the path starts
        // near `from` and ends near `to`.
        const startMix = gradient
          ? `color-mix(in srgb, ${gradient.to} ${startPercent}%, ${gradient.from})`
          : `color-mix(in srgb, ${stopColor} ${startPercent}%, ${token('colors.bg')})`
        const stopMix = gradient
          ? `color-mix(in srgb, ${gradient.to} ${stopPercent}%, ${gradient.from})`
          : `color-mix(in srgb, ${stopColor} ${stopPercent}%, ${token('colors.bg')})`

        return `
            .${path}-gradient-${i}-start { stop-color: ${startMix} }
            .${path}-gradient-${i}-stop { stop-color: ${stopMix} }
          `
      })}
    </style>
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
  chevronApexAngle = 80,
  chevronSize = 2.2,
  cornerRadius = 0,
  tipExtension = 0,
  fillContainer = false,
  debugBorder = false,
  gradient,
  glow = true,
}: GestureDiagramProps) => {
  const [id] = useState(createId())

  // match signaturePad shadow in TraceGesture component
  // TODO: Why isn't this working?
  const dropShadow = glow
    ? `drop-shadow(0 0 ${(GESTURE_GLOW_BLUR * 2) / 3}px ${token(`colors.${GESTURE_GLOW_COLOR}` as const)})`
    : 'none'

  arrowSize = arrowSize ? +arrowSize : strokeWidth * 5
  reversalOffset = reversalOffset ? +reversalOffset : size * 0.3

  // If path is null, render a cancel gesture svg
  if (path === null) {
    return (
      <svg
        width={styleCancelAsRegularGesture ? size / 2 : 20}
        height={styleCancelAsRegularGesture ? size / 2 : 24}
        className={css(
          debugBorder && { border: '1px solid blue' },
          inGestureContainer && { position: 'relative', top: '10px' },
          cssRaw,
        )}
        style={{
          ...style,
          ...(styleCancelAsRegularGesture
            ? { paddingLeft: size / 10, paddingRight: size / 3 }
            : { marginTop: '12px', marginBottom: '20px', marginLeft: '20px' }),
        }}
        viewBox='0 0 24 24'
      >
        <path
          d='M9.2725 0.714111C7.51965 3.8284 5.38488 6.62757 3.32706 9.53916C2.78228 10.31 2.34409 10.9449 1.86001 11.742C1.61923 12.1385 1.24853 12.6919 1.15146 13.1773C1.13411 13.264 1.17847 13.2863 1.25138 13.2681C1.67295 13.1627 2.15668 12.9113 2.52768 12.7276C7.4968 10.2679 11.7666 6.68876 16.4261 3.73452C18.1996 2.61011 20.1063 1.47669 22.1308 0.863996C22.8342 0.651122 22.5133 1.3142 22.3443 1.74968C21.91 2.86867 21.1473 3.86772 20.4094 4.80188C18.9097 6.70051 16.9227 8.26976 15.0181 9.74354C12.4635 11.7203 9.78768 13.554 7.29674 15.6118C6.3193 16.4192 5.37795 17.2552 4.47618 18.1462C4.01607 18.6008 3.51334 19.0404 3.18172 19.6042C3.0095 19.8969 3.10278 19.9327 3.39519 19.9221C4.08649 19.897 4.79822 19.8572 5.47541 19.7086C7.05389 19.3623 8.53153 18.5857 10.0219 17.9872C11.5619 17.3688 13.1128 16.7992 14.632 16.1296C17.0018 15.085 19.356 14.0449 21.4995 12.5777C22.2937 12.0341 23.0976 11.5068 23.884 10.9517C24.1828 10.7408 24.8514 10.0682 24.8514 10.4339C24.8514 10.8715 24.3341 11.4593 24.1247 11.7874C23.4648 12.8219 22.7443 13.8086 21.99 14.776C20.5168 16.6656 18.6452 17.9367 16.6759 19.2726C15.9788 19.7455 15.2156 20.2057 14.5821 20.7669C14.4752 20.8616 14.332 21.0133 14.2777 21.153C14.1713 21.4267 14.8675 21.199 15.1589 21.1621C16.8507 20.9478 18.5347 20.6994 20.2277 20.4989'
          stroke={highlight != null && highlight > 0 ? token('colors.vividHighlight') : color || token('colors.fg')}
          strokeWidth={1.25}
          strokeLinecap='round'
          fill='none'
          style={styleCancelAsRegularGesture ? undefined : { filter: dropShadow }}
        />
      </svg>
    )
  }

  /** Calculates the change in x,y position of each segment of the gesture diagram. */
  const pathSegmentDelta = (dir: Direction, i: number, pathDirs: Direction[]) => {
    const beforePrev = pathDirs[i - 2]
    const prev = pathDirs[i - 1]
    const next = pathDirs[i + 1]
    const afterNext = pathDirs[i + 2]
    const horizontal = dir === 'l' || dir === 'r'
    const path = pathDirs.join('')

    const negative = dir === 'l' || dir === 'd' // negative movement along the respective axis

    const clockwisePrev = rotateClockwise(prev) === dir
    const clockwiseAfterNext = rotateClockwise(next) === afterNext
    const reversal = i < path.length - 1 && next === oppositeDirection(dir) && afterNext !== dir

    // shorten the segment to make up for a reversal
    const shorten =
      (i > 1 && prev === oppositeDirection(beforePrev)) ||
      (i < path.length - 2 && next === oppositeDirection(afterNext))
        ? reversalOffset!
        : 0

    const flipOffset =
      (i < path.length - 2 && !negative === clockwiseAfterNext) || (i > 0 && !negative === clockwisePrev)

    // when there is a reversal of direction, instead of moving 0 on the orthogonal plane, offset the vertex to avoid segment overlap
    const dx = horizontal
      ? (size - shorten) * (negative ? -1 : 1)
      : (reversal ? reversalOffset! : 0) * (flipOffset ? -1 : 1) // the negative multiplier here ensures the offset is moving away from the previous segment so it doesn't trace backwards
    const dy = !horizontal
      ? (size - shorten) * (!negative ? -1 : 1)
      : (reversal ? reversalOffset! : 0) * (flipOffset ? -1 : 1)

    return { dx, dy }
  }

  // Convert path string to array of directions
  // Special cases:
  // - Extend the last segment of →↓← so that the New Uncle gesture is more intuitive
  // - Extend the middle segment of ←↓→ so that the Select All gesture is more intuitive
  const extendedPath = path === 'rdl' ? 'rddl' : path === 'ldr' ? 'lddr' : path
  const extendedPathArray = Array.from(extendedPath) as Direction[]
  const pathSegments = extendedPathArray.map(pathSegmentDelta)

  const sumWidth = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dx, 0))
  const sumHeight = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dy, 0))
  const scale = size / Math.max(size, sumWidth, sumHeight)

  // Compute the positions of all points
  const positions = pathSegments.reduce(
    (accum, segment) => {
      const prevPos = accum[accum.length - 1]
      const x = prevPos.x + segment.dx * scale
      const y = prevPos.y + segment.dy * scale
      return [...accum, { x, y }]
    },
    [{ x: 0, y: 0 }],
  )

  // Detect if the last position overlaps with any previous position
  const lastPosition = positions[positions.length - 1]
  const overlapsWithPrevious = positions
    .slice(0, positions.length - 1)
    .some(pos => pos.x === lastPosition.x && pos.y === lastPosition.y)

  // Shorten the last segment if it overlaps with a previous segment
  if (overlapsWithPrevious) {
    const lastSegmentStartPos = positions[positions.length - 2]
    const lastSegment = pathSegments[pathSegments.length - 1]

    // Shorten to 60% of the original length
    const scale = 0.6

    // Update the last segment
    lastSegment.dx *= scale
    lastSegment.dy *= scale

    // Update the last position
    positions[positions.length - 1] = {
      x: lastSegmentStartPos.x + lastSegment.dx,
      y: lastSegmentStartPos.y + lastSegment.dy,
    }
  }

  // Extend the last segment outward by `tipExtension` user-space units so the final bend has
  // more breathing room before the arrowhead. The chevron, gradient chord, and bbox all derive
  // from `positions`, so they stay in sync automatically.
  if (tipExtension > 0 && positions.length >= 2) {
    const tip = positions[positions.length - 1]
    const prev = positions[positions.length - 2]
    const dxRaw = tip.x - prev.x
    const dyRaw = tip.y - prev.y
    const len = Math.hypot(dxRaw, dyRaw) || 1
    positions[positions.length - 1] = {
      x: tip.x + (dxRaw / len) * tipExtension,
      y: tip.y + (dyRaw / len) * tipExtension,
    }
  }

  /** Crop the viewbox to the diagram and adjust the svg element's height when first rendered. */
  const onRef = (el: SVGGraphicsElement | null) => {
    if (!el) return
    if (viewBox) return

    // For straight (non-rounded, non-rdld) gestures, derive the bbox from the precomputed
    // vertex positions instead of getBBox. Browsers disagree about whether getBBox includes
    // marker geometry, and a marker that extends asymmetrically (e.g. a tall arrowhead at the
    // end of "rur") biases the centering of the path within the cell.
    if (path !== 'rdld' && !rounded) {
      // Include chevron leg endpoints in the bbox so the viewBox accommodates them.
      const allPts = chevronPoints
        ? [...positions, chevronPoints.leg1Open, chevronPoints.leg2Open]
        : positions
      const xs = allPts.map(p => p.x)
      const ys = allPts.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const padX = arrowSize! + strokeWidth * 4
      const padY = arrowSize! + strokeWidth * 2
      if (fillContainer) {
        // Force a square viewBox centered on the bbox center so every gesture fits-to-cell at
        // the same scale. We also clamp the side to a minimum of `size + tipExtension` (the max
        // extent a straight gesture can reach) so rounded and rdld gestures — whose natural
        // bboxes are smaller — share the same fit-scale and render strokes at the same on-screen
        // thickness as straight gestures.
        const pad = Math.max(padX, padY)
        const side = Math.max(maxX - minX, maxY - minY, size + tipExtension) + pad * 2
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        el.setAttribute('viewBox', `${cx - side / 2} ${cy - side / 2} ${side} ${side}`)
        return
      }
      el.setAttribute(
        'viewBox',
        `${minX - padX} ${minY - padY} ${maxX - minX + padX * 2} ${maxY - minY + padY * 2}`,
      )
      return
    }

    const bbox = el.getBBox()
    if (fillContainer) {
      // Same square-viewBox treatment we apply to straight gestures, with the same clamp to
      // `size + tipExtension` so rounded/rdld gestures share the straight-gesture fit-scale.
      const pad = arrowSize! + strokeWidth * 4
      const side = Math.max(bbox.width, bbox.height, size + tipExtension) + pad * 2
      const cx = bbox.x + bbox.width / 2
      const cy = bbox.y + bbox.height / 2
      el.setAttribute('viewBox', `${cx - side / 2} ${cy - side / 2} ${side} ${side}`)
      return
    }
    el.setAttribute(
      'viewBox',
      `${bbox.x - arrowSize! - strokeWidth * 4} ${bbox.y - arrowSize! - strokeWidth * 2} ${
        +bbox.width + +arrowSize! * (arrowhead === 'outlined' ? 2 : 5) + +strokeWidth * 8
      } ${+bbox.height + +arrowSize! * 2 + +strokeWidth * 4}`,
    )
  }

  /** Generates an SVG path string for a curved segment of the gesture.*/
  const generateArcPath = (index: number, pathDirs: Direction[]) => {
    const { startX, startY, radius, sweepFlag, endX, endY } = generateArcCoordinates(index, pathDirs, size)
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`
  }

  // When a two-color gradient is supplied, render the whole gesture as a single <path> with one
  // chord-aligned linear gradient. This avoids the visible seams that per-segment paths produce
  // at their overlapping rounded joins, and applies to straight, `rounded`, and the special-case
  // 'rdld' help glyph.
  const useSingleGradient = !!gradient

  // In fillContainer mode, scale up the geometry of rounded and rdld gestures so their natural
  // bboxes match the straight-gesture extent (`size + tipExtension`). This keeps the viewBox
  // (and thus the rendered stroke thickness) uniform across gestures while letting each one
  // fill its cell at a similar visual size.
  // - rounded: radius = arcSize * 0.4. We want 2*radius = size + tipExtension (the extent of a
  //   270° arc, which is the typical case), so arcSize = (size + tipExtension) / 0.8.
  // - rdld: hardcoded path's natural max dimension is ~76 (height from y=-4.5 to y=72), so
  //   scale = (size + tipExtension) / 76 normalizes it to the same extent.
  const RDLD_NATURAL_MAX = 76
  const arcSize = fillContainer ? (size + tipExtension) / 0.8 : size
  const rdldScale = fillContainer ? (size + tipExtension) / RDLD_NATURAL_MAX : 1

  // Endpoints of the gradient chord. For straight gestures, run from first vertex to tip. For
  // rounded gestures, run from the start of the first arc to the end of the last arc. For rdld,
  // run from the top of the question mark to the bottom of its stem (matching the hardcoded
  // path).
  const gradientChord = useSingleGradient
    ? path === 'rdld'
      ? {
          start: { x: 29.7 * rdldScale, y: 13.5 * rdldScale },
          end: { x: 45 * rdldScale, y: 72 * rdldScale },
        }
      : rounded
        ? (() => {
            const dirs = Array.from(path!) as Direction[]
            const first = generateArcCoordinates(0, dirs, arcSize)
            const last = generateArcCoordinates(dirs.length - 1, dirs, arcSize)
            return {
              start: { x: first.startX, y: first.startY },
              end: { x: last.endX, y: last.endY },
            }
          })()
        : { start: positions[0], end: positions[positions.length - 1] }
    : null

  // 'outlined-wide' renders the chevron as a separate <path> whose apex sits at the gesture's
  // natural tip, with two legs splaying BACKWARD (≈65° apex by default). Independent of
  // `gradient`: the chevron can use the gesture's gradient or fall back to a solid color.
  const useChevronArrowhead =
    arrowhead === 'outlined-wide' && path !== 'rdld' && !rounded && positions.length >= 2

  const chevronPoints = useChevronArrowhead
    ? (() => {
        const tip = positions[positions.length - 1]
        const prev = positions[positions.length - 2]
        const dxRaw = tip.x - prev.x
        const dyRaw = tip.y - prev.y
        const len = Math.hypot(dxRaw, dyRaw) || 1
        // Unit vector along last segment (forward toward apex).
        const ux = dxRaw / len
        const uy = dyRaw / len
        // Perpendicular (clockwise from forward): r→down, l→up, u→right, d→left.
        const px = -uy
        const py = ux
        // Chevron span scales with `chevronSize` (multiples of path stroke); leg projection is
        // derived from the apex angle so the legs always meet at exactly `chevronApexAngle`
        // regardless of stroke width or chosen size.
        const pathStroke = strokeWidth * 1.5
        const halfSpan = pathStroke * chevronSize
        const halfAngleRad = (chevronApexAngle / 2) * (Math.PI / 180)
        // legBack / halfSpan = cot(halfAngle); guard against very wide angles where cot → 0.
        const legBack = halfSpan / Math.max(Math.tan(halfAngleRad), 0.01)
        const leg1Open = {
          x: tip.x - ux * legBack + px * halfSpan,
          y: tip.y - uy * legBack + py * halfSpan,
        }
        const leg2Open = {
          x: tip.x - ux * legBack - px * halfSpan,
          y: tip.y - uy * legBack - py * halfSpan,
        }
        return { tip, leg1Open, leg2Open }
      })()
    : null

  return (
    <span
      className={css({ display: 'inline-block' }, debugBorder && { border: '1px solid blue' }, cssRaw)}
      style={
        fillContainer
          ? { width: '100%', height: '100%' }
          : { width: `${maxWidth ?? size}px`, height: `${maxHeight ?? size}px` }
      }
    >
      <svg
        className={css(inGestureContainer && { position: 'relative', top: '10px' }, { width: '100%', height: '100%' })}
        style={style}
        ref={onRef}
        viewBox={viewBox}
      >
        <defs>
          <marker
            id={id}
            viewBox='0 0 10 10'
            // refX=0 puts the open side of the ">" at the path endpoint so the chevron extends
            // past the path tip rather than overlapping it.
            refX={rounded ? '0' : arrowhead === 'outlined' ? '0' : '5'}
            refY='5'
            // Marker is sized so its strokes can equal the path stroke in user space (per
            // spec) while the chevron still reads as a clearly hollow ">". The 4× factor
            // gives chevron span ≈ 4× path-stroke thickness, matching the mockup proportions.
            markerWidth={arrowSize! * (arrowhead === 'outlined' ? 4 : 1)}
            markerHeight={arrowSize! * (arrowhead === 'outlined' ? 4 : 1)}
            markerUnits='userSpaceOnUse'
            orient='auto-start-reverse'
          >
            <path
              d={
                arrowhead === 'filled'
                  ? 'M 0 0 L 10 5 L 0 10 z'
                  : arrowhead === 'outlined'
                    ? // 70° apex (w/h ≈ 1.43, half-span 3.3 vb ≈ 2× path-stroke). Centered on
                      // refY=5 so the chevron is symmetric around the path.
                      'M 0 1.7 L 4.71 5 L 0 8.3'
                    : undefined
              }
              fill={
                arrowhead === 'outlined'
                  ? 'none'
                  : highlight != null && highlight >= path.length
                    ? token('colors.vividHighlight')
                    : color || token('colors.fg')
              }
              stroke={
                arrowhead === 'outlined' ? gradient?.to ?? color ?? token('colors.fg') : 'none'
              }
              // 1:1 thickness with the path stroke in user space (per spec). With
              // markerUnits='userSpaceOnUse' the marker's strokeWidth is in viewBox units;
              // path stroke (user) = strokeWidth * 1.5, viewBox-to-user scale = markerWidth/10
              // = arrowSize * 0.4, so equivalent vb stroke = (strokeWidth * 1.5) /
              // (arrowSize * 0.4) = strokeWidth * 3.75 / arrowSize.
              strokeWidth={arrowhead === 'outlined' ? (strokeWidth * 3.75) / arrowSize! : 0}
              strokeLinecap={arrowhead === 'outlined' ? 'round' : undefined}
              strokeLinejoin={arrowhead === 'outlined' ? 'round' : undefined}
              style={{ filter: dropShadow }}
            />
          </marker>
          {extendedPath === 'rdld' && !useSingleGradient ? (
            <MobileCommandUniverseGradients />
          ) : useSingleGradient ? (
            <linearGradient
              id={`${extendedPath}-gradient-single`}
              gradientUnits='userSpaceOnUse'
              x1={gradientChord!.start.x}
              y1={gradientChord!.start.y}
              x2={gradientChord!.end.x}
              y2={gradientChord!.end.y}
            >
              <stop offset='0%' stopColor={gradient!.from} />
              <stop offset='100%' stopColor={gradient!.to} />
            </linearGradient>
          ) : (
            pathSegments.map((segment, i) => {
              return rounded ? (
                <ArcGradient key={`${extendedPath}-gradient-${i}`} index={i} extendedPath={extendedPath} size={size} />
              ) : (
                <linearGradient
                  id={`${extendedPath}-gradient-${i}`}
                  key={`${extendedPath}-gradient-${i}`}
                  gradientUnits='userSpaceOnUse'
                  x1={positions[i].x}
                  x2={positions[i].x + segment.dx * scale}
                  y1={positions[i].y}
                  y2={positions[i].y + segment.dy * scale}
                >
                  <stop offset='0%' className={`${extendedPath}-gradient-${i}-start`} />
                  <stop offset='100%' className={`${extendedPath}-gradient-${i}-stop`} />
                </linearGradient>
              )
            })
          )}
        </defs>

        {!useSingleGradient && (
          <GradientStyleBlock color={color} gradient={gradient} highlight={highlight} path={extendedPath} />
        )}

        {useSingleGradient ? (
          // Single continuous gesture path with chord-aligned gradient. For straight gestures,
          // interior vertices may be softened with quadratic curves (cornerRadius > 0) so the
          // bends look like rounded turns rather than mitered joins. For `rounded` gestures,
          // concatenate the per-segment arcs into one continuous path so segment joins
          // disappear and the gradient flows as one stroke.
          <path
            d={(() => {
              if (path === 'rdld') {
                // Concatenate the four hardcoded ?-glyph segments into one continuous path so
                // their rounded caps no longer overlap as four discrete blobs. Coords are scaled
                // by `rdldScale` so the glyph's bbox matches `size + tipExtension` in
                // fillContainer mode (otherwise scale = 1 and we render at natural size).
                const r = rdldScale
                return (
                  `M ${29.7 * r},${13.5 * r}` +
                  ` Q ${46.8 * r},${-4.5 * r} ${63 * r},${13.5 * r}` +
                  ` Q ${72 * r},${27 * r} ${54 * r},${40.5 * r}` +
                  ` Q ${45 * r},${49.5 * r} ${45 * r},${58.5 * r}` +
                  ` L ${45 * r},${72 * r}`
                )
              }
              if (rounded) {
                const dirs = Array.from(path!) as Direction[]
                const cmds: string[] = []
                for (let i = 0; i < dirs.length; i++) {
                  const { startX, startY, radius, sweepFlag, endX, endY } = generateArcCoordinates(i, dirs, arcSize)
                  if (i === 0) cmds.push(`M ${startX} ${startY}`)
                  cmds.push(`A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`)
                }
                return cmds.join(' ')
              }
              if (cornerRadius <= 0 || positions.length < 3) {
                return positions
                  .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                  .join(' ')
              }
              const cmds: string[] = [`M ${positions[0].x} ${positions[0].y}`]
              for (let i = 1; i < positions.length - 1; i++) {
                const prev = positions[i - 1]
                const curr = positions[i]
                const next = positions[i + 1]
                const dxIn = curr.x - prev.x
                const dyIn = curr.y - prev.y
                const lenIn = Math.hypot(dxIn, dyIn) || 1
                // Cap the corner radius at half the segment length so adjacent corners don't
                // overlap on short segments.
                const inLen = Math.min(cornerRadius, lenIn / 2)
                const dxOut = next.x - curr.x
                const dyOut = next.y - curr.y
                const lenOut = Math.hypot(dxOut, dyOut) || 1
                const outLen = Math.min(cornerRadius, lenOut / 2)
                const beforeX = curr.x - (dxIn / lenIn) * inLen
                const beforeY = curr.y - (dyIn / lenIn) * inLen
                const afterX = curr.x + (dxOut / lenOut) * outLen
                const afterY = curr.y + (dyOut / lenOut) * outLen
                cmds.push(`L ${beforeX} ${beforeY}`)
                cmds.push(`Q ${curr.x} ${curr.y} ${afterX} ${afterY}`)
              }
              const last = positions[positions.length - 1]
              cmds.push(`L ${last.x} ${last.y}`)
              return cmds.join(' ')
            })()}
            stroke={`url(#${extendedPath}-gradient-single)`}
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
            fill='none'
            // When the chevron arrowhead is rendered as a separate path (non-rounded outlined-wide),
            // skip markerEnd so we don't double-draw the arrowhead. The 'rdld' help glyph has no
            // arrowhead at all. Otherwise the marker handles it.
            markerEnd={useChevronArrowhead || path === 'rdld' ? undefined : `url(#${id})`}
            style={{ filter: dropShadow }}
          />
        ) : (
          pathSegments.map((segment, i) => {
            const { x, y } = positions[i]
            return (
              <path
                d={
                  // use a custom '?' path for the Help gesture
                  path === 'rdld'
                    ? i === 0
                      ? 'M 29.7,13.5 Q 46.8,-4.5 63,13.5'
                      : i === 1
                        ? 'M 63,13.5 Q 72,27 54,40.5'
                        : i === 2
                          ? 'M 54,40.5 Q 45,49.5 45,58.5'
                          : 'M 45,58.5 L 45,72'
                    : rounded
                      ? generateArcPath(i, Array.from(path) as Direction[])
                      : `M ${x} ${y} l ${segment.dx * scale} ${segment.dy * scale}`
                }
                // segments do not change independently, so we can use index as the key
                key={i}
                stroke={`url(#${extendedPath}-gradient-${i})`}
                strokeWidth={strokeWidth * 1.5}
                strokeLinecap='round'
                strokeLinejoin='round'
                fill='none'
                markerEnd={
                  // skip markerEnd when the 'outlined-wide' chevron is drawn separately below
                  i === pathSegments.length - 1 && path !== 'rdld' && !useChevronArrowhead
                    ? `url(#${id})`
                    : undefined
                }
                style={{ filter: dropShadow }}
              />
            )
          })
        )}

        {/* Chevron arrowhead for 'outlined-wide': a separate <path> whose apex coincides with
            the gesture path's tip, with two legs splaying backward. When the gesture path uses
            a single chord-aligned gradient, the chevron uses the same gradient so brightness
            flows continuously through the arrowhead instead of jumping to a flat color. */}
        {chevronPoints && (
          <path
            d={
              `M ${chevronPoints.leg1Open.x} ${chevronPoints.leg1Open.y}` +
              ` L ${chevronPoints.tip.x} ${chevronPoints.tip.y}` +
              ` L ${chevronPoints.leg2Open.x} ${chevronPoints.leg2Open.y}`
            }
            stroke={
              useSingleGradient
                ? `url(#${extendedPath}-gradient-single)`
                : color ?? token('colors.fg')
            }
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
            fill='none'
            style={{ filter: dropShadow }}
          />
        )}
      </svg>
    </span>
  )
}

const GestureDiagramMemo = React.memo(GestureDiagram)
GestureDiagramMemo.displayName = 'GestureDiagram'

export default GestureDiagramMemo
