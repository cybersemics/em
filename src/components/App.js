import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store.js'
import { AppComponent } from './AppComponent.js'

export const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

