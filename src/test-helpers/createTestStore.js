import { applyMiddleware, createStore } from 'redux'
import multi from 'redux-multi'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'

/**
 * Returns new store for test.
 */
export const createTestStore = () => createStore(
  appReducer,
  applyMiddleware(
    multi,
    thunk
  )
)
