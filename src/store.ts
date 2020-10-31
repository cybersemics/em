/**
 * Defines the Redux app reducer and exports a global store.
 * NOTE: Exporting the store is not compatible with server-side rendering.
 *
 */

import { applyMiddleware, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import multi from './redux-middleware/multi'
import syncQueue from './redux-middleware/syncQueue'
import thoughtCacheMiddleware from './redux-middleware/thoughtCacheMiddleware'
import updateUrlHistory from './redux-middleware/updateUrlHistory'
import appReducer from './reducers/app'
import undoRedoReducerEnhancer from './redux-enhancers/undoRedoReducerEnhancer'

const composeEnhancers = composeWithDevTools({ trace: true })

export const store = createStore(
  appReducer,
  composeEnhancers(applyMiddleware(
    multi,
    thunk,
    syncQueue,
    thoughtCacheMiddleware,
    updateUrlHistory
  ), undoRedoReducerEnhancer)
)
