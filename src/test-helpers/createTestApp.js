import React, { createRef } from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'
import { wrapInTestContext } from 'react-dnd-test-utils'

import { initialize } from '../initialize'
import { cleanup as cleanupEventHandlers } from '../util/initEvents'
import { Provider } from 'react-redux'
import { store } from '../store'
import * as db from '../db'

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
  await act(async () => {

    // calls initEvents, which must be manually cleaned up
    await initialize()

    jest.useFakeTimers()

    const root = document.body.appendChild(document.createElement('div'))

    // using test drag and drop backend and context
    const TestApp = wrapInTestContext(App)
    const dndRef = createRef()

    const wrapper = await mount(<TestApp ref={dndRef}/>,
      { attachTo: root })
    wrapper.update()

    // make DND ref available for drag and drop tests.
    document.DND = dndRef.current

    // dismiss the tutorial
    // make sure it has not already been dismissed
    // i.e. the DOM will be reused when there are multiple tests within the same file
    const skipTutorial = wrapper.find('div.modal-actions div a')
    if (skipTutorial.length > 0) {
      skipTutorial.simulate('click')
    }

    // make wrapper available to tests
    document.wrapper = wrapper
  })
}

/** Clear store and local db, and remove window event handlers. */
export const cleanupTestApp = async () => {
  store.dispatch({ type: 'clear' })
  cleanupEventHandlers() // cleanup initEvents which is called in initialize
  await db.clearAll()
  document.body.innerHTML = ''
}

export default createTestApp
