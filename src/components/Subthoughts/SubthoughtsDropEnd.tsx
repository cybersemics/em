import classNames from 'classnames'
import React from 'react'
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
import themeColors from '../../selectors/themeColors'
import { compareReasonable } from '../../util/compareThought'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import headId from '../../util/headId'
import strip from '../../util/strip'
import unroot from '../../util/unroot'
import DragAndDropSubthoughts from '../DragAndDropSubthoughts'

/** The drop target at the end of the Subthoughts. The drop-hover components are ThoughtDropHover, SubthoughtsDropEnd, and SubthoughtsDropEmpty. */
const SubthoughtsDropEnd = ({
  depth,
  distance,
  dropTarget,
  isHovering,
  // specifies if this is the last drop component in a list
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
  // const parentId = useSelector((state: State) => getThoughtById(state, thoughtId)?.parentId)
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  const colors = useSelector(themeColors)

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

  if (!globals.simulateDrag && !globals.simulateDrop && !dragInProgress) return null

  return (dropTarget || ID)(
    <li
      className={classNames({
        'drop-end': true,
        last: depth === 0,
      })}
      style={{
        display: 'list-item',
        backgroundColor: globals.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        height: last ? '4em' : undefined,
        marginLeft: last ? '-4em' : undefined,
        // offset marginLeft, minus 1em for bullet
        // otherwise drop-hover will be too far left
        paddingLeft: last ? (isTouch ? '9em' : '3em') : undefined,
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
          {strip(value)}
          {isHovering ? '*' : ''}
        </span>
      )}
      {(showDropHover || globals.simulateDrag) && (
        <span
          className='drop-hover'
          style={{
            // unroot the simplePath, otherwise the root thought will have the same depth as the first level
            backgroundColor: unroot(simplePath).length % 2 ? colors.highlight : colors.highlight2,
          }}
        ></span>
      )}
    </li>,
  )
}

const DragAndDropSubthoughtsDropEnd = DragAndDropSubthoughts(SubthoughtsDropEnd)

const SubthoughtsDropEndMemo = React.memo(DragAndDropSubthoughtsDropEnd)
SubthoughtsDropEndMemo.displayName = 'SubthoughtsDropEnd'

export default SubthoughtsDropEndMemo
