// util
import {
  canShowModal,
} from '../util.js'

export const showModal = (state, { id, thoughtIndex }) =>
  canShowModal(id, state)
    ? {
      showModal: id,
      showModalIcon: null,
      modalData: thoughtIndex || state.modalData
    }
    : {}
