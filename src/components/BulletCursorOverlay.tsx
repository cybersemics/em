/**
 * @packageDocumentation
 * @module components.BulletCursorOverlay
 */

import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { equalPath } from '../util'
import { State } from '../util/initialState'
import { Path } from '../types'

interface BulletCursorOverlayProps {
  isDragging?: boolean,
  thoughtsRanked: Path,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletCursorOverlayProps) => {
  const {
    draggedThoughtsRanked,
    dragHold
  } = state
  const {
    thoughtsRanked,
    isDragging
  } = props
  return {
    isDragging: isDragging || (dragHold && equalPath(draggedThoughtsRanked!, thoughtsRanked))
  }
}

/**
 * Circle next to the Thought.
 */
const BulletCursorOverlay = ({
  isDragging
}: BulletCursorOverlayProps) => {
  return (
    <span className={classNames({
      'bullet-cursor-overlay': true,
      'bullet-cursor-overlay-highlighted': isDragging
    })}>•</span>
  )
}

export default connect(mapStateToProps)(BulletCursorOverlay)
