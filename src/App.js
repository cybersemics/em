/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, loadLocalState } from './util.js'
import { initFirebase } from './store.js'

(async() => loadLocalState())()
initFirebase()
initEvents()

export default App
