import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import clearMulticursors from './clearMulticursors'

/** Closes the active dropdown and the independent Command Center, ending any multiselection. */
const closeDropdowns = (state: State): State =>
  clearMulticursors({ ...state, activeDropdown: null, showCommandCenter: false })

/** Dispatches only while a dropdown or the Command Center is open. */
export const closeDropdownsActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  if (state.activeDropdown || state.showCommandCenter) dispatch({ type: 'closeDropdowns' })
}

export default closeDropdowns

registerActionMetadata('closeDropdowns', {
  undoable: false,
})
