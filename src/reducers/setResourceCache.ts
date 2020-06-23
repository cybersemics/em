import { State } from '../util/initialState'

/** Sets a value in the resource cache. */
const setResourceCache = (state: State, { key, value }: { key: string, value: string }) => ({
  ...state,
  resourceCache: {
    ...state.resourceCache,
    [key]: value
  }
})

export default setResourceCache
