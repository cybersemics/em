import { applyMiddleware, createStore } from 'redux'
import multi from 'redux-multi'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { never } from '../util'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {

  const store = createStore(
    appReducer,
    applyMiddleware(
      multi,
      thunk
    )
  )

  store.dispatch([

    // initialize settings
    importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, {
      lastUpdated: never(),
      preventSetCursor: true,
    }),

    // skip tutorial
    { type: 'modalComplete', id: 'welcome' },

    // close welcome modal
    { type: 'tutorial', value: false },

  ])

  return store
}
