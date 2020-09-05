import React, { createRef } from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'
import { wrapInTestContext } from 'react-dnd-test-utils'

import { initialize } from '../initialize'
import { cleanup as cleanupEventHandlers } from '../util/initEvents'
import { Provider } from 'react-redux'
import { store } from '../store'
import * as db from '../data-providers/dexie'

// components
import AppComponent from '../components/AppComponent'
import ErrorBoundaryContainer from '../components/ErrorBoundaryContainer'
import TouchMonitor from '../components/TouchMonitor'

/**
 * Test App.
 */
// eslint-disable-next-line
export const App = React.forwardRef(() =>
  <Provider store={store}>
    <ErrorBoundaryContainer>
      <TouchMonitor>
        <AppComponent />
      </TouchMonitor>
    </ErrorBoundaryContainer>
  </Provider>
)

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {

  // store wrapper using closure since act cannot return
  let wrapper // eslint-disable-line fp/no-let

  await act(async () => {

    // calls initEvents, which must be manually cleaned up
    await initialize()

    jest.useFakeTimers()

    const root = document.body.appendChild(document.createElement('div'))

    // using test drag and drop backend and context
    const TestApp = wrapInTestContext(App)
    const dndRef = createRef()

    wrapper = await mount(<TestApp ref={dndRef}/>, { attachTo: root })
    wrapper.update()

    // dismiss the tutorial
    const skipTutorial = wrapper.find('#skip-tutorial')
    skipTutorial.simulate('click')

    jest.runOnlyPendingTimers()
    wrapper.update()

    // make DND ref available for drag and drop tests.
    document.DND = dndRef.current
  })

  return wrapper
}

/** Clear store, localStorage, local db, and window event handlers. */
export const cleanupTestApp = async () => {
  await act(async () => {

    // clear localStorage before dispatching clear action, since initialState reads from localStorage
    localStorage.clear()

    // cleanup initEvents which is called in initialize
    cleanupEventHandlers()

    store.dispatch({ type: 'clear', full: true })
    await db.clearAll()
    document.body.innerHTML = ''

    jest.runOnlyPendingTimers()
  })
}

export default createTestApp
