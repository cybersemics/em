import classNames from 'classnames'
import React, { FC } from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { isTouch } from '../../browser'
import { ID } from '../../constants'
import globals from '../../globals'
import { getChildrenSorted } from '../../selectors/getChildren'
import getSortPreference from '../../selectors/getSortPreference'
import getThoughtById from '../../selectors/getThoughtById'
import rootedParentOf from '../../selectors/rootedParentOf'
import { compareReasonable } from '../../util/compareThought'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import headId from '../../util/headId'
import isRoot from '../../util/isRoot'
import strip from '../../util/strip'
import DragAndDropSubthoughts from '../DragAndDropSubthoughts'
import useDropHoverColor from './useDropHoverColor'
import useHoveringPath from './useHoveringPath'

/** A container fragment that only renders its children when dragInProgress is true. Useful for short circuiting child components with more expensive selectors. */
const DragOnly: FC = ({ children }) => {
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  return <>{globals.simulateDrag || globals.simulateDrop || dragInProgress ? children : null}</>
}

/** The drop target at the end of the Subthoughts. The drop-hover components are ThoughtDropHover, SubthoughtsDropEnd, and SubthoughtsDropEmpty. */
const SubthoughtsDropEnd = ({
  depth,
  distance,
  dropTarget,
  isHovering,
  // specifies if this is the last thought
  // renders the component with additional click area below and to the left since there are no thoughts below to obscure
  last,
  simplePath,
}: {
  depth: number
  distance?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  last?: boolean
  simplePath: SimplePath
}) => {
  const thoughtId = head(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, thoughtId)?.value)
  const dropHoverColor = useDropHoverColor(depth + 1)
  useHoveringPath(simplePath, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // a boolean indicating if the drop-hover component is shown
  // true if hovering and the context is not sorted
  const showDropHover = useSelector((state: State) => {
    if (globals.simulateDrag) return true

    // if hovering, and the parent is not sorted, show the drop-hover
    const isParentSorted = getSortPreference(state, thoughtId).type === 'Alphabetical'
    if (isHovering && !isParentSorted) return true

    // If sorted and hovering, only show the drop-hover if the thought would be dropped to the end of the list.
    // Otherwise, asssume the ThoughtDropHover component will be rendered at the place of insertion.
    if (!isParentSorted) return false

    // only render drop-hover during drag-and-drop
    const draggingThoughtValue = state.draggingThought
      ? getThoughtById(state, headId(state.draggingThought))?.value
      : null
    if (!draggingThoughtValue) return false

    // render the drop-hover if hovering over any thought in a sorted list
    const isThoughtHovering =
      state.hoveringPath &&
      equalPath(rootedParentOf(state, state.hoveringPath), simplePath) &&
      state.hoverZone === DropThoughtZone.ThoughtDrop

    // render the drop-hover if hovering over sorted Subthoughts
    const isSubthoughtsHovering =
      state.hoveringPath &&
      equalPath(state.hoveringPath, simplePath) &&
      state.hoverZone === DropThoughtZone.SubthoughtsDrop

    // only rendner drop-hover if hovering over the appropriate ThoughtDrop or SubthoughtsDrop
    if (!isThoughtHovering && !isSubthoughtsHovering) return false

    // check if the dragged thought would get dropped after the last thought in the list
    const children = getChildrenSorted(state, thoughtId)
    const lastChildValue = children[children.length - 1]?.value
    return (isThoughtHovering || isSubthoughtsHovering) && compareReasonable(draggingThoughtValue, lastChildValue) > 0
  })

  return (dropTarget || ID)(
    <li
      className={classNames({
        'drop-end': true,
        last,
      })}
      style={{
        display: 'list-item',
        backgroundColor: globals.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        height: last ? (isRoot(simplePath) ? '8em' : '4em') : '1.9em',
        marginLeft: last ? '-4em' : undefined,
        // offset marginLeft, minus 1em for bullet
        // otherwise drop-hover will be too far left
        paddingLeft: last ? (isTouch ? '6em' : '3em') : undefined,
        // The ROOT drop end can be set to static since there are now following siblings that would be obscured.
        // This ensures that previous thoughts are stacked on top (as this element doesn't create a new stacking context).
        // Otherwise, the ROOT drop end will cover the last child's drop end.
        position: isRoot(simplePath) ? 'static' : 'absolute',
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

const DragAndDropSubthoughtsDropEnd = DragAndDropSubthoughts(SubthoughtsDropEnd)

const SubthoughtsDropEndMemo = React.memo(DragAndDropSubthoughtsDropEnd)
SubthoughtsDropEndMemo.displayName = 'SubthoughtsDropEnd'

/** SubthoughtsDropEnd that is only rendered when a drag-and-drop is in progress.. */
const SubthoughtsDropEndDragOnly = (props: Parameters<typeof SubthoughtsDropEndMemo>[0]) => (
  <DragOnly>
    <SubthoughtsDropEndMemo {...props} />
  </DragOnly>
)

export default SubthoughtsDropEndDragOnly
