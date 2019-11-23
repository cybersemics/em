import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store.js'
import globals from '../globals.js'
import { AppComponent } from './AppComponent.js'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import TouchBackend from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'

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
      <AppComponent/>
    </div>
  </Provider>
)
