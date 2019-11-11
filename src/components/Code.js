import React from 'react'
import { connect } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// util
import {
  equalItemsRanked,
  getThought,
  sigKey,
  strip,
} from '../util.js'

export const Code = connect(({ cursorBeforeEdit, cursor, data }, props) => {

  const isEditing = equalItemsRanked(cursorBeforeEdit, props.itemsRanked)

  // use live items if editing
  const itemsRanked = isEditing
    ? cursor || []
    : props.itemsRanked

  const value = sigKey(itemsRanked)

  return {
    code: getThought(value, data) && getThought(value, data).code,
    itemsRanked
  }
})(({ code, itemsRanked, dispatch  }) => {

  return <code>
    <ContentEditable
      html={code || ''}
      onChange={e => {
        // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
        const newValue = strip(e.target.value)
        dispatch({ type: 'codeChange', itemsRanked, newValue })
      }}
    />
  </code>
})

