/** Set an alert with an optional close link. */
export default (state, { value, showCloseLink }) => ({
  alert: value ? { value, showCloseLink } : null
})
