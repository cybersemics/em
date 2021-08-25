import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { isTouch } from '../browser'
import { store } from '../store'
import { attribute, getParent, hasChild, isContextViewActive } from '../selectors'
import { deleteAttribute, editing, setAttribute, setNoteFocus } from '../action-creators'
import { asyncFocus, selectNextEditable, setSelection, strip } from '../util'
import { Context } from '../@types'
import ContentEditable, { ContentEditableEvent, IKeyDown } from './ContentEditable.native'

interface NoteProps {
  context: Context
  onFocus: () => void
}

// Todo: discuss editableOfNote() equivalent approach in native.
/** Gets the editable node for the given note element. */
const editableOfNote = (noteEl: any) => {
  // To prevent incorrect compilation, we need an explict return statement here (https://github.com/cybersemics/em/issues/923#issuecomment-738103132)
  return (noteEl.parentNode?.previousSibling as HTMLElement)?.querySelector('.editable') as HTMLElement | null
}

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ context, onFocus }: NoteProps) => {
  const state = store.getState()
  const dispatch = useDispatch()
  const [justPasted, setJustPasted] = useState(false)

  const hasNote = hasChild(state, context, '=note')

  /** Check if the note thought is pending or not. */
  const isNotePending = () => {
    const noteThought = getParent(state, [...context, '=note'])
    return !noteThought || noteThought.pending
  }

  if (!hasNote || isNotePending() || isContextViewActive(state, context)) return null

  const note = attribute(state, context, '=note')

  /** Handles note keyboard shortcuts. */
  const onKeyDown = (e: IKeyDown) => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(store.getState(), context, '=note')
    const editable = editableOfNote(e)!

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp' || e.keyCode === 'N'.charCodeAt(0)) {
      editable?.focus()
      setSelection(editable, { end: true })
      dispatch(setNoteFocus({ value: false }))
    }
    // delete empty note
    // (delete non-empty note is handled by delete shortcut, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      if (isTouch) {
        asyncFocus()
      }
      editable.focus()
      setSelection(editable, { end: true })

      dispatch(deleteAttribute({ context, key: '=note' }))
      dispatch(setNoteFocus({ value: false }))
    } else if (e.key === 'ArrowDown') {
      selectNextEditable(editable)
    }
  }

  /** Updates the =note attribute when the note text is edited. */
  const onChange = (e: ContentEditableEvent) => {
    const value = justPasted
      ? // if just pasted, strip all HTML from value
        (setJustPasted(false), strip(e))
      : // Mobile Safari inserts <br> when all text is deleted
        // Strip <br> from beginning and end of text
        e?.replace(/^<br>|<br>$/gi, '')

    dispatch(
      setAttribute({
        context,
        key: '=note',
        value,
      }),
    )
  }

  /** Set editing to false onBlur, if keyboard is closed. */
  const onBlur = () => {
    dispatch(editing({ value: false }))
  }

  return (
    <ContentEditable
      html={note || ''}
      placeholder='Enter a note'
      onKeyDown={onKeyDown}
      onChange={onChange}
      // onPaste={() => {
      //   // set justPasted so onChange can strip HTML from the new value
      //   // the default onPaste behavior is maintained for easier caret and selection management
      //   setJustPasted(true)
      // }}
      onBlur={onBlur}
      forceUpdate={false}
      onFocus={onFocus}
    />
  )
}

export default Note
