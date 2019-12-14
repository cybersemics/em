import { store } from '../store.js'
import { handleKeyboard } from '../shortcuts.js'

// util
import { decodeItemsUrl } from './decodeItemsUrl.js'
import { restoreSelection } from './restoreSelection.js'

export const initEvents = () => {
  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', handleKeyboard)

  window.addEventListener('popstate', () => {
    const { itemsRanked, contextViews } = decodeItemsUrl(window.location.pathname, store.getState().data)
    store.dispatch({ type: 'setCursor', itemsRanked, replaceContextViews: contextViews })
    restoreSelection(itemsRanked)
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
