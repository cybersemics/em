// Side-effect import: must come first so the iOS console proxy installs before any other module body runs and captures bootstrap logs.
import './util/iOSConsoleProxy'
import { createRoot } from 'react-dom/client'
import App from './components/App'
import './index.css'
import { initialize } from './initialize'
import { register } from './serviceWorkerRegistration'

initialize()

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)

register()
