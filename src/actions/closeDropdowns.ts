import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { DROPDOWN_STATE_KEYS } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import clearMulticursors from './clearMulticursors'

/** Returns the state keys of the dropdowns that closeDropdowns closes. */
const dropdownStateKeysToClose = ({ keepCommandCenter, keepUndoSlider }: Parameters<typeof closeDropdowns>[1] = {}) =>
  Object.values(DROPDOWN_STATE_KEYS).filter(
    stateKey =>
      !(keepCommandCenter && stateKey === 'showCommandCenter') && !(keepUndoSlider && stateKey === 'showUndoSlider'),
  )

/** Closes all open dropdowns. With keepCommandCenter, closes only the toolbar dropdowns, leaving the Command Center open and the multiselect intact, since closing the Command Center is what ends the multiselect. With keepUndoSlider, leaves the Undo Slider open. */
const closeDropdowns = (
  state: State,
  {
    keepCommandCenter,
    keepUndoSlider,
  }: {
    /** Leave the Command Center open and keep the multicursors. */
    keepCommandCenter?: boolean
    /** Leave the Undo Slider open, e.g. when Undo or Redo is tapped, which move through the history the slider shows. */
    keepUndoSlider?: boolean
  } = {},
): State =>
  reducerFlow([
    state => ({
      ...state,
      ...Object.fromEntries(
        dropdownStateKeysToClose({ keepCommandCenter, keepUndoSlider }).map(stateKey => [stateKey, false]),
      ),
    }),
    keepCommandCenter ? null : clearMulticursors,
  ])(state)

/** Action-creator for closeDropdowns. Only dispatches if any dropdown that would be closed is open. */
export const closeDropdownsActionCreator =
  (payload: Parameters<typeof closeDropdowns>[1] = {}): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    // avoid dispatching if all dropdowns are already closed
    if (dropdownStateKeysToClose(payload).some(stateKey => state[stateKey as keyof State])) {
      dispatch({ type: 'closeDropdowns', ...payload })
    }
  }

export default closeDropdowns

// Register this action's metadata
registerActionMetadata('closeDropdowns', {
  undoable: false,
})
