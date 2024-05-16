import { Operation, applyPatch, compare } from 'fast-json-patch'
import { produce } from 'immer'
import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Patch from '../@types/Patch'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import * as reducers from '../actions'
import updateThoughts from '../actions/updateThoughts'
import getThoughtById from '../selectors/getThoughtById'
import headValue from '../util/headValue'
import reducerFlow from '../util/reducerFlow'

// a map of action types to boolean
type ActionFlags = {
  [key in keyof typeof reducers]: boolean
}

// Actions representing any cursor movements.
// These need to be differentiated from the other actions because contiguous navigational actions are merged together.
const NAVIGATION_ACTIONS: Partial<ActionFlags> = {
  cursorBack: true,
  cursorBeforeSearch: true,
  cursorDown: true,
  cursorForward: true,
  cursorHistory: true,
  cursorUp: true,
  jump: true,
  setNoteFocus: true,
  setCursor: true,
  toggleNote: true,
}

/** Returns if an action is navigational, i.e. cursor movements. Contiguous navigation actions will be merged and adjoined with the last non-navigational action. */
export const isNavigation = (actionType: string) => NAVIGATION_ACTIONS[actionType as keyof typeof NAVIGATION_ACTIONS]

// a list of all undoable actions
// assumes that reducer names match their action types
const UNDOABLE_ACTIONS: ActionFlags = {
  addLatestShortcuts: false,
  alert: false,
  archiveThought: true,
  authenticate: false,
  bumpThoughtDown: true,
  clear: false,
  clearExpandDown: false,
  clearLatestShortcuts: false,
  closeModal: false,
  collapseContext: true,
  commandPalette: false,
  createThought: true,
  cursorBack: true,
  cursorBeforeSearch: true,
  cursorCleared: false,
  cursorDown: true,
  cursorForward: true,
  cursorHistory: true,
  cursorUp: true,
  deleteAttribute: true,
  deleteEmptyThought: true,
  deleteThought: true,
  deleteThoughtWithCursor: true,
  dragHold: false,
  dragInProgress: false,
  dragShortcut: false,
  dragShortcutZone: false,
  editableRender: false,
  editing: false,
  editThought: true,
  error: false,
  expandContextThought: true,
  expandHoverDown: false,
  expandHoverUp: false,
  extractThought: true,
  freeThoughts: false,
  fontSize: false,
  heading: true,
  importSpeechToText: true,
  importText: true,
  indent: true,
  initThoughts: false,
  invalidState: false,
  join: true,
  jump: true,
  mergeThoughts: false,
  moveThought: true,
  moveThoughtDown: true,
  moveThoughtUp: true,
  newGrandChild: true,
  newSubthought: true,
  newThought: true,
  outdent: true,
  prependRevision: false,
  rerank: false,
  search: false,
  searchContexts: false,
  searchLimit: true,
  setCursor: true,
  setDescendant: true,
  setFirstSubthought: true,
  setNoteFocus: true,
  setRemoteSearch: false,
  setResourceCache: false,
  settings: true,
  showModal: false,
  splitSentences: true,
  splitThought: true,
  status: false,
  subCategorizeAll: true,
  subCategorizeOne: true,
  textColor: true,
  swapNote: true,
  toggleAbsoluteContext: false,
  toggleAttribute: true,
  toggleColorPicker: false,
  toggleContextView: true,
  toggleHiddenThoughts: true,
  toggleNote: true,
  toggleShortcutsDiagram: false,
  toggleSidebar: false,
  toggleSort: true,
  toggleSplitView: false,
  toggleThought: true,
  toggleUserSetting: false,
  toolbarLongPress: false,
  tutorial: false,
  tutorialChoice: false,
  tutorialNext: false,
  tutorialPrev: false,
  tutorialStep: false,
  undoArchive: false,
  unknownAction: false,
  updateSplitPosition: false,
  updateThoughts: false,
}

/** Returns if an action is undoable. */
const isUndoable = (actionType: string) => UNDOABLE_ACTIONS[actionType as keyof typeof UNDOABLE_ACTIONS]

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

  const undoTwice = isNavigation(lastAction) ? isUndoable(penultimateAction) : penultimateAction === 'newThought'

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

  const redoTwice = lastAction && (isNavigation(lastAction) || lastAction === 'newThought')

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
    let lastActionType: string

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
          } catch (e: any) {
            console.error(e.message, { state, lastUndoPatch })
            throw new Error('Error applying patch')
          }
        }
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
