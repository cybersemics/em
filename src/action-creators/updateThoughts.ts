import updateThoughts from '../reducers/updateThoughts'
import Thunk from '../@types/Thunk'

/** Action-creator for updateThoughts. */
const updateThoughtsActionCreator =
  (payload: Parameters<typeof updateThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'updateThoughts', ...payload })

export default updateThoughtsActionCreator
