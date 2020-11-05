import configureStore from 'redux-mock-store'
import multi from 'redux-multi'
import thunk from 'redux-thunk'

/**
 * Returns new mock store for tests.
 */
export const createMockStore = () => {

  const store = configureStore([multi, thunk])

  return store
}
