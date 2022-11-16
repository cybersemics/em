import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import globals from '../../globals'
import getThoughtById from '../../selectors/getThoughtById'
import head from '../../util/head'
import strip from '../../util/strip'
import DragAndDropThought from '../DragAndDropThought'
import useDropHoverColor from './useDropHoverColor'

/** A drop target for after the hidden parent at a cliff. This is needed because the Thought will be hidden/shimmed so DragAndDropThought will not be rendered. */
const SubthoughtsDropCliff = ({
  depth,
  dropTarget,
  isHovering,
  simplePath,
}: {
  depth?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  simplePath: SimplePath
}) => {
  const dropHoverColor = useDropHoverColor(depth || 0)
  const value = useSelector((state: State) =>
    globals.simulateDrop ? getThoughtById(state, head(simplePath))?.value || '' : '',
  )

  if (!dropTarget) return null

  return dropTarget(
    <span
      className={classNames({
        'drop-end': true,
      })}
      style={{
        backgroundColor: globals.simulateDrop ? '#32305f' : undefined, // mid eggplant
        height: '1.9em',
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
  )
}

// TODO: Type this correctly so it does not require all the Thought props (which it does not use)
const DragAndDropSubthoughtsDropCliff = DragAndDropThought(SubthoughtsDropCliff) as any

const SubthoughtsDropEmptyMemo = React.memo(DragAndDropSubthoughtsDropCliff)
SubthoughtsDropEmptyMemo.displayName = 'SubthoughtsDropCliff'

export default SubthoughtsDropEmptyMemo
