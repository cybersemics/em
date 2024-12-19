import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'

/** Clears all multicursors and updates expanded state based on current cursor and previously selected thoughts. */
const clearMulticursors = (state: State): State => {
  // Get all previously selected paths
  const selectedPaths = Object.values(state.multicursors)

  // Create a new state without multicursors
  const stateWithoutMulticursors = {
    ...state,
    multicursors: {},
  }

  // Expand based on cursor first
  let newExpanded = expandThoughts(stateWithoutMulticursors, state.cursor)

  // Then expand each previously selected path
  selectedPaths.forEach(path => {
    // Get the thought
    const thought = getThoughtById(state, head(path))
    if (!thought) return

    // Get its children
    const children = getAllChildrenAsThoughts(state, thought.id)

    // If it has children, expand it
    if (children.length > 0) {
      const pathExpanded = expandThoughts(stateWithoutMulticursors, path)
      newExpanded = {
        ...newExpanded,
        ...pathExpanded,
      }
    }
  })

  return {
    ...state,
    multicursors: {},
    expanded: newExpanded,
  }
}

/** Action-creator for clearMulticursors. */
export const clearMulticursorsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearMulticursors' })

export default clearMulticursors
