/**
 * Defines the Redux app reducer, loads middleware and enhancers, and exports a global store.
 */
import { applyMiddleware, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'
import cursorChanged from '../redux-enhancers/cursorChanged'
import pushQueue from '../redux-enhancers/pushQueue'
import storageCache from '../redux-enhancers/storageCache'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import freeThoughts from '../redux-middleware/freeThoughts'
import multi from '../redux-middleware/multi'
import pullQueue from '../redux-middleware/pullQueue'
import reducerThunk from '../redux-middleware/reducerThunk'
import updateUrlHistory from '../redux-middleware/updateUrlHistory'

const composeEnhancers = composeWithDevTools({ trace: true })

if (!appReducer) {
  throw new Error('appReducer is undefined. This probably means there is a circular import.')
}

const middlewareEnhancer = applyMiddleware(
  multi,
  // reducerThunk must go before the thunk middleware since the thunk middleware assumes all functions are thunks
  reducerThunk,
  thunk,
  pullQueue,
  updateUrlHistory,
  freeThoughts,
)

const store = createStore(
  appReducer,
  composeEnhancers(
    middlewareEnhancer,
    storageCache,
    undoRedoEnhancer,
    cursorChanged,
    // pushQueue must go at the end to ensure it clears state.pushQueue before other enhancers
    pushQueue,
  ),
)

export default store
