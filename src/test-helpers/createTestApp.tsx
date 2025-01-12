import { render } from '@testing-library/react'
import { act, createRef } from 'react'
import { DndProvider } from 'react-dnd'
import { TestBackend } from 'react-dnd-test-backend'
import Await from '../@types/Await'
import { clearActionCreator as clear } from '../actions/clear'
import App from '../components/App'
import * as db from '../data-providers/yjs/thoughtspace'
import { initialize } from '../initialize'
import store from '../stores/app'
import storage from '../util/storage'

let cleanup: Await<ReturnType<typeof initialize>>['cleanup']

/** Set up testing and mock document and window functions. */
const createTestApp = async ({ tutorial } = { tutorial: false }) => {
  await act(async () => {
    vi.useFakeTimers({ loopLimit: 100000 })
    // calls initEvents, which must be manually cleaned up
    const init = await initialize()
    cleanup = init.cleanup

    // const root = document.body.appendChild(document.createElement('div'))

    // using test drag and drop backend and context
    const dndRef = createRef<HTMLElement>()

    render(
      <DndProvider backend={TestBackend}>
        <App />
      </DndProvider>,
    )

    store.dispatch([
      // sometimes we wan't to show tutorial on test runs, sometimes we don't
      { type: 'tutorial', value: tutorial },

      // close welcome modal
      { type: 'closeModal' },
    ])

    await vi.runOnlyPendingTimersAsync()

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

    db.clear()
    await vi.runAllTimersAsync()

    // set url back to home
    window.history.pushState({}, '', '/')

    await vi.runAllTimersAsync()
  })
}

/** Refresh the test app. */
export const refreshTestApp = async () => {
  await act(async () => {
    await store.dispatch(clear())
    await initialize()
  })

  await act(vi.runOnlyPendingTimersAsync)
}

/** Clear exisiting event listeners, but without clearing the app. */
export const cleanupTestEventHandlers = async () => {
  await act(async () => {
    if (cleanup) {
      cleanup()
    }
  })
}

export default createTestApp
