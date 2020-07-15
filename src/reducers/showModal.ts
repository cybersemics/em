import { canShowModal } from '../selectors'
import { State } from '../util/initialState'

/** Shows or hides a modal. */
const showModal = (state: State, { id }: { id: string }) =>
  canShowModal(state, id)
    ? {
      ...state,
      showModal: id,
      showModalIcon: null,
    }
    : state

export default showModal
