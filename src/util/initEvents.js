import { store } from '../store'
import { keyDown, keyUp } from '../shortcuts'

// util
import { decodeThoughtsUrl } from './decodeThoughtsUrl'

export const initEvents = () => {
  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)

  window.addEventListener('popstate', () => {
    const { thoughtIndex, contextIndex } = store.getState()
    const { thoughtsRanked, contextViews } = decodeThoughtsUrl(window.location.pathname, thoughtIndex, contextIndex)
    store.dispatch({ type: 'setCursor', thoughtsRanked, replaceContextViews: contextViews })
  })

  window.addEventListener('error', e => {
    // ignore generic script error caused by a firebase disconnect (cross-site error)
    // https://blog.sentry.io/2016/05/17/what-is-script-error
    if (e.message === 'Script error.') return

    console.error(e)
    store.dispatch({ type: 'error', value: e.message })
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
