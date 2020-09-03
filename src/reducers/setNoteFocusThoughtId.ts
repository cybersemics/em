import { State } from '../util/initialState'

/** Set id of the node which needs to set focus on a note component when at its initial render. */
const setNoteFocusThoughtId = (state: State, { value }: { value: string | null }) => ({
  ...state,
  noteFocusThoughtId: value
})

export default setNoteFocusThoughtId
