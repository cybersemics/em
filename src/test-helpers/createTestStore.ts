import { applyMiddleware, compose, createStore } from 'redux'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'
import importText from '../reducers/importText'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { never } from '../util/never'
import undoRedoReducerEnhancer from '../redux-enhancers/undoRedoReducerEnhancer'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {

  // import at run-time to avoid circular import
  const { default: appReducer } = require('../reducers/app')

  const store = createStore(
    appReducer,
    compose(applyMiddleware(
      multi,
      thunk
    ), undoRedoReducerEnhancer)
  )

  store.dispatch([

    {
      type: 'importText',
      path: [{ value: EM_TOKEN, rank: 0 }],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    },

    // skip tutorial
    { type: 'modalComplete', id: 'welcome' },

    // close welcome modal
    { type: 'tutorial', value: false },

  ])

  return store
}
