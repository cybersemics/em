/**
 * Defines the Redux app reducer and exports a global store.
 * NOTE: Exporting the store is not compatible with server-side rendering.
 *
 */

import { applyMiddleware, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import multi from './redux-middleware/multi'
import pushQueue from './redux-middleware/pushQueue'
import pullQueue from './redux-middleware/pullQueue'
import updateUrlHistory from './redux-middleware/updateUrlHistory'
import appReducer from './reducers/app'
import undoRedoReducerEnhancer from './redux-enhancers/undoRedoReducerEnhancer'
import cursorChangedEnhancer from './redux-enhancers/cursorChanged'

const composeEnhancers = composeWithDevTools({ trace: true })

if (!appReducer) {
  throw new Error('appReducer is undefined. This probably means there is a circular import.')
}

export const store = createStore(
  appReducer,
  composeEnhancers(applyMiddleware(
    multi,
    thunk,
    pushQueue,
    pullQueue,
    updateUrlHistory
  ), undoRedoReducerEnhancer, cursorChangedEnhancer)
)
