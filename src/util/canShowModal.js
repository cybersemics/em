import { store } from '../store'

// util
// declare using traditional function syntax so it is hoisted
export const canShowModal = (id, state = store ? store.getState() : null) => {
  return state &&
    (!state.showModal || state.showModal === id) &&
    !state.modals[id].complete &&
    state.modals[id].hideuntil < Date.now()
}
