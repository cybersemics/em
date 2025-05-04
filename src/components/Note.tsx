import React, { useCallback, useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { editingActionCreator as editing } from '../actions/editing'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from '../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import useFreshCallback from '../hooks/useFreshCallback'
import store from '../stores/app'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import noteValue from '../util/noteValue'
import strip from '../util/strip'
import FauxCaret from './FauxCaret'

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = React.memo(
  ({
    disabled,
    path,
  }: {
    /** Disables interaction with the note. Used when the note is hidden by autofocus but remains in th DOM. */
    disabled?: boolean
    path: Path
  }) => {
    const thoughtId = head(path)
    const dispatch = useDispatch()
    const noteRef: { current: HTMLElement | null } = useRef(null)
    const fontSize = useSelector(state => state.fontSize)
    const hasFocus = useSelector(state => state.noteFocus && equalPathHead(state.cursor, path))
    const [justPasted, setJustPasted] = useState(false)

    /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
    const note = useSelector(state => noteValue(state, thoughtId))
    const noteOffset = useSelector(state => state.noteOffset)

    /** Focus Handling with useFreshCallback. */
    const onFocus = useFreshCallback(() => {
      dispatch(
        setCursor({
          path,
          cursorHistoryClear: true,
          editing: true,
          noteOffset: null,
          noteFocus: true,
        }),
      )
    }, [dispatch, path])

    // set the caret on the note if editing this thought and noteFocus is true
    useEffect(() => {
      // cursor must be true if note is focused
      if (hasFocus && noteOffset !== null) {
        selection.set(noteRef.current!, { offset: noteOffset })
      }
    }, [hasFocus, noteOffset])

    /** Handles note keyboard shortcuts. */
    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
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
          e.stopPropagation()
          e.preventDefault()
          dispatch(deleteAttribute({ path, value: '=note' }))
          dispatch(setNoteFocus({ value: false }))
        } else if (e.key === 'ArrowDown') {
          e.stopPropagation()
          e.preventDefault()
          dispatch(cursorDown())
        }
      },
      [dispatch, path, thoughtId],
    )

    /** Updates the =note attribute when the note text is edited. */
    const onChange = useCallback(
      (e: ContentEditableEvent) => {
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
      },
      [dispatch, path, justPasted],
    )

    /** Set editing to false onBlur, if keyboard is closed. */
    const onBlur = useCallback(
      (e: React.FocusEvent) => {
        if (isTouch && !selection.isActive()) {
          // if we know that the focus is changing to another editable or note then do not set editing to false
          // (does not work when clicking a bullet as it is set to null)
          const isRelatedTargetEditableOrNote =
            e.relatedTarget &&
            ((e.relatedTarget as Element).hasAttribute?.('data-editable') ||
              !!(e.relatedTarget as Element).matches('[aria-label="note-editable"]'))

          if (!isRelatedTargetEditableOrNote) setTimeout(() => dispatch(editing({ value: false })))
        }
      },
      [dispatch],
    )

    if (note === null) return null

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
            padding: '0 0 4px 0',
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
        <span className={css({ fontSize: '1.2em', position: 'absolute', margin: '-0.175em 0 0 0.0875em' })}>
          <FauxCaret caretType='noteStart' />
        </span>
        <ContentEditable
          html={note || ''}
          innerRef={noteRef}
          aria-label='note-editable'
          placeholder='Enter a note'
          className={css({
            display: 'inline-block',
            padding: '0 1em 0 0.333em',
          })}
          // For some reason, pointerEvents: 'none' on ContentEditable or its parent does prevent onFocus.
          // This is strange, as it seems to prevent onFocus in Subthought.tsx.
          disabled={disabled}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onPaste={() => {
            // set justPasted so onChange can strip HTML from the new value
            // the default onPaste behavior is maintained for easier caret and selection management
            setJustPasted(true)
          }}
          onBlur={onBlur}
          onFocus={onFocus}
          role='button'
        />
        <span className={css({ fontSize: '1.1em', position: 'absolute', margin: '-0.15em 0 0 -1.175em' })}>
          <FauxCaret caretType='noteEnd' />
        </span>
      </div>
    )
  },
)

Note.displayName = 'Note'

export default Note
