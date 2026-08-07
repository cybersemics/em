// This import must come first so the console proxy installs before any other module body runs and captures all subsequent logs.
import './util/consoleProxy'
import { createRoot } from 'react-dom/client'
import App from './components/App'
import ThoughtspaceInUse from './components/ThoughtspaceInUse'
import { thoughtspaceRuntime } from './data-providers/thoughtspace'
import testFlags from './e2e/testFlags'
import './index.css'
import { initialize } from './initialize'
import { register } from './serviceWorkerRegistration'
import store from './stores/app'
import initEvents from './util/initEvents'

const container = document.getElementById('root')
const root = createRoot(container!)

/** Acquires thoughtspace access before initializing or rendering the interactive app. */
const bootstrap = async (): Promise<void> => {
  const access = await thoughtspaceRuntime.acquireAccess()

  if (access.status === 'blocked') {
    root.render(<ThoughtspaceInUse reason={access.reason} />)
    return
  }

  initEvents(store)

  if (!testFlags.preventInitialize) {
    void initialize()
  }

  root.render(<App />)
}

void bootstrap()
register()
