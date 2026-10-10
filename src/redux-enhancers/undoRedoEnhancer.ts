import { Operation, applyPatch, compare } from 'fast-json-patch'
import { Immer, produce } from 'immer'
import _ from 'lodash'
import { Action, UnknownAction } from 'redux'
import ActionType from '../@types/ActionType'
import Patch, { CommandAttributedAction } from '../@types/Patch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import ThoughtspaceView from '../@types/ThoughtspaceView'
import { editThoughtPayload } from '../actions/editThought'
import editableRender from '../actions/editableRender'
import db from '../data-providers/thoughtspace'
import { isNavigation, isUndoable } from '../util/actionMetadata.registry'
import debugLog from '../util/debugLog'
import getUndoStepCount from '../util/getUndoStepCount'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'
import stripTags from '../util/stripTags'

// Temporary comparison baselines need copy-on-write, but are never published as editor state.
const produceHistoryBaseline = new Immer({ autoFreeze: false }).produce

/** Track a stream of editThought actions so that they can be merged,
 * allowing edits to be treated as a single undo/redo step when they involve adding new characters or else removing old characters. */
enum EditThoughtDirection {
  None = 'None',
  Longer = 'Longer',
  Shorter = 'Shorter',
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

/** Keys of State whose value is a Path or a list of Paths. */
type PathProperty = {
  [K in keyof State]-?: NonNullable<State[K]> extends Path | (Path | null)[] ? K : never
}[keyof State]

/** State properties that diffState replaces whole. A Record over PathProperty rather than a list, so that adding a Path to State without listing it here is a type error. */
const pathProperties: Record<PathProperty, true> = {
  cursor: true,
  cursorBeforeQuickAdd: true,
  cursorBeforeSearch: true,
  cursorHistory: true,
  draggedSimplePath: true,
  draggingThoughts: true,
  expandHoverDownPath: true,
  expandHoverUpPath: true,
  hoveringPath: true,
  jumpHistory: true,
  multicursorAnchor: true,
}

/** Records UI restoration and value-only formatting baselines, never diagnostic document patches. */
const diffState = (
  newValue: State,
  value: Omit<State, 'thoughts'> & { thoughts: Omit<ThoughtspaceView, 'getLexeme' | 'revision'> },
  {
    transaction,
    mergeWith,
    actionType,
  }: {
    transaction?: ThoughtspaceTransaction
    mergeWith?: Patch
    actionType?: string
  } = {},
): { ops: Operation[]; isFormatting: boolean; formattingBefore: Patch['formattingBefore'] } => {
  const mergeOps = mergeWith?.ops ?? []
  const changes = transaction?.getChanges()
  const priorValues = mergeWith?.formattingBefore ?? {}
  const ids = new Set([
    ...Object.keys(priorValues),
    ...(changes?.reset
      ? [...value.thoughts.values(), ...newValue.thoughts.values()].map(thought => thought.id)
      : (changes?.thoughtIds ?? [])),
  ])
  const formattingBefore: Patch['formattingBefore'] = {}
  let isFormatting = false
  ids.forEach(key => {
    const id = key as ThoughtId
    const before = Object.hasOwn(priorValues, id) ? priorValues[id] : (value.thoughts.getThought(id)?.value ?? null)
    const after = newValue.thoughts.getThought(id)?.value ?? null
    if (before === after) return
    formattingBefore[id] = before
    isFormatting ||=
      before !== null && after !== null && stripTags(before).toLowerCase() === stripTags(after).toLowerCase()
  })
  let previous = value
  if (mergeOps.length) {
    // Normalize UI restoration against this group's earlier state, including UI-only merge steps.
    try {
      previous = produceHistoryBaseline(previous, draft => applyPatch(draft, mergeOps).newDocument)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      console.error(error.message, { state: value, mergeWith })
      // The throw unwinds dispatch before loggerMiddleware can record the action that triggered it.
      debugLog.log('undoPatchError', {
        actionType,
        message: error.message,
        patchActionTypes: mergeWith?.metadata.actionTypes,
        opPaths: mergeOps.map(op => `${op.op} ${op.path}`),
      })
      throw new Error('Error applying patch')
    }
  }
  const omitted = [...statePropertiesToOmit, 'undoPatches', 'redoPatches', 'thoughtUi', 'thoughts']
  const ops = compare(_.omit(newValue, omitted), _.omit(previous, omitted))
  // Navigation and incoming changes may shorten or clear Paths without changing history.
  // Restore the captured value, not array operations that assume the previous path still exists.
  const pathKeys = new Set(
    ops
      .map(op => op.path.split('/'))
      .filter(segments => segments.length > 2 && segments[1] in pathProperties)
      .map(segments => segments[1] as PathProperty),
  )
  return {
    isFormatting,
    formattingBefore,
    ops: [
      ...ops.filter(op => !pathKeys.has(op.path.split('/')[1] as PathProperty)),
      ...[...pathKeys].map(key => ({ op: 'replace' as const, path: `/${key}`, value: _.cloneDeep(previous[key]) })),
      // A remote deletion may have pruned an entry since history was recorded. Restore each entry atomically.
      ...Object.keys({ ...newValue.thoughtUi, ...previous.thoughtUi }).flatMap<Operation>(id =>
        _.isEqual(newValue.thoughtUi[id], previous.thoughtUi[id])
          ? []
          : previous.thoughtUi[id]
            ? [{ op: 'add', path: `/thoughtUi/${id}`, value: previous.thoughtUi[id] }]
            : [{ op: 'remove', path: `/thoughtUi/${id}` }],
      ),
    ],
  }
}

/** Actions that mutate state.multicursors. They are not undoable on their own, but belong to an executing multicursor command's history. */
const multicursorActionTypes: Set<ActionType> = new Set(['addMulticursor', 'clearMulticursors', 'removeMulticursor'])

/** Prepares undo policy and restoration without opening transactions or publishing editor state. */
// The dispatch stream includes enhancer-only actions such as undo/redo outside the action reducer registry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const undoRedoEnhancer = <A extends Action<any>>(
  reducer: (state: State | undefined, action: A, transaction?: ThoughtspaceTransaction) => State,
  { project }: { project: (state: State, transaction?: ThoughtspaceTransaction) => State },
) => {
  let committedGrouping: { lastAction?: A; direction: EditThoughtDirection } = {
    direction: EditThoughtDirection.None,
  }

  /** Reverts an engine receipt and UI state, returning the fresh receipt and actual diff for the opposite history stack. */
  const revertPatch = (
    state: State,
    patch: Patch,
    transaction?: ThoughtspaceTransaction,
  ): { state: State; patch: Patch } => {
    if (patch.documentOperationIds.length && !transaction) {
      throw new Error('Restoring document history requires a thoughtspace transaction')
    }
    const previousThoughts = transaction?.capturePrevious() ?? state.thoughts
    const from = transaction?.operationOffset ?? db.operationOffset
    const documentOperationIds = patch.documentOperationIds.length
      ? transaction!.revert(patch.documentOperationIds)
      : []
    const uiState = produce(state, draft => applyPatch(draft, patch.ops).newDocument)
    const newState = project(uiState, transaction)
    const { ops, isFormatting, formattingBefore } = diffState(
      newState,
      { ...state, thoughts: previousThoughts },
      { transaction },
    )
    const to = transaction?.operationOffset ?? db.operationOffset
    return {
      state: newState,
      patch: {
        ops,
        formattingBefore,
        documentHistory: from === to ? [] : [{ from, to }],
        metadata: { ...patch.metadata, isFormatting },
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

    const lastPatchIsFormatting = !!lastUndoPatch?.metadata.isFormatting

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

  /** Applies undo/redo or records the command's result under the current grouping policy. */
  const execute = (
    state: State,
    action: A,
    { transaction, grouping }: { transaction?: ThoughtspaceTransaction; grouping: typeof committedGrouping },
  ): State => {
    const { redoPatches, undoPatches } = state
    const actionType = action.type
    const commandMetadata = (action as A & CommandAttributedAction).commandMetadata

    // Incoming publication is not history and must not merge a later edit with a pre-publication diagnostic diff.
    if (actionType === 'clear' || actionType === 'replaceThoughts') {
      grouping.lastAction = undefined
      grouping.direction = EditThoughtDirection.None
      return project(reducer(state, action, transaction), transaction)
    }

    // Handle undo and redo.
    // Restoration belongs to history policy rather than the action reducers.
    if (actionType === 'undo' || actionType === 'redo') {
      // Reset the edit-direction tracking so the next action after an undo/redo does not
      // accidentally merge with whatever patch happens to be at the top of the stack.
      grouping.lastAction = undefined
      grouping.direction = EditThoughtDirection.None

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

      return project({ ...undoOrRedoState, ...omitted }, transaction)
    }

    // otherwise run the normal reducer for the action
    const previousThoughts = transaction?.capturePrevious() ?? state.thoughts
    const from = transaction?.operationOffset ?? db.operationOffset
    const newState = project(reducer(state, action, transaction), transaction)
    const to = transaction?.operationOffset ?? db.operationOffset
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
      (actionType === 'importText' && !newState.undoPatches.length)
    ) {
      return newState
    }

    // Determine if an edit is an addition or a deletion.
    // Formatting edits (bold, italic, color) and case changes preserve text length and return None, so they never merge with content edits.
    const editThoughtDirection = getEditThoughtDirection(action)

    const shouldMergeWithLastEditThought =
      editThoughtDirection !== EditThoughtDirection.None && editThoughtDirection === grouping.direction

    // Some actions are merged together into a single undo/redo patch.
    // - Navigation actions are merged with the previous non-navigation action. This matches the behavior of most word processors where undo will revert the last destructive action, and the cursor will be restored to where it was before. For example, if the user edits 'a' to 'aa', moves the cursor to 'b', and then undoes, the cursor will be restored to 'aa' then the edit will be undone.
    // - Contiguous edits in the same direction are merged into a single edit action. For example, if the user edits 'a' to 'ab' and then 'ab' to 'abc', the undo will revert to 'a' in one step. Formatting edits (None direction) are never merged with any other edits — each formatting change (bold, italic, color) gets its own separate undo step. Edits marked preventMerge (e.g. a generated thought) are likewise never merged on either side.
    // - All actions within an explicit command transaction are merged under that command's metadata.
    // - Direct action batches guarded by isMulticursorExecuting are merged into one action patch.
    const lastUndoPatch = state.undoPatches.at(-1)
    // A resumed invocation may extend its latest patch, but never reach back across another edit or undo/redo.
    // Its identity survives await; only contiguous history is eligible for merging.
    const continuesCommand =
      !!grouping.lastAction &&
      commandMetadata &&
      lastUndoPatch?.metadata.source === 'command' &&
      lastUndoPatch.metadata.invocationId === commandMetadata.invocationId
    const shouldMerge = commandMetadata
      ? continuesCommand ||
        state.isMulticursorExecuting ||
        (isNavigation(actionType) && isNavigation(grouping.lastAction?.type))
      : (isNavigation(actionType) && isNavigation(grouping.lastAction?.type)) ||
        shouldMergeWithLastEditThought ||
        state.isMulticursorExecuting ||
        (grouping.lastAction as UnknownAction)?.mergeNext

    if (shouldMerge) {
      grouping.lastAction = action
      const {
        ops: combinedUndoPatch,
        isFormatting,
        formattingBefore,
      } = diffState(
        newState,
        { ...state, thoughts: previousThoughts },
        {
          transaction,
          mergeWith: lastUndoPatch,
          actionType,
        },
      )
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
                  formattingBefore,
                  documentHistory: [
                    ...(lastUndoPatch?.documentHistory ?? []),
                    ...(from !== to || lastUndoPatch?.documentHistory.length ? [{ from, to }] : []),
                  ],
                  documentOperationIds: combinedOperationIds,
                  metadata: {
                    ...(commandMetadata ?? lastUndoPatch?.metadata ?? { source: 'action' as const }),
                    actionTypes,
                    isFormatting,
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

    grouping.lastAction = action
    grouping.direction = editThoughtDirection

    // add a new undo patch
    // Note focus intentionally does not dispatch on every caret movement. For the first note edit after focus,
    // infer the pre-edit caret so the inverse patch can restore it instead of leaving the caret at the end.
    const noteOffsetBeforeEdit = getNoteOffsetBeforeEdit(action)
    const stateBeforeAction = {
      ...state,
      thoughts: previousThoughts,
      ...(noteOffsetBeforeEdit == null ? {} : { noteOffset: noteOffsetBeforeEdit }),
    }
    const { ops: undoPatch, isFormatting, formattingBefore } = diffState(newState, stateBeforeAction, { transaction })
    return undoPatch.length || documentOperationIds.length
      ? {
          ...newState,
          lastUndoableActionType: actionType,
          redoPatches: [],
          undoPatches: [
            ...newState.undoPatches,
            {
              ops: undoPatch,
              formattingBefore,
              documentHistory: from === to ? [] : [{ from, to }],
              metadata: {
                ...(commandMetadata ?? {
                  source: 'action',
                  // Any action may name its undo step, including a multicursor batch or a color change.
                  ...(typeof (action as UnknownAction).undoLabel === 'string'
                    ? { label: (action as UnknownAction).undoLabel as string }
                    : null),
                }),
                actionTypes: [actionType],
                isFormatting,
                isNavigation: isNavigation(actionType),
              },
              documentOperationIds,
            },
          ],
        }
      : newState
  }

  return {
    /** Leaves grouping provisional until the caller publishes the successfully completed command. */
    prepare: (state: State, action: A, transaction?: ThoughtspaceTransaction) => {
      const grouping = { ...committedGrouping }
      const next = execute(state, action, { transaction, grouping })
      return {
        state: next,
        // Commit before subscribers run so reentrant dispatch starts from this command's grouping.
        commit: () => {
          committedGrouping = grouping
        },
      }
    },
  }
}

export default undoRedoEnhancer
