import React, { useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { isTouch } from '../browser'
import { store } from '../store'
import { attribute, hasChild, isContextViewActive } from '../selectors'
import { deleteAttribute, editing, setAttribute, setNoteFocus } from '../action-creators'
import { asyncFocus, selectNextEditable, setSelection, strip } from '../util'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { Context } from '../types'

interface NoteProps {
  context: Context,
  onFocus: (e: React.FocusEvent) => void,
}

/** Gets the editable node for the given note element. */
const editableOfNote = (noteEl: HTMLElement) => {
  // To prevent incorrect compilation, we need an explict return statement here (https://github.com/cybersemics/em/issues/923#issuecomment-738103132)
  return (noteEl.parentNode?.previousSibling as HTMLElement)?.querySelector('.editable') as (HTMLElement | null)
}

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ context, onFocus }: NoteProps) => {

  const state = store.getState()
  const dispatch = useDispatch()
  const noteRef: { current: HTMLElement | null } = useRef(null)
  const [justPasted, setJustPasted] = useState(false)

  const hasNote = hasChild(state, context, '=note')
  if (!hasNote || isContextViewActive(state, context)) return null

  const note = attribute(state, context, '=note')

  /** Handles note keyboard shortcuts. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(store.getState(), context, '=note')
    const editable = editableOfNote(e.target as HTMLElement)!

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp' || (e.metaKey && e.altKey && e.keyCode === 'N'.charCodeAt(0))) {
      e.stopPropagation()
      e.preventDefault()
      editable.focus()
      setSelection(editable, { end: true })
      dispatch(setNoteFocus({ value: false }))
    }
    // delete empty note
    // (delete non-empty note is handled by delete shortcut, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()

      if (isTouch) {
        asyncFocus()
      }
      editable.focus()
      setSelection(editable, { end: true })

      dispatch(deleteAttribute({ context, key: '=note' }))
      dispatch(setNoteFocus({ value: false }))
    }
    else if (e.key === 'ArrowDown') {
      e.stopPropagation()
      e.preventDefault()
      selectNextEditable(editable)
    }
  }

  /** Updates the =note attribute when the note text is edited. */
  const onChange = (e: ContentEditableEvent) => {
    const value = justPasted
      // if just pasted, strip all HTML from value
      ? (setJustPasted(false), strip(e.target.value))
      // Mobile Safari inserts <br> when all text is deleted
      // Strip <br> from beginning and end of text
      : e.target.value.replace(/^<br>|<br>$/gi, '')

    dispatch(setAttribute({
      context,
      key: '=note',
      value
    }))
  }

  /** Set editing to false onBlur, if keyboard is closed. */
  const onBlur = () => {
    if (isTouch && !window.getSelection()?.focusNode) {
      setTimeout(() => dispatch(editing({ value: false })))
    }
  }

  return <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
    <ContentEditable
      html={note || ''}
      innerRef={noteRef}
      placeholder='Enter a note'
      onKeyDown={onKeyDown}
      onChange={onChange}
      onPaste={() => {
        // set justPasted so onChange can strip HTML from the new value
        // the default onPaste behavior is maintained for easier caret and selection management
        setJustPasted(true)
      }}
      onBlur={onBlur}
      onFocus={onFocus}
    />
  </div>
}

export default Note
