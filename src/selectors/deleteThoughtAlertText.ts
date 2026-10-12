import Path from '../@types/Path'
import State from '../@types/State'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import { anyChild } from './getChildren'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'
import lastThoughtsFromContextChain from './lastThoughtsFromContextChain'
import splitChain from './splitChain'

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
  const contextChain = splitChain(state, path)
  // Only a path that crosses the context view is a context. A hidden child of a thought whose context view is active, such as =favorite when Backspace archives it (#5858), is an ordinary child.
  const showContexts = contextChain.length > 1 && isContextViewActive(state, parentOf(path))
  const simplePath = lastThoughtsFromContextChain(state, contextChain)
  const thought = getThoughtById(state, head(simplePath))
  const child = anyChild(state, head(simplePath))
  const value = thought && ellipsize(thought.value === '=note' ? 'note ' + child?.value || '' : thought.value)

  return `${archive ? 'Deleted' : 'Permanently deleted'} ${value || 'empty thought'}${
    showContexts ? ' from ' + ellipsize(headValue(state, path) ?? 'MISSING_THOUGHT') : ''
  }`
}

export default deleteThoughtAlertText
