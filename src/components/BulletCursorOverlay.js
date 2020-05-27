import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

// util
import {
  equalPath,
} from '../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {
  const {
    draggedThoughtsRanked,
    dragHold
  } = state
  const {
    thoughtsRanked,
    isDragging
  } = props
  return {
    isDragging: isDragging || (dragHold && equalPath(draggedThoughtsRanked, thoughtsRanked))
  }
}

/**
 * Circle next to the Thought.
 */
const BulletCursorOverlay = ({
  isDragging
}) => {
  return (
    <span className={classNames({
      'bullet-cursor-overlay': true,
      'bullet-cursor-overlay-highlighted': isDragging
    })}>•</span>
  )
}

export default connect(mapStateToProps)(BulletCursorOverlay)
