import classNames from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import testFlags from '../e2e/testFlags'
import useDragAndDropThought from '../hooks/useDragAndDropThought'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import { hasChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import nextSibling from '../selectors/nextSibling'
import head from '../util/head'
import strip from '../util/strip'

/** A drop target for after the hidden parent at a cliff (before the next hidden uncle). This is needed because the Thought will be hidden/shimmed so DragAndDropThought will not be rendered. DropEnd does not work since it drops at the end of a context, whereas this needs to drop before the next hidden uncle. */
const DropUncle = ({ depth, path, simplePath }: { depth?: number; path: Path; simplePath: SimplePath }) => {
  const dropHoverColor = useDropHoverColor(depth || 0)
  const value = useSelector(state =>
    testFlags.simulateDrop ? getThoughtById(state, head(simplePath))?.value || '' : '',
  )

  const { isHovering, dropTarget } = useDragAndDropThought({ path, simplePath })
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  if (!dropTarget) return null

  return (
    <span
      className={classNames({
        'drop-end': true,
      })}
      ref={dropTarget}
      style={{
        backgroundColor: testFlags.simulateDrop ? '#52305f' : undefined, // eggplant
        height: '1.9em',
        opacity: 0.9,
      }}
    >
      {testFlags.simulateDrop && (
        <span
          style={{
            paddingLeft: 5,
            position: 'absolute',
            // make sure label does not interfere with drop target hovering
            pointerEvents: 'none',
            left: 0,
            color: '#ff7bc3' /* mid pink */,
          }}
        >
          {strip(value)}
          {isHovering ? '*' : ''}
        </span>
      )}
      {(testFlags.simulateDrag || isHovering) && (
        <span className='drop-hover' style={{ backgroundColor: dropHoverColor }} />
      )}
    </span>
  )
}

/** Renders a DropUncle component if there is a drag in progress and the thought is the cursor's hidden uncle. */
const DropUncleCondition = ({ depth, path, simplePath }: { depth?: number; path: Path; simplePath: SimplePath }) => {
  /** Tracks if the thought is the cursor uncle and there is a drag in progress. */
  const show = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if ((!state.dragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) || !state.cursor) return false
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    const cursorParentId = state.cursor[state.cursor.length - (isCursorLeaf ? 3 : 2)] as ThoughtId | null
    // first uncle of the cursor used for DropUncle
    const cursorUncleId = (cursorParentId && nextSibling(state, cursorParentId)?.id) || null
    return head(simplePath) === cursorUncleId
  })

  if (!show) return

  return <DropUncle {...{ depth, path, simplePath }} />
}

const DropUncleMemo = React.memo(DropUncleCondition)
DropUncleMemo.displayName = 'DropUncle'

export default DropUncleMemo
