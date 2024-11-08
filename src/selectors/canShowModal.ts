import State from '../@types/State'

/**
 * Returns true if a modal is not completed or suspended, and there is not another modal being shown.
 */
const canShowModal = (state: State, id: string): boolean =>
  state && (!state.showModal || state.showModal === id) && !state.modals[id].complete

export default canShowModal
