import Thunk from '../@types/Thunk'
import toggleThought from '../reducers/toggleThought'

/** Action-creator for toggleThought. */
const toggleThoughtActionCreator =
  (payload: Parameters<typeof toggleThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleThought', ...payload })

export default toggleThoughtActionCreator
