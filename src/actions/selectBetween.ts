import { curryRight, sortBy } from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import { HOME_PATH } from '../constants'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import addMulticursor from './addMulticursor'

/** Selects all thoughts between two selected thoughts. */
const selectBetween = (state: State): State => {
  const { cursor } = state
  const multicursorPaths = Object.values(state.multicursors)

  if (multicursorPaths.length === 1) {
    return alert(state, { value: 'Select Between requires at least two selected thoughts.' })
  }

  const cursorParent = cursor ? rootedParentOf(state, cursor) : HOME_PATH

  // verify that all selected paths are at the same level
  if (!multicursorPaths.every(path => equalPath(rootedParentOf(state, path), cursorParent))) {
    return alert(state, { value: 'Select Between only works when the selected thoughts are at the same level.' })
  }

  const cursorSiblingPaths = getChildrenSorted(state, head(cursorParent)).map(child =>
    appendToPath(cursorParent, child.id),
  )
  const multicursorPathsSorted = sortBy(multicursorPaths, path => getThoughtById(state, head(path))?.rank ?? -1)

  // find the first and last selected paths, defaulting to the first and last cursor siblings
  const firstPath = multicursorPathsSorted.at(0) ?? cursorSiblingPaths.at(0)
  const lastPath = multicursorPathsSorted.at(-1) ?? cursorSiblingPaths.at(-1)

  if (!firstPath || !lastPath) {
    return alert(state, { value: 'Select Between requires two selected thoughts.' })
  }

  const firstRank = getThoughtById(state, head(firstPath))?.rank ?? -1
  const lastRank = getThoughtById(state, head(lastPath))?.rank ?? -1

  // add every path between the first and last selected paths to the multicursor
  const pathsToAdd = cursorSiblingPaths.filter(path => {
    const thought = getThoughtById(state, head(path))
    return thought && thought.rank >= firstRank && thought.rank <= lastRank
  })

  return reducerFlow(pathsToAdd.map(path => addMulticursor({ path })))(state)
}

/** Action-creator for selectBetween. */
export const selectBetweenActionCreator = (): Thunk => dispatch => dispatch({ type: 'selectBetween' })

export default curryRight(selectBetween)

// Register this action's metadata
registerActionMetadata('selectBetween', {
  undoable: false,
})
