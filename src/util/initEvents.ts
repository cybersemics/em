// @ts-nocheck
import { store } from '../store'
import { inputHandlers } from '../shortcuts'
import * as db from '../db'
import { clearSelection, isRoot, scrollCursorIntoView } from '../util'
import _ from 'lodash'

// util
import { decodeThoughtsUrl } from '../selectors'
import { toggleTopControlsAndBreadcrumbs } from '../action-creators'

/** Initializes global window events. */
export const initEvents = () => {

  const { keyDown, keyUp } = inputHandlers(store)
  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)

  // setCursor on browser history forward/backward
  window.addEventListener('popstate', () => {
    const { thoughtsRanked, contextViews } = decodeThoughtsUrl(store.getState(), window.location.pathname)
    const toRoot = !thoughtsRanked || isRoot(thoughtsRanked)

    // clear the selection if root
    if (toRoot) {
      clearSelection()
    }

    // set the cursor
    // check if thoughtsRanked is the root, since decodeThoughtsUrl returns a rooted path rather than null
    store.dispatch({ type: 'setCursor', thoughtsRanked: toRoot ? null : thoughtsRanked, replaceContextViews: contextViews })

    // scroll cursor into view
    setTimeout(scrollCursorIntoView)
  })

  window.addEventListener('mousemove', _.debounce(() => store.dispatch(toggleTopControlsAndBreadcrumbs(true)), 100, { leading: true }))

  // NOTE: This does not catch React errors. See the ErrorFallback component that is used in the error boundary of the App component.
  window.addEventListener('error', e => {
    // ignore generic script error caused by a firebase disconnect (cross-site error)
    // https://blog.sentry.io/2016/05/17/what-is-script-error
    if (e.message === 'Script error.') return

    console.error(e.error.stack)
    db.log({ message: e.message, stack: e.error.stack })
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
