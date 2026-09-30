import _ from 'lodash'
import LetterCaseType from '../@types/LetterCaseType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import noteValue from '../selectors/noteValue'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import applyLetterCase from '../util/applyLetterCase'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import editThought from './editThought'
import setCursor from './setCursor'
import setDescendant from './setDescendant'

export interface formatLetterCasePayload {
  /** The letter case to apply. */
  command: LetterCaseType
  /** The plain-text range of the cursor thought to letter-case. Omitted to letter-case the whole value. */
  range?: { start: number; end: number }
  /** The caret offset in the cursor thought after the edit. */
  cursorOffset?: number | null
  /** The action-creator has already written the cursor thought's new value to its live editable and restored the
   * selection, so the edit must neither force a render nor reset the cursor, either of which would collapse the
   * restored range. */
  editableWritten?: boolean
  /** Names the undo step. Read by undoRedoEnhancer rather than by the reducer. */
  undoLabel?: string
}

/** Applies a letter case to the cursor thought or note, over the given range or in full, or to every thought of a
 * multiselection in full. */
const formatLetterCase = (
  state: State,
  { command, range, cursorOffset, editableWritten }: formatLetterCasePayload,
): State => {
  const { cursor, noteFocus } = state
  const isMulticursor = hasMulticursor(state)
  // thoughts can be selected without a cursor, e.g. by Cmd/Ctrl + Clicking a thought after dismissing the cursor with the Home button (#4844)
  if (!cursor && !isMulticursor) return state

  // when the caret is on a note, format the note instead of the thought (#4469)
  // resolveNotePath returns null if the thought has no note, in which case there is nothing to format
  const targetPath = !cursor ? null : noteFocus ? resolveNotePath(state, cursor) : cursor
  const paths = isMulticursor ? Object.values(state.multicursors) : targetPath ? [targetPath] : []
  const cursorThoughtId = cursor && !noteFocus ? head(cursor) : null

  // A multiselection is a single action and therefore a single undo step, so the selected thoughts do not have to be
  // undone individually (#4842).
  return reducerFlow([
    ...paths.map(path => {
      const value = noteFocus && cursor ? noteValue(state, cursor) : getThoughtById(state, head(path))?.value
      if (!value) return null

      const newValue = applyLetterCase(command, value, range)
      const isWritten = !!editableWritten && head(path) === cursorThoughtId

      return noteFocus
        ? setDescendant({ path, values: [newValue] })
        : editThought({
            ...(isWritten ? { cursorOffset: cursorOffset ?? undefined } : null),
            oldValue: value,
            newValue,
            path: simplifyPath(state, path),
            force: !isWritten,
          })
    }),

    // noteFocus doesn't respect cursorOffset, so better to avoid setting the cursor when the caret is on a note (#4469)
    // It shouldn't be possible to have noteFocus be true with the keyboard closed, so setCursor shouldn't be necessary for notes.
    // It seems like the caret goes to the end of the note anyway when its value is replaced.
    // preserveMulticursor keeps the multiselected thoughts selected, otherwise setCursor clears them (#4840).
    // Skipped when the editable was written by the action-creator: the edit already carries the offset, and setCursor
    // recomputes expanded and resets cursorCleared, whose re-render re-runs useEditMode — which would place the
    // caret at cursorOffset on top of the restored range. As in formatSelection, which sets no cursor.
    !noteFocus && cursor && !editableWritten
      ? setCursor({ path: simplifyPath(state, cursor), offset: cursorOffset, preserveMulticursor: true })
      : null,
  ])(state)
}

/** Returns the plain text of an HTML value, i.e. what the editable renders it as. */
const plainText = (html: string): string => {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

/** Action-creator for formatLetterCase. Reads the browser selection, which the reducer cannot read, and keeps the
 * selection in step with the letter-cased value (#4840, #4985).
 */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    const isMulticursor = hasMulticursor(state)
    if (!cursor && !isMulticursor) return

    const targetPath = !cursor ? null : state.noteFocus ? resolveNotePath(state, cursor) : cursor
    const paths = isMulticursor ? Object.values(state.multicursors) : targetPath ? [targetPath] : []
    // a multicursor may exclude the cursor thought, in which case its value is not letter-cased and its offsets do not move
    const isCursorEdited = !!cursor && paths.some(path => head(path) === head(cursor))
    const offset = selection.offsetThought()

    // The plain-text offsets of the selected text within the cursor thought, so that it can be re-selected after the
    // edit (#4840). There is no caret to restore when the selected thoughts have no cursor.
    const cursorEditableSelector = cursor ? `[aria-label="editable-${head(cursor)}"]` : null
    const cursorEditable =
      cursorEditableSelector && !state.noteFocus
        ? (document.querySelector(cursorEditableSelector) as HTMLElement | null)
        : null
    const cursorText = cursorEditable?.textContent ?? null
    const selectedRange = cursorEditable ? selection.offsetRange(cursorEditable) : null

    // The range of the cursor thought to letter-case, or undefined to letter-case the whole thought (#4281). As in
    // formatSelection, a collapsed caret or a full selection letter-cases the whole thought. A multiselection has no
    // browser selection to letter-case a range of, and each of its thoughts is letter-cased in full.
    const range =
      !isMulticursor &&
      selectedRange &&
      selectedRange.end > selectedRange.start &&
      selectedRange.end - selectedRange.start < (cursorText?.length ?? 0)
        ? selectedRange
        : undefined

    // The cursor thought's value, which is what its editable re-renders from. Editable trims the value on its way into
    // Redux, so it can differ from the editable's own text while the thought is being edited.
    const cursorValue = cursor ? getThoughtById(state, head(cursor))?.value : undefined

    /** Applies the letter case transform to plain text. */
    const transformedText = (text: string): string => {
      // round-trip the plain text through an element so that it is escaped, since applyLetterCase parses HTML
      const el = document.createElement('div')
      el.textContent = text
      el.innerHTML = applyLetterCase(command, el.innerHTML, range)
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

    // Keep the cursor thought's edit synchronous with its live editable, as formatSelection does for partial thought
    // formatting. Writing the new value and restoring the range here means the edit does not need a forced render, and
    // that matters beyond saving a render: force bumps editableNonce, which useEditMode subscribes to, so the forced
    // render re-runs it and it collapses the caret to cursorOffset — on touch that lands after the range is restored
    // and wipes it. ContentEditable skips an innerHTML assignment when the live HTML already matches the prop. The
    // editable has to be written before the dispatch re-renders it, so the letter-cased value is computed here as well
    // as in the reducer.
    const editableWritten = !!(
      isCursorEdited &&
      cursorEditable &&
      cursorValue &&
      restoreRange &&
      restoreRange.end > restoreRange.start
    )
    if (editableWritten) {
      cursorEditable!.innerHTML = applyLetterCase(command, cursorValue!, range)
      selection.setRange(cursorEditable!, restoreRange!)
    }

    dispatch({
      type: 'formatLetterCase',
      command,
      range,
      cursorOffset,
      editableWritten,
      undoLabel: 'letterCase',
    })

    // Re-select the text that was selected before the edit (#4840). editThought re-renders the ContentEditable from
    // the new value, which destroys the browser selection, and useEditMode then collapses the caret to cursorOffset.
    // ContentEditable replaces the editable's contents from a passive effect, which is not guaranteed to run before the
    // next animation frame, so wait for the replacement itself rather than for a frame. Otherwise the re-selection can
    // land on the old text and be wiped by the re-render, leaving nothing selected (#4985).
    if (
      !editableWritten &&
      restoreRange &&
      restoreRange.end > restoreRange.start &&
      cursorEditableSelector &&
      cursorEditable &&
      cursorValue !== undefined
    ) {
      // The text the editable will re-render to, derived from the value being dispatched rather than from the
      // editable's own text: Editable trims the value on its way into Redux, so a thought with leading or trailing
      // whitespace renders as text the editable never held, and a prediction made from the editable would never match.
      // A multicursor may exclude the cursor thought, in which case its value is re-rendered unchanged.
      const newText = plainText(isCursorEdited ? applyLetterCase(command, cursorValue, range) : cursorValue)
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

export default _.curryRight(formatLetterCase)

// Register this action's metadata
registerActionMetadata('formatLetterCase', {
  undoable: true,
  isNavigation: false,
})
