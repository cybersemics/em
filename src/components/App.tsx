import store from '../stores/app'
import AppComponent from './AppComponent'
import DragAndDropContext from './DragAndDropContext'
import EditorProvider from './EditorProvider'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'
import TouchMonitor from './TouchMonitor'

/**
 * App.
 */
const App = () => (
  <DragAndDropContext>
    <EditorProvider store={store}>
      <ErrorBoundaryContainer>
        <TouchMonitor>
          <AppComponent />
        </TouchMonitor>
      </ErrorBoundaryContainer>
    </EditorProvider>
  </DragAndDropContext>
)

export default App
