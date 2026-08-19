import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import isEM from '../util/isEM'
import reducerFlow from '../util/reducerFlow'
import setCursor from './setCursor'

/** Toggles the EM context as the outline root, allowing normal editing of EM/Settings. Entering sets the cursor to EM/Settings (if it exists); exiting restores the cursor that was active before entering. */
const toggleEmContext = (state: State): State => {
  const exiting = isEM(state.rootContext)

  const settingsId = findDescendant(state, EM_TOKEN, 'Settings')
  const cursorNew = exiting ? state.cursorBeforeEmContext : settingsId ? ([EM_TOKEN, settingsId] as Path) : null

  return reducerFlow([
    stateNew => ({
      ...stateNew,
      rootContext: exiting ? [HOME_TOKEN] : [EM_TOKEN],
      cursorBeforeEmContext: exiting ? null : state.cursor,
    }),
    // setCursor recalculates state.expanded against the new root
    setCursor({ path: cursorNew }),
  ])(state)
}

/** Action-creator for toggleEmContext. */
export const toggleEmContextActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleEmContext' })

export default toggleEmContext

registerActionMetadata('toggleEmContext', {
  undoable: false,
})
