import React from 'react'
import { connect } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// util
import {
  equalThoughtsRanked,
  getThought,
  headKey,
  strip,
} from '../util.js'

export const Code = connect(({ cursorBeforeEdit, cursor, thoughtIndex }, props) => {

  const isEditing = equalThoughtsRanked(cursorBeforeEdit, props.thoughtsRanked)

  // use live items if editing
  const thoughtsRanked = isEditing
    ? cursor || []
    : props.thoughtsRanked

  const value = headKey(thoughtsRanked)

  return {
    code: getThought(value, thoughtIndex) && getThought(value, thoughtIndex).code,
    thoughtsRanked
  }
})(({ code, thoughtsRanked, dispatch }) => {

  return <code>
    <ContentEditable
      html={code || ''}
      onChange={e => {
        // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
        const newValue = strip(e.target.value)
        dispatch({ type: 'codeChange', thoughtsRanked, newValue })
      }}
    />
  </code>
})
