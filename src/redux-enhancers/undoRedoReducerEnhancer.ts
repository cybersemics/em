import _ from 'lodash'
import { applyPatch, compare, deepClone } from 'fast-json-patch'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import { NAVIGATION_ACTIONS, UNDOABLE_ACTIONS } from '../constants'
import { State } from '../util/initialState'
import { Index, Patch } from '../types'
import { updateThoughts } from '../reducers'
import { reducerFlow } from '../util'

const stateSectionsToOmit = ['alert', 'pushQueue', 'user']

/**
 * Manually extract thought and context index updates along with pushQueue.
 */
const extractUpdates = (newState: State, patch: Patch) => {
  const thoughtIndexPath = `/thoughts/thoughtIndex/`
  const contextIndexPath = `/thoughts/contextIndex/`
  const thoughtIndexChanges = patch.filter(p => p.path.indexOf(thoughtIndexPath) === 0)
  const contextIndexChanges = patch.filter(p => p.path.indexOf(contextIndexPath) === 0)

  const thoughtIndexUpdates = thoughtIndexChanges.reduce((acc, { path }) => {
    const [thoughtId] = path.slice(thoughtIndexPath.length).split('/')
    return { ...acc, [thoughtId]: newState.thoughts.thoughtIndex[thoughtId] ?? null }
  }, {})
  const contextIndexUpdates = contextIndexChanges.reduce((acc, { path }) => {
    const [contextId] = path.slice(contextIndexPath.length).split('/')
    return { ...acc, [contextId]: newState.thoughts.contextIndex[contextId] ?? null }
  }, {})
  return updateThoughts({ thoughtIndexUpdates, contextIndexUpdates })(newState)
}

const deadActionChecks = {
  dataNonce: (patch: Patch) => patch.length === 1 && patch[0].path === '/dataNonce'
}

/**
 * Checks if the patch only includes the opearations that don't impact the UI, and can be dispensed.
 */
const isDispensable = (patch: Patch) =>
  Object.values(deadActionChecks).reduce((acc, curr) => acc || curr(patch), false)

/**
 * Combines two patches by appending operations from the latter to the former.
 */
const appendPatch = (patch: Patch, toAppend: Patch) => [...patch, ...toAppend]

/**
 * Returns the diff between two state values after omitting certain parts of them.
 */
const compareWithOmit = <T>(newValue: Index<T>, value: Index<T>): Patch =>
  compare(_.omit(newValue, stateSectionsToOmit), _.omit(value, stateSectionsToOmit)) as Patch

/**
 * Checks if the action type is existingThoughtChange.
 */
const isExistingThoughtChange = (actionType: string) => actionType === 'existingThoughtChange'

/**
 * Append actions to all operations of a patch.
 */
const addActionsToPatch = (patch: Patch, actions: string[]) =>
  patch.map(operation => ({ ...operation, actions }))

/**
 * Gets the first action from a patch.
 */
const getPatchAction = (patch: Patch) => patch[0].actions[0]

/**
 * Gets the nth item from the end of an array.
 */
const nthLast = <T>(arr: T[], n: number) => arr[arr.length - n]

/**
 * Applies the last inverse-patch to get the next state and adds a corresponding reverse-patch for the same.
 */
const undoReducer = (state: State) => {
  const { patches, inversePatches } = state
  const lastInversePatch = nthLast(inversePatches, 1)
  if (!lastInversePatch) return state
  const newState = applyPatch(deepClone(state) as State, lastInversePatch).newDocument
  const correspondingPatch = addActionsToPatch(compareWithOmit(newState as Index, state), [...lastInversePatch[0].actions])
  return {
    ...newState,
    patches: [...patches, correspondingPatch],
    inversePatches: inversePatches.slice(0, -1)
  }
}

/**
 * Applies the last patch to get the next state and adds a corresponding inverse patch for the same.
 */
const redoReducer = (state: State) => {
  const { patches, inversePatches } = state
  const lastPatch = nthLast(patches, 1)
  if (!lastPatch) return state
  const newState = applyPatch(deepClone(state), lastPatch).newDocument
  const correspondingInversePatch = addActionsToPatch(compareWithOmit(newState as Index, state), [...lastPatch[0].actions])
  return {
    ...newState,
    patches: patches.slice(0, -1),
    inversePatches: [...inversePatches, correspondingInversePatch]
  }
}

/**
 * Controls the number of undo operations based on the inversepatch history.
 */
const undoHandler = (state: State, inversePatches: Patch[]) => {
  const lastInversePatch = nthLast(inversePatches, 1)
  const lastAction = lastInversePatch && getPatchAction(lastInversePatch)
  const penultimateInversePatch = nthLast(inversePatches, 2)
  const penultimateAction = penultimateInversePatch && getPatchAction(penultimateInversePatch)

  if (!inversePatches.length) return state

  const undoTwice = penultimateInversePatch && !!((lastAction && NAVIGATION_ACTIONS[lastAction]) ||
  (penultimateAction && (NAVIGATION_ACTIONS[penultimateAction] || penultimateAction === 'newThought')))

  const poppedInversePatches = undoTwice ? [penultimateInversePatch, lastInversePatch] : [lastInversePatch]
  return reducerFlow([undoTwice ? undoReducer : null, undoReducer, state => extractUpdates(state, poppedInversePatches.flat())])(state)
}

/**
 * Controls the number of redo operations based on the patch history.
 */
const redoHandler = (state: State, patches: Patch[]) => {
  const lastPatch = nthLast(patches, 1)
  const lastAction = lastPatch && getPatchAction(lastPatch)

  if (!patches.length) return state

  const redoTwice = lastAction && (NAVIGATION_ACTIONS[lastAction] || lastAction === 'newThought')

  const poppedPatches = redoTwice ? [nthLast(patches, 2), lastPatch] : [lastPatch]
  return reducerFlow([redoTwice ? redoReducer : null, redoReducer, state => extractUpdates(state, poppedPatches.flat())])(state)
}

/**
 * Store enhancer to append the ability to undo/redo for all undoable actions.
 */
const undoRedoReducerEnhancer: StoreEnhancer<any> = (createStore: StoreEnhancerStoreCreator) => <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
  // eslint-disable-next-line fp/no-let
  let lastActionType: string

  /**
   * Reducer to handle undo/redo actions and add/merge inverse-patches for other actions.
   */
  const undoAndRedoReducer = (state: State | undefined = initialState, action: A): State => {
    if (!state) return reducer(initialState, action)
    const { patches, inversePatches } = state as State
    const actionType = action.type

    const undoOrRedoState = actionType === 'undoAction' ?
      undoHandler(state, inversePatches)
      : actionType === 'redoAction'
        ? redoHandler(state, patches)
        : null

    if (undoOrRedoState) {
      // do not omit pushQueue because that includes updates added by updateThoughts
      const omitted = _.pick(state, stateSectionsToOmit.filter(k => k !== 'pushQueue'))
      return { ...undoOrRedoState, ...omitted }
    }

    const newState = reducer(state, action)
    if (!UNDOABLE_ACTIONS[actionType]) {
      return newState
    }

    // combine navigation and thoughtChange actions
    if ((NAVIGATION_ACTIONS[actionType] && NAVIGATION_ACTIONS[lastActionType]) || (isExistingThoughtChange(lastActionType) && isExistingThoughtChange(actionType)) || actionType === 'closeAlert') {
      lastActionType = actionType
      const lastInversePatch = nthLast(state.inversePatches, 1)
      const lastState = lastInversePatch && lastInversePatch.length > 0
        ? applyPatch(deepClone(state), lastInversePatch).newDocument
        : state
      const combinedInversePatch = compareWithOmit(newState as Index, lastState)
      return {
        ...newState,
        inversePatches: [
          ...newState.inversePatches.slice(0, -1),
          addActionsToPatch(combinedInversePatch, [
            ...lastInversePatch && lastInversePatch.length > 0
              ? lastInversePatch[0].actions
              : [],
            actionType
          ])
        ]
      }
    }

    lastActionType = actionType

    // add a new inverse patch
    const inversePatch = compareWithOmit(newState as Index, state)

    // if the patch is dispensable, combine it with the last patch
    // Note: we can't simply ignore a dispensable patch because that would result in
    // inconsistencies between the original state, and the one built using patches
    if (isDispensable(inversePatch)) {
      const lastPatch = nthLast(inversePatches, 1)
      return {
        ...newState,
        patches: [],
        inversePatches: [
          ...newState.inversePatches.slice(0, -1),
          addActionsToPatch(lastPatch ? appendPatch(lastPatch, inversePatch) : inversePatch, [...lastPatch ? lastPatch[0].actions : [], actionType])
        ]
      }
    }

    return inversePatch.length ?
      {
        ...newState,
        patches: [],
        inversePatches: [...newState.inversePatches, addActionsToPatch(inversePatch, [action.type])]
      }
      : newState
  }

  return createStore(undoAndRedoReducer, initialState)
}

export default undoRedoReducerEnhancer
