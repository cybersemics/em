import { State } from '../util/initialState'

/** Sets the search limit. */
const searchLimits = (state: State, { value }: { value: string }) => ({
  ...state,
  searchLimit: value
})

export default searchLimits
