import { Operation, applyPatch, compare } from 'fast-json-patch'
import { produce } from 'immer'
import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator, UnknownAction } from 'redux'
import ActionType from '../@types/ActionType'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Patch, { CommandPatchMetadata, PatchMetadataInput } from '../@types/Patch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { editThoughtPayload } from '../actions/editThought'
import editableRender from '../actions/editableRender'
import updateThoughts from '../actions/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import { isNavigation, isUndoable } from '../util/actionMetadata.registry'
import equalArrays from '../util/equalArrays'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'
import stripTags from '../util/stripTags'
import { registerCommandMetadataStore } from './commandMetadata'

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
  'pushQueue',
  'selectionOffsets',
]

/** Reconstructs TreeCRDT move updates and placement metadata from the final state produced by an undo/redo patch. */
const restoreMoveUpdatesFromThoughtUpdates = (
  state: State,
  oldState: State,
  thoughtIndexUpdates: Index<Thought | null>,
): {
  thoughtIndexUpdates: Index<Thought | null>
  movePlacements: Index<ThoughtId | null>
} => {
  const touchedParentIds = Object.entries(thoughtIndexUpdates).reduce<Set<ThoughtId>>((acc, [id, thought]) => {
    const thoughtId = id as ThoughtId
    if (!thought) return acc

    const oldThought = getThoughtById(oldState, thoughtId)
    const moved = oldThought && (oldThought.parentId !== thought.parentId || oldThought.rank !== thought.rank)
    if (!moved) return acc

    acc.add(oldThought.parentId)
    acc.add(thought.parentId)
    return acc
  }, new Set())

  const { thoughtIndexUpdates: moveThoughtIndexUpdates, movePlacements } = [...touchedParentIds].reduce<{
    thoughtIndexUpdates: Index<Thought | null>
    movePlacements: Index<ThoughtId | null>
  }>(
    (acc, parentId) => {
      const oldChildren = getChildrenRanked(oldState, parentId).map(child => child.id)
      const children = getChildrenRanked(state, parentId)
      const childIds = children.map(child => child.id)
      if (equalArrays(oldChildren, childIds)) return acc

      children.forEach((child, i) => {
        const childThought = getThoughtById(state, child.id)
        if (!childThought) return

        acc.thoughtIndexUpdates[child.id] = childThought
        acc.movePlacements[child.id] = i === 0 ? null : childIds[i - 1]
      })

      return acc
    },
    { thoughtIndexUpdates: {}, movePlacements: {} },
  )

  const moveThoughtIds = new Set(Object.keys(movePlacements))
  const nonMoveThoughtIndexUpdates = Object.entries(thoughtIndexUpdates).reduce<Index<Thought | null>>(
    (acc, [id, thought]) => (moveThoughtIds.has(id) ? acc : { ...acc, [id]: thought }),
    {},
  )

  return {
    thoughtIndexUpdates: {
      ...nonMoveThoughtIndexUpdates,
      ...moveThoughtIndexUpdates,
    },
    movePlacements,
  }
}

/**
 * Manually recreate the pushQueue for thought and thought index updates from patches.
 */
const restorePushQueueFromPatches = (state: State, oldState: State, ops: Operation[]) => {
  const lexemeIndexChanges = ops.filter(p => p?.path.startsWith('/thoughts/lexemeIndex/'))
  const thoughtIndexChanges = ops.filter(p => p?.path.startsWith('/thoughts/thoughtIndex/'))

  const lexemeIndexUpdates = lexemeIndexChanges.reduce<Index<Lexeme | null>>((acc, { path }) => {
    const lexemeKey = path.slice('/thoughts/lexemeIndex/'.length).split('/')[0]
    return {
      ...acc,
      // Patch paths may target nested lexeme properties such as contexts. Persist the full lexeme.
      [lexemeKey]: state.thoughts.lexemeIndex[lexemeKey] || null,
    }
  }, {})
  const thoughtIndexUpdates = thoughtIndexChanges.reduce<Index<Thought | null>>((acc, { path }) => {
    const id = path.slice('/thoughts/thoughtIndex/'.length).split('/')[0]
    return {
      ...acc,
      [id]: getThoughtById(state, id as ThoughtId) || null,
    }
  }, {})

  /*
    Note: Computed thoughtIndexUpdates and contextIndexUpdates will take store to the identical state
    after patches are applied by undo or redo handler. This is done to create push batches using updateThoughts generates.

    However we also need to update the state like cursor that depends on the new thought indices changes. Else
    logic depending on those states will break.
  */
  const oldStateWithUpdatedCursor = {
    ...oldState,
    cursor: state.cursor,
    editingValue: state.cursor ? headValue(state, state.cursor) : null,
  }
  const moveUpdates = restoreMoveUpdatesFromThoughtUpdates(state, oldState, thoughtIndexUpdates)

  return {
    ...state,
    pushQueue: updateThoughts({
      lexemeIndexUpdates,
      thoughtIndexUpdates: moveUpdates.thoughtIndexUpdates,
      ...(Object.keys(moveUpdates.movePlacements).length > 0 ? { movePlacements: moveUpdates.movePlacements } : null),
    })(oldStateWithUpdatedCursor).pushQueue,
  }
}

/**
 * Returns the diff between two states as a fast-json-patch Patch that can be applied for undo/redo functionality. Ignores ephemeral state properties such as alert which should not be recreated (defined in statePropertiesToOmit).
 */
const diffState = <T>(newValue: Index<T>, value: Index<T>): Operation[] =>
  compare(_.omit(newValue, statePropertiesToOmit), _.omit(value, statePropertiesToOmit))

/**
 * Creates a patch with user-level metadata stored once, independently of its operations.
 */
const createPatch = (ops: Operation[], metadata: PatchMetadataInput, actionType: ActionType): Patch => ({
  ops,
  metadata: {
    ...metadata,
    isNavigation: isNavigation(actionType),
  } as Patch['metadata'],
})

/**
 * Gets the first action from a patch.
 */
const getPatchAction = (patch: Patch): string =>
  patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType

/** Returns true when a patch represents an undoable change rather than navigation-only state. */
const isPatchUndoable = (patch: Patch | undefined): boolean => !!patch && !patch.metadata.isNavigation

/** Actions that mutate state.multicursors. They are not undoable on their own, since selecting thoughts should not be an undo step, but they must be tracked while a multicursor command is executing. See the bail condition in the enhancer. */
const multicursorActionTypes: Set<ActionType> = new Set(['addMulticursor', 'clearMulticursors', 'removeMulticursor'])

/**
 * Gets the nth item from the end of an array.
 */
const nthLast = <T>(arr: T[], n: number) => arr[arr.length - n]

/**
 * Undoes a single action. Applies the last inverse-patch to get the next state and adds a corresponding reverse-patch for the same.
 */
const undoOneReducer = (state: State): State => {
  const { redoPatches, undoPatches } = state
  const lastUndoPatch = nthLast(undoPatches, 1)
  if (!lastUndoPatch) return state
  const newState = produce(state, (state: State) => applyPatch(state, lastUndoPatch.ops).newDocument)
  const correspondingRedoPatch: Patch = {
    ops: diffState(newState as Index, state),
    metadata: lastUndoPatch.metadata,
  }
  return {
    ...newState,
    // A replay can produce no operations when a non-undoable action already wrote back the restored state. Metadata lives on
    // the patch, so the empty diff can move safely between stacks without losing its identity (#5082).
    redoPatches: [...redoPatches, correspondingRedoPatch],
    undoPatches: undoPatches.slice(0, -1),
    cursorCleared: false,
    lastUndoableActionType: getPatchAction(lastUndoPatch) as State['lastUndoableActionType'],
  }
}

/**
 * Redoes a single action. Applies the last patch to get the next state and adds a corresponding undo patch for the same.
 */
const redoOneReducer = (state: State): State => {
  const { redoPatches, undoPatches } = state
  const lastRedoPatch = nthLast(redoPatches, 1)
  if (!lastRedoPatch) return state
  const newState = produce(state, (state: State) => applyPatch(state, lastRedoPatch.ops).newDocument)
  const correspondingUndoPatch: Patch = {
    ops: diffState(newState as Index, state),
    metadata: lastRedoPatch.metadata,
  }
  return {
    ...newState,
    redoPatches: redoPatches.slice(0, -1),
    undoPatches: [...undoPatches, correspondingUndoPatch],
    cursorCleared: false,
    lastUndoableActionType: getPatchAction(lastRedoPatch) as State['lastUndoableActionType'],
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
): State => {
  const lastUndoPatch = nthLast(undoPatches, 1)
  const penultimateUndoPatch = nthLast(undoPatches, 2)
  const penultimateAction = penultimateUndoPatch && getPatchAction(penultimateUndoPatch)
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

  const undoTwice = lastUndoPatch?.metadata.isNavigation
    ? isPatchUndoable(penultimateUndoPatch)
    : penultimateAction === 'newThought' && !lastPatchIsFormatting
  const undoCount = count ?? (undoTwice ? 2 : 1)

  const poppedUndoPatches = undoPatches.slice(-undoCount)

  // Capture the current cursor offset before applying the undo patch.
  // When undoing a formatting-only edit, preserve this offset
  // so the caret stays where it was at the time of undo, instead of jumping to
  // the pre-formatting position that was stored in the patch.
  const priorCursorOffset = state.cursorOffset

  return reducerFlow([
    ...Array.from({ length: undoCount }, () => undoOneReducer),
    newState =>
      restorePushQueueFromPatches(
        newState,
        state,
        poppedUndoPatches.flatMap(patch => patch.ops),
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
): State => {
  const lastRedoPatch = nthLast(redoPatches, 1)
  if (!redoPatches.length) return state

  const redoTwice =
    !!lastRedoPatch && (lastRedoPatch.metadata.isNavigation || getPatchAction(lastRedoPatch) === 'newThought')
  const redoCount = count ?? (redoTwice ? 2 : 1)

  const poppedRedoPatches = redoPatches.slice(-redoCount)

  return reducerFlow([
    ...Array.from({ length: redoCount }, () => redoOneReducer),
    newState =>
      restorePushQueueFromPatches(
        newState,
        state,
        poppedRedoPatches.flatMap(patch => patch.ops),
      ),
    cursorAtEnd ? cursorOffsetAtEnd : null,
    editableRender,
  ])(state)
}

/**
 * Store enhancer to append the ability to undo/redo for all undoable actions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const undoRedoReducerEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastAction: Action<any> | undefined

    /** Metadata for the command currently being executed. Kept outside State so opening and closing a transaction cannot itself produce a diff. */
    let activeCommandMetadata: Omit<CommandPatchMetadata, 'isNavigation'> | null = null
    /** True once the active command has created a patch, so later actions merge into that patch rather than the previous command. */
    let activeCommandHasPatch = false

    /** Longer if the last edit was an addition of characters, Shorter if a deletion of characters. Undo steps of contiguous edits in the same direction are combined (e.g. "one" -> "one two" -> "one two three"); Undo steps of continiguous edits in the opposite direction are not combined (e.g. "hello world" -> "hello" -> "hello universe"). */
    let lastEditThoughtDirection = EditThoughtDirection.None

    /**
     * Reducer to handle undo/redo actions and add/merge inverse-redoPatches for other actions.
     */
    const undoAndRedoReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const { redoPatches, undoPatches } = state as State
      const actionType = action.type

      // Clear the last edit thought direction when the clear action is executed.
      if (actionType === 'clear') {
        lastAction = undefined
        lastEditThoughtDirection = EditThoughtDirection.None
        return reducer(state, action)
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
            ? undoReducer(state, undoPatches, { cursorAtEnd, count })
            : actionType === 'redo'
              ? redoReducer(state, redoPatches, { cursorAtEnd, count })
              : null

        // do not omit pushQueue because that includes updates added by updateThoughts
        // do not omit editableNonce because editableRender bumps it to force ContentEditable to re-render after undo/redo
        const omitted = _.pick(
          state,
          statePropertiesToOmit.filter(k => k !== 'pushQueue' && k !== 'editableNonce'),
        )

        return { ...undoOrRedoState!, ...omitted }
      }

      // otherwise run the normal reducer for the action
      const newState = reducer(state, action)

      if (
        // bail if state has not changed
        state === newState ||
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
      const shouldMerge = activeCommandMetadata
        ? activeCommandHasPatch ||
          state.isMulticursorExecuting ||
          (isNavigation(actionType) && isNavigation(lastAction?.type))
        : (isNavigation(actionType) && isNavigation(lastAction?.type)) ||
          shouldMergeWithLastEditThought ||
          actionType === 'closeAlert' ||
          state.isMulticursorExecuting ||
          (lastAction as UnknownAction)?.mergeNext

      if (shouldMerge) {
        lastAction = action
        const lastUndoPatch = nthLast(state.undoPatches, 1)
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
        if (activeCommandMetadata) activeCommandHasPatch = combinedUndoPatch.length > 0

        return {
          ...newState,
          lastUndoableActionType: activeCommandMetadata?.commandId ?? actionType,
          // Drop a merged patch when its actions net to no change, mirroring the non-merge branch's
          // `undoPatch.length` guard below. Patch metadata survives empty replay diffs, but a new no-op transaction
          // should not add history.
          undoPatches: [
            ...newState.undoPatches.slice(0, -1),
            ...(combinedUndoPatch.length
              ? [
                  {
                    ops: combinedUndoPatch,
                    metadata: activeCommandMetadata
                      ? {
                          ...activeCommandMetadata,
                          isNavigation: !!lastUndoPatch?.metadata.isNavigation && isNavigation(actionType),
                        }
                      : lastUndoPatch
                        ? {
                            ...lastUndoPatch.metadata,
                            isNavigation: lastUndoPatch.metadata.isNavigation && isNavigation(actionType),
                          }
                        : createPatch([], { source: 'action', actionType }, actionType).metadata,
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
      if (activeCommandMetadata && undoPatch.length) activeCommandHasPatch = true
      return undoPatch.length
        ? {
            ...newState,
            lastUndoableActionType: activeCommandMetadata?.commandId ?? actionType,
            redoPatches: [],
            undoPatches: [
              ...newState.undoPatches,
              createPatch(
                undoPatch,
                activeCommandMetadata ?? {
                  source: 'action',
                  actionType: lastAction.type,
                  ...(isSetIsMulticursorExecutingAction(action) && action.undoLabel
                    ? { label: action.undoLabel }
                    : null),
                },
                actionType,
              ),
            ],
          }
        : newState
    }

    const enhancedStore = createStore(undoAndRedoReducer, initialState)
    registerCommandMetadataStore(enhancedStore, value => {
      activeCommandMetadata = value
      activeCommandHasPatch = false
      // Command boundaries must not inherit or leak direct text-edit coalescing. Preserve lastAction so consecutive
      // navigation commands retain their established grouping behavior.
      lastEditThoughtDirection = EditThoughtDirection.None
    })
    return enhancedStore
  }

export default undoRedoReducerEnhancer
