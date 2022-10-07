import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import Autofocus from '../../@types/Autofocus'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { isTouch } from '../../browser'
import { ID } from '../../constants'
import globals from '../../globals'
import getSortPreference from '../../selectors/getSortPreference'
import getThoughtById from '../../selectors/getThoughtById'
import head from '../../util/head'
import isRoot from '../../util/isRoot'
import strip from '../../util/strip'

/** The drop target at the end of a list. */
const DropEnd = ({
  autofocus,
  depth,
  distance,
  dropTarget,
  isHovering,
  simplePath,
}: {
  autofocus: Autofocus
  depth: number
  distance: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  simplePath: SimplePath
}) => {
  const thoughtId = head(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, thoughtId)?.value)
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  // the last visible drop-end will always be a dimmed thought at distance 1 (an uncle)
  const isLastVisible = isRoot(simplePath) || (distance === 1 && autofocus === 'dim')
  const cursorOnAlphabeticalSort = useSelector(
    (state: State) => state.cursor && getSortPreference(state, thoughtId).type === 'Alphabetical',
  )

  return (dropTarget || ID)(
    <li
      className={classNames({
        'drop-end': true,
        last: depth === 0,
      })}
      style={{
        display:
          (autofocus === 'show' || autofocus === 'dim') && (globals.simulateDrag || dragInProgress)
            ? 'list-item'
            : 'none',
        backgroundColor: globals.simulateDrop ? `hsl(170, 50%, ${20 + 5 * (depth % 2)}%)` : undefined,
        // Extend the click area of the drop target when there is nothing below.
        // Always extend the root subthught drop target.
        // The last visible drop-end will always be a dimmed thought at distance 1 (an uncle).
        // Dimmed thoughts at distance 0 should not be extended, as they are dimmed siblings and sibling descendants that have thoughts below
        height: isLastVisible ? '4em' : undefined,
        marginLeft: isLastVisible ? '-4em' : undefined,
        // offset marginLeft, minus 1em for bullet
        // otherwise drop-hover will be too far left
        paddingLeft: isLastVisible ? (isTouch ? '9em' : '3em') : undefined,
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
          display: (globals.simulateDrag || isHovering) && !cursorOnAlphabeticalSort ? 'inline' : 'none',
        }}
      ></span>
    </li>,
  )
}

export default DropEnd
