import State from '../@types/State'
import Thunk from '../@types/Thunk'
import nearestPortalPath from '../selectors/nearestPortalPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import setCursor from './setCursor'

/** Returns to the nearest traversed portal's entrance while leaving its view open. */
const exitPortal = (state: State): State => {
  const entrance = nearestPortalPath(state, state.cursor)
  return entrance ? setCursor(state, { path: entrance, offset: 0 }) : state
}

/** Creates an action that returns to the entrance of the nearest traversed portal. */
export const exitPortalActionCreator = (): Thunk => dispatch => dispatch({ type: 'exitPortal' })

export default exitPortal

registerActionMetadata('exitPortal', { undoable: true, isNavigation: true })
