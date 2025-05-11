import { head, sortBy } from 'lodash'
import Command from '../@types/Command'
import { addMulticursorActionCreator } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { HOME_PATH } from '../constants'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'

const selectBetweenCommand: Command = {
  id: 'selectBetween',
  label: 'Select Between',
  description: 'Selects all thoughts between two selected thoughts.',
  gesture: 'rdl',
  multicursor: false,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const multicursorPaths = Object.values(state.multicursors)

    if (multicursorPaths.length === 1) {
      dispatch(alert('Select Between requires at least two selected thoughts.'))
      return
    }

    const cursorParent = cursor ? rootedParentOf(state, cursor) : HOME_PATH

    // verify that all selected paths are at the same level
    if (!multicursorPaths.every(path => equalPath(rootedParentOf(state, path), cursorParent))) {
      dispatch(alert('Select Between only works when the selected thoughts are at the same level.'))
      return
    }

    const cursorSiblingPaths = getChildrenSorted(state, head(cursorParent)).map(child =>
      appendToPath(cursorParent, child.id),
    )
    const multicursorPathsSorted = sortBy(multicursorPaths, path => getThoughtById(state, head(path))?.rank ?? 0)

    // find the first and last selected paths, defaulting to the first and last cursor siblings
    const firstPath = multicursorPathsSorted.at(0) ?? cursorSiblingPaths.at(0)
    const lastPath = multicursorPathsSorted.at(-1) ?? cursorSiblingPaths.at(-1)

    if (!firstPath || !lastPath) {
      dispatch(alert('Select Between requires two selected thoughts.'))
      return
    }

    const firstRank = getThoughtById(state, head(firstPath))?.rank ?? 0
    const lastRank = getThoughtById(state, head(lastPath))?.rank ?? 0

    // add every path between the first and last selected paths to the multicursor
    const pathsToAdd = cursorSiblingPaths.filter(path => {
      const thought = getThoughtById(state, head(path))
      return thought && thought.rank >= firstRank && thought.rank <= lastRank
    })

    dispatch(pathsToAdd.map(path => addMulticursorActionCreator({ path })))
  },
}

export default selectBetweenCommand
