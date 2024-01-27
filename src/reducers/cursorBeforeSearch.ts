import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

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
