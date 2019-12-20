// SIDE EFFECTS: localStorage
export const modalComplete = ({ modals }, { id }) => {
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
