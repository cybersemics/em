/* eslint-disable import/prefer-default-export */
import LetterCaseType from '../@types/LetterCaseType'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import noteValue from '../selectors/noteValue'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import applyLetterCase from '../util/applyLetterCase'
import head from '../util/head'
import { editThoughtActionCreator as editThought } from './editThought'
import { setCursorActionCreator as setCursor } from './setCursor'
import { setDescendantActionCreator as setDescendant } from './setDescendant'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from './setIsMulticursorExecuting'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    const isMulticursor = hasMulticursor(state)
    // thoughts can be selected without a cursor, e.g. by Cmd/Ctrl + Clicking a thought after dismissing the cursor with the Home button (#4844)
    if (!cursor && !isMulticursor) return

    // when the caret is on a note, format the note instead of the thought (#4469)
    // resolveNotePath returns null if the thought has no note, in which case there is nothing to format
    const targetPath = !cursor ? null : state.noteFocus ? resolveNotePath(state, cursor) : cursor
    const paths = isMulticursor ? Object.values(state.multicursors) : targetPath ? [targetPath] : []
    // a multicursor may exclude the cursor thought, in which case its value is not letter-cased and its offsets do not move
    const isCursorEdited = !!cursor && paths.some(path => head(path) === head(cursor))
    const offset = selection.offsetThought()
    const cursorSimplePath = cursor ? simplifyPath(state, cursor) : null

    // The plain-text offsets of the selected text within the cursor thought, so that it can be re-selected after the
    // edit (#4840). There is no caret to restore when the selected thoughts have no cursor.
    const cursorEditableSelector = cursor ? `[aria-label="editable-${head(cursor)}"]` : null
    const cursorEditable =
      cursorEditableSelector && !state.noteFocus
        ? (document.querySelector(cursorEditableSelector) as HTMLElement | null)
        : null
    const cursorText = cursorEditable?.textContent ?? null
    const selectedRange = cursorEditable ? selection.offsetRange(cursorEditable) : null

    /** Applies the letter case transform to plain text. */
    const transformedText = (text: string): string => {
      // round-trip the plain text through an element so that it is escaped, since applyLetterCase parses HTML
      const el = document.createElement('div')
      el.textContent = text
      el.innerHTML = applyLetterCase(command, el.innerHTML)
      return el.textContent ?? text
    }

    /** Maps a plain-text offset in the cursor thought to the corresponding offset in the letter-cased thought. A letter
     * case transform can change the length of the text (e.g. 'ß'.toUpperCase() === 'SS'), so an offset is only valid
     * after the edit if the text that precedes it is transformed too. */
    const transformedOffset = (text: string, offset: number): number => transformedText(text.slice(0, offset)).length

    const cursorOffset =
      isCursorEdited && cursorText !== null && offset !== null ? transformedOffset(cursorText, offset) : offset
    const restoreRange =
      isCursorEdited && cursorText !== null && selectedRange
        ? {
            start: transformedOffset(cursorText, selectedRange.start),
            end: transformedOffset(cursorText, selectedRange.end),
          }
        : selectedRange
    const editActions = paths.flatMap(path => {
      const value = state.noteFocus && cursor ? noteValue(state, cursor) : getThoughtById(state, head(path))?.value

      if (!value) return []

      const newValue = applyLetterCase(command, value)

      return state.noteFocus
        ? [
            setDescendant({
              path,
              values: [newValue],
            }),
          ]
        : [
            editThought({
              oldValue: value,
              newValue,
              path: simplifyPath(state, path),
              force: true,
            }),
          ]
    })

    // Bracket the per-thought edits with setIsMulticursorExecuting so that they collapse into a single undo step, as
    // executeCommandWithMulticursor does for multicursor commands. Otherwise each selected thought would have to be
    // undone individually (#4842).
    dispatch([
      isMulticursor ? setIsMulticursorExecuting({ value: true, undoLabel: 'letterCase' }) : null,

      ...editActions,

      // noteFocus doesn't respect cursorOffset, so better to avoid setting the cursor when the caret is on a note (#4469)
      // It shouldn't be possible to have noteFocus be true with the keyboard closed, so setCursor shouldn't be necessary for notes.
      // It seems like the caret goes to the end of the note anyway when its value is replaced.
      // preserveMulticursor keeps the multiselected thoughts selected, otherwise setCursor clears them (#4840).
      !state.noteFocus && cursorSimplePath
        ? setCursor({ path: cursorSimplePath, offset: cursorOffset, preserveMulticursor: true })
        : null,

      isMulticursor ? setIsMulticursorExecuting({ value: false }) : null,
    ])

    // Re-select the text that was selected before the edit (#4840). editThought re-renders the ContentEditable from
    // the new value, which destroys the browser selection, and useEditMode then collapses the caret to cursorOffset.
    // ContentEditable replaces the editable's contents from a passive effect, which is not guaranteed to run before the
    // next animation frame, so wait for the replacement itself rather than for a frame. Otherwise the re-selection can
    // land on the old text and be wiped by the re-render, leaving nothing selected (#4985).
    if (
      restoreRange &&
      restoreRange.end > restoreRange.start &&
      cursorEditableSelector &&
      cursorEditable &&
      cursorText !== null
    ) {
      // a multicursor may exclude the cursor thought, in which case its text is re-rendered unchanged
      const newText = isCursorEdited ? transformedText(cursorText) : cursorText
      const observer = new MutationObserver(() => {
        const editable = document.querySelector(cursorEditableSelector)
        // ignore any mutation that precedes the re-render, e.g. one dispatched in the same tick as the edit
        if (editable?.textContent !== newText) return
        observer.disconnect()
        selection.setRange(editable, restoreRange)
      })
      observer.observe(cursorEditable, { characterData: true, childList: true, subtree: true })
    }
  }
