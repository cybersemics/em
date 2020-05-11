// selectors
import canShowModal from '../selectors/canShowModal'

export default (state, { id, thoughtIndex }) =>
  canShowModal(state, id)
    ? {
      showModal: id,
      showModalIcon: null,
      modalData: thoughtIndex || state.modalData
    }
    : {}
