import { applyMiddleware, compose, createStore, Store } from 'redux'
import thunk from 'redux-thunk'
import { State } from '../@types'
import { importText } from '../action-creators'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import appReducer from '../reducers/app'
import undoRedoReducerEnhancer from '../redux-enhancers/undoRedoReducerEnhancer'
import multi from '../redux-middleware/multi'
import { never } from '../util'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {
  const store = createStore(appReducer, compose(applyMiddleware(multi, thunk), undoRedoReducerEnhancer))

  store.dispatch([
    importText({
      path: [{ value: EM_TOKEN, rank: 0 }],
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
