import { render } from '../reducers'
import { State } from '../util/initialState'

/** Merges loaded state. */
const loadLocalState = (state: State, { newState }: { newState: State }) =>
  render({
    ...state,
    recentlyEdited: {
      ...state.recentlyEdited,
      ...newState.recentlyEdited
    },
    schemaVersion: newState.schemaVersion,
  })

export default loadLocalState
