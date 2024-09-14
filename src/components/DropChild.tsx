import classNames from 'classnames'
import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { isTouch } from '../browser'
import testFlags from '../e2e/testFlags'
import useDragAndDropSubThought from '../hooks/useDragAndDropSubThought'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import { hasChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import calculateCliffDropTargetHeight from '../util/calculateCliffDropTargetHeight'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import strip from '../util/strip'
import DragOnly from './DragOnly'

interface DropChildProps {
  depth?: number
  last?: boolean
  path: Path
  simplePath: SimplePath
  isLastVisible?: boolean
}

/** Renders the DropChildInnerContainer component if the user is dragging and the dropTarget exists. This component is an optimization to avoid calculating DropChildIfCollapsed and DropChild hooks when unnecessary. */
const DropChildIfDragging = ({ depth, last, path, simplePath, isLastVisible }: DropChildProps) => {
  return (
    <DragOnly>
      <DropChildIfCollapsed
        depth={depth}
        last={last}
        path={path}
        simplePath={simplePath}
        isLastVisible={isLastVisible}
      />
    </DragOnly>
  )
}

/** Render the DropChild component if the thought is collapsed, and does not match the dragging thought. This component is an optimization to avoid calculating DropChild hooks when unnecessary. */
const DropChildIfCollapsed = ({ depth, last, path, simplePath, isLastVisible }: DropChildProps) => {
  const isExpanded = useSelector(state => hasChildren(state, head(simplePath)) && !!state.expanded[hashPath(path)])
  const draggingThought = useSelector(state => state.draggingThought, shallowEqual)

  // Do not render DropChild on expanded thoughts or on the dragging thought.
  // Even though canDrop will prevent a thought from being dropped on itself, we still should prevent rendering the drop target at all, otherwise it will obscure valid drop targets.
  if (isExpanded || equalPath(draggingThought, simplePath)) return null

  return <DropChild depth={depth} last={last} path={path} simplePath={simplePath} isLastVisible={isLastVisible} />
}

/** A drop target that allows dropping as a child of a thought. It is only shown when a thought has no children or is collapsed. Only renders if there is a valid dropTarget and a drag is in progress. */
const DropChild = ({ depth, last, path, simplePath, isLastVisible }: DropChildProps) => {
  const value = useSelector(state => getThoughtById(state, head(simplePath))?.value || '')
  const dropHoverColor = useDropHoverColor(depth || 0)

  const { isHovering, dropTarget } = useDragAndDropSubThought({ path, simplePath })
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  // Calculate the height for the child thought over cliff
  const dropTargetHeight = isLastVisible ? calculateCliffDropTargetHeight({ depth }) : 0

  return (
    <li className='drop-empty' style={{ position: 'relative' }}>
      <span
        className={classNames({
          'drop-end': true,
          'inside-divider': isDivider(value),
          last,
        })}
        ref={dropTarget}
        style={{
          backgroundColor: testFlags.simulateDrop ? '#32305f' : undefined, // purple-eggplant
          // shift the drop target to the right
          marginLeft: isTouch ? '33%' : 'calc(2.9em - 2px)',
          opacity: 0.9,
          // add some additional padding to empty subthought drop targets to avoid gaps in between sibling's subthought drop targets. This provides a smoother experience when dragging across many siblings. The user can still shift left to be clear of the empty subthought drop targets and drop on a child drop target.
          paddingBottom: '1em',
          height: `${0.5 + dropTargetHeight}em`,
        }}
      >
        {testFlags.simulateDrop && (
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
        {(testFlags.simulateDrag || isHovering) && (
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
      </span>
    </li>
  )
}

/** DropChild wired up with react-dnd hooks. */
const DropChildMemo = React.memo(DropChildIfDragging)
DropChildMemo.displayName = 'DropChild'

export default DropChildMemo
