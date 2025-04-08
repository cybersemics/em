import State from '../@types/State'
import Thunk from '../@types/Thunk'
import TipId from '../@types/TipId'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { alertActionCreator } from './alert'

/** Shows a popup with a tip. */
const showTip = (state: State, { tip }: { tip: TipId }): State => ({
  ...state,
  // for now, don't allow stacking tips
  tips: [tip],
})

/** Action-creator for showTip. */
export const showTipActionCreator =
  (payload: Parameters<typeof showTip>[1]): Thunk =>
  dispatch => {
    dispatch({ type: 'showTip', ...payload })
    dispatch(alertActionCreator(null))
  }

export default showTip

// Register this action's metadata
registerActionMetadata('showTip', {
  undoable: false,
})
