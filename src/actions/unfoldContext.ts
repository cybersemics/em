import ContextViewExpansion from '../@types/ContextViewExpansion'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import setCursor from './setCursor'

/** Unfolds one context entry from the selected ancestor and selects it inside the portal. */
const unfoldContext = (state: State, expansion: ContextViewExpansion): State => {
  const { contextViewPath, contextId, ancestorId } = expansion
  const value = headValue(state, contextViewPath)
  const destination = getThoughtById(state, contextId)
  const destinationPath = thoughtToPath(state, contextId)
  const rootId = getThoughtById(state, destinationPath[0])?.parentId
  if (
    !isContextViewActive(state, contextViewPath) ||
    value === undefined ||
    !getContexts(state, value).includes(contextId) ||
    !destination ||
    (!destinationPath.includes(ancestorId) && !(isRoot([ancestorId]) && ancestorId === rootId))
  )
    return state

  const anchor = appendToPath(contextViewPath, contextId)
  return setCursor(
    {
      ...state,
      contextViewExpansions: {
        ...state.contextViewExpansions,
        [hashPath(anchor)]: expansion,
      },
    },
    { path: appendToPath(anchor, ancestorId), offset: 0 },
  )
}

/** Creates an action that unfolds a context entry without leaving its portal. */
export const unfoldContextActionCreator =
  (expansion: ContextViewExpansion): Thunk =>
  dispatch =>
    dispatch({ type: 'unfoldContext', ...expansion })

export default unfoldContext

registerActionMetadata('unfoldContext', { undoable: true, isNavigation: true })
