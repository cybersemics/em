import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Opens or closes the find bar (see FindBar). Opened by the Find command, and closed by the find bar itself. */
const showFindBar = (state: State, { value }: { value: boolean }): State =>
  state.showFindBar === value ? state : { ...state, showFindBar: value }

/** Action-creator for showFindBar. */
export const showFindBarActionCreator =
  (payload: Parameters<typeof showFindBar>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'showFindBar', ...payload })

export default _.curryRight(showFindBar)

// Opening the find bar is not an edit, so it must not participate in undo history.
registerActionMetadata('showFindBar', {
  undoable: false,
})
