import { Store, applyMiddleware, compose, createStore } from 'redux'
import thunk from 'redux-thunk'
import State from '../@types/State'
import importText from '../action-creators/importText'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import appReducer from '../reducers/app'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import multi from '../redux-middleware/multi'
import never from '../util/never'

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
