import { Operation, applyPatch, compare } from 'fast-json-patch'
import { produce } from 'immer'
import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import ActionType from '../@types/ActionType'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Patch from '../@types/Patch'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import editableRender from '../actions/editableRender'
import updateThoughts from '../actions/updateThoughts'
import getThoughtById from '../selectors/getThoughtById'
import { isNavigation, isUndoable } from '../util/actionMetadata.registry'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'

/** Properties that are ignored when generating state patches. */
const statePropertiesToOmit: (keyof State)[] = ['alert', 'cursorCleared', 'pushQueue']

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
    editingValue: state.cursor ? headValue(state, state.cursor) : null,
  }

  return {
    ...state,
    pushQueue: updateThoughts({ lexemeIndexUpdates, thoughtIndexUpdates })(oldStateWithUpdatedCursor).pushQueue,
  }
}

/**
 * Returns the diff between two states as a fast-json-patch Patch that can be applied for undo/redo functionality. Ignores ephemeral state properties such as alert which should not be recreated (defined in statePropertiesToOmit).
 */
const diffState = <T>(newValue: Index<T>, value: Index<T>): Operation[] =>
  compare(_.omit(newValue, statePropertiesToOmit), _.omit(value, statePropertiesToOmit))

/**
 * Append action names to all operations of a Patch.
 */
const addActionsToPatch = (patch: Operation[], actions: ActionType[]): Patch =>
  // TODO: Fix Patch type to support any Operation, not just GetOperation. See Patch.ts.
  patch.map(operation => ({ ...operation, actions })) as Patch

/**
 * Gets the first action from a patch.
 */
const getPatchAction = (patch: Patch): ActionType => patch[0]?.actions[0]

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
  const newState = produce(state, (state: State) => applyPatch(state, lastUndoPatch).newDocument)
  const correspondingRedoPatch = addActionsToPatch(diffState(newState as Index, state), [...lastUndoPatch[0].actions])
  return {
    ...newState,
    redoPatches: [...redoPatches, correspondingRedoPatch],
    undoPatches: undoPatches.slice(0, -1),
    cursorCleared: false,
    lastUndoableActionType: lastUndoPatch[0].actions[0],
  }
}

/**
 * Redoes a single action. Applies the last patch to get the next state and adds a corresponding undo patch for the same.
 */
const redoOneReducer = (state: State): State => {
  const { redoPatches, undoPatches } = state
  const lastRedoPatch = nthLast(redoPatches, 1)
  if (!lastRedoPatch) return state
  const newState = produce(state, (state: State) => applyPatch(state, lastRedoPatch).newDocument)
  const correspondingUndoPatch = addActionsToPatch(diffState(newState as Index, state), [...lastRedoPatch[0].actions])
  return {
    ...newState,
    redoPatches: redoPatches.slice(0, -1),
    undoPatches: [...undoPatches, correspondingUndoPatch],
    cursorCleared: false,
    lastUndoableActionType: lastRedoPatch[0].actions[0],
  }
}

/**
 * Controls the number of undo operations based on the undo history.
 */
const undoReducer = (state: State, undoPatches: Patch[]): State => {
  const lastUndoPatch = nthLast(undoPatches, 1)
  const lastAction = lastUndoPatch && getPatchAction(lastUndoPatch)
  const penultimateUndoPatch = nthLast(undoPatches, 2)
  const penultimateAction = penultimateUndoPatch && getPatchAction(penultimateUndoPatch)

  if (!undoPatches.length) return state

  const undoTwice = isNavigation(lastAction) ? isUndoable(penultimateAction) : penultimateAction === 'newThought'

  const poppedUndoPatches = undoTwice ? [penultimateUndoPatch, lastUndoPatch] : [lastUndoPatch]

  return reducerFlow([
    undoOneReducer,
    undoTwice ? undoOneReducer : null,
    newState => restorePushQueueFromPatches(newState, state, poppedUndoPatches.flat()),
    editableRender,
  ])(state)
}

/**
 * Controls the number of redo operations based on the patch history.
 */
const redoReducer = (state: State, redoPatches: Patch[]): State => {
  const lastRedoPatch = nthLast(redoPatches, 1)
  const lastAction = lastRedoPatch && getPatchAction(lastRedoPatch)

  if (!redoPatches.length) return state

  const redoTwice = lastAction && (isNavigation(lastAction) || lastAction === 'newThought')

  const poppedPatches = redoTwice ? [nthLast(redoPatches, 2), lastRedoPatch] : [lastRedoPatch]
  return reducerFlow([
    redoTwice ? redoOneReducer : null,
    redoOneReducer,
    newState => restorePushQueueFromPatches(newState, state, poppedPatches.flat()),
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
    let lastActionType: ActionType

    /**
     * Reducer to handle undo/redo actions and add/merge inverse-redoPatches for other actions.
     */
    const undoAndRedoReducer = (state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)
      const { redoPatches, undoPatches } = state as State
      const actionType = action.type

      // Handle undo and redo.
      // They are defined in the redux enhancer rather than in /actions.
      if (actionType === 'undo' || actionType === 'redo') {
        const undoOrRedoState =
          actionType === 'undo'
            ? undoReducer(state, undoPatches)
            : actionType === 'redo'
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
        !isUndoable(actionType) ||
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
        (isNavigation(actionType) && isNavigation(lastActionType)) ||
        (lastActionType === 'editThought' && actionType === 'editThought') ||
        actionType === 'closeAlert'
      ) {
        lastActionType = actionType
        const lastUndoPatch = nthLast(state.undoPatches, 1)
        let lastState = state
        if (lastUndoPatch && lastUndoPatch.length > 0) {
          // Add a try-catch to provide better error messaging if a patch fails.
          // The patch should always be valid, i.e. the necessary structure is in the state to apply the patch.
          // However, because non-undoable actions are skipped, it is possible that the state has shifted and the patch is no longer valid.
          // If a patch is invalid, all prior undo states will be inaccessible, so we should try to identify and fix this whenever it occurs.
          try {
            lastState = produce(state, (state: State) => applyPatch(state, lastUndoPatch).newDocument)
          } catch (e) {
            if (!(e instanceof Error)) throw e
            console.error(e.message, { state, lastUndoPatch })
            throw new Error('Error applying patch')
          }
        }
        const combinedUndoPatch = diffState(newState as Index, lastState)
        return {
          ...newState,
          lastUndoableActionType: actionType,
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
            lastUndoableActionType: actionType,
            redoPatches: [],
            undoPatches: [...newState.undoPatches, addActionsToPatch(undoPatch, [lastActionType])],
          }
        : newState
    }

    return createStore(undoAndRedoReducer, initialState)
  }

export default undoRedoReducerEnhancer
