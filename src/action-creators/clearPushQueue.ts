import Thunk from '../@types/Thunk'

/** Action-creator for clearPushQueue. */
const clearPushQueueActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearPushQueue' })

export default clearPushQueueActionCreator
