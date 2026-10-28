import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Opens or closes the pinned command's tooltip. There is nothing to open while no command is pinned. */
const showPinnedCommandTooltip = (state: State, { value }: { value: boolean }): State =>
  value && !state.learning.pinnedCommandId ? state : { ...state, showPinnedCommandTooltip: value }

/** Action-creator for showPinnedCommandTooltip. */
export const showPinnedCommandTooltipActionCreator =
  (payload: Parameters<typeof showPinnedCommandTooltip>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'showPinnedCommandTooltip', ...payload })

export default _.curryRight(showPinnedCommandTooltip)

// Opening the tooltip is not an edit, so it must not participate in undo history.
registerActionMetadata('showPinnedCommandTooltip', {
  undoable: false,
})
