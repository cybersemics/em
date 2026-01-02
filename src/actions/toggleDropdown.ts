import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'

type DropdownType = 'colorPicker' | 'letterCase' | 'sortPicker' | 'commandCenter' | 'undoSlider'

type DropdownStateKeys =
  | 'showColorPicker'
  | 'showLetterCase'
  | 'showSortPicker'
  | 'showCommandCenter'
  | 'showUndoSlider'

// Map dropdown types to their state keys
const DROPDOWN_STATE_KEYS: Record<DropdownType, DropdownStateKeys> = {
  colorPicker: 'showColorPicker',
  letterCase: 'showLetterCase',
  sortPicker: 'showSortPicker',
  commandCenter: 'showCommandCenter',
  undoSlider: 'showUndoSlider',
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

  return reducerFlow([
    state => ({ ...state, ...dropdownStates }),
    // When closing the commandCenter, clear the multicursors.
    // This is necessary because multicursorAlertMiddleware only handles Multiselect -> Alert/CommandCenter.
    (!dropDownType || dropDownType === 'commandCenter') && !value ? clearMulticursors : null,
  ])(state)
}

/** Dispatches toggleDropdown only if needed. */
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
