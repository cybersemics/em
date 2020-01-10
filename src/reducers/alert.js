export const alert = (state, { value, x }) => ({
  alert: value ? { value, x } : null
})
