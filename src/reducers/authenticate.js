export const authenticate = (state, { value, user, userRef }) => ({
  // autologin is set to true in separate 'settings' action to set localStorage
  // assume firebase is connected and return to connected state
  authenticated: value,
  status: value ? 'loading' : 'disconnected',
  user,
  userRef
})
