/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, initFirebase, loadLocalState } from './util.js'
import initDB from './db'

(async () => loadLocalState())()
initDB()
initFirebase()
initEvents()

export default App
