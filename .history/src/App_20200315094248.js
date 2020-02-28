/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, initFirebase, loadLocalState } from './util.js'
import initDB from './db'

// initDB();
(async () => loadLocalState())()
initFirebase()
initEvents()

export default App
