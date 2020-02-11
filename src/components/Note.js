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
  isContextViewActive,
} from '../util.js'

// gets the editable node for the given note element
const editableOfNote = noteEl =>
  noteEl.parentNode.previousSibling.querySelector('.editable')

export const Note = ({ context }) => {

  const note = attribute(context, '=note')

  if (note === undefined || isContextViewActive(context)) return null

  const dispatch = useDispatch()

  return <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
    <ContentEditable
      html={note || ''}
      placeholder='Enter a note'
      onKeyDown={e => {

        // delete empty note
        // need to get updated note attribute (not the note in the outside scope)
        const note = attribute(context, '=note')

        // select thought
        if (e.key === 'Escape' || (e.metaKey && e.altKey && e.keyCode === 'N'.charCodeAt(0))) {
          e.stopPropagation()
          editableOfNote(e.target).focus()
        }
        // delete note
        // note may be '' or null if the attribute child was deleted
        else if (e.key === 'Backspace' && (!note || (e.shiftKey && (e.metaKey || e.ctrlKey)))) {
          e.stopPropagation() // prevent delete thought
          e.preventDefault()
          editableOfNote(e.target).focus()
          dispatch(deleteAttribute(context, '=note'))
        }
      }}
      onChange={e => {
        dispatch(setAttribute(context, '=note', e.target.value))
      }}
    />
  </div>
}