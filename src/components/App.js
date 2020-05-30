import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import TouchBackend from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'

// components
import AppComponent from './AppComponent'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'

const dragDropContext = DragDropContext(MultiBackend({
  backends: [
    {
      backend: HTML5Backend
    },
    {
      backend: TouchBackend({ delayTouchStart: 200 }),
      preview: true,
      transition: TouchTransition
    }
  ]
}))

export const App = dragDropContext(() =>
  <Provider store={store}>
    <ErrorBoundaryContainer>
      <TouchMonitor>
        <AppComponent />
      </TouchMonitor>
    </ErrorBoundaryContainer>
  </Provider>
)
