import React from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { dropEndRecipe, dropHoverRecipe } from '../../styled-system/recipes'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import { DROP_HOVER_WIDTH } from '../constants'
import testFlags from '../e2e/testFlags'
import useDragAndDropSubThought from '../hooks/useDragAndDropSubThought'
import attributeEquals from '../selectors/attributeEquals'
import dropHoverColor from '../selectors/dropHoverColor'
import { getChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCliffDropTargetHeight from '../util/calculateCliffDropTargetHeight'
import { compareReasonable } from '../util/compareThought'
import dndRef from '../util/dndRef'
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
  const value = useSelector(state => getThoughtById(state, thoughtId)?.value) ?? ''
  const dropHoverColorValue = useSelector(state => dropHoverColor(state, depth + 1))

  const isParentTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, path)), '=view', 'Table'),
  )

  const { isHovering, dropTarget } = useDragAndDropSubThought({ path })

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
    const draggingThoughtValues =
      state.draggingThoughts.map(draggingPath => getThoughtById(state, head(draggingPath))?.value).filter(Boolean) || []

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

    // check if any of the dragged thoughts would get dropped after the last thought in the list
    const children = getChildrenSorted(state, thoughtId)
    const lastChildValue = children[children.length - 1]?.value
    return (
      (isThoughtHovering || isSubthoughtsHovering) &&
      draggingThoughtValues.some(draggingValue => compareReasonable(draggingValue, lastChildValue) > 0)
    )
  })

  // Allocate extra more space (1.4 em) to last drop target panel
  const dropTargetHeight = isLastVisible ? calculateCliffDropTargetHeight({ cliff, depth }) + 1.4 : 0

  return (
    <li
      className={cx(
        dropEndRecipe(),
        css({
          display: 'list-item',
          marginLeft: isRootPath ? '-4em' : last ? '-2em' : undefined,
          // offset marginLeft, minus 1em for bullet
          // otherwise drop-hover will be too far left
          paddingLeft: isRootPath ? '3em' : last ? (isTouch ? '6em' : '1em') : undefined,
        }),
      )}
      style={{
        backgroundColor: testFlags.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        height: isRootPath ? '8em' : `${0.7 + dropTargetHeight}em`,
        // use transform to avoid conflicting with margin, which is currently spread out across multiple components
        transform: `translateX(${DROPEND_FINGERSHIFT}em)`,
        // If dropping target is table column 1, do not set width (but use width property of dropEndRecipe)
        width: isParentTableCol1 ? undefined : DROP_HOVER_WIDTH,
      }}
      ref={dndRef(dropTarget)}
    >
      {testFlags.simulateDrop && (
        <span
          className={css({
            position: 'absolute',
            left: '0.3em',
            // make sure label does not interfere with drop target hovering
            pointerEvents: 'none',
            color: 'midPink',
          })}
        >
          {isHovering ? '*' : ''}
          {last ? '$' : ''}
          {strip(value)}
        </span>
      )}
      {(showDropHover || testFlags.simulateDrag) && (
        <span
          className={dropHoverRecipe({ insideDropEnd: true })}
          style={{
            width: DROP_HOVER_WIDTH,
            backgroundColor: dropHoverColorValue,
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
