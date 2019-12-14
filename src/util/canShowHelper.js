import { store } from '../store.js'

// util
// declare using traditional function syntax so it is hoisted
export const canShowHelper = (id, state = store ? store.getState() : null) => {
  return state &&
    (!state.showHelper || state.showHelper === id) &&
    !state.helpers[id].complete &&
    state.helpers[id].hideuntil < Date.now()
}
