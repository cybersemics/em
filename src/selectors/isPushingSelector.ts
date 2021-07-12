import { State } from '../util/initialState'

/** Is PushingSelector.  */
const isPushingSelector = (state: State) => state.isPushing

export default isPushingSelector
