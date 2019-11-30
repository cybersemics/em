// SIDE EFFECTS: localStorage
export const helperComplete = ({ helpers }, { id }) => {
  localStorage.setItem('helper-complete-' + id, true)
  return {
    showHelper: null,
    helpers: Object.assign({}, helpers, {
      [id]: Object.assign({}, helpers[id], {
        complete: true
      })
    })
  }
}
