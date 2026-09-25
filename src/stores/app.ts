/**
 * Defines the Redux app reducer, loads middleware and enhancers, and exports a global store.
 */
import { composeWithDevTools } from '@redux-devtools/extension'
import _ from 'lodash'
import { applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import appReducer from '../actions/app'
import storageCache from '../redux-enhancers/storageCache'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import updateJumpHistory from '../redux-enhancers/updateJumpHistoryEnhancer'
import validateStateEnhancer from '../redux-enhancers/validateStateEnhancer'
import clearSelection from '../redux-middleware/clearSelection'
import closeDropdownsWhenCursorNull from '../redux-middleware/closeDropdownsWhenCursorNull'
import doNotDispatchReducer from '../redux-middleware/doNotDispatchReducer'
import loggerMiddleware from '../redux-middleware/loggerMiddleware'
import multi from '../redux-middleware/multi'
import multicursorAlertMiddleware from '../redux-middleware/multicursorAlertMiddleware'
import multiselectCursorMiddleware from '../redux-middleware/multiselectCursorMiddleware'
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
  clearSelection,
  updateEditingValue,
  updateUrlHistory,
  loggerMiddleware,
  multicursorAlertMiddleware,
  multiselectCursorMiddleware,
  closeDropdownsWhenCursorNull,
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
    updateJumpHistory,
    // validate state again after production enhancers run
    ...(validateStateEnhancerDevOnly || []),
    // Run commands and history before entering Redux; the Redux reducer only publishes the prepared snapshot.
    undoRedoEnhancer,
  ),
)

// Run validation
if (import.meta.env.MODE === 'development') {
  // This can be safely called here because it lazy-loads the actions module
  validateActionRegistrations()
}

export default store
