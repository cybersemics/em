import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { DROPDOWN_STATE_KEYS } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'

/** Returns the state keys of the dropdowns that closeDropdowns closes. */
const dropdownStateKeysToClose = (keepCommandCenter?: boolean) =>
  Object.values(DROPDOWN_STATE_KEYS).filter(stateKey => !keepCommandCenter || stateKey !== 'showCommandCenter')

/** Closes all open dropdowns. With keepCommandCenter, closes only the toolbar dropdowns, leaving the Command Center open and the multiselect intact, since closing the Command Center is what ends the multiselect. */
const closeDropdowns = (
  state: State,
  {
    keepCommandCenter,
  }: {
    /** Leave the Command Center open and keep the multicursors. */
    keepCommandCenter?: boolean
  } = {},
): State =>
  reducerFlow([
    state => ({
      ...state,
      ...Object.fromEntries(dropdownStateKeysToClose(keepCommandCenter).map(stateKey => [stateKey, false])),
    }),
    keepCommandCenter ? null : clearMulticursors,
  ])(state)

/** Action-creator for closeDropdowns. Only dispatches if any dropdown that would be closed is open. */
export const closeDropdownsActionCreator =
  (payload: Parameters<typeof closeDropdowns>[1] = {}): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    // avoid dispatching if all dropdowns are already closed
    if (dropdownStateKeysToClose(payload.keepCommandCenter).some(stateKey => state[stateKey as keyof State])) {
      dispatch({ type: 'closeDropdowns', ...payload })
    }
  }

export default closeDropdowns

// Register this action's metadata
registerActionMetadata('closeDropdowns', {
  undoable: false,
})
