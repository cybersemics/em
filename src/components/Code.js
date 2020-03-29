import React from 'react'
import { connect } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// util
import {
  equalPath,
  getThought,
  headValue,
  strip,
} from '../util.js'

const mapStateToProps = ({ cursorBeforeEdit, cursor, thoughtIndex }, props) => {

  const isEditing = equalPath(cursorBeforeEdit, props.thoughtsRanked)

  // use live thoughts if editing
  const thoughtsRanked = isEditing
    ? cursor || []
    : props.thoughtsRanked

  const value = headValue(thoughtsRanked)

  return {
    code: getThought(value, thoughtIndex) && getThought(value, thoughtIndex).code,
    thoughtsRanked
  }
}

const Code = ({ code, thoughtsRanked, dispatch }) => {

  // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
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
