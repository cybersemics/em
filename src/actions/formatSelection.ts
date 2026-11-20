import _ from 'lodash'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { isSafari, isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import noteThought from '../selectors/noteThought'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import editableSyncStore from '../stores/editableSyncStore'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import reducerFlow from '../util/reducerFlow'
import editThought from './editThought'
import setDescendant from './setDescendant'
import setNoteFocus from './setNoteFocus'
import updateThoughts from './updateThoughts'

/** The single placeholder character that carries the formatting applied to an empty thought, whose own value has no
 * text for the formatting tags to wrap. */
const PENDING_FORMAT_PLACEHOLDER = 'x'

export interface formatSelectionPayload {
  /** The formatting command to apply. */
  command: FormatCommand
  /** The color to apply, for foreColor and backColor. */
  color?: ColorToken
  /** The plain-text range of the cursor thought or note to format. Omitted to format the whole value. */
  range?: { start: number; end: number }
  /** The caret offset to restore in the cursor thought after the edit. */
  cursorOffset?: number
  /** The caret offset to restore in the note after the edit, since overwriting its value drops the caret (#4630). */
  noteOffset?: number | null
  /** Names the undo step. Read by undoRedoEnhancer rather than by the reducer. */
  undoLabel?: string
}

/** The options that apply a formatting command in the current theme. */
const formatOptions = (
  state: State,
  { command, color, note }: { command: FormatCommand; color?: ColorToken; note?: boolean },
) => {
  const colors = themeColors(state)
  return {
    command,
    colorValue: color ? colors[color] : undefined,
    // A note is semi-transparent by default, so its default foreground differs from a thought's (#3902).
    defaultColor: note ? colors.fgNote : colors.fg,
    defaultBackgroundColor: colors.bg,
  }
}

/** Holds formatting applied to an empty thought until text is typed into it (#3910). An empty thought's value must stay
 * empty, so the formatting has nowhere to live in the value itself. It is accumulated on a placeholder character so
 * that further commands compose exactly as they do on a real value, and editThought drops it once the value carries
 * the formatting itself. */
const holdFormat = (state: State, id: ThoughtId, options: ReturnType<typeof formatOptions>): State => {
  const thought = getThoughtById(state, id)
  if (!thought) return state
  const pendingFormat = formatSelectionHtml(thought.pendingFormat ?? PENDING_FORMAT_PLACEHOLDER, options)
  if (pendingFormat === thought.pendingFormat) return state

  return updateThoughts(state, {
    thoughtIndexUpdates: { [id]: { ...thought, pendingFormat } },
    lexemeIndexUpdates: {},
    // pendingFormat is not part of the persisted ThoughtPayload, so there is nothing to write or sync
    local: false,
    remote: false,
    // Holding formatting is not an edit, so lastUpdated does not advance. Without this the update looks like a stale
    // echo from another device and is discarded. Same reason generateEmoji sets it for `generating`.
    overwritePending: true,
  })
}

/** Formats the cursor thought or note, over the given range or in full, or colors every thought of a multiselection in
 * full. An empty thought holds the formatting until text is typed into it. */
const formatSelection = (
  state: State,
  { command, color, range, cursorOffset, noteOffset }: formatSelectionPayload,
): State => {
  // Multicursor: apply the color to each selected thought in full, since there is no browser selection. A single
  // action is a single undo step, so the selected thoughts do not have to be undone individually (#4841).
  if (hasMulticursor(state) && (command === 'foreColor' || command === 'backColor')) {
    const options = formatOptions(state, { command, color })
    return reducerFlow(
      Object.values(state.multicursors).map(path => {
        const thought = pathToThought(state, path)
        if (!thought) return null

        // A selected empty thought holds the formatting, just as it does when it is the only cursor.
        if (thought.value.length === 0) return (state: State) => holdFormat(state, thought.id, options)

        const newValue = formatSelectionHtml(thought.value, options)
        return newValue !== thought.value
          ? editThought({
              oldValue: thought.value,
              newValue,
              path: simplifyPath(state, path),
              // force the ContentEditable to update
              force: true,
            })
          : null
      }),
    )(state)
  }

  if (!state.cursor) return state
  const thought = pathToThought(state, state.cursor)
  if (!thought) return state

  // The current value of the note or thought being formatted (#3901).
  const value = state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value
  const options = formatOptions(state, { command, color, note: state.noteFocus })

  if (value.length === 0) {
    // A note's formatting is held on the thought that holds its text, which noteThought resolves. It is null for a
    // note assembled from several thoughts (=children/=note/=path), which has nowhere to hold it.
    const target = state.noteFocus ? noteThought(state, state.cursor) : thought
    return target ? holdFormat(state, target.id, options) : state
  }

  const newValue = formatSelectionHtml(value, { ...range, ...options })
  const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor
  if (newValue === value || !path) return state

  return reducerFlow(
    state.noteFocus
      ? [setDescendant({ path, values: [newValue] }), setNoteFocus({ value: true, offset: noteOffset ?? null })]
      : [
          editThought({
            cursorOffset,
            oldValue: value,
            newValue,
            path: simplifyPath(state, path),
            // Force the ContentEditable to update when formatting the whole thought. Partial thought formatting is
            // applied to the live DOM by the action-creator without a forced render.
            force: !range,
          }),
        ],
  )(state)
}

/**
 * Registers a single native undo step in WKWebView for a formatSelection edit on iOS.
 *
 * The DOMParser-based formatSelection applies formatting by re-rendering the contentEditable from Redux (editThought),
 * not via document.execCommand, so WebKit records no native undo step. Without a step, a native undo gesture
 * (shake-to-undo / three-finger swipe) has nothing to undo and fires no event — so the historyUndo `beforeinput` handler
 * that routes native undo through em's own undo (#3954) never runs (#4637).
 *
 * This performs a scoped execCommand purely so WebKit registers one native undo step per format. Its DOM effect is
 * immaterial: it is immediately overwritten by the editThought re-render, and the native undo it anchors is
 * preventDefaulted by the beforeinput handler (which dispatches em's undo instead). It exists only as the trigger that
 * makes the native undo gesture fire.
 *
 * No-op on non-iOS platforms (isTouch && isSafari gates iOS WKWebView; desktop Safari has no shake/three-finger undo).
 *
 * Trade-offs:
 *
 * In order to avoid keyboard focus messiness, this is only called when the keyboard is open and the caret is on a thought.
 * This means that when the keyboard is closed, a native undo step will not be registered and the native undo stack will drift out of sync.
 * The native undo stack can already drift out of sync because non-editing actions may be undoable without creating a
 * native editing step.
 *
 * Limitations:
 *
 * - The only way to intercept a native undo gesture is via the `beforeinput` event, which is only dispatched when the native undo stack has a step
 * to undo. `beforeInput` keeps a step available by recycling WebKit's position through the stack after each gesture, so one step anywhere in the
 * stack is enough — but until something registers that first step, the gesture is not dispatched at all.
 * - Registering an undo step needs a focused editable, so when there are none — as after undoing the creation of the only remaining thought — no
 * further undo step is registered. The next gesture that does reach `beforeInput` anchors a fresh step itself, so undo gestures resume once a
 * thought is focused again. Redo is unaffected: `device/nativeHistory.ts` registers its redo step on a hidden editing host
 * that always exists.
 */
const registerNativeUndoStep = (html: string): void => {
  if (!isTouch || !isSafari()) return
  editableSyncStore.update({ suppressChange: true })
  document.execCommand('insertHTML', false, html)
  editableSyncStore.update({ suppressChange: false })
}

/** Action-creator for formatSelection. Reads the browser selection, which the reducer cannot read, and keeps the live
 * editable in step with the formatted value (#4275, #4637).
 */
export const formatSelectionActionCreator =
  (command: FormatCommand, color?: ColorToken): Thunk =>
  (dispatch, getState) => {
    const state = getState()

    // Multicursor: the reducer colors every selected thought, and there is no browser selection to read.
    if (hasMulticursor(state) && (command === 'foreColor' || command === 'backColor')) {
      dispatch({ type: 'formatSelection', command, color, undoLabel: 'textColor' })

      // The edits change neither the cursor nor the multicursors, so updateUrlHistoryMiddleware does not detect them,
      // and a held format changes no thought value at all. Update the command state directly, otherwise the swatch of
      // the color that was just applied would not be selected and tapping it again would not toggle the color off.
      updateCommandState(getState())

      return
    }

    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return

    const contentEditable = document.querySelector(
      state.noteFocus
        ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
        : `[aria-label="editable-${thought.id}"]`,
    ) as HTMLElement | null
    if (!contentEditable) return

    const value = state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value

    // An empty thought has no selection to read, and the reducer holds the formatting rather than changing the value.
    if (value.length === 0) {
      dispatch({ type: 'formatSelection', command, color })
      updateCommandState(getState())
      return
    }

    // Compute the plain-text character offsets [start, end) of the selection relative to the editable.
    const plainLength = contentEditable.textContent?.length ?? 0
    const offsets = selection.offsetRange(contentEditable)
    const start = offsets?.start ?? 0
    const end = offsets?.end ?? plainLength

    // Treat a collapsed caret or a full selection as formatting the whole thought.
    const whole = start === end || end - start === plainLength
    const range = whole ? undefined : { start, end }

    // The live editable has to be updated before the dispatch re-renders it, so the formatted value is computed here as
    // well as in the reducer.
    const newValue = formatSelectionHtml(value, {
      ...range,
      ...formatOptions(state, { command, color, note: state.noteFocus }),
    })
    if (newValue === value) return

    // Capture the caret's plain-text offset within the note before overwriting its value. Overwriting
    // re-renders the note's ContentEditable, which drops the caret; restoring the offset via setNoteFocus
    // places it back where the user left off instead of jumping to the start/end of the note (#4630).
    // noteFocus is only true when the caret is on a note, so it's not necessary to check whether the keyboard is open.
    const noteOffset = state.noteFocus ? selection.offsetFromNode(contentEditable) : null

    // Only call document.execCommand when the keyboard is open and the caret is on a thought.
    // This avoids messy and buggy focus-management logic.
    if (state.isKeyboardOpen) registerNativeUndoStep(newValue)

    // Keep partial thought formatting synchronous with the live editable. Restoring the range immediately after the
    // write preserves the logical selection.
    if (range && !state.noteFocus) {
      contentEditable.innerHTML = newValue
      selection.setRange(contentEditable, range)
    }

    dispatch({
      type: 'formatSelection',
      command,
      color,
      range,
      cursorOffset: offsets?.end,
      noteOffset,
    })

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (range || !state.isKeyboardOpen) updateCommandState(getState())
  }

export default _.curryRight(formatSelection)

// Register this action's metadata
registerActionMetadata('formatSelection', {
  undoable: true,
  isNavigation: false,
})
