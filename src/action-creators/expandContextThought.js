import { store } from '../store.js'

export default thoughtsRanked => {
  if (thoughtsRanked || store.getState().present.expandContextThought) {
    store.dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}
