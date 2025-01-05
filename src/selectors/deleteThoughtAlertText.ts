import Path from '../@types/Path'
import State from '../@types/State'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import { anyChild } from './getChildren'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'
import simplifyPath from './simplifyPath'

/** Generates the alert text for deleting or achiving a thought. Handles empty thought, note, and context view. */
const deleteThoughtAlertText = (
  state: State,
  path: Path,
  {
    archive,
  }: {
    /** If true, returns "Deleted" instead of "Permanently deleted". */
    archive?: boolean
  } = {},
): string => {
  const showContexts = isContextViewActive(state, parentOf(path))
  const simplePath = simplifyPath(state, path)
  const thought = getThoughtById(state, head(simplePath))
  const child = anyChild(state, head(simplePath))
  const value = thought && ellipsize(thought.value === '=note' ? 'note ' + child?.value || '' : thought.value)

  return `${archive ? 'Deleted' : 'Permanently deleted'} ${value || 'empty thought'}${
    showContexts ? ' from ' + ellipsize(headValue(state, path) ?? 'MISSING_THOUGHT') : ''
  }`
}

export default deleteThoughtAlertText
