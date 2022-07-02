import { render } from '@testing-library/react'
import React, { createRef } from 'react'
import { wrapInTestContext } from 'react-dnd-test-utils'
import { act } from 'react-dom/test-utils'
import { Provider } from 'react-redux'
import Await from '../@types/Await'
import clear from '../action-creators/clear'
// components
import AppComponent from '../components/AppComponent'
import ErrorBoundaryContainer from '../components/ErrorBoundaryContainer'
import TouchMonitor from '../components/TouchMonitor'
import * as db from '../data-providers/dexie'
import { initialize } from '../initialize'
import { store } from '../store'
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

// eslint-disable-next-line fp/no-let
let cleanup: Await<ReturnType<typeof initialize>>['cleanup']

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  await act(async () => {
    jest.useFakeTimers()

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
      { type: 'modalComplete', id: 'welcome' },

      // close welcome modal
      { type: 'tutorial', value: false },
    ])

    jest.runOnlyPendingTimers()

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

    await db.clearAll()
    document.body.innerHTML = ''

    // set url back to home
    window.history.pushState({}, '', '/')

    jest.runOnlyPendingTimers()
  })
}

export default createTestApp
