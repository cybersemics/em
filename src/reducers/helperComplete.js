export const helperComplete = (state) => ({ id }) => {
  localStorage['helper-complete-' + id] = true
  return {
    showHelper: null,
    helpers: Object.assign({}, state.helpers, {
      [id]: Object.assign({}, state.helpers[id], {
        complete: true
      })
    })
  }
}