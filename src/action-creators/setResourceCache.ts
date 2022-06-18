import setResourceCache from '../reducers/setResourceCache'
import Thunk from '../@types/Thunk'

/** Action-creator for setResourceCache. */
const setResourceCacheActionCreator =
  (payload: Parameters<typeof setResourceCache>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setResourceCache', ...payload })

export default setResourceCacheActionCreator
