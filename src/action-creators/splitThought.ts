import Thunk from '../@types/Thunk'
import splitThought from '../reducers/splitThought'

/** Action-creator for splitThought. */
const splitThoughtActionCreator =
  (payload: Parameters<typeof splitThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'splitThought', ...payload })

export default splitThoughtActionCreator
