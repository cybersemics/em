import React from 'react'
import { connect } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// util
import {
  equalPath,
  headValue,
  strip,
} from '../util'

// selectors
import { getThought } from '../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {

  const { cursorBeforeEdit, cursor } = state
  const isEditing = equalPath(cursorBeforeEdit, props.thoughtsRanked)

  // use live thoughts if editing
  const thoughtsRanked = isEditing
    ? cursor || []
    : props.thoughtsRanked

  const value = headValue(thoughtsRanked)

  return {
    code: getThought(state, value) && getThought(state, value).code,
    thoughtsRanked
  }
}

/** An editable code component. */
const Code = ({ code, thoughtsRanked, dispatch }) => {

  /**
   * Dispatch codeChange action.
   * When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
   */
  const onChange = e => {
    const newValue = strip(e.target.value)
    dispatch({ type: 'codeChange', thoughtsRanked, newValue })
  }

  return <code>
    <ContentEditable
      html={code || ''}
      onChange={onChange}
    />
  </code>
}

export default connect(mapStateToProps)(Code)
