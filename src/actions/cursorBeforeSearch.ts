import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Stores the cursor so that it can be restored after the search is closed. */
const cursorBeforeSearch = (state: State, { value }: { value: Path | null }) => ({
  ...state,
  cursorBeforeSearch: value,
})

/** Action-creator for cursorBeforeSearch. */
export const cursorBeforeSearchActionCreator =
  (payload: Parameters<typeof cursorBeforeSearch>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorBeforeSearch', ...payload })

export default _.curryRight(cursorBeforeSearch)

// Register this action's metadata
registerActionMetadata('cursorBeforeSearch', {
  undoable: true,
  isNavigation: true,
})
