import classNames from 'classnames'
import React from 'react'
import { connect } from 'react-redux'
import { SimplePath, State } from '../@types'
import { equalPath } from '../util'

interface BulletCursorOverlayProps {
  isDragging?: boolean
  simplePath: SimplePath
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletCursorOverlayProps) => {
  const { draggedSimplePath, dragHold } = state
  const { simplePath, isDragging } = props
  return {
    isDragging: isDragging || (dragHold && equalPath(draggedSimplePath!, simplePath)),
  }
}

/**
 * Circle next to the Thought.
 */
const BulletCursorOverlay = ({ isDragging }: BulletCursorOverlayProps) => {
  return (
    <span
      className={classNames({
        'bullet-cursor-overlay': true,
        'bullet-cursor-overlay-highlighted': isDragging,
      })}
    >
      •
    </span>
  )
}

export default connect(mapStateToProps)(BulletCursorOverlay)
