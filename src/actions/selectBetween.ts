import { curryRight, sortBy } from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import getSiblingPaths from '../selectors/getSiblingPaths'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import reducerFlow from '../util/reducerFlow'
import addMulticursor from './addMulticursor'

/** Selects all thoughts between two selected thoughts. */
const selectBetween = (state: State): State => {
  const { cursor } = state
  const multicursorPaths = Object.values(state.multicursors)

  if (multicursorPaths.length === 1) {
    return alert(state, { value: 'Select Between requires at least two selected thoughts.' })
  }

  const cursorSiblingPaths = getSiblingPaths(state, cursor)
  const cursorSiblingIndex = new Map(cursorSiblingPaths.map((path, i) => [hashPath(path), i]))

  // verify that all selected paths are at the same level
  if (multicursorPaths.length > 0 && !multicursorPaths.every(path => cursorSiblingIndex.has(hashPath(path)))) {
    return alert(state, { value: 'Select Between only works when the selected thoughts are at the same level.' })
  }

  const multicursorPathsSorted = sortBy(multicursorPaths, path => cursorSiblingIndex.get(hashPath(path)) ?? -1)

  // find the first and last selected paths, defaulting to the first and last cursor siblings
  const firstPath = multicursorPathsSorted.at(0) ?? cursorSiblingPaths.at(0)
  const lastPath = multicursorPathsSorted.at(-1) ?? cursorSiblingPaths.at(-1)

  if (!firstPath || !lastPath) {
    return alert(state, { value: 'Select Between requires two selected thoughts.' })
  }

  const firstIndex = cursorSiblingIndex.get(hashPath(firstPath))
  const lastIndex = cursorSiblingIndex.get(hashPath(lastPath))

  if (firstIndex === undefined || lastIndex === undefined) {
    return alert(state, { value: 'Select Between only works when the selected thoughts are at the same level.' })
  }

  const startIndex = Math.min(firstIndex, lastIndex)
  const endIndex = Math.max(firstIndex, lastIndex)

  // add every path between the first and last selected paths to the multicursor
  const pathsToAdd = cursorSiblingPaths.slice(startIndex, endIndex + 1)

  return reducerFlow(pathsToAdd.map(path => addMulticursor({ path })))(state)
}

/** Action-creator for selectBetween. */
export const selectBetweenActionCreator = (): Thunk => dispatch => dispatch({ type: 'selectBetween' })

export default curryRight(selectBetween)

// Register this action's metadata
registerActionMetadata('selectBetween', {
  undoable: false,
})
