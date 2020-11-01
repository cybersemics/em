import { State } from '../util/initialState'

/**
 * Returns true if a modal is not completed or suspended, and there is not another modal being shown.
 */
const canShowModal = (state: State, id: string): boolean => state &&
  (!state.showModal || state.showModal === id) &&
  !state.modals[id].complete &&
  state.modals[id].hideuntil < Date.now()

export default canShowModal
