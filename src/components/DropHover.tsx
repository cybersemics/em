import React from 'react'
import { useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'
import DropThoughtZone from '../@types/DropThoughtZone'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import testFlags from '../e2e/testFlags'
import useDropHoverColor from '../hooks/useDropHoverColor'
import attributeEquals from '../selectors/attributeEquals'
import calculateAutofocus from '../selectors/calculateAutofocus'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
import { compareReasonable } from '../util/compareThought'
import equalPath from '../util/equalPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A drop-hover element that is rendered during drag-and-drop when it is possible to drop in a ThoughtDrop zone (next to a Thought). The canDrop and drop handlers can be found in the DropTarget components, DragAndDropThought and DragAndDropSubthoughts. */
const DropHoverIfVisible = ({
  isHovering,
  prevChildId,
  simplePath,
}: {
  isHovering: boolean
  prevChildId?: ThoughtId
  simplePath: SimplePath
}) => {
  // true if a thought is being dragged over this drop hover
  const showDropHover = useSelector(state => {
    // Typically we show the drop hover if the thought is being directly hovered over.
    // However, when moving into a different context that is sorted, we need to show the drop hover on the sorted drop destination if the thought is hovered over any of the thoughts in the sorted context.
    const parentId = getThoughtById(state, head(simplePath))?.parentId
    const sameContext =
      state.draggingThought &&
      equalPath(rootedParentOf(state, state.draggingThought), rootedParentOf(state, simplePath))
    const isParentSorted = getSortPreference(state, parentId).type === 'Alphabetical'
    if (!isParentSorted || sameContext) return testFlags.simulateDrag || isHovering
    else if (!state.dragInProgress) return false

    const draggingThoughtValue = state.draggingThought
      ? getThoughtById(state, head(state.draggingThought))?.value
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

    const value = getThoughtById(state, head(simplePath))?.value

    return (
      (isThoughtHovering || isSubthoughtsHovering) &&
      draggingThoughtValue &&
      // check if it's alphabetically previous to current thought
      compareReasonable(draggingThoughtValue, value) <= 0 &&
      // check if it's alphabetically next to previous thought if it exists
      (!prevChildId || compareReasonable(draggingThoughtValue, getThoughtById(state, prevChildId).value) === 1)
    )
  })

  return showDropHover ? <DropHover simplePath={simplePath} /> : null
}

/** Renders a drop-hover element unconditionally. */
const DropHover = ({ simplePath }: { simplePath: SimplePath }) => {
  const dropHoverColor = useDropHoverColor(simplePath.length)
  const highlight2 = useSelector(state => themeColors(state)?.highlight2)

  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )

  const animateHover = useSelector(state => {
    const parent = parentOf(simplePath)
    const autofocus = calculateAutofocus(state, simplePath)
    const autofocusParent = calculateAutofocus(state, parent)
    return autofocus === 'dim' && autofocusParent === 'hide'
  })

  return (
    <span
      className='drop-hover'
      style={{
        display: 'inline',
        backgroundColor: animateHover ? highlight2 : dropHoverColor,
        width: isTableCol1 ? '50vw' : undefined,
        marginLeft: isTableCol1 ? 'calc(0.9em - 12px)' : undefined,
        animation: animateHover
          ? `pulse-light ${token('durations.hoverPulseDuration')} linear infinite alternate`
          : undefined,
      }}
    />
  )
}

const DropHoverMemo = React.memo(DropHoverIfVisible)
DropHoverMemo.displayName = 'DropHover'

export default DropHoverMemo
