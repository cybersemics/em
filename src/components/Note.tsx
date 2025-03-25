import React, { useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import { closeCommandMenuActionCreator } from '../actions/closeCommandMenu'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { editingActionCreator as editing } from '../actions/editing'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from '../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import { isSafari, isTouch } from '../browser'
import * as selection from '../device/selection'
import store from '../stores/app'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import noteValue from '../util/noteValue'
import strip from '../util/strip'

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
      // deleting a note, then closing the keyboard, then creating a new note could result in lack of focus,
      // perhaps related to iOS Safari's internal management of selection ranges and focus
      if (isTouch && isSafari()) noteRef.current?.focus()
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
    // (delete non-empty note is handled by delete command, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()
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

  /** Enables noteFocus and sets the cursor on the thought. */
  const onFocus = () => {
    const state = store.getState()

    // Close command menu if it's open when focusing on a note.
    if (state.commandMenuOpen && isTouch) {
      dispatch(closeCommandMenuActionCreator())
    }

    dispatch(
      setCursor({
        path,
        cursorHistoryClear: true,
        editing: true,
        noteFocus: true,
      }),
    )
  }

  return (
    <div
      aria-label='note'
      className={cx(
        textNoteRecipe(),
        css({
          fontSize: 'sm',
          lineHeight: 1.25,
          // negative margin to compensate for line-height. See .thought-container
          marginTop: -3,
          position: 'relative',
          marginBottom: '2px',
          paddingBottom: '4px',
          '@media (max-width: 1024px)': {
            _android: {
              position: 'relative',
              marginBottom: '2px',
              paddingBottom: '4px',
            },
          },
        }),
      )}
      style={{
        // offset editable's margin-left, which is dynamically set based on font size
        marginLeft: fontSize - 14,
      }}
    >
      <ContentEditable
        html={note || ''}
        innerRef={noteRef}
        aria-label='note-editable'
        placeholder='Enter a note'
        className={css({
          display: 'inline-block',
          padding: '0 1em 0 0.333em',
        })}
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
  )
})

Note.displayName = 'Note'

export default Note
