import createThought from '../reducers/createThought'
import Thunk from '../@types/Thunk'

/** Action-creator for createThought. */
const createThoughtActionCreator =
  (payload: Parameters<typeof createThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'createThought', ...payload })

export default createThoughtActionCreator
