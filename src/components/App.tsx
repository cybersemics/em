import { Provider } from 'react-redux'
import store from '../stores/app'
import AppComponent from './AppComponent'
import DragAndDropContext from './DragAndDropContext'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'

/**
 * App.
 */
const App = () => (
  <Provider store={store}>
    <DragAndDropContext>
      <ErrorBoundaryContainer>
        <TouchMonitor>
          <AppComponent />
        </TouchMonitor>
      </ErrorBoundaryContainer>
    </DragAndDropContext>
  </Provider>
)

export default App
