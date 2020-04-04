import { store } from '../store'

// util
/* Navigates home and resets the scroll position */
export default () => {
  store.dispatch({ type: 'setCursor', thoughtsRanked: null, cursorHistoryClear: true })
  window.scrollTo(0, 0)
  document.getSelection().removeAllRanges()
}
