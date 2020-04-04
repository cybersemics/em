import { store } from '../store'

export default thoughtsRanked => {
  if (thoughtsRanked || store.getState().expandContextThought) {
    store.dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}
