import { applyMiddleware, compose, createStore, Store } from 'redux'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import appReducer from '../reducers/app'
import { never } from '../util'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import { State } from '../@types'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {
  const store = createStore(appReducer, compose(applyMiddleware(multi, thunk), undoRedoEnhancer))

  store.dispatch([
    importText({
      path: [EM_TOKEN],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    }),

    // skip tutorial
    { type: 'modalComplete', id: 'welcome' },

    // close welcome modal
    { type: 'tutorial', value: false },
  ])

  return store as Store<State, any>
}
