import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import toggleAttribute from '../actions/toggleAttribute'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Toggles the pin on the cursor thought, so that its subthoughts are always visible. No-op if there is no cursor. */
const pin = (state: State, _payload: undefined = undefined, document?: ThoughtspaceTransaction): State =>
  toggleAttribute(state, { path: state.cursor, values: ['=pin', 'true'] }, document)

/** Action-creator for pin. */
export const pinActionCreator = (): Thunk => dispatch => dispatch({ type: 'pin' })

export default command(pin)

// Register this action's metadata
registerActionMetadata('pin', {
  undoable: true,
})
