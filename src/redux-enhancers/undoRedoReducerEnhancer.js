import { applyPatch, compare, deepClone } from 'fast-json-patch'
import { NAVIGATION_ACTIONS, UNDOABLE_ACTIONS } from '../constants'

/**
 * Checks if the action type is existingThoughtChange.
 */
const isExistingThoughtChange = actionType => actionType === 'existingThoughtChange'

/**
 * Gets the last item of an array.
 */
const getLastItem = arr => arr[arr.length - 1]

/**
 * Applies the last inverse-patch to get the next state and adds a corresponding reverse-patch for the same.
 */
const undoReducer = state => {
  const { patches, inversePatches } = state
  const lastInversePatch = getLastItem(inversePatches)
  const newState = lastInversePatch ? applyPatch(deepClone(state), lastInversePatch).newDocument : state
  const correspondingPatch = compare(newState, state).map(operation => ({ ...operation, actions: [...lastInversePatch[0].actions] }))
  return { ...newState, patches: [...patches, correspondingPatch], inversePatches: inversePatches.slice(0, -1) }
}

/**
 * Applies the last patch to get the next state and adds a corresponding inverse patch for the same.
 */
const redoReducer = state => {
  const { patches, inversePatches } = state
  const lastPatch = getLastItem(patches)
  const newState = lastPatch ? applyPatch(deepClone(state), lastPatch).newDocument : state
  const correspondingInversePatch = compare(newState, state).map(operation => ({ ...operation, actions: [...lastPatch[0].actions] }))
  return { ...newState, patches: patches.slice(0, -1), inversePatches: [...inversePatches, correspondingInversePatch] }
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
    if (action.type === 'undoAction') {
      return inversePatches.length ? getLastItem(inversePatches) && NAVIGATION_ACTIONS[getLastItem(inversePatches)[0].actions[0]] ? undoReducer(undoReducer(state)) : undoReducer(state) : state
    }
    if (action.type === 'redoAction') {
      return patches.length ? getLastItem(patches) && NAVIGATION_ACTIONS[getLastItem(patches)[0].actions[0]] ? redoReducer(redoReducer(state)) : redoReducer(state) : state
    }
    const newState = reducer(state, action)
    if (!UNDOABLE_ACTIONS[action.type]) {
      return newState
    }

    // combine navigation and thoughtChange actions
    if ((NAVIGATION_ACTIONS[action.type] && NAVIGATION_ACTIONS[lastActionType]) || (isExistingThoughtChange(lastActionType) && isExistingThoughtChange(action.type))) {
      lastActionType = action.type
      const lastInversePatch = getLastItem(state.inversePatches)
      const lastState = lastInversePatch ? applyPatch(deepClone(state), lastInversePatch).newDocument : state
      const combinedInversePatch = compare(newState, lastState)
      return {
        ...newState,
        inversePatches: [...newState.inversePatches.slice(0, -1), combinedInversePatch.map(operation => ({ ...operation, actions: [...lastInversePatch ? lastInversePatch[0].actions : [], action.type] }))]
      }
    }

    lastActionType = action.type
    const inversePatch = compare(newState, state)

    return { ...newState, inversePatches: [...newState.inversePatches, inversePatch.map(operation => ({ ...operation, actions: [action.type] }))] }
  }

  return createStore(undoAndRedoReducer, initialState, enhancer)
}

export default undoRedoReducerEnhancer
