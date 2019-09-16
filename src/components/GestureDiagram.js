import React from 'react'
import { connect } from 'react-redux'

import {
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
  color: props.color || (settings.dark ? 'white' : 'black')
}))(({ path, size=50, strokeWidth=1.5, arrowSize, reversalOffset, color }) => {

  arrowSize = arrowSize ? +arrowSize : (size * 0.3)
  reversalOffset = reversalOffset ? +reversalOffset : (size * 0.3)

  const pathCommands = path.split('').map((dir, i, dirs) => {

    const beforePrev = dirs[i-2]
    const prev = dirs[i-1]
    const next = dirs[i+1]
    const afterNext = dirs[i+2]
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
    return `l ${dx} ${dy}`
  })

  // return path
  return <svg width='100' height='100' ref={el => {
    if (el) {
      // crop viewbox to diagram
      const bbox = el.getBBox()
      el.setAttribute('viewBox', `${bbox.x - arrowSize} ${bbox.y - arrowSize + strokeWidth/2} ${bbox.width + arrowSize * 2} ${bbox.height + arrowSize}`)
      el.setAttribute('width', (size) + 'px')
      el.setAttribute('height', (size) + 'px')
    }
  }}>
    <defs>
       <marker id='arrow' viewBox='0 0 10 10' refX='5' refY='5' markerWidth={arrowSize} markerHeight={arrowSize} orient='auto-start-reverse'>
        <path d='M 0 0 L 10 5 L 0 10 z' fill={color} stroke='none' />
      </marker>
    </defs>
    <path d={'M 50 50 ' + pathCommands.join(' ')} stroke={color} strokeWidth={strokeWidth} fill='none' markerEnd="url(#arrow)" />
  </svg>
})

