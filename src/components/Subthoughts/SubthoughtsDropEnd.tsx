import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { isTouch } from '../../browser'
import { ID } from '../../constants'
import globals from '../../globals'
import getSortPreference from '../../selectors/getSortPreference'
import getThoughtById from '../../selectors/getThoughtById'
import head from '../../util/head'
import strip from '../../util/strip'

/** The drop target at the end of the Subthoughts. */
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
  distance: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  last?: boolean
  simplePath: SimplePath
}) => {
  const thoughtId = head(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, thoughtId)?.value)
  const dragInProgress = useSelector((state: State) => state.dragInProgress)

  // a boolean indicating if the drop-hover component is shown
  // true if hovering and the context is not sorted
  const showDropHover = useSelector(
    (state: State) =>
      (globals.simulateDrag || isHovering) && getSortPreference(state, thoughtId).type !== 'Alphabetical',
  )

  return (dropTarget || ID)(
    <li
      className={classNames({
        'drop-end': true,
        last: depth === 0,
      })}
      style={{
        display: globals.simulateDrag || dragInProgress ? 'list-item' : 'none',
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
      <span
        className='drop-hover'
        style={{
          display: showDropHover ? 'inline' : 'none',
        }}
      ></span>
    </li>,
  )
}

SubthoughtsDropEnd.displayName = 'SubthoughtsDropEnd'

export default SubthoughtsDropEnd
