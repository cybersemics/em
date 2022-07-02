import Thunk from '../@types/Thunk'
import createThought from '../reducers/createThought'

/** Action-creator for createThought. */
const createThoughtActionCreator =
  (payload: Parameters<typeof createThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'createThought', ...payload })

export default createThoughtActionCreator
