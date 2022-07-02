import Thunk from '../@types/Thunk'
import setResourceCache from '../reducers/setResourceCache'

/** Action-creator for setResourceCache. */
const setResourceCacheActionCreator =
  (payload: Parameters<typeof setResourceCache>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setResourceCache', ...payload })

export default setResourceCacheActionCreator
