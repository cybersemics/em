import React from 'react'
import { useSelector } from 'react-redux'
import Autofocus from '../../@types/Autofocus'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import globals from '../../globals'
import getSortPreference from '../../selectors/getSortPreference'
import getThoughtById from '../../selectors/getThoughtById'
import rootedParentOf from '../../selectors/rootedParentOf'
import themeColors from '../../selectors/themeColors'
import { compareReasonable } from '../../util/compareThought'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import headId from '../../util/headId'
import parentOf from '../../util/parentOf'

/** A drop-hover element that is rendered during drag-and-drop when it is possible to drop in a ThoughtDrop zone (next to a Thought). The drop-hover components are ThoughtDropHover, SubthoughtsDropEnd, and SubthoughtsDropEmpty. */
const ThoughtDropHover = ({
  autofocus,
  isHovering,
  prevChildId,
  simplePath,
}: {
  autofocus?: Autofocus
  isHovering: boolean
  prevChildId?: ThoughtId
  simplePath: SimplePath
}) => {
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value)
  const colors = useSelector(themeColors)

  // true if a thought is being dragged over this drop hover
  const showDropHover = useSelector((state: State) => {
    if (autofocus !== 'show' && autofocus !== 'dim') return false

    // if alphabetical sort is disabled just check if current thought is hovering
    const parentId = getThoughtById(state, head(simplePath))?.parentId
    const isParentSorted = getSortPreference(state, parentId).type === 'Alphabetical'
    if (!isParentSorted) return globals.simulateDrag || isHovering
    else if (!state.dragInProgress) return false

    const draggingThoughtValue = state.draggingThought
      ? getThoughtById(state, headId(state.draggingThought))?.value
      : null

    // render the drop-hover if hovering over any thought in a sorted list
    const isThoughtHovering =
      state.hoveringPath &&
      equalPath(parentOf(state.hoveringPath), parentOf(simplePath)) &&
      state.hoverZone === DropThoughtZone.ThoughtDrop

    // render the drop-hover if hovering over sorted Subthoughts
    const isSubthoughtsHovering =
      state.hoveringPath &&
      equalPath(state.hoveringPath, rootedParentOf(state, simplePath)) &&
      state.hoverZone === DropThoughtZone.SubthoughtsDrop

    // TODO: Show the first drop-hover with distance === 2. How to determine?
    // const distance = state.cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, state.cursor.length - depth!)) : 0

    return (
      (isThoughtHovering || isSubthoughtsHovering) &&
      draggingThoughtValue &&
      // check if it's alphabetically previous to current thought
      compareReasonable(draggingThoughtValue, value) <= 0 &&
      // check if it's alphabetically next to previous thought if it exists
      (!prevChildId || compareReasonable(draggingThoughtValue, getThoughtById(state, prevChildId).value) === 1)
    )
  })

  return (
    <>
      {showDropHover && (
        <span
          className='drop-hover'
          style={{
            display: 'inline',
            backgroundColor: simplePath.length % 2 ? colors.highlight2 : colors.highlight,
          }}
        />
      )}
    </>
  )
}

const ThoughtDropHoverMemo = React.memo(ThoughtDropHover)
ThoughtDropHoverMemo.displayName = 'ThoughtDropHover'

export default ThoughtDropHoverMemo
