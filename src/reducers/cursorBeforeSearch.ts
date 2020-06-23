import { State } from '../util/initialState'

/** Stores the cursor so that it can be restored after the search is closed. */
const cursorBeforeSearch = (state: State, { value }: { value: string }) => ({
  ...state,
  cursorBeforeSearch: value
})

export default cursorBeforeSearch
