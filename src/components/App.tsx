import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'

// components
import AppComponent from './AppComponent'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'
import { DragAndDropContext } from './DragAndDropContext'
import smoothscroll from 'smoothscroll-polyfill'

smoothscroll.polyfill()

/**
 * App.
 */
export const App = () =>
  <DragAndDropContext>
    <Provider store={store}>
      <ErrorBoundaryContainer>
        <TouchMonitor>
          <AppComponent />
        </TouchMonitor>
      </ErrorBoundaryContainer>
    </Provider>
  </DragAndDropContext>
