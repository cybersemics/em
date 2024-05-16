import React, { useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { editingActionCreator as editing } from '../actions/editing'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from '../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import { isTouch } from '../browser'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import simplifyPath from '../selectors/simplifyPath'
import store from '../stores/app'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import noteValue from '../util/noteValue'
import strip from '../util/strip'

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

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = React.memo(({ path }: { path: Path }) => {
  const thoughtId = head(path)
  const dispatch = useDispatch()
  const noteRef: { current: HTMLElement | null } = useRef(null)
  const fontSize = useSelector(state => state.fontSize)
  const hasFocus = useSelector(state => state.noteFocus && equalPathHead(state.cursor, path))
  const [justPasted, setJustPasted] = useState(false)

  // set the caret on the note if editing this thought and noteFocus is true
  useEffect(() => {
    // cursor must be true if note is focused
    if (hasFocus) {
      selection.set(noteRef.current!, { end: true })
    }
  }, [hasFocus])

  /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
  const note = useSelector(state => noteValue(state, thoughtId))

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
      dispatch(deleteAttribute({ path, value: '=note' }))
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
      setDescendant({
        path,
        values: ['=note', value],
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
    <div
      className='note children-subheading text-note text-small'
      style={{
        lineHeight: 1.25,
        // negative margin to compensate for line-height. See .thought-container
        marginTop: -3,
        // offset editable's margin-left, which is dynamically set based on font size
        marginLeft: fontSize - 14,
        transition: 'color 0.75s ease-in-out',
      }}
    >
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
})

Note.displayName = 'Note'

export default Note
