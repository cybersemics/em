import { State } from '../util/initialState'

/** PushQueueLength.  */
const pushQueueLengthSelector = (state: State) => state.pushQueue.length

export default pushQueueLengthSelector
