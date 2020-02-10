import { store } from '../store.js'

export default thoughtsRanked => {
  if (thoughtsRanked || store.getState().expandContextThought) {
    store.dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}
