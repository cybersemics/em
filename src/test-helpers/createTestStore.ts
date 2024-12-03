import { Store, applyMiddleware, compose, createStore } from 'redux'
import { thunk } from 'redux-thunk'
import State from '../@types/State'
import appReducer from '../actions/app'
import pushQueue from '../redux-enhancers/pushQueue'
import undoRedoEnhancer from '../redux-enhancers/undoRedoEnhancer'
import updateJumpHistoryEnhancer from '../redux-enhancers/updateJumpHistoryEnhancer'
import clearSelection from '../redux-middleware/clearSelection'
import doNotDispatchReducer from '../redux-middleware/doNotDispatchReducer'
import freeThoughts from '../redux-middleware/freeThoughts'
import multi from '../redux-middleware/multi'
import pullQueueMiddleware from '../redux-middleware/pullQueue'
import scrollCursorIntoViewMiddleware from '../redux-middleware/scrollCursorIntoView'
import updateEditingValue from '../redux-middleware/updateEditingValue'

// import updateUrlHistoryMiddleware from '../redux-middleware/updateUrlHistory'
// import storageCacheStoreEnhancer from '../redux-enhancers/storageCache'

const middlewareEnhancer = applyMiddleware(
  // prevent accidentally passing a reducer to the dispatch function (dev and test only)
  // (must go before the thunk middleware so that it can throw an error before the thunk middleware tries to execute it)
  ...(import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test' ? [doNotDispatchReducer] : []),
  multi,
  thunk,
  pullQueueMiddleware,
  scrollCursorIntoViewMiddleware,
  clearSelection,
  updateEditingValue,
  // TODO: TypeError: middleware is not a function
  // updateUrlHistoryMiddleware,
  freeThoughts,
)

/**
 * Returns new store for test.
 */
export default function createTestStore() {
  // TODO: Type properly
  const store = createStore(
    appReducer,
    compose(
      middlewareEnhancer,
      // TypeError: Cannot read properties of undefined (reading 'apply')
      // storageCacheStoreEnhancer,
      undoRedoEnhancer,
      updateJumpHistoryEnhancer,
      pushQueue,
    ) as any,
  )

  store.dispatch([
    // skip tutorial
    { type: 'tutorial', value: false },

    // close welcome modal
    { type: 'closeModal' },
  ])

  return store as Store<State, any>
}
