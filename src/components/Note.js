import React, { useRef } from 'react'
import { useDispatch } from 'react-redux'
import { isMobile } from '../browser'
import { store } from '../store.js'
import { attribute, hasChild, isContextViewActive } from '../selectors'
import { asyncFocus, clearSelection, selectNextEditable, setSelection } from '../util'
import ContentEditable from 'react-contenteditable'

/** Gets the editable node for the given note element. */
const editableOfNote = noteEl =>
  noteEl.parentNode.previousSibling.querySelector('.editable')

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ context, thoughtsRanked, contextChain }) => {

  const state = store.getState()
  const hasNote = hasChild(state, context, '=note')

  if (!hasNote || isContextViewActive(state, context)) return null

  const dispatch = useDispatch()
  const noteRef = useRef()
  const note = attribute(state, context, '=note')

  /** Handles note keyboard shortcuts. */
  const onKeyDown = e => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(store.getState(), context, '=note')

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp' || (e.metaKey && e.altKey && e.keyCode === 'N'.charCodeAt(0))) {
      e.stopPropagation()
      editableOfNote(e.target).focus()
      setSelection(editableOfNote(e.target), { end: true })
    }
    // delete empty note
    // (delete non-empty note is handled by delete shortcut, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()

      if (isMobile) {
        asyncFocus()
      }
      editableOfNote(e.target).focus()
      setSelection(editableOfNote(e.target), { end: true })

      dispatch({ type: 'deleteAttribute', context, key: '=note' })
    }
    else if (e.key === 'ArrowDown') {
      e.stopPropagation()
      e.preventDefault()
      selectNextEditable(editableOfNote(e.target))
    }
  }

  /** Updates the =note attribute when the note text is edited. */
  const onChange = e => {
    // Mobile Safari inserts <br> when all text is deleted
    // Strip <br> from beginning and end of text
    dispatch({
      type: 'setAttribute',
      context,
      key: '=note',
      value: e.target.value.replace(/^<br>|<br>$/gi, '')
    })
  }

  /** Sets the cursor on the note's thought when then note is focused. */
  const onFocus = e => {
    dispatch({ type: 'setCursor', thoughtsRanked, contextChain, cursorHistoryClear: true, editing: false, noteFocus: true })
  }

  return <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
    <ContentEditable
      html={note || ''}
      innerRef={noteRef}
      placeholder='Enter a note'
      onKeyDown={onKeyDown}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={clearSelection}
    />
  </div>
}

export default Note
