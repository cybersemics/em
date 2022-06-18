import _ from 'lodash'
import State from '../@types/State'

/** Sets a value in the resource cache. */
const setResourceCache = (state: State, { key, value }: { key: string; value: boolean }) => ({
  ...state,
  resourceCache: {
    ...state.resourceCache,
    [key]: value,
  },
})

export default _.curryRight(setResourceCache)
