// selectors
import canShowModal from '../selectors/canShowModal'

/** Shows or hides a modal. */
export default (state, { id, thoughtIndex }) =>
  canShowModal(state, id)
    ? {
      showModal: id,
      showModalIcon: null,
      modalData: thoughtIndex || state.modalData
    }
    : {}
