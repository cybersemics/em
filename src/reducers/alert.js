export default (state, { value, showCloseLink }) => ({
  alert: value ? { value, showCloseLink } : null
})
