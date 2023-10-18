import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import Direction from '../@types/Direction'
import GesturePath from '../@types/GesturePath'
import themeColors from '../selectors/themeColors'
import createId from '../util/createId'

interface GestureDiagramProps {
  arrowSize?: number
  className?: string
  color?: string
  flexibleSize?: number
  // override auto height
  height?: number
  // highlight the first n segments of the gesture diagram
  highlight?: number
  path: GesturePath
  reversalOffset?: number
  size?: number
  strokeWidth?: number
  style?: React.CSSProperties
  // overrides the SVG's viewBox attributeo
  // if not provided, viewBox will be calculated automatically
  // TODO: improve auto cropping so there is no excess space
  viewBox?: `${number} ${number} ${number} ${number}`
  // override auto width
  width?: number
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

/** Renders an SVG representation of a gesture.
 *
 * @param path Any combination of l/r/u/d.
 * @param size The length of each segment of the gesture.
 * @param arrowSize The length of the arrow marker.
 * @param reversalOffset The amount of orthogonal distance to offset a vertex when there is a reversal of direction to avoid segment overlap.
 */
const GestureDiagram = ({
  arrowSize,
  className,
  color,
  flexibleSize,
  height,
  highlight,
  path,
  reversalOffset,
  size = 50,
  strokeWidth = 1.5,
  style,
  viewBox,
  width,
}: GestureDiagramProps) => {
  const [id] = useState(createId())
  const colors = useSelector(themeColors)

  arrowSize = arrowSize ? +arrowSize : strokeWidth * 5
  reversalOffset = reversalOffset ? +reversalOffset : size * 0.3

  /** Calculates the change in x,y position of each segment of the gesture diagram. */
  const pathSegmentDelta = (dir: Direction, i: number, pathDirs: Direction[]) => {
    const beforePrev = pathDirs[i - 2]
    const prev = pathDirs[i - 1]
    const next = pathDirs[i + 1]
    const afterNext = pathDirs[i + 2]
    const horizontal = dir === 'l' || dir === 'r'
    const negative = dir === 'l' || dir === 'd' // negative movement along the respective axis

    const clockwisePrev = rotateClockwise(prev) === dir
    const clockwiseAfterNext = rotateClockwise(next) === afterNext
    const reversal = i < path.length - 1 && next === oppositeDirection(dir)

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

  // eslint-disable-next-line no-extra-parens
  const pathSegments = (Array.from(path) as Direction[]).map(pathSegmentDelta)
  const sumWidth = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dx, 0))
  const sumHeight = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dy, 0))

  /** Crop the viewbox to the diagram and adjust the svg element's height when first rendered. */
  const onRef = (el: SVGGraphicsElement | null) => {
    if (!el) return

    // crop viewbox to diagram
    if (!viewBox) {
      const bbox = el.getBBox()
      el.setAttribute(
        'viewBox',
        `${bbox.x - arrowSize! - strokeWidth * 4} ${bbox.y - arrowSize! - strokeWidth * 2} ${
          +bbox.width + +arrowSize! * 5 + +strokeWidth * 8
        } ${+bbox.height + +arrowSize! * 2 + +strokeWidth * 4}`,
      )
    }

    // use size if sumWidth is ~0, eg. for the path 'rl'
    // sumWidth will not be exactly 0 due to the reversal offset
    if (!width) {
      el.setAttribute('width', (flexibleSize ? Math.max(sumWidth, size) : size) + 'px')
      el.setAttribute('height', (flexibleSize ? Math.max(sumHeight, size) : size) + 'px')
    }
  }

  return (
    <svg
      width={width || '100'}
      height={height || '100'}
      className={className}
      style={style}
      ref={onRef}
      viewBox={viewBox}
    >
      <defs>
        <marker
          id={id}
          viewBox='0 0 10 10'
          refX='5'
          refY='5'
          markerWidth={arrowSize!}
          markerHeight={arrowSize}
          markerUnits='userSpaceOnUse'
          orient='auto-start-reverse'
        >
          <path
            d='M 0 0 L 10 5 L 0 10 z'
            fill={highlight != null && highlight >= path.length ? colors.vividHighlight : color || colors.fg}
            stroke='none'
          />
        </marker>
      </defs>

      {pathSegments.map((segment, i) => {
        const { x, y } = pathSegments
          .slice(0, i)
          .reduce((accum, segment) => ({ x: accum.x + segment.dx, y: accum.y + segment.dy }), { x: 50, y: 50 })
        return (
          <path
            d={`M ${x} ${y} l ${segment.dx} ${segment.dy}`}
            // segments do not change independently, so we can use index as the key
            key={i}
            stroke={highlight != null && i < highlight ? colors.vividHighlight : color || colors.fg}
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
            fill='none'
            markerEnd={i === pathSegments.length - 1 ? `url(#${id})` : undefined}
          />
        )
      })}
    </svg>
  )
}

const GestureDiagramMemo = React.memo(GestureDiagram)
GestureDiagramMemo.displayName = 'GestureDiagram'

export default GestureDiagramMemo
