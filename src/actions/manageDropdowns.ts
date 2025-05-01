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
 * If no dropdown type is provided, close all dropdowns.
 */
const manageDropdowns = (state: State, { dropDownType, value }: { dropDownType?: DropdownType; value?: boolean }) => {
  // Create an object with all dropdowns set to false
  const newState = Object.fromEntries(Object.values(DROPDOWN_STATE_KEYS).map(key => [key, false])) as Record<
    DropdownStateKeys,
    boolean
  >

  // If no dropdown type is provided, just close all dropdowns
  if (!dropDownType) {
    return {
      ...state,
      ...newState,
    }
  }

  const stateKey = DROPDOWN_STATE_KEYS[dropDownType]

  // Set the value for the current dropdown (toggle if value is not provided)
  newState[stateKey] = value ?? !state[stateKey]

  return {
    ...state,
    ...newState,
  }
}

/** Action-creator for manageDropdowns. */
export const manageDropdownsActionCreator =
  (payload?: Parameters<typeof manageDropdowns>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'manageDropdowns', ...payload })

export default manageDropdowns

registerActionMetadata('manageDropdowns', {
  undoable: false,
})
