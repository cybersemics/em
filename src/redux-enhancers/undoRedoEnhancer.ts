import { Operation, applyPatch, compare } from 'fast-json-patch'
import { produce } from 'immer'
import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator, UnknownAction } from 'redux'
import ActionType from '../@types/ActionType'
import Index from '../@types/IndexType'
import Patch, { CommandAttributedAction } from '../@types/Patch'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import * as commands from '../actions'
import { editThoughtPayload } from '../actions/editThought'
import editableRender from '../actions/editableRender'
import { CACHED_SETTINGS, EM_TOKEN } from '../constants'
import db, { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import contextToThoughtId from '../selectors/contextToThoughtId'
import expandThoughts from '../selectors/expandThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import { isNavigation, isUndoable } from '../util/actionMetadata.registry'
import debugLog from '../util/debugLog'
import getUndoStepCount from '../util/getUndoStepCount'
import headValue from '../util/headValue'
import isAttribute from '../util/isAttribute'
import reducerFlow from '../util/reducerFlow'
import storage from '../util/storage'
import stripTags from '../util/stripTags'

/** Refreshes the read-only document view after a complete command and before recording its history. */
const projectThoughts = (state: State, transaction?: ThoughtspaceTransaction): State => {
  const thoughts = transaction?.project(state.thoughts) ?? db.project(state.thoughts)
  if (thoughts === state.thoughts) return state
  const projected = { ...state, thoughts }
  return { ...projected, expanded: expandThoughts(projected, projected.cursor) }
}

/** Caches first-paint settings only after a document transaction succeeds. */
const cacheSettings = (state: State, previous: State) => {
  if (state.thoughts === previous.thoughts) return
  for (const name of CACHED_SETTINGS) {
    const settingsId = contextToThoughtId(state, [EM_TOKEN, 'Settings', name])
    const setting = getChildrenRanked(state, settingsId).find(child => !isAttribute(child.value))
    const previousSettingsId = contextToThoughtId(previous, [EM_TOKEN, 'Settings', name])
    const previousSetting = getChildrenRanked(previous, previousSettingsId).find(child => !isAttribute(child.value))
    if (setting?.value === previousSetting?.value) continue
    if (setting?.value) storage.setItem(`Settings/${name}`, setting.value)
    else storage.removeItem(`Settings/${name}`)
  }
}

/** Track a stream of editThought actions so that they can be merged,
 * allowing edits to be treated as a single undo/redo step when they involve adding new characters or else removing old characters. */
enum EditThoughtDirection {
  None = 'None',
  Longer = 'Longer',
  Shorter = 'Shorter',
}

/** Interface for the setIsMulticursorExecuting action. */
interface SetIsMulticursorExecutingAction extends Action<'setIsMulticursorExecuting'> {
  value: boolean
  undoLabel?: string
}

/** Type guard to check if an action is a setIsMulticursorExecuting action. */
function isSetIsMulticursorExecutingAction(action: Action<string>): action is SetIsMulticursorExecutingAction {
  return action.type === 'setIsMulticursorExecuting'
}

/** Type guard for editThought action. */
function isEditThoughtAction(action: UnknownAction): action is UnknownAction & editThoughtPayload {
  return action.type === 'editThought'
}

/** Returns true when a restored note offset is being cleared after the caret has been placed. */
function isClearNoteOffsetAction(action: UnknownAction): boolean {
  return action.type === 'setNoteFocus' && action.value === true && action.offset === null
}

/** Gets plain text from html. */
function getTextContent(value: string): string {
  const element = document.createElement('div')
  element.innerHTML = value
  return element.textContent || ''
}

/** Infers the note caret offset before an edit from its post-edit offset and plain-text length delta. */
function getNoteOffsetBeforeEdit(action: UnknownAction): number | null {
  if (!isEditThoughtAction(action) || action.noteOffset == null) return null

  const oldTextLength = getTextContent(action.oldValue).length
  const newTextLength = getTextContent(action.newValue).length
  const noteOffsetBeforeEdit = action.noteOffset + oldTextLength - newTextLength

  return Math.max(0, Math.min(oldTextLength, noteOffsetBeforeEdit))
}

/** Compare the text contents of the old and new values to determine the direction of the edit.
 * Returns None if the action is not an editThought action or if the text content length is the same.
 * Formatting edits (bold, italic, color) and case changes (HELLO → hello) preserve text length and return None.
 * Edits marked preventMerge likewise return None, so a programmatic edit such as a generated thought is never
 * merged with the user's typing stream on either side.
 */
function getEditThoughtDirection(action: UnknownAction): EditThoughtDirection {
  if (!isEditThoughtAction(action) || action.preventMerge) return EditThoughtDirection.None

  const oldText = getTextContent(action.oldValue)
  const newText = getTextContent(action.newValue)

  return newText.length === oldText.length
    ? EditThoughtDirection.None
    : newText.length > oldText.length
      ? EditThoughtDirection.Longer
      : EditThoughtDirection.Shorter
}

/** Properties that are ignored when generating state patches.
 * The editableNonce is a transient re-render trigger (incremented by editableRender and by force edits), not real state.
 * It must be excluded from patches, otherwise undoing a force edit reverts the nonce and editableRender re-increments
 * it to the same value, resulting in no net change. The ContentEditable then fails to update its innerHTML while
 * editing (allowInnerHTMLChange is false), so undoing a formatting/letter-case edit appears to do nothing.
 * The isKeyboardOpen flag is likewise device state, not document state: it reflects whether the virtual keyboard is
 * currently up. Actions that open it as a side effect (newThought, setCursor) would otherwise record the transition in
 * their patch, so undoing them silently closes edit mode. That desyncs the flag from the real keyboard mid-reducer and
 * drives the dismissal machinery (clearSelection -> selection.clear -> Keyboard.hide), which then fights the next
 * thought's attempt to raise the keyboard (#4692). Undo/redo must never move the keyboard; only the blur and
 * dismissKeyboard paths may.
 * The selectionOffsets snapshot is likewise device state: it records where the browser selection was before a UI took
 * the focus, so restoring the one that happened to be current when an action was undone would resurrect a selection
 * the user has long since moved on from. */
const statePropertiesToOmit: (keyof State)[] = [
  'alert',
  'cursorCleared',
  'editableNonce',
  'isKeyboardOpen',
  'selectionOffsets',
]

/** Computes UI restoration and diagnostic document diffs, never recursively recording the history itself. */
const diffState = <T>(newValue: Index<T>, value: Index<T>): Operation[] => [
  ...compare(
    _.omit(newValue, [...statePropertiesToOmit, 'undoPatches', 'redoPatches', 'cursor']),
    _.omit(value, [...statePropertiesToOmit, 'undoPatches', 'redoPatches', 'cursor']),
  ),
  // Incoming deletion can shorten or clear the cursor without changing history. Restore its captured value atomically,
  // not with relative array operations that assume the pre-publication path still exists.
  ...(_.isEqual(newValue.cursor, value.cursor)
    ? []
    : [{ op: 'replace' as const, path: '/cursor', value: value.cursor }]),
]

/** Actions that mutate state.multicursors. They are not undoable on their own, but belong to an executing multicursor command's history. */
const multicursorActionTypes: Set<ActionType> = new Set(['addMulticursor', 'clearMulticursors', 'removeMulticursor'])

/** Reverts an engine receipt and UI state, returning the fresh receipt and actual diff for the opposite history stack. */
const revertPatch = (
  state: State,
  patch: Patch,
  transaction?: ThoughtspaceTransaction,
): { state: State; patch: Patch } => {
  if (patch.documentOperationIds.length && !transaction) {
    throw new Error('Restoring document history requires a thoughtspace transaction')
  }
  const documentOperationIds = patch.documentOperationIds.length ? transaction!.revert(patch.documentOperationIds) : []
  const uiState = produce(
    state,
    draft =>
      applyPatch(
        draft,
        patch.ops.filter(op => op.path !== '/thoughts' && !op.path.startsWith('/thoughts/')),
      ).newDocument,
  )
  const projected = projectThoughts(uiState, transaction)
  // These three fields belong to the editor even though they live beside canonical thought fields.
  // Restore them only on nodes the engine currently exposes; a stale history path must not resurrect a remote deletion.
  const withOverlays = produce(projected, draft => {
    patch.ops.forEach(op => {
      const match = op.path.match(/^\/thoughts\/thoughtIndex\/([^/]+)(?:\/(generating|displayValue|splitSource))?$/)
      if (!match) return
      const thought = draft.thoughts.thoughtIndex[match[1]]
      if (!thought) return
      const fields = match[2] ? [match[2]] : ['generating', 'displayValue', 'splitSource']
      fields.forEach(field => {
        const value = 'value' in op ? (match[2] ? op.value : op.value?.[field]) : undefined
        if (value === undefined) delete (thought as Index)[field]
        else (thought as Index)[field] = value
      })
    })
  })
  const newState = projectThoughts(withOverlays, transaction)
  return {
    state: newState,
    patch: {
      ops: diffState(newState as Index, state),
      metadata: patch.metadata,
      documentOperationIds,
    },
  }
}

/** Reverts one history entry, transferring its actual UI changes and fresh engine receipt to the opposite stack. */
const revertHistoryEntry = (
  state: State,
  { from, transaction }: { from: 'undoPatches' | 'redoPatches'; transaction?: ThoughtspaceTransaction },
): State => {
  const to = from === 'undoPatches' ? 'redoPatches' : 'undoPatches'
  const entry = state[from].at(-1)
  if (!entry) return state
  const { state: newState, patch } = revertPatch(state, entry, transaction)
  return {
    ...newState,
    [from]: state[from].slice(0, -1),
    // A UI patch already reverted by a non-undoable action (e.g. Note) must not leave an endless no-op history step.
    [to]: patch.ops.length || patch.documentOperationIds.length ? [...state[to], patch] : state[to],
    cursorCleared: false,
    lastUndoableActionType: entry.metadata.actionTypes[0],
  }
}

/** Moves the caret to the end of the cursor thought. Undo/redo otherwise restores the cursorOffset captured before the undone action, which can be anywhere in the thought (the tap position on iOS, or 0), leaving the caret away from the word that was just restored. */
const cursorOffsetAtEnd = (state: State): State => ({
  ...state,
  cursorOffset: state.cursor ? stripTags(headValue(state, state.cursor) ?? '').length : null,
})

/**
 * Undoes one step of the undo history, which spans two patches when a navigation action follows an undoable action or an edit follows a newThought. With count, reverts exactly that many patches instead. The undo slider passes a count so that it can move through the history by whole steps in either direction (see selectors/undoSteps, which mirrors the grouping below).
 */
const undoReducer = (
  state: State,
  undoPatches: Patch[],
  { cursorAtEnd, count }: { cursorAtEnd?: boolean; count?: number } = {},
  transaction?: ThoughtspaceTransaction,
): State => {
  const lastUndoPatch = undoPatches.at(-1)
  const penultimateUndoPatch = undoPatches.at(-2)
  if (!undoPatches.length) return state

  // Infer whether the last patch is a formatting-only edit by examining the diff operations.
  // A formatting patch changes a thought's value without changing its plain text content.
  // This is detected by finding an operation that restores a thoughtIndex value where
  // stripTags(restored_value) === stripTags(current_value) — same plain text, different HTML.
  // Letter case changes (e.g. "hello" → "HELLO") are also treated as formatting since they do not
  // add or remove content, only change its presentation.
  const lastPatchIsFormatting = !!lastUndoPatch?.ops.some(op => {
    const match = op.path.match(/^\/thoughts\/thoughtIndex\/([^/]+)\/value$/)
    if (!match) return false
    const id = match[1]
    const currentValue = state.thoughts.thoughtIndex[id]?.value
    if (currentValue === undefined || !('value' in op) || op.value === undefined) return false
    const restoredPlain = stripTags(op.value as string)
    const currentPlain = stripTags(currentValue)
    return restoredPlain === currentPlain || restoredPlain.toLowerCase() === currentPlain.toLowerCase()
  })

  const undoCount =
    count ?? getUndoStepCount(lastUndoPatch, penultimateUndoPatch, { isFormatting: lastPatchIsFormatting })

  // Capture the current cursor offset before applying the undo patch.
  // When undoing a formatting-only edit, preserve this offset
  // so the caret stays where it was at the time of undo, instead of jumping to
  // the pre-formatting position that was stored in the patch.
  const priorCursorOffset = state.cursorOffset

  return reducerFlow([
    ...Array.from(
      { length: undoCount },
      () => (s: State) => revertHistoryEntry(s, { from: 'undoPatches', transaction }),
    ),
    undoCount === 1 && lastPatchIsFormatting ? (s: State) => ({ ...s, cursorOffset: priorCursorOffset }) : null,
    cursorAtEnd ? cursorOffsetAtEnd : null,
    editableRender,
  ])(state)
}

/**
 * Redoes one step of the redo history, which spans two patches when the next patch is a navigation action or a newThought. With count, restores exactly that many patches instead (see undoReducer).
 */
const redoReducer = (
  state: State,
  redoPatches: Patch[],
  { cursorAtEnd, count }: { cursorAtEnd?: boolean; count?: number } = {},
  transaction?: ThoughtspaceTransaction,
): State => {
  const lastRedoPatch = redoPatches.at(-1)
  if (!redoPatches.length) return state

  const redoCount = count ?? getUndoStepCount(lastRedoPatch, redoPatches.at(-2), { direction: 'redo' })

  return reducerFlow([
    ...Array.from(
      { length: redoCount },
      () => (s: State) => revertHistoryEntry(s, { from: 'redoPatches', transaction }),
    ),
    cursorAtEnd ? cursorOffsetAtEnd : null,
    editableRender,
  ])(state)
}

/**
 * Executes commands and history outside Redux, which only receives immutable prepared snapshots.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const undoRedoReducerEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(
    // Redux's enhancer signature accepts arbitrary state types; this app enhancer only receives State.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reducer: (state: any, action: A, transaction?: ThoughtspaceTransaction) => any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialState: any,
  ): Store<State, A> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastAction: Action<any> | undefined

    /** Longer if the last edit was an addition of characters, Shorter if a deletion of characters. Undo steps of contiguous edits in the same direction are combined (e.g. "one" -> "one two" -> "one two three"); Undo steps of continiguous edits in the opposite direction are not combined (e.g. "hello world" -> "hello" -> "hello universe"). */
    let lastEditThoughtDirection = EditThoughtDirection.None

    /**
     * Reducer to handle undo/redo actions and add/merge inverse-redoPatches for other actions.
     */
    const execute = (
      state: State | undefined = initialState,
      action: A,
      transaction?: ThoughtspaceTransaction,
    ): State => {
      if (!state) return reducer(initialState, action)
      const { redoPatches, undoPatches } = state as State
      const actionType = action.type
      const commandMetadata = (action as A & CommandAttributedAction).commandMetadata

      // Incoming publication is not history and must not merge a later edit with a pre-publication diagnostic diff.
      if (actionType === 'clear' || actionType === 'replaceThoughts') {
        lastAction = undefined
        lastEditThoughtDirection = EditThoughtDirection.None
        return projectThoughts(reducer(state, action, transaction), transaction)
      }

      // Handle undo and redo.
      // They are defined in the redux enhancer rather than in /actions.
      if (actionType === 'undo' || actionType === 'redo') {
        // Reset the edit-direction tracking so the next action after an undo/redo does not
        // accidentally merge with whatever patch happens to be at the top of the stack.
        lastAction = undefined
        lastEditThoughtDirection = EditThoughtDirection.None

        // Native undo/redo (iOS three-finger swipe, shake-to-undo) sets cursorAtEnd to place the caret at the end of the restored thought.
        const cursorAtEnd = !!(action as UnknownAction).cursorAtEnd
        // The undo slider passes the exact number of patches to revert or restore.
        const count = (action as UnknownAction).count as number | undefined

        const undoOrRedoState =
          actionType === 'undo'
            ? undoReducer(state, undoPatches, { cursorAtEnd, count }, transaction)
            : redoReducer(state, redoPatches, { cursorAtEnd, count }, transaction)

        // do not omit editableNonce because editableRender bumps it to force ContentEditable to re-render after undo/redo
        const omitted = _.pick(
          state,
          statePropertiesToOmit.filter(k => k !== 'editableNonce'),
        )

        return projectThoughts({ ...undoOrRedoState, ...omitted }, transaction)
      }

      // otherwise run the normal reducer for the action
      const newState = projectThoughts(reducer(state, action, transaction), transaction)
      const documentOperationIds = transaction?.operationIds ?? []

      if (
        // bail if state has not changed
        (state === newState && !documentOperationIds.length) ||
        // Clearing a one-shot note offset after restoring the caret is ephemeral. Recording it as a navigation
        // action would clear the redo stack immediately after undo.
        isClearNoteOffsetAction(action) ||
        // bail if the action is not undoable.
        // Exception: multicursor actions dispatched while a multicursor command is executing belong to the command's
        // single undo entry, e.g. the addMulticursor calls that restore the multiselect at the end of
        // executeCommandWithMulticursor. Skipping them would bake their changes into the merge baseline reconstructed
        // below, so undo would restore the original multiselect without removing the restored one, leaving both
        // selected (#4728). Other non-undoable actions are still skipped so that transient ui state (e.g. the
        // Command Center opened by the multicursor alert middleware) is not restored by undo.
        (!isUndoable(actionType) && !(state.isMulticursorExecuting && multicursorActionTypes.has(actionType))) ||
        // ignore the first importText since it is part of app initialization and should not be undoable
        // otherwise the edit merge logic below will create an undo patch with an invalid lexemeIndex/000
        // See: https://github.com/cybersemics/em/issues/1494
        (actionType === 'importText' && !newState.undoPatches.length)
      ) {
        return newState
      }

      // Determine if an edit is an addition or a deletion.
      // Formatting edits (bold, italic, color) and case changes preserve text length and return None, so they never merge with content edits.
      const editThoughtDirection = getEditThoughtDirection(action)

      const shouldMergeWithLastEditThought =
        editThoughtDirection !== EditThoughtDirection.None && editThoughtDirection === lastEditThoughtDirection

      // Some actions are merged together into a single undo/redo patch.
      // - Navigation actions are merged with the previous non-navigation action. This matches the behavior of most word processors where undo will revert the last destructive action, and the cursor will be restored to where it was before. For example, if the user edits 'a' to 'aa', moves the cursor to 'b', and then undoes, the cursor will be restored to 'aa' then the edit will be undone.
      // - Contiguous edits in the same direction are merged into a single edit action. For example, if the user edits 'a' to 'ab' and then 'ab' to 'abc', the undo will revert to 'a' in one step. Formatting edits (None direction) are never merged with any other edits — each formatting change (bold, italic, color) gets its own separate undo step. Edits marked preventMerge (e.g. a generated thought) are likewise never merged on either side.
      // - The closeAlert action is merged with the previous action so that the alert can be undone.
      // - All actions within an explicit command transaction are merged under that command's metadata.
      // - Direct action batches guarded by isMulticursorExecuting are merged into one action patch.
      const lastUndoPatch = state.undoPatches.at(-1)
      // A resumed invocation may extend its latest patch, but never reach back across another edit or undo/redo.
      // Its identity survives await; only contiguous history is eligible for merging.
      const continuesCommand =
        !!lastAction &&
        commandMetadata &&
        lastUndoPatch?.metadata.source === 'command' &&
        lastUndoPatch.metadata.invocationId === commandMetadata.invocationId
      const shouldMerge = commandMetadata
        ? continuesCommand ||
          state.isMulticursorExecuting ||
          (isNavigation(actionType) && isNavigation(lastAction?.type))
        : (isNavigation(actionType) && isNavigation(lastAction?.type)) ||
          shouldMergeWithLastEditThought ||
          actionType === 'closeAlert' ||
          state.isMulticursorExecuting ||
          (lastAction as UnknownAction)?.mergeNext

      if (shouldMerge) {
        lastAction = action
        let lastState = state
        if (lastUndoPatch && lastUndoPatch.ops.length > 0) {
          // Add a try-catch to provide better error messaging if a patch fails.
          // The patch should always be valid, i.e. the necessary structure is in the state to apply the patch.
          // However, because non-undoable actions are skipped, it is possible that the state has shifted and the patch is no longer valid.
          // If a patch is invalid, all prior undo states will be inaccessible, so we should try to identify and fix this whenever it occurs.
          try {
            lastState = produce(state, (state: State) => applyPatch(state, lastUndoPatch.ops).newDocument)
          } catch (e) {
            if (!(e instanceof Error)) throw e
            console.error(e.message, { state, lastUndoPatch })
            throw new Error('Error applying patch')
          }
        }
        const combinedUndoPatch = diffState(newState as Index, lastState)
        const combinedOperationIds = [...(lastUndoPatch?.documentOperationIds ?? []), ...documentOperationIds]

        const actionTypes: [ActionType, ...ActionType[]] = lastUndoPatch
          ? lastUndoPatch.metadata.actionTypes.includes(actionType)
            ? lastUndoPatch.metadata.actionTypes
            : [...lastUndoPatch.metadata.actionTypes, actionType]
          : [actionType]

        return {
          ...newState,
          lastUndoableActionType: actionType,
          // Drop UI-only groups that net to no change, but retain engine receipts even without a projection diff.
          undoPatches: [
            ...newState.undoPatches.slice(0, -1),
            ...(combinedUndoPatch.length || combinedOperationIds.length
              ? [
                  {
                    ops: combinedUndoPatch,
                    documentOperationIds: combinedOperationIds,
                    metadata: {
                      ...(commandMetadata ?? lastUndoPatch?.metadata ?? { source: 'action' as const }),
                      actionTypes,
                      isNavigation: lastUndoPatch
                        ? lastUndoPatch.metadata.isNavigation && isNavigation(actionType)
                        : isNavigation(actionType),
                    },
                  },
                ]
              : []),
          ],
        }
      }

      lastAction = action
      lastEditThoughtDirection = editThoughtDirection

      // add a new undo patch
      // Note focus intentionally does not dispatch on every caret movement. For the first note edit after focus,
      // infer the pre-edit caret so the inverse patch can restore it instead of leaving the caret at the end.
      const noteOffsetBeforeEdit = getNoteOffsetBeforeEdit(action)
      const stateBeforeAction = noteOffsetBeforeEdit == null ? state : { ...state, noteOffset: noteOffsetBeforeEdit }
      const undoPatch = diffState(newState as Index, stateBeforeAction)
      return undoPatch.length || documentOperationIds.length
        ? {
            ...newState,
            lastUndoableActionType: actionType,
            redoPatches: [],
            undoPatches: [
              ...newState.undoPatches,
              {
                ops: undoPatch,
                metadata: {
                  ...(commandMetadata ?? {
                    source: 'action',
                    ...(isSetIsMulticursorExecutingAction(action) && action.undoLabel
                      ? { label: action.undoLabel }
                      : null),
                  }),
                  actionTypes: [actionType],
                  isNavigation: isNavigation(actionType),
                },
                documentOperationIds,
              },
            ],
          }
        : newState
    }

    const preparedState = Symbol('prepared editor state')
    type PreparedAction = A & { [preparedState]?: State }
    const store = createStore((state: State | undefined, action: PreparedAction) => {
      if (preparedState in action) return action[preparedState]!
      // Redux initialization is pure; all ordinary action evaluation happens in dispatch below.
      return state ?? reducer(undefined, action)
    }, initialState)

    return {
      ...store,
      dispatch: <T extends A>(action: T): T => {
        const state = store.getState()
        const previousAction = lastAction
        const previousEditDirection = lastEditThoughtDirection
        const handler = (commands as Index<{ requiresDocument?: boolean }>)[action.type]
        const needsDocument = handler?.requiresDocument || action.type === 'undo' || action.type === 'redo'
        try {
          const result =
            needsDocument && thoughtspaceRuntime.ready
              ? db.transact(transaction => execute(state, action, transaction))
              : undefined
          const next = result ? result.value : execute(state, action)
          // The document is already committed. A best-effort first-paint cache must never prevent publication.
          try {
            cacheSettings(next, state)
          } catch (error) {
            console.warn('Unable to cache first-paint settings', error)
          }
          if (result && next.thoughts !== state.thoughts) {
            debugLog.log('push', { thoughtCount: Object.keys(next.thoughts.thoughtIndex).length })
            void result.persisted
              .then(() => debugLog.log('pushSynced'))
              .catch(error => {
                console.error('Thoughtspace persistence failed', error)
                debugLog.log('pushError', { error: String(error) })
              })
          }
          store.dispatch(Object.assign({}, action, { [preparedState]: next }))
          return action
        } catch (error) {
          lastAction = previousAction
          lastEditThoughtDirection = previousEditDirection
          throw error
        }
      },
    }
  }

export default undoRedoReducerEnhancer
