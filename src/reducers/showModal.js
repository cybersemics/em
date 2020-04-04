// util
import {
  canShowModal,
} from '../util'

export default (state, { id, thoughtIndex }) =>
  canShowModal(id, state)
    ? {
      showModal: id,
      showModalIcon: null,
      modalData: thoughtIndex || state.modalData
    }
    : {}
