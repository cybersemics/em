import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'

// components
import AppComponent from './AppComponent'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'
import { DragAndDropContext } from './DragAndDropContext'
import { incrementSessionCount } from '../util/sessionCount'

/**
 * App.
 */
export const App = () => {
  useEffect(() => {
    incrementSessionCount()
  }, [])

  return <DragAndDropContext>
    <Provider store={store}>
      <ErrorBoundaryContainer>
        <TouchMonitor>
          <AppComponent />
        </TouchMonitor>
      </ErrorBoundaryContainer>
    </Provider>
  </DragAndDropContext>
}
