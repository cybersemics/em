// SIDE EFFECTS: localStorage
export const helperComplete = ({ helpers }, { id }) => {
  localStorage['helper-complete-' + id] = true
  return {
    showHelper: null,
    helpers: Object.assign({}, helpers, {
      [id]: Object.assign({}, helpers[id], {
        complete: true
      })
    })
  }
}
