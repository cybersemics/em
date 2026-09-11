import store from '../stores/app'
import headValue from '../util/headValue'

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

export default multicursorValues
