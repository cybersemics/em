/** Sets a value in the resource cache. */
export default (state, { key, value }) => ({
  ...state,
  resourceCache: {
    ...state.resourceCache,
    [key]: value
  }
})
