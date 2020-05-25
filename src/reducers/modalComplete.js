/**
 * Close a modal permanently.
 * SIDE EFFECTS: localStorage.
 */
export default ({ modals }, { id }) => {
  localStorage.setItem('modal-complete-' + id, true)
  return {
    showModal: null,
    modals: Object.assign({}, modals, {
      [id]: Object.assign({}, modals[id], {
        complete: true
      })
    })
  }
}
