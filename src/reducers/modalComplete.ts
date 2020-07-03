import { State } from '../util/initialState'

/**
 * Close a modal permanently.
 * SIDE EFFECTS: localStorage.
 */
const modalComplete = (state: State, { id }: { id: string }) => {
  localStorage.setItem('modal-complete-' + id, 'true')
  return {
    ...state,
    showModal: null,
    modals: {
      ...state.modals,
      [id]: {
        ...state.modals[id],
        complete: true
      }
    }
  }
}

export default modalComplete
