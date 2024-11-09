import React from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { dropEnd, dropHover } from '../../styled-system/recipes'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import testFlags from '../e2e/testFlags'
import useDragAndDropThought from '../hooks/useDragAndDropThought'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import getThoughtById from '../selectors/getThoughtById'
import calculateCliffDropTargetHeight from '../util/calculateCliffDropTargetHeight'
import head from '../util/head'
import strip from '../util/strip'

/** A drop target for after the hidden parent at a cliff (before the next hidden uncle). This is needed because the Thought will be hidden/shimmed so DragAndDropThought will not be rendered. DropEnd does not work since it drops at the end of a context, whereas this needs to drop before the next hidden uncle. */
const DropUncle = ({
  depth,
  path,
  simplePath,
  cliff,
}: {
  depth?: number
  path: Path
  simplePath: SimplePath
  cliff?: number
}) => {
  const dropHoverColor = useDropHoverColor(depth || 0)
  const value = useSelector(state =>
    testFlags.simulateDrop ? getThoughtById(state, head(simplePath))?.value || '' : '',
  )

  const { isHovering, dropTarget } = useDragAndDropThought({ path, simplePath })
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // Calculate the height for the uncle thought over cliff
  const dropTargetHeight = calculateCliffDropTargetHeight({ cliff, depth })

  if (!dropTarget) return null

  return (
    <span
      className={cx(
        dropEnd(),
        css({
          backgroundColor: testFlags.simulateDrop ? 'eggplant' : undefined, // eggplant
          opacity: 0.9,
        }),
      )}
      style={{ height: `${1.9 + dropTargetHeight}em` }}
      ref={dropTarget}
    >
      {testFlags.simulateDrop && (
        <span
          className={css({
            paddingLeft: 5,
            position: 'absolute',
            // make sure label does not interfere with drop target hovering
            pointerEvents: 'none',
            left: 0,
            color: 'midPink',
          })}
        >
          {strip(value)}
          {isHovering ? '*' : ''}
        </span>
      )}
      {(testFlags.simulateDrag || isHovering) && (
        <span className={dropHover({ insideDropEnd: true })} style={{ backgroundColor: dropHoverColor }} />
      )}
    </span>
  )
}

const DropUncleMemo = React.memo(DropUncle)
DropUncleMemo.displayName = 'DropUncle'

export default DropUncleMemo
