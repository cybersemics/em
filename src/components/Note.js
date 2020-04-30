import React from 'react'
import { useDispatch } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// action-creators
import deleteAttribute from '../action-creators/deleteAttribute'
import setAttribute from '../action-creators/setAttribute'

// util
import {
  attribute,
  hasAttribute,
  isContextViewActive,
  selectNextEditable,
  setSelection,
} from '../util'

// gets the editable node for the given note element
const editableOfNote = noteEl =>
  noteEl.parentNode.previousSibling.querySelector('.editable')

const Note = ({ context }) => {

  const hasNote = hasAttribute(context, '=note')

  if (!hasNote || isContextViewActive(context)) return null

  const dispatch = useDispatch()
  const note = attribute(context, '=note')

  const onKeyDown = e => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(context, '=note')

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp' || (e.metaKey && e.altKey && e.keyCode === 'N'.charCodeAt(0))) {
      e.stopPropagation()
      setSelection(editableOfNote(e.target), { end: true })
    }
    // delete note
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && (!note || (e.shiftKey && (e.metaKey || e.ctrlKey)))) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()
      setSelection(editableOfNote(e.target), { end: true })
      dispatch(deleteAttribute(context, '=note'))
    }
    else if (e.key === 'ArrowDown') {
      e.stopPropagation()
      e.preventDefault()
      selectNextEditable(editableOfNote(e.target))
    }
  }

  const onChange = e => {
    dispatch(setAttribute(context, '=note', e.target.value))
  }

  return <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
    <ContentEditable
      html={note || ''}
      placeholder='Enter a note'
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  </div>
}

export default Note
