import { Provider } from 'react-redux'
import store from '../stores/app'
import AppComponent from './AppComponent'
import { DragAndDropContext } from './DragAndDropContext'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'

/**
 * App.
 */
export const App = () => (
  <DragAndDropContext>
    <Provider store={store}>
      <ErrorBoundaryContainer>
        <TouchMonitor>
          <AppComponent />
        </TouchMonitor>
      </ErrorBoundaryContainer>
    </Provider>
  </DragAndDropContext>
)
