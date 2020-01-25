/** Defines the Redux app reducer and exports a global store.
  NOTE: Exporting the store is not compatible with server-side rendering.
*/

import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'

// app reducer
import appReducer from './reducers'

export const store = createStore(
  appReducer,
  composeWithDevTools(applyMiddleware(thunk))
)
