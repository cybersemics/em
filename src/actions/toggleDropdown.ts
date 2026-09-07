import DropdownType from '../@types/DropdownType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { DROPDOWN_STATE_KEYS } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'

/**
 * Toggle a specific dropdown and close all others.
 * The commandCenter is not in a mutually exclusive relationship with the toolbar dropdowns
 * (colorPicker, letterCase, sortPicker, undoSlider); they can be open at the same time.
 */
const toggleDropdown = (state: State, { dropDownType, value }: { dropDownType: DropdownType; value?: boolean }) => {
  const dropdownStates = Object.fromEntries(
    Object.entries(DROPDOWN_STATE_KEYS).map(([type, stateKey]) => {
      // commandCenter is not mutually exclusive with other dropdowns; preserve its state when
      // toggling a toolbar dropdown, and preserve other dropdowns' states when toggling commandCenter.
      const isCommandCenterIndependent = type === 'commandCenter' || dropDownType === 'commandCenter'
      return [
        stateKey,
        dropDownType === type
          ? (value ?? !state[stateKey as keyof State])
          : isCommandCenterIndependent
            ? (state[stateKey as keyof State] as boolean)
            : false,
      ]
    }),
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
