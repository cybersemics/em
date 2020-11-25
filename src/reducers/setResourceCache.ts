import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets a value in the resource cache. */
const setResourceCache = (state: State, { key, value }: { key: string, value: boolean }) => ({
  ...state,
  resourceCache: {
    ...state.resourceCache,
    [key]: value
  }
})

export default _.curryRight(setResourceCache)
