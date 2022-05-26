import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { isTouch } from '../browser'
import { store } from '../store'
import { attribute, getEditingPath, contextToThought, isContextViewActive, simplifyPath } from '../selectors'
import {
  cursorDown,
  deleteAttribute,
  editing,
  setAttribute,
  setCursor,
  setNoteFocus,
  toggleNote,
} from '../action-creators'
import { equalArrays, head, pathToContext, strip } from '../util'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import { Path, State } from '../@types'

interface NoteProps {
  path: Path
}

/** Sets the cursor on the note's thought as it is being edited. */
const setCursorOnLiveThought = ({ path }: { path: Path }) => {
  const state = store.getState()
  const simplePath = simplifyPath(state, path) || path
  const simplePathLive = getEditingPath(state, simplePath)

  store.dispatch(
    setCursor({
      path: simplePathLive,
      cursorHistoryClear: true,
      editing: true,
      noteFocus: true,
    }),
  )
}

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ path }: NoteProps) => {
  const state = store.getState()
  const context = pathToContext(state, path)
  const thoughtId = head(path)
  const dispatch = useDispatch()
  const noteRef: { current: HTMLElement | null } = useRef(null)
  const [justPasted, setJustPasted] = useState(false)

  // set the caret on the note if editing this thought and noteFocus is true
  useEffect(() => {
    const state = store.getState()
    // cursor must be true if note is focused
    if (state.noteFocus && equalArrays(pathToContext(state, simplifyPath(state, state.cursor!)), context)) {
      selection.set(noteRef.current!, { end: true })
    }
  }, [state.noteFocus])

  /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
  const note: string | null = useSelector((state: State) => {
    if (isContextViewActive(state, path)) return null
    const noteThought = contextToThought(state, [...context, '=note'])
    if (noteThought?.pending) return null
    return attribute(state, thoughtId, '=note')
  })

  if (note === null) return null

  /** Handles note keyboard shortcuts. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(store.getState(), thoughtId, '=note')

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp') {
      e.stopPropagation()
      e.preventDefault()
      dispatch(toggleNote())
    }
    // delete empty note
    // (delete non-empty note is handled by delete shortcut, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()
      asyncFocus()
      dispatch(deleteAttribute({ path, key: '=note' }))
      dispatch(setNoteFocus({ value: false }))
    } else if (e.key === 'ArrowDown') {
      e.stopPropagation()
      e.preventDefault()
      dispatch(cursorDown())
    }
  }

  /** Updates the =note attribute when the note text is edited. */
  const onChange = (e: ContentEditableEvent) => {
    const value = justPasted
      ? // if just pasted, strip all HTML from value
        (setJustPasted(false), strip(e.target.value))
      : // Mobile Safari inserts <br> when all text is deleted
        // Strip <br> from beginning and end of text
        e.target.value.replace(/^<br>|<br>$/gi, '')

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
    if (isTouch && !selection.isActive()) {
      setTimeout(() => dispatch(editing({ value: false })))
    }
  }

  return (
    <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
      <ContentEditable
        html={note || ''}
        innerRef={noteRef}
        className={'note-editable'}
        placeholder='Enter a note'
        onKeyDown={onKeyDown}
        onChange={onChange}
        onPaste={() => {
          // set justPasted so onChange can strip HTML from the new value
          // the default onPaste behavior is maintained for easier caret and selection management
          setJustPasted(true)
        }}
        onBlur={onBlur}
        onFocus={() => setCursorOnLiveThought({ path })}
      />
    </div>
  )
}

export default Note
