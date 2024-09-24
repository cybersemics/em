import classNames from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import testFlags from '../e2e/testFlags'
import useDragAndDropSubThought from '../hooks/useDragAndDropSubThought'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import { getChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCliffDropTargetHeight from '../util/calculateCliffDropTargetHeight'
import { compareReasonable } from '../util/compareThought'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import strip from '../util/strip'
import DragOnly from './DragOnly'

/** The amount of space to shift the drop target to the right so the user's finger is not in the way on mobile (em). */
const DROPEND_FINGERSHIFT = isTouch ? 5 : 0

/** The drop target at the end of the Subthoughts. The canDrop and drop handlers can be found in the DropTarget components, DragAndDropThought and DragAndDropSubthoughts.  */
const DropEnd = ({
  depth,
  distance,
  // specifies if this is the last thought
  // renders the component with additional click area below and to the left since there are no thoughts below to obscure
  last,
  path,
  cliff,
  isLastVisible,
}: {
  depth: number
  distance?: number
  last?: boolean
  path?: Path
  cliff?: number
  isLastVisible?: boolean
}) => {
  if (!path) {
    throw new Error('path required')
  }
  const thoughtId = head(path)
  const isRootPath = isRoot(path)
  const value = useSelector(state => getThoughtById(state, thoughtId)?.value)
  const dropHoverColor = useDropHoverColor(depth + 1)

  const { isHovering, dropTarget } = useDragAndDropSubThought({ path })
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // a boolean indicating if the drop-hover component is shown
  // true if hovering and the context is not sorted
  const showDropHover = useSelector(state => {
    if (testFlags.simulateDrag) return true

    // if hovering, and the parent is not sorted, show the drop-hover
    const isParentSorted = getSortPreference(state, thoughtId).type === 'Alphabetical'
    if (isHovering && !isParentSorted) return true

    // If sorted and hovering, only show the drop-hover if the thought would be dropped to the end of the list.
    // Otherwise, asssume the DropHover component will be rendered at the place of insertion.
    if (!isParentSorted) return false

    // only render drop-hover during drag-and-drop
    const draggingThoughtValue = state.draggingThought
      ? getThoughtById(state, head(state.draggingThought))?.value
      : null
    if (!draggingThoughtValue) return false

    // render the drop-hover if hovering over any thought in a sorted list
    const isThoughtHovering =
      state.hoveringPath &&
      equalPath(rootedParentOf(state, state.hoveringPath), path) &&
      state.hoverZone === DropThoughtZone.ThoughtDrop

    // render the drop-hover if hovering over sorted Subthoughts
    const isSubthoughtsHovering =
      state.hoveringPath && equalPath(state.hoveringPath, path) && state.hoverZone === DropThoughtZone.SubthoughtsDrop

    // only rendner drop-hover if hovering over the appropriate ThoughtDrop or SubthoughtsDrop
    if (!isThoughtHovering && !isSubthoughtsHovering) return false

    // check if the dragged thought would get dropped after the last thought in the list
    const children = getChildrenSorted(state, thoughtId)
    const lastChildValue = children[children.length - 1]?.value
    return (isThoughtHovering || isSubthoughtsHovering) && compareReasonable(draggingThoughtValue, lastChildValue) > 0
  })

  const dropTargetHeight = isLastVisible ? calculateCliffDropTargetHeight({ cliff, depth }) : 0

  return (
    <li
      className={classNames({
        'drop-end': true,
        last,
      })}
      ref={dropTarget}
      style={{
        display: 'list-item',
        backgroundColor: testFlags.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        height: isRootPath ? '8em' : `${1.9 + dropTargetHeight}em`,
        marginLeft: isRootPath ? '-4em' : last ? '-2em' : undefined,
        // offset marginLeft, minus 1em for bullet
        // otherwise drop-hover will be too far left
        paddingLeft: isRootPath ? '3em' : last ? (isTouch ? '6em' : '1em') : undefined,
        // use transform to avoid conflicting with margin, which is currently spread out across multiple components and App.css
        transform: `translateX(${DROPEND_FINGERSHIFT}em)`,
      }}
    >
      {testFlags.simulateDrop && (
        <span
          style={{
            position: 'absolute',
            left: '0.3em',
            // make sure label does not interfere with drop target hovering
            pointerEvents: 'none',
            color: '#ff7bc3' /* mid pink */,
          }}
        >
          {isHovering ? '*' : ''}
          {last ? '$' : ''}
          {strip(value)}
        </span>
      )}
      {(showDropHover || testFlags.simulateDrag) && (
        <span
          className='drop-hover'
          style={{
            backgroundColor: dropHoverColor,
            // shift the drop-hover back into the proper place visually, even though drop-end has been shifted right for touch
            marginLeft: `-${DROPEND_FINGERSHIFT}em`,
          }}
        ></span>
      )}
    </li>
  )
}

const DropEndMemo = React.memo(DropEnd)
DropEndMemo.displayName = 'DropEnd'

/** DropEnd that is only rendered when a drag-and-drop is in progress.. */
const DropEndDragOnly = (props: Parameters<typeof DropEndMemo>[0]) => (
  <DragOnly>
    <DropEndMemo {...props} />
  </DragOnly>
)

export default DropEndDragOnly
