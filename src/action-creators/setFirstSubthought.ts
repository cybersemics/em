import setFirstSubthought from '../reducers/setFirstSubthought'
import Thunk from '../@types/Thunk'

/** Action-creator for setFirstSubthought. */
const setFirstSubthoughtActionCreator =
  (payload: Parameters<typeof setFirstSubthought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setFirstSubthought', ...payload })

export default setFirstSubthoughtActionCreator
