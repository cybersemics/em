import Thunk from '../@types/Thunk'
import setFirstSubthought from '../reducers/setFirstSubthought'

/** Action-creator for setFirstSubthought. */
const setFirstSubthoughtActionCreator =
  (payload: Parameters<typeof setFirstSubthought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setFirstSubthought', ...payload })

export default setFirstSubthoughtActionCreator
