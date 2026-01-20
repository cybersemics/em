import React from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { dropHoverRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import DropThoughtZone from '../@types/DropThoughtZone'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import { LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'
import attributeEquals from '../selectors/attributeEquals'
import calculateAutofocus from '../selectors/calculateAutofocus'
import dropHoverColor from '../selectors/dropHoverColor'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import { compareReasonable } from '../util/compareThought'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import nonNull from '../util/nonNull'
import parentOf from '../util/parentOf'

/** Renders a drop-hover element unconditionally. */
const DropHover = ({ simplePath }: { simplePath: SimplePath }) => {
  const dropHoverColorValue = useSelector(state => dropHoverColor(state, simplePath.length))

  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )

  const animateHover = useSelector(state => {
    const parent = parentOf(simplePath)
    const autofocus = calculateAutofocus(state, simplePath)
    const autofocusParent = calculateAutofocus(state, parent)
    return autofocus === 'dim' && autofocusParent === 'hide'
  })
  const thoughtId = head(simplePath)
  const insideDivider = useSelector(state => isDivider(getThoughtById(state, thoughtId)?.value))

  return (
    <span
      className={cx(
        dropHoverRecipe({ insideDivider }),
        css({
          /* only add a margin on the Thought drop hover since Subthought drop hover does not need to offset the bullet */
          /* Equivalent to -1.2em @ Font Size 18, but scales across Font Sizes 13–24. */
          marginLeft: isTableCol1 ? 'calc(0.9em - 0.55em)' : 'calc(-0.4em - 0.55em)',
          marginTop: '-0.1em',
          _mobile: {
            /* Equivalent to -1.2em @ Font Size 18, but scales across Font Sizes 13–24. */
            marginLeft: 'calc(-0.4em - 14px)',
          },
          display: 'inline',
          animation: animateHover ? `pulseLight {durations.mediumPulse} linear infinite alternate` : undefined,
        }),
      )}
      style={{
        backgroundColor: animateHover ? token('colors.highlight2') : dropHoverColorValue,
      }}
    />
  )
}
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
    /** Returns true if hovering over current thought. */
    const isThoughtHovering = () =>
      state.hoveringPath &&
      equalPath(parentOf(state.hoveringPath), parentOf(simplePath)) &&
      state.hoverZone === DropThoughtZone.ThoughtDrop

    /** Returns true if hovering over the current subthought. */
    const isSubthoughtsHovering = () =>
      state.hoveringPath &&
      equalPath(state.hoveringPath, rootedParentOf(state, simplePath)) &&
      state.hoverZone === DropThoughtZone.SubthoughtsDrop
    const prevChild = prevChildId && getThoughtById(state, prevChildId)

    if (!isThoughtHovering() && !isSubthoughtsHovering()) {
      return false
    }

    const thought = getThoughtById(state, head(simplePath))
    if (thought?.value === undefined) {
      return false
    }

    // Don't show drop hover between contiguous selected thoughts
    const contiguousDraggingThoughts = state.draggingThoughts.filter(draggingPath => {
      const prev = prevSibling(state, draggingPath)
      const prevPath = prev ? appendToPath(parentOf(draggingPath), prev.id) : null
      return prev && state.draggingThoughts.some(simplePath => equalPath(prevPath, simplePath))
    })

    if (contiguousDraggingThoughts.some(draggingPath => equalPath(draggingPath, simplePath))) {
      return false
    }

    // Typically we show the drop hover if the thought is being directly hovered over.
    // However, when moving into a different context that is sorted, we need to show the drop hover on the sorted drop destination if the thought is hovered over any of the thoughts in the sorted context.
    const sameContext = state.draggingThoughts.every(draggingPath =>
      equalPath(rootedParentOf(state, draggingPath), rootedParentOf(state, simplePath)),
    )

    /** Returns true if the parent is sorted alphabetically. */
    const isParentSorted = () => getSortPreference(state, thought.parentId).type === 'Alphabetical'
    if (sameContext || !isParentSorted()) {
      return testFlags.simulateDrag || isHovering
    } else if (state.longPress !== LongPressState.DragInProgress) {
      return false
    }

    const draggingThoughtValues = state.draggingThoughts
      .map(draggingPath => getThoughtById(state, head(draggingPath))?.value)
      .filter(nonNull)

    // TODO: Show the first drop-hover with distance === 2. How to determine?
    // const distance = state.cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, state.cursor.length - depth!)) : 0

    // Check if any of the dragging thoughts would be inserted at this position
    return draggingThoughtValues.some(
      draggingValue =>
        // check if it's alphabetically previous to current thought
        compareReasonable(draggingValue, thought.value) <= 0 &&
        // check if it's alphabetically next to previous thought if it exists
        (!prevChild || compareReasonable(draggingValue, prevChild.value) === 1),
    )
  })

  return showDropHover ? <DropHover simplePath={simplePath} /> : null
}

const DropHoverMemo = React.memo(DropHoverIfVisible)
DropHoverMemo.displayName = 'DropHover'

export default DropHoverMemo
