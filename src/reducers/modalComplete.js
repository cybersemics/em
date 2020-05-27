/**
 * Close a modal permanently.
 * SIDE EFFECTS: localStorage.
 */
export default (state, { id }) => {
  localStorage.setItem('modal-complete-' + id, true)
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
