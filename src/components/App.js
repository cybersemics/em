import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import globals from '../globals'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import TouchBackend from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'

// components
import AppComponent from './AppComponent'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'

const HTML5toTouch = {
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
}

export const App = DragDropContext(MultiBackend(HTML5toTouch))(() =>
  <Provider store={store}>
    <div onTouchMove={
      () => globals.touching = true // eslint-disable-line no-return-assign
    } onTouchEnd={() => {
      globals.touching = false // eslint-disable-line no-return-assign
      globals.touched = true // eslint-disable-line no-return-assign
    }}>
      <ErrorBoundaryContainer>
        <AppComponent />
      </ErrorBoundaryContainer>
    </div>
  </Provider>
)
