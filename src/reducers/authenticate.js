export default (state, { value, user, userRef }) => ({
  // autologin must be stored in localStorage separately since it is not modified on every authentication
  // assume firebase is connected and return to connected state
  authenticated: value,
  autologin: value || state.autologin,
  status: value ? 'loading' : 'disconnected',
  user,
  userRef,
})
