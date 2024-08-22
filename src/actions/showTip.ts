import State from '../@types/State'
import Thunk from '../@types/Thunk'
import TipId from '../@types/TipId'

/** Shows a popup with a tip. */
const showTip = (state: State, { tip }: { tip: TipId }): State => ({
  ...state,
  tips: state.tips.includes(tip) ? state.tips : [...state.tips, tip],
})

/** Action-creator for showTip. */
export const showTipActionCreator =
  (payload: Parameters<typeof showTip>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'showTip', ...payload })

export default showTip
