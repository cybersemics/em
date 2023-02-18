/**
 * Defines the Redux app reducer, loads middleware and enhancers, and exports a global store.
 */
import { applyMiddleware, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import appReducer from '../reducers/app'
import cursorChanged from '../redux-enhancers/cursorChanged'
import pushQueue from '../redux-enhancers/pushQueue'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import multi from '../redux-middleware/multi'
import pullQueue from '../redux-middleware/pullQueue'
import updateUrlHistory from '../redux-middleware/updateUrlHistory'

const composeEnhancers = composeWithDevTools({ trace: true })

if (!appReducer) {
  throw new Error('appReducer is undefined. This probably means there is a circular import.')
}

const store = createStore(
  appReducer,
  composeEnhancers(
    applyMiddleware(multi, thunk, pullQueue, updateUrlHistory),
    undoRedoEnhancer,
    cursorChanged,
    // must go at the end to ensure it clears the pushQueue before other enhancers
    pushQueue,
  ),
)

export default store
