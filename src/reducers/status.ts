import { State } from '../util/initialState'

/** Sets the connection status. */
const status = (state: State, { value }: { value: string }) => ({
  ...state,
  status: value
})

export default status
