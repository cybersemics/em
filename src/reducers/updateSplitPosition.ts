import { State } from '../util/initialState'

/** Updates the position of the Split View splitter. */
const updateSplitPosition = (state: State, { value }: { value: number }) => ({
  ...state,
  splitPosition: value
})

export default updateSplitPosition
