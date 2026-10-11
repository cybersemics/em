import ActiveDropdown from '../@types/ActiveDropdown'
import DropdownType from '../@types/DropdownType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import clearMulticursors from './clearMulticursors'

/** Opens, replaces, or closes a complete dropdown target. The Command Center remains independent. */
const toggleDropdown = (
  state: State,
  {
    dropDownType,
    surface = 'toolbar',
    value,
  }: {
    dropDownType: DropdownType
    surface?: ActiveDropdown['surface']
    value?: boolean
  },
): State => {
  if (dropDownType === 'commandCenter') {
    const showCommandCenter = value ?? !state.showCommandCenter
    const next = { ...state, showCommandCenter }
    // Closing the Command Center also ends its multiselection, even if the panel was already hidden.
    return showCommandCenter ? next : clearMulticursors(next)
  }

  const matches = state.activeDropdown?.picker === dropDownType && state.activeDropdown.surface === surface
  // A delayed close from another presentation must not close the replacement dropdown.
  if (value === false && !matches) return state
  const open = value ?? !matches
  return { ...state, activeDropdown: open ? { picker: dropDownType, surface } : null }
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
