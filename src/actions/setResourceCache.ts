import _ from 'lodash'
import { registerActionMetadata } from '../@types/ActionMetadata'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Sets a value in the resource cache. */
const setResourceCache = (state: State, { key, value }: { key: string; value: boolean }) => ({
  ...state,
  resourceCache: {
    ...state.resourceCache,
    [key]: value,
  },
})

/** Action-creator for setResourceCache. */
export const setResourceCacheActionCreator =
  (payload: Parameters<typeof setResourceCache>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setResourceCache', ...payload })

export default _.curryRight(setResourceCache)

// Register this action's metadata
registerActionMetadata('setResourceCache', {
  undoable: false,
})
