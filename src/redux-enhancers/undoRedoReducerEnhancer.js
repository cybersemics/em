import { applyPatch, compare, deepClone } from 'fast-json-patch'
import { NAVIGATION_ACTIONS, UNDOABLE_ACTIONS } from '../constants'
import _ from 'lodash'

const deadActionChecks = {
  dataNonce: patch => patch.length === 1 && patch[0].path === '/dataNonce'
}
const stateSectionsToOmit = ['alert']

/**
 * Checks if the patch only includes the opearations that don't impact the UI, and can be dispensed.
 */
const isDispensable = patch => Object.values(deadActionChecks).reduce((acc, curr) => acc || curr(patch), false)

/**
 * Combines two patches by appending operations from the latter to the former.
 */
const appendPatch = (patch, toAppend) => [...patch, ...toAppend]

/**
 * Returns the diff between two state values after omitting certain parts of them.
 */
const compareWithOmit = (newValue, value) => compare(_.omit(newValue, stateSectionsToOmit), _.omit(value, stateSectionsToOmit))

/**
 * Checks if the action type is existingThoughtChange.
 */
const isExistingThoughtChange = actionType => actionType === 'existingThoughtChange'

/**
 * Append actions to all operations of a patch.
 */
const addActionsToPatch = (patch, actions) => patch.map(operation => ({ ...operation, actions }))

/**
 * Gets the first action from a patch.
 */
const getPatchAction = patch => patch[0].actions[0]

/**
 * Gets the nth item from the end of an array.
 */
const nthLast = (arr, n) => arr[arr.length - n]

/**
 * Applies the last inverse-patch to get the next state and adds a corresponding reverse-patch for the same.
 */
const undoReducer = state => {
  const { patches, inversePatches } = state
  const lastInversePatch = nthLast(inversePatches, 1)
  if (!lastInversePatch) return state
  const newState = applyPatch(deepClone(state), lastInversePatch).newDocument
  const correspondingPatch = addActionsToPatch(compareWithOmit(newState, state), [...lastInversePatch[0].actions])
  return {
    ...newState,
    cursorBeforeEdit: newState.cursor,
    patches: [...patches, correspondingPatch],
    inversePatches: inversePatches.slice(0, -1)
  }
}

/**
 * Applies the last patch to get the next state and adds a corresponding inverse patch for the same.
 */
const redoReducer = state => {
  const { patches, inversePatches } = state
  const lastPatch = nthLast(patches, 1)
  if (!lastPatch) return state
  const newState = applyPatch(deepClone(state), lastPatch).newDocument
  const correspondingInversePatch = addActionsToPatch(compareWithOmit(newState, state), [...lastPatch[0].actions])
  return {
    ...newState,
    cursorBeforeEdit: newState.cursor,
    patches: patches.slice(0, -1),
    inversePatches: [...inversePatches, correspondingInversePatch]
  }
}

/**
 * Controls the number of undo operations based on the inversepatch history.
 */
const undoHandler = (state, inversePatches) => {
  const lastInversePatch = nthLast(inversePatches, 1)
  const lastAction = lastInversePatch && getPatchAction(lastInversePatch)
  const penultimateInversePatch = nthLast(inversePatches, 2)
  const penultimateAction = penultimateInversePatch && getPatchAction(penultimateInversePatch)
  return inversePatches.length ? (lastAction && NAVIGATION_ACTIONS[lastAction]) ||
    (penultimateAction && (NAVIGATION_ACTIONS[penultimateAction] || penultimateAction === 'newThought'))
    ? undoReducer(undoReducer(state))
    : undoReducer(state)
    : state
}

/**
 * Controls the number of redo operations based on the patch history.
 */
const redoHandler = (state, patches) => {
  const lastPatch = nthLast(patches, 1)
  const lastAction = lastPatch && getPatchAction(lastPatch)
  return patches.length ?
    lastAction && (NAVIGATION_ACTIONS[lastAction] || lastAction === 'newThought')
      ? redoReducer(redoReducer(state))
      : redoReducer(state)
    : state
}

/**
 * Store enhancer to append the ability to undo/redo for all undoable actions.
 */
const undoRedoReducerEnhancer = createStore => (
  reducer,
  initialState,
  enhancer
) => {
  // eslint-disable-next-line fp/no-let
  let lastActionType

  /**
   * Reducer to handle undo/redo actions and add/merge inverse-patches for other actions.
   */
  const undoAndRedoReducer = (state = initialState, action) => {
    if (!state) return reducer(initialState, action)
    const { patches, inversePatches } = state
    const actionType = action.type

    const undoOrRedoState = actionType === 'undoAction' ?
      undoHandler(state, inversePatches)
      : actionType === 'redoAction'
        ? redoHandler(state, patches)
        : null

    if (undoOrRedoState) return undoOrRedoState

    const newState = reducer(state, action)
    if (!UNDOABLE_ACTIONS[actionType]) {
      return newState
    }

    // combine navigation and thoughtChange actions
    if ((NAVIGATION_ACTIONS[actionType] && NAVIGATION_ACTIONS[lastActionType]) || (isExistingThoughtChange(lastActionType) && isExistingThoughtChange(actionType)) || actionType === 'closeAlert') {
      lastActionType = actionType
      const lastInversePatch = nthLast(state.inversePatches, 1)
      const lastState = lastInversePatch
        ? applyPatch(deepClone(state), lastInversePatch).newDocument
        : state
      const combinedInversePatch = compareWithOmit(newState, lastState)
      return {
        ...newState,
        inversePatches: [
          ...newState.inversePatches.slice(0, -1),
          addActionsToPatch(combinedInversePatch, [
            ...lastInversePatch
              ? lastInversePatch[0].actions
              : [],
            actionType
          ])
        ]
      }
    }

    lastActionType = actionType

    // add a new inverse patch
    const inversePatch = compareWithOmit(newState, state)

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

  return createStore(undoAndRedoReducer, initialState, enhancer)
}

export default undoRedoReducerEnhancer
