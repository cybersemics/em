import State from '../@types/State'
import Thunk from '../@types/Thunk'
import TipId from '../@types/TipId'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { toggleDropdownActionCreator as toggleDropdown } from './toggleDropdown'

/** Shows a tip popup at the bottom of the screen. */
const showTip = (state: State, { tip }: { tip: TipId }): State => ({
  ...state,
  tip,
})

/** Action-creator for showTip. */
export const showTipActionCreator =
  (payload: Parameters<typeof showTip>[1]): Thunk =>
  (dispatch, getState) => {
    // Close any open dropdown (e.g. Command Center) so the tip is visible.
    dispatch(toggleDropdown())
    dispatch({ type: 'showTip', ...payload })
  }

export default showTip

// Register this action's metadata
registerActionMetadata('showTip', {
  undoable: false,
})
