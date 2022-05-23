import React, { createRef } from 'react'
import { act } from 'react-dom/test-utils'
import { mount, ReactWrapper } from 'enzyme'
import { wrapInTestContext } from 'react-dnd-test-utils'

import { initialize } from '../initialize'
import { Provider } from 'react-redux'
import { store } from '../store'
import * as db from '../data-providers/dexie'
import { clear } from '../action-creators'
import { Await } from '../@types'

// components
import AppComponent from '../components/AppComponent'
import ErrorBoundaryContainer from '../components/ErrorBoundaryContainer'
import TouchMonitor from '../components/TouchMonitor'
import testTimer from './testTimer'
import { storage } from '../util/storage'

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

const fakeTimer = testTimer()

/* Note: After each component tests, there may be possible chance of asychronous calls calling dispatch altering state of new running test. */

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  // store wrapper using closure since act cannot return
  let wrapper: ReactWrapper | null = null // eslint-disable-line fp/no-let

  fakeTimer.useFakeTimer()

  // calls initEvents, which must be manually cleaned up
  // Note: Why not await ? Please read caveat section of https://github.com/cybersemics/em/issues/919#issuecomment-739135971
  initialize().then(init => {
    cleanup = init.cleanup
  })

  // Note: Flushing all the setTimeouts and promises (including db calls). If not flushed some asynchronous calls gets called even after test completion and affect another running test initial state.
  await fakeTimer.runAllAsync()

  await act(async () => {
    const root = document.body.appendChild(document.createElement('div'))

    window.location.hostname = 'localhost'

    // using test drag and drop backend and context
    const TestApp = wrapInTestContext(App)
    const dndRef = createRef<HTMLElement>()
    fakeTimer.useFakeTimer()

    wrapper = await mount(<TestApp ref={dndRef} />, { attachTo: root })
    wrapper.update()
    // dismiss the tutorial
    const skipTutorial = wrapper.find('#skip-tutorial')
    skipTutorial.simulate('click')

    // flush all the promises before the actual test starts
    await fakeTimer.runAllAsync()

    // make DND ref available for drag and drop tests.
    document.DND = dndRef.current

    // wait for lazy components
    await import('../components/Content')

    wrapper.update()
  })

  fakeTimer.useRealTimer()

  // Note: Use jest fake timer by default. It allows flushing microtasks. But inorder to flush promises use test timer that uses sinon.
  jest.useFakeTimers()

  // since act cannot return anything, we have to wait for wrapper to be set and then convince Typescript that it is not being used before it is assigned
  return wrapper as unknown as ReactWrapper<unknown, unknown>
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

    fakeTimer.useFakeTimer()
    if (db.db.isOpen()) db.clearAll()
    await fakeTimer.runAllAsync()
    fakeTimer.useRealTimer()
    document.body.innerHTML = ''

    // set url back to home
    window.history.pushState({}, '', '/')
  })
}

/** Refresh the test app. */
export const refreshTestApp = async () => {
  fakeTimer.useFakeTimer()
  store.dispatch(clear())
  await fakeTimer.runAllAsync()
  initialize()
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()
}

export default createTestApp
