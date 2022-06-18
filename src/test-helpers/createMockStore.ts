import configureStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'
import State from '../@types/State'

/**
 * Returns new mock store for tests.
 */
export const createMockStore = () => configureStore<State>([multi, thunk])
