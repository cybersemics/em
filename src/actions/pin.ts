import State from '../@types/State'
import Thunk from '../@types/Thunk'
import toggleAttribute from '../actions/toggleAttribute'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles the pin on the cursor thought, so that its subthoughts are always visible. No-op if there is no cursor. */
const pin = (state: State): State => toggleAttribute(state, { path: state.cursor, values: ['=pin', 'true'] })

/** Action-creator for pin. */
export const pinActionCreator = (): Thunk => dispatch => dispatch({ type: 'pin' })

export default pin

// Register this action's metadata
registerActionMetadata('pin', {
  undoable: true,
})
