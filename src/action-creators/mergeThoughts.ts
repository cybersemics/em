import mergeThoughts from '../reducers/mergeThoughts'
import Thunk from '../@types/Thunk'

/** Action-creator for mergeThoughts. */
const mergeThoughtsActionCreator =
  (payload: Parameters<typeof mergeThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'mergeThoughts', ...payload })

export default mergeThoughtsActionCreator
