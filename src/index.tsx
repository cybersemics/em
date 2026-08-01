// This import must come first so the console proxy installs before any other module body runs and captures all subsequent logs.
import './util/consoleProxy'
import { createRoot } from 'react-dom/client'
import App from './components/App'
import testFlags from './e2e/testFlags'
import './index.css'
import { initialize } from './initialize'
import { register } from './serviceWorkerRegistration'
import store from './stores/app'
import initEvents from './util/initEvents'

initEvents(store)

if (!testFlags.preventInitialize) {
  void initialize()
}

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)

register()
