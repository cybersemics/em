/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, getSavedState } from './util.js'
import { initFirebase } from './store.js'

(async() => getSavedState())()
initFirebase()
initEvents()

export default App
