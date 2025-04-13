import State from '../@types/State'
import Thunk from '../@types/Thunk'
import TipId from '../@types/TipId'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Shows a popup with a tip and clears any existing alert. */
const showTip = (state: State, { tip }: { tip: TipId }): State => ({
  ...state,
  // for now, don't allow stacking tips
  tips: [tip],
  // clear any existing alert when showing a tip
  ...(tip && { alert: null }),
})

/** Action-creator for showTip. */
export const showTipActionCreator =
  (payload: Parameters<typeof showTip>[1]): Thunk =>
  dispatch => {
    dispatch({ type: 'showTip', ...payload })
  }

export default showTip

// Register this action's metadata
registerActionMetadata('showTip', {
  undoable: false,
})
