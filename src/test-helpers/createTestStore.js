import { applyMiddleware, compose, createStore } from 'redux'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'
import appReducer from '../reducers/app'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { never } from '../util'
import undoRedoReducerEnhancer from '../redux-enhancers/undoRedoReducerEnhancer'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {

  const store = createStore(
    appReducer,
    compose(applyMiddleware(
      multi,
      thunk
    ), undoRedoReducerEnhancer)
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
