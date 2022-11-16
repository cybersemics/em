import classNames from 'classnames'
import React, { useEffect } from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import DragThoughtZone from '../../@types/DragThoughtZone'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import dragInProgressActionCreator from '../../action-creators/dragInProgress'
import globals from '../../globals'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import isDivider from '../../util/isDivider'
import strip from '../../util/strip'
import DragAndDropSubthoughts from '../DragAndDropSubthoughts'
import useDropHoverColor from './useDropHoverColor'

/** A drop target when there are no children or the thought is collapsed. The drop-hover components are ThoughtDropHover, SubthoughtsDropEnd, and SubthoughtsDropEmpty. */
const SubthoughtsDropEmpty = ({
  depth,
  dropTarget,
  isHovering,
  last,
  simplePath,
}: {
  depth?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  last?: boolean
  simplePath: SimplePath
}) => {
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  const draggingThought = useSelector((state: State) => state.draggingThought)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value || '')
  const dropHoverColor = useDropHoverColor(depth || 0)

  // When SubthoughtsDropEmpty is hovered over during drag, update the hoveringPath.
  // Check dragInProgress to ensure the drag has not been aborted (e.g. by shaking).
  useEffect(() => {
    if (isHovering && store.getState().dragInProgress) {
      store.dispatch(
        dragInProgressActionCreator({
          value: true,
          draggingThought: store.getState().draggingThought,
          hoveringPath: simplePath,
          hoverZone: DropThoughtZone.SubthoughtsDrop,
          sourceZone: DragThoughtZone.Thoughts,
        }),
      )
    }
  }, [isHovering])

  // Why do we bail if the thought is being dragged?
  // Even though canDrop will prevent a thought from being dropped on itself, we still should prevent rendering the drop target at all, otherwise it will obscure valid drop targets.
  if (
    (!globals.simulateDrag && !globals.simulateDrop && !dragInProgress) ||
    !dropTarget ||
    equalPath(draggingThought, simplePath)
  )
    return null

  return (
    <li className='empty-children' style={{ position: 'relative', left: '1em' }}>
      {dropTarget(
        <span
          className={classNames({
            child: true,
            'drop-end': true,
            'inside-divider': isDivider(value),
            last,
          })}
          style={{
            backgroundColor: globals.simulateDrop ? '#32305f' : undefined, // mid eggplant
            opacity: 0.9,
          }}
        >
          {globals.simulateDrop && (
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
          {(globals.simulateDrag || isHovering) && (
            <span className='drop-hover' style={{ backgroundColor: dropHoverColor }} />
          )}
        </span>,
      )}
    </li>
  )
}

const DragAndDropSubthoughtsDropEmpty = DragAndDropSubthoughts(SubthoughtsDropEmpty)

const SubthoughtsDropEmptyMemo = React.memo(DragAndDropSubthoughtsDropEmpty)
SubthoughtsDropEmptyMemo.displayName = 'SubthoughtsDropEmpty'

export default SubthoughtsDropEmptyMemo
