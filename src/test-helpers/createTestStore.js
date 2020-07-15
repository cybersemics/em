import { applyMiddleware, createStore } from 'redux'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'

/**
 * Returns new store for test.
 */
export const createTestStore = () => createStore(
  appReducer,
  applyMiddleware(
    thunk
  )
)
