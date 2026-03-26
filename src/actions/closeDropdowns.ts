import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'
import { DROPDOWN_STATE_KEYS } from './toggleDropdown'

/** Closes all open dropdowns. */
const closeDropdowns = (state: State): State =>
  reducerFlow([
    state => ({
      ...state,
      ...Object.fromEntries(Object.values(DROPDOWN_STATE_KEYS).map(stateKey => [stateKey, false])),
    }),
    clearMulticursors,
  ])(state)

/** Action-creator for closeDropdowns. Only dispatches if any dropdown is open. */
export const closeDropdownsActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  // avoid dispatching if all dropdowns are already closed
  if (Object.values(DROPDOWN_STATE_KEYS).some(stateKey => state[stateKey as keyof State])) {
    dispatch({ type: 'closeDropdowns' })
  }
}

export default closeDropdowns

// Register this action's metadata
registerActionMetadata('closeDropdowns', {
  undoable: false,
})
