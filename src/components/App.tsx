import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'

// components
import AppComponent from './AppComponent'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'
import { DragAndDropContext } from './DragAndDropContext'
import GlobalStyle from '../styles/globalStyles'
// import { GlobalStyles as BaseStyles } from 'twin.macro'

/**
 * App.
 */
export const App = () => (
  <>
    {/* TODO: Enable reset styles  */}
    {/* <BaseStyles /> */}
    <GlobalStyle />
    <DragAndDropContext>
      <Provider store={store}>
        <ErrorBoundaryContainer>
          <TouchMonitor>
            <AppComponent />
          </TouchMonitor>
        </ErrorBoundaryContainer>
      </Provider>
    </DragAndDropContext>
  </>
)
