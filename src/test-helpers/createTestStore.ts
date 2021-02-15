import { applyMiddleware, compose, createStore, Store } from 'redux'
import thunk from 'redux-thunk'
import multi from '../redux-middleware/multi'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { never } from '../util/never'
import undoRedoReducerEnhancer from '../redux-enhancers/undoRedoReducerEnhancer'
import { State } from '../util/initialState'

// import directly to avoid circular import
import importText from '../action-creators/importText'
import appReducer from '../reducers/app'

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
