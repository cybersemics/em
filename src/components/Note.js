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

        // note may be '' or null if the attribute child was deleted
        if (e.key === 'Backspace' && !note) {
          dispatch(deleteAttribute(context, '=note'))
        }
      }}
      onChange={e => {
        dispatch(setAttribute(context, '=note', e.target.value))
      }}
    />
  </div>
}