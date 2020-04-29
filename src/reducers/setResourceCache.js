export default (state, { key, value }) => ({
  resourceCache: {
    ...state.resourceCache,
    [key]: value
  }
})
