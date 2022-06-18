import moveThought from '../reducers/moveThought'
import Thunk from '../@types/Thunk'

/** Action-creator for moveThought. */
const moveThoughtActionCreator =
  (payload: Parameters<typeof moveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'moveThought', ...payload })

export default moveThoughtActionCreator
