/** Sets a value in the resource cache. */
export default (state, { key, value }) => ({
  resourceCache: {
    ...state.resourceCache,
    [key]: value
  }
})
