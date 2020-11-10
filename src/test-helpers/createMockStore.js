import configureStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'

/**
 * Returns new mock store for tests.
 */
export const createMockStore = () =>
  configureStore([multi, thunk])
