import React, { useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import cursorDown from '../action-creators/cursorDown'
import deleteAttribute from '../action-creators/deleteAttribute'
import editing from '../action-creators/editing'
import setAttribute from '../action-creators/setAttribute'
import setCursor from '../action-creators/setCursor'
import setNoteFocus from '../action-creators/setNoteFocus'
import toggleNote from '../action-creators/toggleNote'
import { isTouch } from '../browser'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import { firstVisibleChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { store } from '../store'
import head from '../util/head'
import strip from '../util/strip'

interface NoteProps {
  path: Path
}

/** Sets the cursor on the note's thought as it is being edited. */
const setCursorOnLiveThought = ({ path }: { path: Path }) => {
  const state = store.getState()
  const simplePath = simplifyPath(state, path) || path

  store.dispatch(
    setCursor({
      path: simplePath,
      cursorHistoryClear: true,
      editing: true,
      noteFocus: true,
    }),
  )
}

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, id: ThoughtId) => {
  const noteId = findDescendant(state, id, '=note')
  if (!noteId) return null
  const noteThought = getThoughtById(state, noteId)
  if (noteThought.pending) return null
  return firstVisibleChild(state, noteId!)?.value ?? null
}

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ path }: NoteProps) => {
  const thoughtId = head(path)
  const dispatch = useDispatch()
  const noteRef: { current: HTMLElement | null } = useRef(null)
  const [justPasted, setJustPasted] = useState(false)

  /** Gets state.noteFocus. */
  const hasFocus = useSelector((state: State) => state.noteFocus && state.cursor && head(state.cursor) === head(path))

  // set the caret on the note if editing this thought and noteFocus is true
  useEffect(() => {
    // cursor must be true if note is focused
    if (hasFocus) {
      selection.set(noteRef.current!, { end: true })
    }
  }, [hasFocus])

  /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
  const note = useSelector((state: State) => noteValue(state, thoughtId))

  if (note === null) return null

  /** Handles note keyboard shortcuts. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    // delete empty note
    const note = noteValue(store.getState(), thoughtId)

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
    // calculate pathToContext onChange not in render for performance
    const value = justPasted
      ? // if just pasted, strip all HTML from value
        (setJustPasted(false), strip(e.target.value))
      : // Mobile Safari inserts <br> when all text is deleted
        // Strip <br> from beginning and end of text
        e.target.value.replace(/^<br>|<br>$/gi, '')

    dispatch(
      setAttribute({
        path,
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
    <div className='note children-subheading text-note text-small'>
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
