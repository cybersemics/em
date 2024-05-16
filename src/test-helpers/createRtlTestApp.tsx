import { render } from '@testing-library/react'
import React, { createRef } from 'react'
import { wrapInTestContext } from 'react-dnd-test-utils'
import { act } from 'react-dom/test-utils'
import { Provider } from 'react-redux'
import Await from '../@types/Await'
import { clearActionCreator as clear } from '../actions/clear'
import AppComponent from '../components/AppComponent'
import ErrorBoundaryContainer from '../components/ErrorBoundaryContainer'
import TouchMonitor from '../components/TouchMonitor'
import * as db from '../data-providers/yjs/thoughtspace'
import { initialize } from '../initialize'
import store from '../stores/app'
import storage from '../util/storage'

/**
 * Test App.
 */
// eslint-disable-next-line
export const App = React.forwardRef(() => (
  <Provider store={store}>
    <ErrorBoundaryContainer>
      <TouchMonitor>
        <AppComponent />
      </TouchMonitor>
    </ErrorBoundaryContainer>
  </Provider>
))
let cleanup: Await<ReturnType<typeof initialize>>['cleanup']

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  await act(async () => {
    vi.useFakeTimers()

    // calls initEvents, which must be manually cleaned up
    const init = await initialize()
    cleanup = init.cleanup

    // const root = document.body.appendChild(document.createElement('div'))

    // using test drag and drop backend and context
    const TestApp = wrapInTestContext(App)
    const dndRef = createRef<HTMLElement>()

    render(<TestApp ref={dndRef} />)

    store.dispatch([
      // skip tutorial
      { type: 'tutorial', value: false },

      // close welcome modal
      { type: 'closeModal' },
    ])

    vi.runOnlyPendingTimers()

    // make DND ref available for drag and drop tests.
    document.DND = dndRef.current
  })
}

/** Clear store, localStorage, local db, and window event handlers. */
export const cleanupTestApp = async () => {
  await act(async () => {
    // clear localStorage before dispatching clear action, since initialState reads from localStorage
    storage.clear()

    // cleanup initEvents which is called in initialize
    if (cleanup) {
      cleanup()
    }

    store.dispatch(clear({ full: true }))

    await db.clear()
    document.body.innerHTML = ''

    // set url back to home
    window.history.pushState({}, '', '/')

    vi.runOnlyPendingTimers()
  })
}

/** Refresh the test app. */
export const refreshTestApp = async () => {
  await act(async () => {
    await store.dispatch(clear())
    await initialize()
  })
}

export default createTestApp
