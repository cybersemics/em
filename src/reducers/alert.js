export default (state, { value, x }) => ({
  alert: value ? { value, x } : null
})
