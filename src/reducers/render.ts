import { State } from '../util/initialState'

/** Forces a full re-render. */
const render = (state: State) => ({
  ...state,
  dataNonce: state.dataNonce + 1
})

export default render
