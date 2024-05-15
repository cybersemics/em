import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { shallowEqual, useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { isTouch } from '../browser'
import globals from '../globals'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import { hasChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import strip from '../util/strip'
import DragAndDropSubthoughts from './DragAndDropSubthoughts'
import DragOnly from './DragOnly'

interface DropEmptyProps {
  depth?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  last?: boolean
  path: Path
  simplePath: SimplePath
}

/** A drop target when there are no children or the thought is collapsed. The drop-hover components are DropBefore, DropEmpty, DropEnd, and DropHover. Only renders if there is a valid dropTarget and a drag is in progress. */
const DropEmptyContainer = ({ depth, dropTarget, isHovering, last, path, simplePath }: DropEmptyProps) => {
  if (!dropTarget) return null
  return (
    <DragOnly>
      <DropEmptyInnerContainer
        depth={depth}
        dropTarget={dropTarget}
        isHovering={isHovering}
        last={last}
        path={path}
        simplePath={simplePath}
      />
    </DragOnly>
  )
}

/** Only render the DropEmpty component if not expanded. */
const DropEmptyInnerContainer = ({
  depth,
  dropTarget,
  isHovering,
  last,
  path,
  simplePath,
}: DropEmptyProps & { dropTarget: ConnectDropTarget }) => {
  const isExpanded = useSelector(
    state => hasChildren(state, head(simplePath)) && !!state.expanded[hashPath(simplePath)],
  )
  const draggingThought = useSelector(state => state.draggingThought, shallowEqual)

  // Do not render DropEmpty on expanded thoughts or on the dragging thought.
  // Even though canDrop will prevent a thought from being dropped on itself, we still should prevent rendering the drop target at all, otherwise it will obscure valid drop targets.
  if (isExpanded || equalPath(draggingThought, simplePath)) return null

  return (
    <DropEmpty
      depth={depth}
      dropTarget={dropTarget}
      isHovering={isHovering}
      last={last}
      path={path}
      simplePath={simplePath}
    />
  )
}

/** The actual DropEmpty component. */
const DropEmpty = ({
  depth,
  dropTarget,
  isHovering,
  last,
  path,
  simplePath,
}: DropEmptyProps & { dropTarget: ConnectDropTarget }) => {
  const value = useSelector(state => getThoughtById(state, head(simplePath))?.value || '')
  const dropHoverColor = useDropHoverColor(depth || 0)
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  return (
    <li className='drop-empty' style={{ position: 'relative' }}>
      {dropTarget(
        <span
          className={classNames({
            'drop-end': true,
            'inside-divider': isDivider(value),
            last,
          })}
          style={{
            backgroundColor: globals.simulateDrop ? '#32305f' : undefined, // purple-eggplant
            // shift the drop target to the right
            marginLeft: isTouch ? '33%' : 'calc(2.9em - 2px)',
            opacity: 0.9,
            // add some additional padding to empty subthought drop targets to avoid gaps in between sibling's subthought drop targets. This provides a smoother experience when dragging across many siblings. The user can still shift left to be clear of the empty subthought drop targets and drop on a child drop target.
            paddingBottom: '1em',
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
            <span
              className='drop-hover'
              style={{
                backgroundColor: dropHoverColor,
                // offset drop-end (above) and add 0.25em to slightly  exaggerate the indentation for better drop perception.
                marginLeft: isTouch ? 'calc(-33% - 8px)' : 'calc(-2em - 10px)',
                marginTop: '-0.4em',
                width: '100%',
              }}
            />
          )}
        </span>,
      )}
    </li>
  )
}

const DragAndDropDropEmpty = DragAndDropSubthoughts(DropEmptyContainer)

const DropEmptyMemo = React.memo(DragAndDropDropEmpty)
DropEmptyMemo.displayName = 'DropEmpty'

export default DropEmptyMemo
