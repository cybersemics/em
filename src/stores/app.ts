/**
 * Defines the Redux app reducer, loads middleware and enhancers, and exports a global store.
 */
import { composeWithDevTools } from '@redux-devtools/extension'
import _ from 'lodash'
import { StoreEnhancer, applyMiddleware, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import EditorStore from '../@types/EditorStore'
import appReducer from '../actions/app'
import db from '../data-providers/thoughtspace'
import commandExecutionEnhancer from '../redux-enhancers/commandExecutionEnhancer'
import storageCache from '../redux-enhancers/storageCache'
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

const middleware = [
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
]

// only validate Redux state in dev and test environments
const validateStateEnhancerDevOnly =
  import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test' ? [validateStateEnhancer] : null

/** Coalesces editor notifications until a synchronous dispatch returns, without deferring state changes. */
const batchEditorNotifications: StoreEnhancer =
  createStore =>
  (...args) => {
    const listeners = new Set<() => void>()
    let dispatching = false
    let pending = false

    /** Relays the latest state once the outer dispatch has finished, including when it throws. */
    const notify = () => {
      pending = dispatching
      if (!dispatching) Array.from(listeners).forEach(listener => listener())
    }
    // Batch inside the middleware chain so a thunk's dispatch also enters it after an await.
    const store = applyMiddleware(
      () => next => action => {
        const wasDispatching = dispatching
        dispatching = true
        try {
          return next(action)
        } finally {
          // A returned Promise does not extend the synchronous batch across an await.
          dispatching = wasDispatching
          if (!dispatching && pending) notify()
        }
      },
      ...middleware,
    )(createStore)(...args)
    store.subscribe(notify)

    return {
      ...store,
      subscribe: listener => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
  }

const editorStore = createStore(
  appReducer,
  composeEnhancers(
    // validate state before production enhancers run
    ...(validateStateEnhancerDevOnly || []),
    batchEditorNotifications,
    storageCache,
    updateJumpHistory,
    // validate state again after production enhancers run
    ...(validateStateEnhancerDevOnly || []),
    // Execute commands before entering Redux; history is prepared within the same boundary.
    commandExecutionEnhancer,
  ),
) as unknown as EditorStore

const store = {
  ...editorStore,
  // React Redux dispatch still enters the complete command/middleware pipeline.
  uiStore: {
    ...editorStore.uiStore,
    dispatch: editorStore.dispatch,
    /** Shares the editor's notification boundary without notifying on document-only changes. */
    subscribe: (listener: () => void) => {
      let previous = editorStore.uiStore.getState()
      return editorStore.subscribe(() => {
        const current = editorStore.uiStore.getState()
        if (current === previous) return
        previous = current
        listener()
      })
    },
  },
}

db.subscribe(getMoves => {
  const thoughts = db.project()
  if (thoughts !== store.getState().thoughts) {
    store.dispatch({ type: 'replaceThoughts', thoughts, getMoves, repairCursor: true })
  }
})

// Run validation
if (import.meta.env.MODE === 'development') {
  // This can be safely called here because it lazy-loads the actions module
  validateActionRegistrations()
}

export default store
