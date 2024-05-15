import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import globals from '../globals'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import { getChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { compareReasonable } from '../util/compareThought'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import strip from '../util/strip'
import DragAndDropSubthoughts from './DragAndDropSubthoughts'
import DragOnly from './DragOnly'

/** An identify function that returns the value passed to it. */
const identity = <T,>(x: T): T => x

/** The drop target at the end of the Subthoughts. The drop-hover components are DropBefore, DropEmpty, DropEnd, and DropHover. The canDrop and drop handlers can be found in the DropTarget components, DragAndDropThought and DragAndDropSubthoughts.  */
const DropEnd = ({
  depth,
  distance,
  dropTarget,
  isHovering,
  // specifies if this is the last thought
  // renders the component with additional click area below and to the left since there are no thoughts below to obscure
  last,
  path,
}: {
  depth: number
  distance?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  last?: boolean
  path?: Path
}) => {
  if (!path) {
    throw new Error('path required')
  }
  const thoughtId = head(path)
  const isRootPath = isRoot(path)
  const value = useSelector(state => getThoughtById(state, thoughtId)?.value)
  const dropHoverColor = useDropHoverColor(depth + 1)
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // a boolean indicating if the drop-hover component is shown
  // true if hovering and the context is not sorted
  const showDropHover = useSelector(state => {
    if (globals.simulateDrag) return true

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

  return (dropTarget || identity)(
    <li
      className={classNames({
        'drop-end': true,
        last,
      })}
      style={{
        display: 'list-item',
        backgroundColor: globals.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        height: isRootPath ? '8em' : '1.9em',
        marginLeft: isRootPath ? '-4em' : last ? '-2em' : undefined,
        // offset marginLeft, minus 1em for bullet
        // otherwise drop-hover will be too far left
        paddingLeft: isRootPath ? '3em' : last ? (isTouch ? '6em' : '1em') : undefined,
      }}
    >
      {globals.simulateDrop && (
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
      {(showDropHover || globals.simulateDrag) && (
        <span
          className='drop-hover'
          style={{
            backgroundColor: dropHoverColor,
          }}
        ></span>
      )}
    </li>,
  )
}

const DragAndDropDropEnd = DragAndDropSubthoughts(DropEnd)

const DropEndMemo = React.memo(DragAndDropDropEnd)
DropEndMemo.displayName = 'DropEnd'

/** DropEnd that is only rendered when a drag-and-drop is in progress.. */
const DropEndDragOnly = (props: Parameters<typeof DropEndMemo>[0]) => (
  <DragOnly>
    <DropEndMemo {...props} />
  </DragOnly>
)

export default DropEndDragOnly
