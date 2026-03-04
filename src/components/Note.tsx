import React, { useCallback, useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from '../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import { isTouch } from '../browser'
import preventAutoscroll, { preventAutoscrollEnd } from '../device/preventAutoscroll'
import * as selection from '../device/selection'
import useFreshCallback from '../hooks/useFreshCallback'
import getThoughtById from '../selectors/getThoughtById'
import resolveNotePath from '../selectors/resolveNotePath'
import store from '../stores/app'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import noteValue from '../util/noteValue'
import strip from '../util/strip'
import useOnCut from './Editable/useOnCut'
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
    const dispatch = useDispatch()
    const noteRef: { current: HTMLElement | null } = useRef(null)
    const fontSize = useSelector(state => state.fontSize)
    const hasFocus = useSelector(state => state.noteFocus && equalPathHead(state.cursor, path))
    const [justPasted, setJustPasted] = useState(false)

    /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
    const note = useSelector(state => noteValue(state, path))
    const noteOffset = useSelector(state => state.noteOffset)

    /** Focus Handling with useFreshCallback. */
    const onFocus = useFreshCallback(() => {
      preventAutoscrollEnd(noteRef.current)
      dispatch(
        setCursor({
          path,
          cursorHistoryClear: true,
          isKeyboardOpen: true,
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
        const note = noteValue(store.getState(), path)

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

          // delete target thought if it exists
          dispatch((dispatch, getState) => {
            const state = getState()
            const targetPath = resolveNotePath(state, path) ?? path
            const targetThought = targetPath ? getThoughtById(state, head(targetPath)) : undefined

            if (targetThought) {
              dispatch(deleteThought({ pathParent: path, thoughtId: targetThought.id }))
            }
          })

          dispatch(setNoteFocus({ value: false }))
        } else if (e.key === 'ArrowDown') {
          e.stopPropagation()
          e.preventDefault()
          dispatch(cursorDown())
        }
      },
      [dispatch, path],
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

        // update the referenced thought directly if it exists
        dispatch((dispatch, getState) => {
          const state = getState()

          const targetPath = resolveNotePath(state, path) ?? path

          dispatch(setDescendant({ path: targetPath, values: [value] }))
        })
      },
      [dispatch, path, justPasted],
    )

    /** Set editing to false onBlur, if keyboard is closed. */
    const onBlur = useCallback(
      (e: React.FocusEvent) => {
        if (!(e.relatedTarget instanceof Element)) return

        const isRelatedTargetNote = !!e.relatedTarget.matches('[aria-label="note-editable"]')

        if (!isRelatedTargetNote) dispatch(setNoteFocus({ value: false }))

        if (isTouch && !selection.isActive()) {
          // if we know that the focus is changing to another editable or note then do not set editing to false
          // (does not work when clicking a bullet as it is set to null)
          const isRelatedTargetEditableOrNote =
            e.relatedTarget && (e.relatedTarget.hasAttribute?.('data-editable') || isRelatedTargetNote)

          if (!isRelatedTargetEditableOrNote) setTimeout(() => dispatch(keyboardOpen({ value: false })))
        }
      },
      [dispatch],
    )

    const onMouseDown = useCallback(() => preventAutoscroll(noteRef.current), [noteRef])

    const onCopy = useCallback((e: React.ClipboardEvent) => {
      const html = selection.html()
      const text = selection.text()

      if (!html || !text) return

      e.clipboardData.setData('text/html', html)
      e.clipboardData.setData('text/plain', text)
      e.clipboardData.setData('text/em', 'true')
      e.preventDefault()
    }, [])

    const onCut = useOnCut()

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
          innerRef={noteRef as React.RefObject<HTMLElement>}
          aria-label='note-editable'
          placeholder='Enter a note'
          className={css({
            display: 'inline-block',
            padding: '0 1em 0 0.333em',
          })}
          // For some reason, pointerEvents: 'none' on ContentEditable or its parent does prevent onFocus.
          // This is strange, as it seems to prevent onFocus in Subthought.tsx.
          disabled={disabled}
          // Prevent drag-and-drop of text selection between thoughts and notes. This also disables dragging
          // text within the note, which was previously possible on mobile but not desktop. This may be addressed
          // on both platforms by https://github.com/cybersemics/em/issues/3739.
          onDrop={isTouch ? (e: React.DragEvent) => e.preventDefault() : undefined}
          onKeyDown={onKeyDown}
          onChange={onChange}
          // Text copied from a note and pasted on a thought should not bring along the note's default color and italicization. (#3779)
          onCopy={onCopy}
          onCut={onCut}
          onPaste={() => {
            // set justPasted so onChange can strip HTML from the new value
            // the default onPaste behavior is maintained for easier caret and selection management
            setJustPasted(true)
          }}
          onBlur={onBlur}
          onFocus={onFocus}
          onMouseDown={onMouseDown}
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
