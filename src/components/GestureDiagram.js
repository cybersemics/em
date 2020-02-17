import React from 'react'
import { connect } from 'react-redux'

import {
  EM_TOKEN,
} from '../constants.js'

import {
  meta,
  oppositeDirection,
  rotateClockwise,
} from '../util.js'

/** Renders an SVG representation of a gesture.
 * @param path Any combination of l/r/u/d
 * @param size The length of each segment of the gesture
 * @param arrowSize The length of the arrow marker
 * @param reversalOffset The amount of orthogonal distance to offset a vertex when there is a reversal of direction to avoid segment overlap.
 */
export const GestureDiagram = connect(({ settings }, props) => ({
  color: props.color || (!meta([EM_TOKEN, 'Settings', 'Theme']).Light ? 'white' : 'black')
}))(({ path, size = 50, flexibleSize, strokeWidth = 1.5, arrowSize, reversalOffset, color, className, style }) => {

  arrowSize = arrowSize ? +arrowSize : (strokeWidth * 5)
  reversalOffset = reversalOffset ? +reversalOffset : (size * 0.3)

  const pathSegments = path.split('').map((dir, i, dirs) => {

    const beforePrev = dirs[i - 2]
    const prev = dirs[i - 1]
    const next = dirs[i + 1]
    const afterNext = dirs[i + 2]
    const horizontal = dir === 'l' || dir === 'r'
    const negative = dir === 'l' || dir === 'd' // negative movement along the respective axis

    const clockwisePrev = rotateClockwise(prev) === dir
    const clockwiseAfterNext = rotateClockwise(next) === afterNext
    const reversal = i < path.length - 1 && next === oppositeDirection(dir)

    // shorten the segment to make up for a reversal
    const shorten =
      (i > 1 && prev === oppositeDirection(beforePrev)) ||
      (i < path.length - 2 && next === oppositeDirection(afterNext)) ? reversalOffset : 0

    const flipOffset =
      (i < path.length - 2 && !negative === clockwiseAfterNext) ||
      (i > 0 && !negative === clockwisePrev)

    // when there is a reversal of direction, instead of moving 0 on the orthogonal plane, offset the vertex to avoid segment overlap
    const dx = horizontal
      ? (size - shorten) * (negative ? -1 : 1)
      : (reversal ? reversalOffset : 0) * (flipOffset ? -1 : 1) // the negative multiplier here ensures the offset is moving away from the previous segment so it doesn't trace backwards
    const dy = !horizontal
      ? (size - shorten) * (!negative ? -1 : 1)
      : (reversal ? reversalOffset : 0) * (flipOffset ? -1 : 1)

    return { dx, dy }
  })

  const pathString = pathSegments.map(segment => `l ${segment.dx} ${segment.dy}`).join(' ')
  const sumWidth = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dx, 0))
  const sumHeight = Math.abs(pathSegments.reduce((accum, cur) => accum + cur.dy, 0))

  // return path
  return <svg width='100' height='100' className={className} style={style} ref={el => {
    if (el) {
      // crop viewbox to diagram
      const bbox = el.getBBox()
      el.setAttribute('viewBox', `${bbox.x - arrowSize - strokeWidth * 4} ${bbox.y - arrowSize - strokeWidth * 2} ${+bbox.width + +arrowSize * 5 + +strokeWidth * 8} ${+bbox.height + +arrowSize * 2 + +strokeWidth * 4}`)

      // use size if sumWidth is ~0, eg. for the path 'rl'
      // sumWidth will not be exactly 0 due to the reversal offset
      el.setAttribute('width', (flexibleSize ? Math.max(sumWidth, size) : size) + 'px')
      el.setAttribute('height', (flexibleSize ? Math.max(sumHeight, size) : size) + 'px')
    }
  }}>
    <defs>
       <marker id='arrow' viewBox='0 0 10 10' refX='5' refY='5' markerWidth={arrowSize} markerHeight={arrowSize} orient='auto-start-reverse'>
        <path d='M 0 0 L 10 5 L 0 10 z' fill={color} stroke='none' />
      </marker>
    </defs>
    <path d={'M 50 50 ' + pathString} stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round' fill='none' markerEnd="url(#arrow)" />
  </svg>
})
