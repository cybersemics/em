import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import AppComponent from './AppComponent'

/**
 * App container.
 */
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppComponent />
    </Provider>
  )
}

export { App }
