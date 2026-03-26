import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { DROPDOWN_STATE_KEYS, DropdownType } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'

/** Toggle a specific dropdown and close all others. */
const toggleDropdown = (state: State, { dropDownType, value }: { dropDownType: DropdownType; value?: boolean }) => {
  const dropdownStates = Object.fromEntries(
    Object.entries(DROPDOWN_STATE_KEYS).map(([type, stateKey]) => [
      stateKey,
      dropDownType === type ? (value ?? !state[stateKey as keyof State]) : false,
    ]),
  )

  return reducerFlow([
    state => ({ ...state, ...dropdownStates }),
    // When closing the commandCenter, clear the multicursors.
    // This is necessary because multicursorAlertMiddleware only handles Multiselect -> Alert/CommandCenter.
    dropDownType === 'commandCenter' && !value ? clearMulticursors : null,
  ])(state)
}

/** Dispatches toggleDropdown. */
export const toggleDropdownActionCreator =
  (payload: Parameters<typeof toggleDropdown>[1]): Thunk =>
  dispatch => {
    dispatch({ type: 'toggleDropdown', ...payload })
  }

export default toggleDropdown

registerActionMetadata('toggleDropdown', {
  undoable: false,
})
