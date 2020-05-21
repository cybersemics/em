/** Set an alert with an optional close link. */
export default (state, { value, showCloseLink, alertType }) => ({
  alert: value ? { value, showCloseLink, alertType } : null
})
