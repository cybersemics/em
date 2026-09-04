import React, { useCallback, useEffect, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { editNotePathActionCreator as editNotePath } from '../actions/editNotePath'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { keyboardOpenActionCreator as keyboardOpen } from '../actions/keyboardOpen'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from '../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import { isSafari, isTouch } from '../browser'
import preventAutoscroll, { preventAutoscrollEnd } from '../device/preventAutoscroll'
import * as selection from '../device/selection'
import globals from '../globals'
import useFreshCallback from '../hooks/useFreshCallback'
import { firstVisibleChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import noteValue from '../selectors/noteValue'
import resolveNoteKey from '../selectors/resolveNoteKey'
import resolveNotePath from '../selectors/resolveNotePath'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
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
    const [noteDraft, setNoteDraft] = useState<string | null>(null)

    /** Gets the value of the note. Returns null if no note exists or if the context view is active. */
    const note = useSelector(state => noteValue(state, path))
    const editableNonce = useSelector(state => state.editableNonce)

    /** Focus Handling with useFreshCallback. */
    const onFocus = useFreshCallback(() => {
      preventAutoscrollEnd(noteRef.current)
      const state = store.getState()

      // iOS Safari sometimes synthesizes the focus of a tap even though onTouchEnd called preventDefault (see
      // globals.suppressCursorAfterTouch). The tap already moved the cursor without opening the keyboard, so dismiss
      // the focus rather than treating it as the second tap that enters edit mode. As in Editable's onFocus, the
      // selection is cleared again after two animation frames, since clearing it synchronously alone leaves iOS
      // Writing Tools stuck open and the selection restored.
      if (isTouch && globals.suppressCursorAfterTouch && !state.isKeyboardOpen) {
        selection.clear()
        dispatch(keyboardOpen({ value: false }))
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            selection.clear()
            dispatch(keyboardOpen({ value: false }))
          })
        })
        return
      }

      const targetPath = resolveNotePath(state, path)
      const { noteId } = resolveNoteKey(state, head(path))
      if (targetPath && !noteId) {
        setNoteDraft(noteValue(state, path) ?? '')
      }
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
      const { noteOffset } = store.getState()
      // cursor must be true if note is focused
      if (hasFocus && noteOffset !== null) {
        selection.set(noteRef.current!, { offset: noteOffset })
        // Clear noteOffset after placing the caret so it acts as a one-shot request. Otherwise repeatedly
        // restoring the caret to the same offset (e.g. applying a font color over a background color multiple
        // times) would set noteOffset to an unchanged value, the effect would not re-run, and the caret would
        // be left wherever the note's re-render dropped it instead of the requested offset (#4630).
        dispatch(setNoteFocus({ value: true, offset: null }))
      }
    }, [dispatch, editableNonce, hasFocus])

    /** Handles note keyboard shortcuts. */
    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Only unmodified keys are note navigation. A chord that includes a command modifier belongs to a command
        // (e.g. Cmd + Shift + ArrowDown is Move Thought Down), so let it propagate to the global keyDown handler
        // instead of swallowing it as Cursor Down or Toggle Note (#4954).
        if (e.metaKey || e.ctrlKey || e.altKey) return

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
        if (globals.suppressChange) return

        // calculate pathToContext onChange not in render for performance
        const value = justPasted
          ? // if just pasted, strip all HTML from value
            (setJustPasted(false), strip(e.target.value))
          : // Mobile Safari inserts <br> when all text is deleted
            // Strip <br> from beginning and end of text
            e.target.value.replace(/^<br>|<br>$/gi, '')

        const noteOffset = noteRef.current ? selection.offsetFromNode(noteRef.current) : null

        // update the referenced thought directly if it exists
        dispatch((dispatch, getState) => {
          const state = getState()

          const resolvedTargetPath = resolveNotePath(state, path)
          const targetPath = resolvedTargetPath ?? path
          const { noteId } = resolveNoteKey(state, head(path))

          if (!noteId && resolvedTargetPath) {
            const values = value.split(',').map(value => value.trim())

            setNoteDraft(value)
            dispatch(
              editNotePath({
                noteOffset: noteOffset ?? undefined,
                path: targetPath,
                values,
              }),
            )
            return
          }

          const noteThought = firstVisibleChild(state, head(targetPath))

          if (noteThought) {
            dispatch(
              editThought({
                path: appendToPath(targetPath, noteThought.id) as SimplePath,
                oldValue: noteThought.value,
                newValue: value,
                noteOffset: noteOffset ?? undefined,
              }),
            )
          } else {
            dispatch(
              setDescendant({
                path: targetPath,
                values: [value],
              }),
            )
          }
        })
      },
      [dispatch, path, justPasted],
    )

    /** Set state.noteFocus if Note lost focus and did not move to another Note. Set state.keyboardOpen if keyboard is closed. */
    const onBlur = useCallback(
      (e: React.FocusEvent) => {
        setNoteDraft(null)
        if (!selection.isNote(e.relatedTarget)) {
          dispatch(setNoteFocus({ value: false }))
        }
        if (isTouch && !selection.isThought()) {
          dispatch(keyboardOpen({ value: false }))
        }
      },
      [dispatch],
    )

    const onMouseDown = useCallback(() => preventAutoscroll(noteRef.current), [noteRef])

    /**
     * Applies the two-tap pattern of thoughts to the note on mobile (see docs/cursor-and-caret.md#mobile): the first
     * tap moves the cursor to the note's thought without opening the keyboard, and only a tap on a note whose thought
     * already has the cursor is left to the browser, which focuses the note and opens the keyboard through onFocus.
     * A tap while the keyboard is already open likewise enters the note directly, as it does on a thought.
     */
    const onTouchEnd = useCallback(
      (e: React.TouchEvent) => {
        if (!isTouch || disabled) return

        dispatch((dispatch, getState) => {
          const state = getState()

          // A touchend that ends a touchmove is a scroll or gesture rather than a tap.
          if (globals.touching) {
            e.preventDefault()
            return
          }

          if (state.isKeyboardOpen || equalPathHead(state.cursor, path)) return

          // preventDefault stops the browser from synthesizing the tap's mousedown and focus, which would open the
          // keyboard.
          e.preventDefault()

          // iOS Safari sometimes synthesizes the focus anyway, e.g. when the touchend is not cancelable because the tap
          // landed during scroll momentum. Flag it for onFocus to dismiss until the next touchstart proves the user
          // tapped again (see globals.suppressCursorAfterTouch).
          if (isSafari()) {
            globals.suppressCursorAfterTouch = true
          }

          dispatch(setCursor({ path, cursorHistoryClear: true }))
        })
      },
      [disabled, dispatch, path],
    )

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
          html={noteDraft ?? note ?? ''}
          innerRef={noteRef as React.RefObject<HTMLElement>}
          aria-label='note-editable'
          data-thought-id={head(path)}
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
          onTouchEnd={onTouchEnd}
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
