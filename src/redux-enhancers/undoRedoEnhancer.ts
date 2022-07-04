import { Operation, applyPatch, compare } from 'fast-json-patch'
import { produce } from 'immer'
import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Patch from '../@types/Patch'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import updateThoughts from '../reducers/updateThoughts'
import getThoughtById from '../selectors/getThoughtById'
import reducerFlow from '../util/reducerFlow'

// actions representing any cursor movements.
// These need to be differentiated from the other actions because
// any two or more such consecutive actions are merged together
export const NAVIGATION_ACTIONS: Index<string> = {
  cursorBack: 'cursorBack',
  cursorBeforeSearch: 'cursorBeforeSearch',
  cursorDown: 'cursorDown',
  cursorForward: 'cursorForward',
  cursorHistory: 'cursorHistory',
  cursorUp: 'cursorUp',
  setCursor: 'setCursor',
}

// a list of all undoable/reversible actions (stored as object for indexing)
const UNDOABLE_ACTIONS: Index<true> = {
  archiveThought: true,
  bumpThoughtDown: true,
  cursorBack: true,
  cursorBeforeSearch: true,
  cursorDown: true,
  cursorForward: true,
  cursorHistory: true,
  cursorUp: true,
  deleteAttribute: true,
  deleteData: true,
  deleteEmptyThought: true,
  deleteThoughtWithCursor: true,
  editThought: true,
  deleteThought: true,
  moveThought: true,
  expandContextThought: true,
  indent: true,
  importText: true,
  moveThoughtDown: true,
  moveThoughtUp: true,
  newThought: true,
  createThought: true,
  outdent: true,
  searchLimit: true,
  setAttribute: true,
  setCursor: true,
  setFirstSubthought: true,
  settings: true,
  splitThought: true,
  splitSentences: true,
  subCategorizeAll: true,
  subCategorizeOne: true,
  toggleAttribute: true,
  toggleCodeView: true,
  toggleContextView: true,
  toggleHiddenThoughts: true,
  toggleSplitView: true,
  toolbarOverlay: true,
}

/** These properties are ignored when generating state patches. */
const statePropertiesToOmit = ['alert', 'pushQueue', 'user']

/**
 * Manually recreate the pushQueue for thought and thought index updates from patches.
 */
const restorePushQueueFromPatches = (state: State, oldState: State, patch: Patch) => {
  const lexemeIndexChanges = patch.filter(p => p?.path.startsWith('/thoughts/lexemeIndex/'))
  const thoughtIndexChanges = patch.filter(p => p?.path.startsWith('/thoughts/thoughtIndex/'))

  const lexemeIndexUpdates = lexemeIndexChanges.reduce<Index<Lexeme | null>>((acc, op) => {
    const lexemeKey = op.path.slice('/thoughts/lexemeIndex/'.length).split('/')[0]
    return {
      ...acc,
      [lexemeKey]: op.value || null,
    }
  }, {})
  const thoughtIndexUpdates = thoughtIndexChanges.reduce((acc, { path }) => {
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
  }

  return {
    ...state,
    pushQueue: updateThoughts({ lexemeIndexUpdates, thoughtIndexUpdates })(oldStateWithUpdatedCursor).pushQueue,
  }
}

/**
 * Returns the diff between two states as a json-fast-patch Patch that can be applied for undo/redo functionality. Ignores ephemeral state properties such as alert which should not be recreated (defined in statePropertiesToOmit).
 */
const diffState = <T>(newValue: Index<T>, value: Index<T>): Operation[] =>
  compare(_.omit(newValue, statePropertiesToOmit), _.omit(value, statePropertiesToOmit))

/**
 * Append action names to all operations of a Patch.
 */
const addActionsToPatch = (patch: Operation[], actions: string[]): Patch =>
  // TODO: Fix Patch type to support any Operation, not just GetOperation. See Patch.ts.
  patch.map(operation => ({ ...operation, actions })) as Patch

/**
 * Gets the first action from a patch.
 */
const getPatchAction = (patch: Patch) => patch[0]?.actions[0]

/**
 * Gets the nth item from the end of an array.
 */
const nthLast = <T>(arr: T[], n: number) => arr[arr.length - n]

/**
 * Undoes a single action. Applies the last inverse-patch to get the next state and adds a corresponding reverse-patch for the same.
 */
const undoOneReducer = (state: State) => {
  const { redoPatches, undoPatches } = state
  const lastUndoPatch = nthLast(undoPatches, 1)
  if (!lastUndoPatch) return state
  const newState = produce(state, (state: State) => applyPatch(state, lastUndoPatch).newDocument)
  const correspondingRedoPatch = addActionsToPatch(diffState(newState as Index, state), [...lastUndoPatch[0].actions])
  return {
    ...newState,
    redoPatches: [...redoPatches, correspondingRedoPatch],
    undoPatches: undoPatches.slice(0, -1),
  }
}

/**
 * Redoes a single action. Applies the last patch to get the next state and adds a corresponding undo patch for the same.
 */
const redoOneReducer = (state: State) => {
  const { redoPatches, undoPatches } = state
  const lastRedoPatch = nthLast(redoPatches, 1)
  if (!lastRedoPatch) return state
  const newState = produce(state, (state: State) => applyPatch(state, lastRedoPatch).newDocument)
  const correspondingUndoPatch = addActionsToPatch(diffState(newState as Index, state), [...lastRedoPatch[0].actions])
  return {
    ...newState,
    redoPatches: redoPatches.slice(0, -1),
    undoPatches: [...undoPatches, correspondingUndoPatch],
  }
}

/**
 * Controls the number of undo operations based on the undo history.
 */
const undoReducer = (state: State, undoPatches: Patch[]) => {
  const lastUndoPatch = nthLast(undoPatches, 1)
  const lastAction = lastUndoPatch && getPatchAction(lastUndoPatch)
  const penultimateUndoPatch = nthLast(undoPatches, 2)
  const penultimateAction = penultimateUndoPatch && getPatchAction(penultimateUndoPatch)

  if (!undoPatches.length) return state

  const undoTwice =
    penultimateUndoPatch &&
    !!(
      (lastAction && NAVIGATION_ACTIONS[lastAction]) ||
      (penultimateAction && (NAVIGATION_ACTIONS[penultimateAction] || penultimateAction === 'newThought'))
    )

  const poppedUndoPatches = undoTwice ? [penultimateUndoPatch, lastUndoPatch] : [lastUndoPatch]

  return reducerFlow([
    undoOneReducer,
    undoTwice ? undoOneReducer : null,
    newState => restorePushQueueFromPatches(newState, state, poppedUndoPatches.flat()),
  ])(state)
}

/**
 * Controls the number of redo operations based on the patch history.
 */
const redoReducer = (state: State, redoPatches: Patch[]) => {
  const lastRedoPatch = nthLast(redoPatches, 1)
  const lastAction = lastRedoPatch && getPatchAction(lastRedoPatch)

  if (!redoPatches.length) return state

  const redoTwice = lastAction && (NAVIGATION_ACTIONS[lastAction] || lastAction === 'newThought')

  const poppedPatches = redoTwice ? [nthLast(redoPatches, 2), lastRedoPatch] : [lastRedoPatch]
  return reducerFlow([
    redoTwice ? redoOneReducer : null,
    redoOneReducer,
    newState => restorePushQueueFromPatches(newState, state, poppedPatches.flat()),
  ])(state)
}

/**
 * Store enhancer to append the ability to undo/redo for all undoable actions.
 */
const undoRedoReducerEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    // eslint-disable-next-line fp/no-let
    let lastActionType: string

    /**
     * Reducer to handle undo/redo actions and add/merge inverse-redoPatches for other actions.
     */
    const undoAndRedoReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const { redoPatches, undoPatches } = state as State
      const actionType = action.type

      // Handle undoAction and redoAction.
      // They are defined in the redux enhancer rather than in /reducers.
      if (actionType === 'undoAction' || actionType === 'redoAction') {
        const undoOrRedoState =
          actionType === 'undoAction'
            ? undoReducer(state, undoPatches)
            : actionType === 'redoAction'
            ? redoReducer(state, redoPatches)
            : null

        // do not omit pushQueue because that includes updates added by updateThoughts
        const omitted = _.pick(
          state,
          statePropertiesToOmit.filter(k => k !== 'pushQueue'),
        )

        return { ...undoOrRedoState!, ...omitted }
      }

      // otherwise run the normal reducer for the action
      const newState = reducer(state, action)

      if (
        // bail if state has not changed
        state === newState ||
        // bail if the action is not undoable
        !UNDOABLE_ACTIONS[actionType] ||
        // ignore the first importText since it is part of app initialization and should not be undoable
        // otherwise the edit merge logic below will create an undo patch with an invalid lexemeIndex/000
        // See: https://github.com/cybersemics/em/issues/1494
        (actionType === 'importText' && !newState.undoPatches.length)
      ) {
        return newState
      }

      // edit merge logic
      // combine navigation and thoughtChange actions into single redoPatches
      if (
        (NAVIGATION_ACTIONS[actionType] && NAVIGATION_ACTIONS[lastActionType]) ||
        (lastActionType === 'editThought' && actionType === 'editThought') ||
        actionType === 'closeAlert'
      ) {
        lastActionType = actionType
        const lastUndoPatch = nthLast(state.undoPatches, 1)
        const lastState =
          lastUndoPatch && lastUndoPatch.length > 0
            ? produce(state, (state: State) => applyPatch(state, lastUndoPatch).newDocument)
            : state
        const combinedUndoPatch = diffState(newState as Index, lastState)
        return {
          ...newState,
          undoPatches: [
            ...newState.undoPatches.slice(0, -1),
            addActionsToPatch(combinedUndoPatch, [
              ...(lastUndoPatch && lastUndoPatch.length > 0 ? lastUndoPatch[0].actions : []),
              actionType,
            ]),
          ],
        }
      }

      lastActionType = actionType

      // add a new undo patch
      const undoPatch = diffState(newState as Index, state)

      return undoPatch.length
        ? {
            ...newState,
            redoPatches: [],
            undoPatches: [...newState.undoPatches, addActionsToPatch(undoPatch, [lastActionType])],
          }
        : newState
    }

    return createStore(undoAndRedoReducer, initialState)
  }

export default undoRedoReducerEnhancer
