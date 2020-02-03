import { store } from '../store.js'
import { handleKeyboard } from '../shortcuts.js'

// util
import { decodeThoughtsUrl } from './decodeThoughtsUrl.js'
import { restoreSelection } from './restoreSelection.js'

export const initEvents = () => {
  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', handleKeyboard)

  window.addEventListener('popstate', () => {

    const { thoughtIndex, contextIndex } = store.getState()

    const { thoughtsRanked, contextViews } = decodeThoughtsUrl(window.location.pathname, thoughtIndex, contextIndex)
    store.dispatch({ type: 'setCursor', thoughtsRanked, replaceContextViews: contextViews })
    restoreSelection(thoughtsRanked)
  })

  // disabled until ngram linking is implemented
  // document.addEventListener('selectionchange', () => {
  //   const focusOffset = window.getSelection().focusOffset
  //   store.dispatch({
  //     type: 'selectionChange',
  //     focusOffset
  //   })
  // })
}
