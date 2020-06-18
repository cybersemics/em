/**
 * @packageDocumentation
 */

import React from 'react'
import { connect } from 'react-redux'
import ContentEditable from 'react-contenteditable'
import { getThought } from '../selectors'
import { equalPath, headValue, strip } from '../util'
import { State } from '../util/initialState'
import { Connected, Path } from '../types'

interface CodeProps {
  code?: string,
  thoughtsRanked: Path,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: CodeProps) => {

  const { cursorBeforeEdit, cursor } = state
  const isEditing = equalPath(cursorBeforeEdit, props.thoughtsRanked)

  // use live thoughts if editing
  const thoughtsRanked = isEditing
    ? cursor || []
    : props.thoughtsRanked

  const value = headValue(thoughtsRanked)

  return {
    // @ts-ignore
    code: getThought(state, value) && getThought(state, value).code,
    thoughtsRanked
  }
}

/** An editable code component. */
const Code = ({ code, thoughtsRanked, dispatch }: Connected<CodeProps>) => {

  /**
   * Dispatch codeChange action.
   * When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop.
   */
  const onChange = (e: any) => {
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
