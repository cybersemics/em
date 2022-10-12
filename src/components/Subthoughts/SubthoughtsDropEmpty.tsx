import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import State from '../../@types/State'
import globals from '../../globals'
import strip from '../../util/strip'

/** A drop target when there are no children or the thought is collapsed. The drop-hover components are ThoughtDropHover, SubthoughtsDropEnd, and SubthoughtsDropEmpty. */
const SubthoughtsDropEmpty = ({
  depth,
  dropTarget,
  isHovering,
  isThoughtDivider,
  debugValue,
}: {
  depth?: number
  dropTarget: ConnectDropTarget
  isHovering?: boolean
  isThoughtDivider?: boolean
  debugValue?: string
}) => {
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  return (
    <ul
      className='empty-children'
      style={{ display: globals.simulateDrag || globals.simulateDrop || dragInProgress ? 'block' : 'none' }}
    >
      {dropTarget(
        <li
          className={classNames({
            child: true,
            'drop-end': true,
            'inside-divider': isThoughtDivider,
            last: depth === 0,
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
              {strip(debugValue || '')}
              {isHovering ? '*' : ''}
            </span>
          )}
          <span
            className='drop-hover'
            style={{ display: globals.simulateDrag || isHovering ? 'inline' : 'none' }}
          ></span>
        </li>,
      )}
    </ul>
  )
}

SubthoughtsDropEmpty.displayName = 'SubthoughtsDropEmpty'

export default SubthoughtsDropEmpty
