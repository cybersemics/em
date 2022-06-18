import insertMultipleThoughts from '../reducers/insertMultipleThoughts'
import Thunk from '../@types/Thunk'

/** Action-creator for insertMultipleThoughts. */
const insertMultipleThoughtsActionCreator =
  (payload: Parameters<typeof insertMultipleThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'insertMultipleThoughts', ...payload })

export default insertMultipleThoughtsActionCreator
