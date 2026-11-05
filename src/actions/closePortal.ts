import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import nearestPortalPath from '../selectors/nearestPortalPath'
import selectionOffsets from '../selectors/selectionOffsets'
import splitChain from '../selectors/splitChain'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isRoot from '../util/isRoot'
import keyValueBy from '../util/keyValueBy'
import setCursor from './setCursor'

/** Closes the route behind the selected visible thought, retaining its actual location. */
const closePortal = (state: State, { offset }: { offset?: number | null } = {}): State => {
  if (!state.cursor || !nearestPortalPath(state, state.cursor)) return state

  // A collapsed context entry displays its parent. simplifyPath would resolve
  // that row's elided child scope, so staying here must resolve the visible head.
  const actualPath = thoughtToPath(state, head(state.cursor))
  const chain = splitChain(state, state.cursor)
  const owners = chain.slice(0, -1).map((_, index) => chain.slice(0, index + 1).flat() as Path)
  const ownerKeys = owners.map(hashPath)
  const contextViews = keyValueBy(state.contextViews, (key, value) =>
    ownerKeys.some(prefix => key.startsWith(prefix)) ? null : { [key]: value },
  )
  const contextViewExpansions = keyValueBy(state.contextViewExpansions, (key, expansion) =>
    owners.some(owner => isDescendantPath(expansion.contextViewPath, owner)) ? null : { [key]: expansion },
  )

  return setCursor(
    { ...state, contextViews, contextViewExpansions },
    {
      path: isRoot(actualPath) ? null : actualPath,
      offset: offset ?? state.cursorOffset,
      // The prior history may contain anchors whose route was just closed.
      cursorHistoryClear: true,
    },
  )
}

/** Captures the native caret before closing the traversed route behind its thought. */
export const closePortalActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  dispatch({ type: 'closePortal', offset: selectionOffsets(state)?.end ?? state.cursorOffset })
}

export default closePortal

registerActionMetadata('closePortal', { undoable: true, isNavigation: true })
