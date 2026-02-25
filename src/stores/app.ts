/**
 * Defines the Redux app reducer, loads middleware and enhancers, and exports a global store.
 */
import { composeWithDevTools } from '@redux-devtools/extension'
import _ from 'lodash'
import { applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import appReducer from '../actions/app'
import pushQueue from '../redux-enhancers/pushQueue'
import storageCache from '../redux-enhancers/storageCache'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import updateJumpHistory from '../redux-enhancers/updateJumpHistoryEnhancer'
import validateStateEnhancer from '../redux-enhancers/validateStateEnhancer'
import clearSelection from '../redux-middleware/clearSelection'
import doNotDispatchReducer from '../redux-middleware/doNotDispatchReducer'
import freeThoughts from '../redux-middleware/freeThoughts'
import multi from '../redux-middleware/multi'
import multicursorAlertMiddleware from '../redux-middleware/multicursorAlertMiddleware'
import pullQueue from '../redux-middleware/pullQueue'
import updateEditingValue from '../redux-middleware/updateEditingValue'
import updateUrlHistory from '../redux-middleware/updateUrlHistory'
import validateActionRegistrations from '../util/actionMetadata.registry'

// composeWithDevTools is typed as redux.compose, which hard codes up to four function arguments.
// Therefore, type it as the functionally equivalent _.flowRight in order to compose more than four enhancers.
const composeEnhancers: typeof _.flowRight = composeWithDevTools({ trace: true })

if (!appReducer) {
  throw new Error('appReducer is undefined. This probably means there is a circular import.')
}

const middlewareEnhancer = applyMiddleware(
  // prevent accidentally passing a reducer to the dispatch function (dev and test only)
  // (must go before the thunk middleware so that it can throw an error before the thunk middleware tries to execute it)
  ...(import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test' ? [doNotDispatchReducer] : []),
  multi,
  thunk,
  pullQueue,
  clearSelection,
  updateEditingValue,
  updateUrlHistory,
  freeThoughts,
  multicursorAlertMiddleware,
)

// only validate Redux state in dev and test environments
const validateStateEnhancerDevOnly =
  import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test' ? [validateStateEnhancer] : null

const store = createStore(
  appReducer,
  composeEnhancers(
    // validate state before production enhancers run
    ...(validateStateEnhancerDevOnly || []),
    middlewareEnhancer,
    storageCache,
    undoRedoEnhancer,
    updateJumpHistory,
    // must go at the end to ensure it clears the pushQueue before other enhancers
    pushQueue,
    // validate state again after production enhancers run
    ...(validateStateEnhancerDevOnly || []),
  ),
)

// Run validation
if (import.meta.env.MODE === 'development') {
  // This can be safely called here because it lazy-loads the actions module
  validateActionRegistrations()
}

export default store
