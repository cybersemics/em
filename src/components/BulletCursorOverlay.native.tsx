import React from 'react'
import { connect } from 'react-redux'
import { equalPath } from '../util'
import { SimplePath, State } from '../@types'
import { Text } from './Text.native'

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
  const style = { color: isDragging ? 'lightblue' : 'white' }
  return <Text style={style}>•</Text>
}

export default connect(mapStateToProps)(BulletCursorOverlay)
