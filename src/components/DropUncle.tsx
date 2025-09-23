import React from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { dropEndRecipe, dropHoverRecipe } from '../../styled-system/recipes'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import testFlags from '../e2e/testFlags'
import useDragAndDropThought from '../hooks/useDragAndDropThought'
import useDropHoverWidth from '../hooks/useDropHoverWidth'
import useHoveringPath from '../hooks/useHoveringPath'
import attributeEquals from '../selectors/attributeEquals'
import dropHoverColor from '../selectors/dropHoverColor'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCliffDropTargetHeight from '../util/calculateCliffDropTargetHeight'
import head from '../util/head'
import parentOf from '../util/parentOf'
import strip from '../util/strip'
import { dndRef } from '../util/typeUtils'

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
  const dropHoverColorValue = useSelector(state => dropHoverColor(state, depth || 0))
  const value = useSelector(state =>
    testFlags.simulateDrop ? getThoughtById(state, head(simplePath))?.value || '' : '',
  )

  const { isHovering, dropTarget } = useDragAndDropThought({ path, simplePath })
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // Calculate the height for the uncle thought over cliff
  const dropTargetHeight = calculateCliffDropTargetHeight({ cliff, depth })
  const isTableCol2 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table'),
  )
  const dropHoverLength = useDropHoverWidth({ isTableCol2 })

  if (!dropTarget) return null

  return (
    <span
      className={cx(
        dropEndRecipe(),
        css({
          backgroundColor: testFlags.simulateDrop ? 'eggplant' : undefined,
          opacity: 0.9,
        }),
      )}
      style={{ width: dropHoverLength, height: `${1.9 + dropTargetHeight}em` }}
      ref={dndRef(dropTarget)}
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
        <span
          className={dropHoverRecipe({ insideDropEnd: true })}
          style={{ width: dropHoverLength, backgroundColor: dropHoverColorValue }}
        />
      )}
    </span>
  )
}

const DropUncleMemo = React.memo(DropUncle)
DropUncleMemo.displayName = 'DropUncle'

export default DropUncleMemo
