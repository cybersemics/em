import { Store, applyMiddleware, compose, createStore } from 'redux'
import thunk from 'redux-thunk'
import State from '../@types/State'
import appReducer from '../reducers/app'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import multi from '../redux-middleware/multi'

/**
 * Returns new store for test.
 */
export const createTestStore = () => {
  const store = createStore(appReducer, compose(applyMiddleware(multi, thunk), undoRedoEnhancer))

  store.dispatch([
    // skip tutorial
    { type: 'tutorial', value: false },

    // close welcome modal
    { type: 'closeModal' },
  ])

  return store as Store<State, any>
}
