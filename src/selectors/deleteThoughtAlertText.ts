import Path from '../@types/Path'
import State from '../@types/State'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'
import simplifyPath from './simplifyPath'

/** Generates the alert text for deleting a thought. Handles empty thought and context view. */
const deleteThoughtAlertText = (state: State, path: Path): string => {
  const showContexts = isContextViewActive(state, parentOf(path))
  const value = getThoughtById(state, head(simplifyPath(state, path))).value
  return `Deleted ${value ? ellipsize(value) : 'empty thought'}${
    showContexts ? ' from ' + ellipsize(headValue(state, path)) : ''
  }`
}

export default deleteThoughtAlertText
