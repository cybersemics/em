import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'

/** Stores the cursor so that it can be restored after the search is closed. */
const cursorBeforeSearch = (state: State, { value }: { value: Path | null }) => ({
  ...state,
  cursorBeforeSearch: value,
})

export default _.curryRight(cursorBeforeSearch)
