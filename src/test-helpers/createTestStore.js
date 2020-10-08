import { applyMiddleware, compose, createStore } from 'redux'
import multi from 'redux-multi'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
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

  // initialize settings
  store.dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))

  // skip tutorial
  store.dispatch({ type: 'modalComplete', id: 'welcome' })

  //  close welcome modal
  store.dispatch({ type: 'tutorial', value: false })

  return store
}
