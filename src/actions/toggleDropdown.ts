import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

type DropdownType = 'colorPicker' | 'letterCase' | 'sortPicker'

type DropdownStateKeys = 'showColorPicker' | 'showLetterCase' | 'showSortPicker'

// Map dropdown types to their state keys
const DROPDOWN_STATE_KEYS: Record<DropdownType, DropdownStateKeys> = {
  colorPicker: 'showColorPicker',
  letterCase: 'showLetterCase',
  sortPicker: 'showSortPicker',
}

/**
 * Toggle a specific dropdown and close all others.
 * If no dropdown type is provided, all dropdowns will be closed.
 */
const toggleDropdown = (state: State, { dropDownType, value }: { dropDownType?: DropdownType; value?: boolean }) => {
  const dropdownStates = Object.fromEntries(
    Object.entries(DROPDOWN_STATE_KEYS).map(([type, stateKey]) => [
      stateKey,
      dropDownType === type ? (value ?? !state[stateKey as keyof State]) : false,
    ]),
  )

  return {
    ...state,
    ...dropdownStates,
  }
}

/** Dispatches toggleDropDown only if needed. */
export const toggleDropdownActionCreator =
  (payload?: Parameters<typeof toggleDropdown>[1]): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const { dropDownType, value } = payload ?? {}
    const stateKeys = Object.values(DROPDOWN_STATE_KEYS) as DropdownStateKeys[]

    // avoid closing all dropdowns if they are already closed
    if (dropDownType || stateKeys.some(stateKey => state[stateKey])) {
      dispatch({ type: 'toggleDropdown', dropDownType, value })
    }
  }

export default toggleDropdown

registerActionMetadata('toggleDropdown', {
  undoable: false,
})
