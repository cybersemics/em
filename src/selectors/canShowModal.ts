import { store } from '../store'

/**
 *
 */
const canShowModal = (state: any, id: number | string) => {
  state = state || (typeof store !== 'undefined' ? store.getState() : null)
  return state &&
    (!state.showModal || state.showModal === id) &&
    !state.modals[id].complete &&
    state.modals[id].hideuntil < Date.now()
}

export default canShowModal
